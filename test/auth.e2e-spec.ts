import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/app.helper.js';
import { clearAll } from './helpers/db-cleaner.js';
import { seedTestUsers, TEST_USERS } from './helpers/seed.helper.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearAll(dataSource);
    await seedTestUsers(dataSource);
  });

  afterAll(async () => {
    await clearAll(dataSource);
    await app.close();
  });

  it('POST /auth/login with valid credentials → 200 + accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USERS.sales1.email, password: TEST_USERS.sales1.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('SALES');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/login with wrong password → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: TEST_USERS.sales1.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login with unknown email → 401 (same message, no enumeration)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unknown@nowhere.com', password: 'somepassword' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('POST /auth/login with missing fields → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/applications without token → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/applications');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/applications with malformed token → 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/applications')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('GET /health is public → 200', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
