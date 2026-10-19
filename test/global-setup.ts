import 'dotenv/config';
import { DataSource } from 'typeorm';

export default async function globalSetup() {
  const testDbUrl = process.env.DATABASE_URL_TEST
    ?? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME_TEST ?? process.env.DB_NAME + '_test'}`;

  const dataSource = new DataSource({
    type: 'postgres',
    url: testDbUrl,
    synchronize: false,
    entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../src/database/migrations/*{.ts,.js}'],
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
  console.log('[E2E] Migrations run on test database');
}
