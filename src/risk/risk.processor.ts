import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { MerchantApplication } from '../merchant-applications/entities/merchant-application.entity.js';
import { ApplicationStatus } from '../merchant-applications/enums/application-status.enum.js';
import { RiskStatus } from '../merchant-applications/enums/risk-status.enum.js';
import { KybProviderService } from './kyb-provider.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/enums/audit-action.enum.js';
import { RiskJobDto } from './dto/risk-job.dto.js';
import { RISK_QUEUE_NAME } from './risk-queue.service.js';

@Processor(RISK_QUEUE_NAME)
export class RiskProcessor extends WorkerHost {
  private readonly logger = new Logger(RiskProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly kybProvider: KybProviderService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<RiskJobDto>): Promise<void> {
    const { applicationId, riskJobKey } = job.data;

    this.logger.log({ event: 'job_received', jobId: job.id, applicationId, attempt: job.attemptsMade + 1 });

    const app = await this.dataSource
      .getRepository(MerchantApplication)
      .findOne({ where: { id: applicationId } });

    if (!app) {
      this.logger.warn({ event: 'app_not_found', jobId: job.id, applicationId });
      return;
    }

    // Layer 2: stale job key check
    if (app.riskJobKey !== riskJobKey) {
      this.logger.log({ event: 'stale_job_key', jobId: job.id, applicationId });
      return;
    }

    // Layer 2: state guard
    if (app.status !== ApplicationStatus.SUBMITTED) {
      this.logger.log({ event: 'wrong_state', jobId: job.id, applicationId, status: app.status });
      return;
    }

    // Layer 3: atomic claim via conditional UPDATE
    const claimed = await this.claimProcessing(applicationId, riskJobKey);
    if (!claimed) {
      this.logger.log({ event: 'already_claimed', jobId: job.id, applicationId });
      return;
    }

    // Call simulated KYB provider — may throw for retry
    const kybResult = await this.kybProvider.checkBusiness(applicationId);

    // Persist result in transaction
    await this.dataSource.transaction(async (manager) => {
      const sanitizedMetadata = {
        score: kybResult.score,
        flags: kybResult.flags,
        reference: kybResult.reference,
        passed: kybResult.passed,
      };

      await manager.update(MerchantApplication, { id: applicationId }, {
        riskStatus: kybResult.passed ? RiskStatus.PASSED : RiskStatus.FAILED,
        status: ApplicationStatus.UNDER_REVIEW,
        riskScore: kybResult.score,
        riskMetadata: sanitizedMetadata,
        riskProcessedAt: new Date(),
      });

      await this.auditService.record(
        {
          actorId: null,
          action: AuditAction.RISK_PROCESSED,
          applicationId,
          metadata: {
            passed: kybResult.passed,
            score: kybResult.score,
            reference: kybResult.reference,
            riskStatus: kybResult.passed ? RiskStatus.PASSED : RiskStatus.FAILED,
          },
        },
        manager,
      );
    });

    this.logger.log({ event: 'job_complete', jobId: job.id, applicationId, passed: kybResult.passed });
  }

  private async claimProcessing(applicationId: string, riskJobKey: string): Promise<boolean> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(MerchantApplication)
      .set({ riskStatus: RiskStatus.PROCESSING })
      .where('id = :id AND status = :status AND risk_job_key = :key', {
        id: applicationId,
        status: ApplicationStatus.SUBMITTED,
        key: riskJobKey,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
