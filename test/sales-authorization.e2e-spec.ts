import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/app.helper.js';
import { clearAll } from './helpers/db-cleaner.js';
import { seedTestUsers, TEST_USERS } from './helpers/seed.helper.js';
import { getToken } from './helpers/auth.helper.js';

const CREATE_APP_BODY = {
  businessName: 'Test Co',
  legalBusinessName: 'Test Co LLC',
  businessType: 'LLC',
  ownerFirstName: 'John',
  ownerLastName: 'Doe',
  ownerEmail: 'john@testco.com',
};

describe('SALES Authorization (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let sales1Token: string;
  let sales2Token: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearAll(dataSource);
    await seedTestUsers(dataSource);

    sales1Token = await getToken(app, TEST_USERS.sales1.email, TEST_USERS.sales1.password);
    sales2Token = await getToken(app, TEST_USERS.sales2.email, TEST_USERS.sales2.password);
    adminToken  = await getToken(app, TEST_USERS.admin.email,  TEST_USERS.admin.password);
  });

  afterAll(async () => {
    await clearAll(dataSource);
    await app.close();
  });

  it('SALES creates application → creatorId = own userId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales1Token}`)
      .send(CREATE_APP_BODY);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.riskStatus).toBe('PENDING');
  });

  it('SALES retrieves own application → 200', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales1Token}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/applications/${appId}`)
      .set('Authorization', `Bearer ${sales1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(appId);
  });

  it('SALES retrieves another users application → 404', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales2Token}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/applications/${appId}`)
      .set('Authorization', `Bearer ${sales1Token}`);

    expect(res.status).toBe(404);
  });

  it('SALES updates own application (DRAFT) → 200', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales1Token}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}`)
      .set('Authorization', `Bearer ${sales1Token}`)
      .send({ businessName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.businessName).toBe('Updated Name');
  });

  it('SALES updates another users application → 404', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales2Token}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}`)
      .set('Authorization', `Bearer ${sales1Token}`)
      .send({ businessName: 'Hacked' });

    expect(res.status).toBe(404);
  });

  it('SALES lists only own applications', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${sales1Token}`);

    expect(res.status).toBe(200);
    const allMine = res.body.data.every((a: Record<string, string>) => a.creatorId !== undefined);
    expect(allMine).toBe(true);
  });

  it('SALES calls assign-reviewer → 403', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales1Token}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${appId}/assign-reviewer`)
      .set('Authorization', `Bearer ${sales1Token}`)
      .send({ reviewerId: '00000000-0000-0000-0000-000000000001' });

    expect(res.status).toBe(403);
  });

  it('SALES calls decisions endpoint → 403', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${sales1Token}`)
      .send(CREATE_APP_BODY);

    const appId = create.body.id;
    const res = await request(app.getHttpServer())
      .post(`/api/v1/applications/${appId}/decisions`)
      .set('Authorization', `Bearer ${sales1Token}`)
      .send({ decision: 'APPROVE' });

    expect(res.status).toBe(403);
  });
});
