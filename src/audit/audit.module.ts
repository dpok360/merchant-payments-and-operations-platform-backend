import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditService } from './audit.service.js';
import { RedactionService } from './redaction.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, RedactionService],
  exports: [AuditService, RedactionService],
})
export class AuditModule {}
