import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1700000000003 implements MigrationInterface {
  name = 'CreateAuditLogsTable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."audit_action_enum" AS ENUM (
        'APPLICATION_CREATED',
        'APPLICATION_SUBMITTED',
        'REVIEWER_ASSIGNED',
        'RISK_PROCESSED',
        'RISK_FAILED',
        'DECISION_APPROVED',
        'DECISION_REJECTED',
        'DECISION_INFO_REQUESTED',
        'USER_LOGIN'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"             UUID    NOT NULL DEFAULT uuid_generate_v4(),
        "actor_id"       UUID,
        "action"         "public"."audit_action_enum" NOT NULL,
        "application_id" UUID,
        "metadata"       JSONB   NOT NULL DEFAULT '{}',
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actor"       ON "audit_logs" ("actor_id")`);
    // SECURITY: run after provisioning: REVOKE UPDATE, DELETE ON audit_logs FROM <app_user>;    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_application" ON "audit_logs" ("application_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action"      ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created"     ON "audit_logs" ("created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_action_enum"`);
  }
}
