import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Baseline migration — schema will be built incrementally by subsequent migrations
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
