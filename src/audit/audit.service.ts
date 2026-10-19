import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditAction } from './enums/audit-action.enum.js';
import { RedactionService } from './redaction.service.js';

export interface AuditEvent {
  actorId: string | null;
  action: AuditAction;
  applicationId?: string | null;
  metadata?: Record<string, unknown>;
}

const METADATA_ALLOWLIST: Record<AuditAction, string[]> = {
  [AuditAction.APPLICATION_CREATED]: ['businessName', 'businessType', 'status'],
  [AuditAction.APPLICATION_SUBMITTED]: ['status', 'riskJobKey'],
  [AuditAction.REVIEWER_ASSIGNED]: ['previousReviewerId', 'newReviewerId'],
  [AuditAction.RISK_PROCESSED]: ['passed', 'score', 'reference', 'riskStatus'],
  [AuditAction.RISK_FAILED]: ['riskJobKey', 'attemptsMade'],
  [AuditAction.DECISION_APPROVED]: ['decision', 'notesProvided'],
  [AuditAction.DECISION_REJECTED]: ['decision', 'notesProvided'],
  [AuditAction.DECISION_INFO_REQUESTED]: ['decision', 'notesProvided'],
  [AuditAction.USER_LOGIN]: ['role'],
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    private readonly redaction: RedactionService,
  ) {}

  async record(event: AuditEvent, manager?: EntityManager): Promise<void> {
    try {
      const repo = manager
        ? manager.getRepository(AuditLog)
        : this.auditRepository;

      const allowedKeys = METADATA_ALLOWLIST[event.action] ?? [];
      const raw = event.metadata ?? {};
      const filtered = this.filterToAllowlist(raw, allowedKeys);
      const redacted = this.redaction.redact(filtered);

      const log = repo.create({
        actorId: event.actorId ?? null,
        action: event.action,
        applicationId: event.applicationId ?? null,
        metadata: redacted,
      });

      await repo.save(log);
    } catch (err) {
      this.logger.error('Failed to write audit log', {
        action: event.action,
        applicationId: event.applicationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private filterToAllowlist(
    data: Record<string, unknown>,
    allowedKeys: string[],
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedKeys.includes(key)),
    );
  }
}
