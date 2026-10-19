import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/app.helper.js';
import { clearAll } from './helpers/db-cleaner.js';
import { seedTestUsers, TEST_USERS } from './helpers/seed.helper.js';
import { getToken } from './helpers/auth.helper.js';
import { AuditLog } from '../src/audit/entities/audit-log.entity.js';
import { AuditAction } from '../src/audit/enums/audit-action.enum.js';
import { RiskProcessor } from '../src/risk/risk.processor.js';
import { MerchantApplication } from '../src/merchant-applications/entities/merchant-application.entity.js';

const CREATE_APP_BODY = {
  businessName: 'Audit Test Co',
  legalBusinessName: 'Audit Test Co Inc',
  businessType: 'Inc',
  ownerFirstName: 'Alice',
  ownerLastName: 'Audit',
  ownerEmail: 'alice@auditco.com',
};

describe('Audit Trail (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let salesToken: string;
  let adminToken: string;
  let reviewer1Token: string;
  let reviewer1Id: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearAll(dataSource);
    const users = await seedTestUsers(dataSource);

    reviewer1Id    = users['reviewer1'].id;
    salesToken     = await getToken(app, TEST_USERS.sales1.email,    TEST_USERS.sales1.password);
    adminToken     = await getToken(app, TEST_USERS.admin.email,     TEST_USERS.admin.password);
    reviewer1Token = await getToken(app, TEST_USERS.reviewer1.email, TEST_USERS.reviewer1.password);
  });

  afterAll(async () => {
    await clearAll(dataSource);
    await app.close();
  });

  it('APPLICATION_CREATED audit event exists after creating an application', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const auditRepo = dataSource.getRepository(AuditLog);
    const log = await auditRepo.findOne({
      where: { applicationId: appId, action: AuditAction.APPLICATION_CREATED },
    });

    expect(log).toBeTruthy();
    expect(log?.actorId).toBeTruthy();
    expect(log?.applicationId).toBe(appId);
  });

  it('DECISION_APPROVED audit event persisted with actorId and applicationId', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/submit`)
      .set('Authorization', `Bearer ${salesToken}`);

    const appRecord = await dataSource.getRepository(MerchantApplication).findOne({ where: { id: appId } });
    const processor = app.get(RiskProcessor);
    await processor.process({ data: { applicationId: appId, riskJobKey: appRecord!.riskJobKey! }, id: appRecord!.riskJobKey, attemptsMade: 0, opts: { attempts: 3 } } as any);

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}/assign-reviewer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewerId: reviewer1Id });

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/decisions`)
      .set('Authorization', `Bearer ${reviewer1Token}`)
      .send({ decision: 'APPROVE' });

    const auditRepo = dataSource.getRepository(AuditLog);
    const log = await auditRepo.findOne({
      where: { applicationId: appId, action: AuditAction.DECISION_APPROVED },
    });

    expect(log).toBeTruthy();
    expect(log?.actorId).toBeTruthy();
    expect(log?.applicationId).toBe(appId);
  });

  it('Audit metadata does NOT contain ownerEmail', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const auditRepo = dataSource.getRepository(AuditLog);
    const logs = await auditRepo.find({ where: { applicationId: appId } });

    for (const log of logs) {
      expect(JSON.stringify(log.metadata)).not.toContain('ownerEmail');
      expect(JSON.stringify(log.metadata)).not.toContain('passwordHash');
    }
  });

  it('AuditLog has no updatedAt column', async () => {
    const columns = await dataSource.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name = 'updated_at'
    `);
    expect(columns.length).toBe(0);
  });
});
