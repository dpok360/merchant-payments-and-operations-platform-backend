import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMerchantApplicationsTables1700000000002 implements MigrationInterface {
  name = 'CreateMerchantApplicationsTables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."application_status_enum" AS ENUM (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED', 'RISK_FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."risk_status_enum" AS ENUM (
        'PENDING', 'PROCESSING', 'PASSED', 'FAILED', 'ERROR'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "merchant_applications" (
        "id"                        UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "business_name"             VARCHAR      NOT NULL,
        "legal_business_name"       VARCHAR      NOT NULL,
        "business_type"             VARCHAR      NOT NULL,
        "owner_first_name"          VARCHAR      NOT NULL,
        "owner_last_name"           VARCHAR      NOT NULL,
        "owner_email"               VARCHAR      NOT NULL,
        "owner_phone"               VARCHAR,
        "requested_monthly_volume"  DECIMAL(12,2),
        "business_website"          VARCHAR,
        "status"    "public"."application_status_enum" NOT NULL DEFAULT 'DRAFT',
        "risk_status" "public"."risk_status_enum"      NOT NULL DEFAULT 'PENDING',
        "risk_score"                INTEGER,
        "risk_metadata"             JSONB,
        "creator_id"                UUID         NOT NULL,
        "assigned_reviewer_id"      UUID,
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "submitted_at"  TIMESTAMP WITH TIME ZONE,
        "reviewed_at"   TIMESTAMP WITH TIME ZONE,
        "risk_processed_at" TIMESTAMP WITH TIME ZONE,
        "risk_job_key"  VARCHAR,
        "version"       INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT "PK_merchant_applications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_merchant_applications_creator"
          FOREIGN KEY ("creator_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_merchant_applications_reviewer"
          FOREIGN KEY ("assigned_reviewer_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_applications_creator"  ON "merchant_applications" ("creator_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_status"   ON "merchant_applications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_reviewer" ON "merchant_applications" ("assigned_reviewer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_created"  ON "merchant_applications" ("created_at" DESC)`);

    await queryRunner.query(`
      CREATE TYPE "public"."decision_enum" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_INFO')
    `);

    await queryRunner.query(`
      CREATE TABLE "review_decisions" (
        "id"             UUID    NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" UUID    NOT NULL,
        "actor_id"       UUID    NOT NULL,
        "decision"       "public"."decision_enum" NOT NULL,
        "notes"          VARCHAR(2000),
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_review_decisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_review_decisions_application"
          FOREIGN KEY ("application_id") REFERENCES "merchant_applications"("id"),
        CONSTRAINT "FK_review_decisions_actor"
          FOREIGN KEY ("actor_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_review_decisions_application" ON "review_decisions" ("application_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "review_decisions"`);
    await queryRunner.query(`DROP TABLE "merchant_applications"`);
    await queryRunner.query(`DROP TYPE "public"."decision_enum"`);
    await queryRunner.query(`DROP TYPE "public"."application_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."risk_status_enum"`);
  }
}
