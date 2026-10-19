import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { RiskJobDto } from './dto/risk-job.dto.js';

export const RISK_QUEUE_NAME = 'risk-review';

@Injectable()
export class RiskQueueService {
  private readonly maxAttempts: number;

  constructor(
    @InjectQueue(RISK_QUEUE_NAME) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.maxAttempts = this.configService.get<number>('risk.jobMaxAttempts') ?? 3;
  }

  async enqueueRiskReview(applicationId: string, riskJobKey: string): Promise<void> {
    const jobData: RiskJobDto = { applicationId, riskJobKey };
    await this.queue.add('process-risk', jobData, {
      jobId: riskJobKey,
      attempts: this.maxAttempts,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
