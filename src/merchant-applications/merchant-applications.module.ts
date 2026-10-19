import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantApplication } from './entities/merchant-application.entity.js';
import { ReviewDecision } from './entities/review-decision.entity.js';
import { MerchantApplicationsService } from './merchant-applications.service.js';
import { MerchantApplicationsController } from './merchant-applications.controller.js';
import { ApplicationPolicy } from './policies/application.policy.js';
import { UsersModule } from '../users/users.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RiskModule } from '../risk/risk.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantApplication, ReviewDecision]),
    UsersModule,
    AuditModule,
    RiskModule,
  ],
  controllers: [MerchantApplicationsController],
  providers: [MerchantApplicationsService, ApplicationPolicy],
  exports: [MerchantApplicationsService],
})
export class MerchantApplicationsModule {}
