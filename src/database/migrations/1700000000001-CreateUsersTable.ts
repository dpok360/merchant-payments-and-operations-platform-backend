import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1700000000001 implements MigrationInterface {
  name = 'CreateUsersTable1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM ('ADMIN', 'REVIEWER', 'SALES')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "email"         VARCHAR           NOT NULL,
        "password_hash" VARCHAR           NOT NULL,
        "role"          "public"."users_role_enum" NOT NULL,
        "first_name"    VARCHAR           NOT NULL,
        "last_name"     VARCHAR           NOT NULL,
        "is_active"     BOOLEAN           NOT NULL DEFAULT true,
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
