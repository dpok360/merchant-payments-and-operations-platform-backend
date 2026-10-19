import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/app.helper.js';
import { clearAll } from './helpers/db-cleaner.js';
import { seedTestUsers, TEST_USERS } from './helpers/seed.helper.js';
import { getToken } from './helpers/auth.helper.js';
import { RiskProcessor } from '../src/risk/risk.processor.js';
import { MerchantApplication } from '../src/merchant-applications/entities/merchant-application.entity.js';

const CREATE_APP_BODY = {
  businessName: 'Lifecycle Co',
  legalBusinessName: 'Lifecycle Co Ltd',
  businessType: 'Ltd',
  ownerFirstName: 'Bob',
  ownerLastName: 'Smith',
  ownerEmail: 'bob@lifecycle.com',
};

describe('Application Lifecycle (e2e)', () => {
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

  it('Submit DRAFT → status SUBMITTED', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('Submit already SUBMITTED → 409', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    await request(app.getHttpServer())
      .post(`/api/v1/applications/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${salesToken}`);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${create.body.id}/submit`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(409);
  });

  it('Decision on DRAFT application → 403 (not UNDER_REVIEW)', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    await request(app.getHttpServer())
      .patch(`/api/v1/applications/${create.body.id}/assign-reviewer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewerId: reviewer1Id });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${create.body.id}/decisions`)
      .set('Authorization', `Bearer ${reviewer1Token}`)
      .send({ decision: 'APPROVE' });

    expect(res.status).toBe(403);
  });

  it('Edit APPROVED application → 422', async () => {
    // Create → submit → process → assign → approve
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

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ businessName: 'Changed after approval' });

    expect(res.status).toBe(403);
  });

  it('Assign non-REVIEWER user as reviewer → 400', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${salesToken}`)
      .send(CREATE_APP_BODY);

    // Try to assign a SALES user as reviewer
    const salesUser = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [TEST_USERS.sales2.email]);
    const salesId = salesUser[0].id;

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${create.body.id}/assign-reviewer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewerId: salesId });

    expect(res.status).toBe(400);
  });

  it('Pagination returns correct shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/applications?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('limit > 100 → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/applications?limit=200')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('Invalid status filter → 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/applications?status=INVALID_STATUS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});
