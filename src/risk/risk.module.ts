import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskQueueService, RISK_QUEUE_NAME } from './risk-queue.service.js';
import { RiskProcessor } from './risk.processor.js';
import { RiskEventsListener } from './risk-events.listener.js';
import { KybProviderService } from './kyb-provider.service.js';
import { MerchantApplication } from '../merchant-applications/entities/merchant-application.entity.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: RISK_QUEUE_NAME }),
    TypeOrmModule.forFeature([MerchantApplication]),
    AuditModule,
  ],
  providers: [
    RiskQueueService,
    RiskProcessor,
    RiskEventsListener,
    KybProviderService,
  ],
  exports: [RiskQueueService],
})
export class RiskModule {}
