import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/app.helper.js';
import { clearAll } from './helpers/db-cleaner.js';
import { seedTestUsers, TEST_USERS } from './helpers/seed.helper.js';
import { getToken } from './helpers/auth.helper.js';
import { RiskProcessor } from '../src/risk/risk.processor.js';
import { MerchantApplication } from '../src/merchant-applications/entities/merchant-application.entity.js';
import { ApplicationStatus } from '../src/merchant-applications/enums/application-status.enum.js';

const CREATE_APP_BODY = {
  businessName: 'Reviewer Test Co',
  legalBusinessName: 'Reviewer Test Co LLC',
  businessType: 'LLC',
  ownerFirstName: 'Jane',
  ownerLastName: 'Doe',
  ownerEmail: 'jane@reviewertest.com',
};

describe('REVIEWER Authorization (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let reviewer1Token: string;
  let reviewer2Token: string;
  let salesToken: string;
  let reviewer1Id: string;
  let reviewer2Id: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearAll(dataSource);
    const users = await seedTestUsers(dataSource);

    reviewer1Id = users['reviewer1'].id;
    reviewer2Id = users['reviewer2'].id;

    adminToken     = await getToken(app, TEST_USERS.admin.email,     TEST_USERS.admin.password);
    reviewer1Token = await getToken(app, TEST_USERS.reviewer1.email, TEST_USERS.reviewer1.password);
    reviewer2Token = await getToken(app, TEST_USERS.reviewer2.email, TEST_USERS.reviewer2.password);
    salesToken     = await getToken(app, TEST_USERS.sales1.email,    TEST_USERS.sales1.password);
  });

  afterAll(async () => {
    await clearAll(dataSource);
    await app.close();
  });

  async function createUnderReviewApp(): Promise<string> {
    // Create → submit → run processor directly → assign reviewer
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/submit`)
      .set('Authorization', `Bearer ${salesToken}`);

    // Directly invoke processor (no live Redis needed in e2e)
    const app2 = await dataSource.getRepository(MerchantApplication).findOne({ where: { id: appId } });
    const processor = app.get(RiskProcessor);
    await processor.process({ data: { applicationId: appId, riskJobKey: app2!.riskJobKey! }, id: app2!.riskJobKey, attemptsMade: 0, opts: { attempts: 3 } } as any);

    return appId;
  }

  it('Unassigned REVIEWER calls decisions endpoint → 403', async () => {
    const appId = await createUnderReviewApp();

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}/assign-reviewer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewerId: reviewer1Id });

    // reviewer2 is NOT assigned
    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/decisions`)
      .set('Authorization', `Bearer ${reviewer2Token}`)
      .send({ decision: 'APPROVE' });

    expect(res.status).toBe(403);
  });

  it('Assigned REVIEWER makes valid decision → 201', async () => {
    const appId = await createUnderReviewApp();

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}/assign-reviewer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewerId: reviewer1Id });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/decisions`)
      .set('Authorization', `Bearer ${reviewer1Token}`)
      .send({ decision: 'APPROVE', notes: 'Looks good' });

    expect(res.status).toBe(201);
    expect(res.body.decision).toBe('APPROVE');
  });

  it('REVIEWER cannot create an application → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${reviewer1Token}`)
      .send(CREATE_APP_BODY);

    expect(res.status).toBe(403);
  });

  it('REVIEWER cannot update an application → 403', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${create.body.id}`)
      .set('Authorization', `Bearer ${reviewer1Token}`)
      .send({ businessName: 'Hacked' });

    expect(res.status).toBe(403);
  });
});
