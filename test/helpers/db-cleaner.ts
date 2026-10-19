import type { DataSource } from 'typeorm';

export async function clearAll(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    TRUNCATE TABLE
      audit_logs,
      review_decisions,
      merchant_applications,
      users
    CASCADE
  `);
}
