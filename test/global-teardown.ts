import 'dotenv/config';
import { DataSource } from 'typeorm';

export default async function globalTeardown() {
  const testDbUrl = process.env.DATABASE_URL_TEST
    ?? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME_TEST ?? process.env.DB_NAME + '_test'}`;

  const dataSource = new DataSource({
    type: 'postgres',
    url: testDbUrl,
    synchronize: false,
    entities: [],
    migrations: [],
  });

  await dataSource.initialize();
  // Truncate all tables in reverse dependency order
  await dataSource.query(`
    TRUNCATE TABLE
      audit_logs,
      review_decisions,
      merchant_applications,
      users
    CASCADE
  `);
  await dataSource.destroy();
  console.log('[E2E] Test database cleaned up');
}
