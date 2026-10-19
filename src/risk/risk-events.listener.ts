import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue, QueueEvents } from 'bullmq';
import { DataSource } from 'typeorm';
import { MerchantApplication } from '../merchant-applications/entities/merchant-application.entity.js';
import { ApplicationStatus } from '../merchant-applications/enums/application-status.enum.js';
import { RiskStatus } from '../merchant-applications/enums/risk-status.enum.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/enums/audit-action.enum.js';
import { RISK_QUEUE_NAME } from './risk-queue.service.js';
import { RiskJobDto } from './dto/risk-job.dto.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RiskEventsListener implements OnModuleInit {
  private readonly logger = new Logger(RiskEventsListener.name);
  private queueEvents: QueueEvents;

  constructor(
    @InjectQueue(RISK_QUEUE_NAME) private readonly queue: Queue,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.queueEvents = new QueueEvents(RISK_QUEUE_NAME, { connection: { url: redisUrl } });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      const job = await this.queue.getJob(jobId);
      if (!job) return;

      const data = job.data as RiskJobDto;
      const isTerminal = (job.attemptsMade ?? 0) >= (job.opts?.attempts ?? 3);

      if (isTerminal) {
        this.logger.error({
          event: 'job_terminal_failure',
          jobId,
          applicationId: data.applicationId,
          reason: failedReason,
        });
        await this.handleTerminalFailure(data.applicationId, data.riskJobKey);
      }
    });
  }

  async handleTerminalFailure(applicationId: string, riskJobKey: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const result = await manager
          .createQueryBuilder()
          .update(MerchantApplication)
          .set({ status: ApplicationStatus.RISK_FAILED, riskStatus: RiskStatus.ERROR })
          .where('id = :id AND risk_job_key = :key AND status IN (:...statuses)', {
            id: applicationId,
            key: riskJobKey,
            statuses: [ApplicationStatus.SUBMITTED],
          })
          .execute();

        if ((result.affected ?? 0) > 0) {
          await this.auditService.record(
            {
              actorId: null,
              action: AuditAction.RISK_FAILED,
              applicationId,
              metadata: { riskJobKey },
            },
            manager,
          );
        }
      });
    } catch (err) {
      this.logger.error({
        event: 'terminal_failure_handler_error',
        applicationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
