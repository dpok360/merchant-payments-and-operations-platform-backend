import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function getToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });
  return res.body.accessToken as string;
}
