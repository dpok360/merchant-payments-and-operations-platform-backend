import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MerchantApplication } from './entities/merchant-application.entity.js';
import { ReviewDecision } from './entities/review-decision.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../users/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { ApplicationPolicy } from './policies/application.policy.js';
import { assertValidTransition } from './utils/state-transitions.js';
import { ApplicationStatus } from './enums/application-status.enum.js';
import { RiskStatus } from './enums/risk-status.enum.js';
import { Decision } from './enums/decision.enum.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/enums/audit-action.enum.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto.js';
import { AssignReviewerDto } from './dto/assign-reviewer.dto.js';
import { RecordDecisionDto } from './dto/record-decision.dto.js';

import { RiskQueueService } from '../risk/risk-queue.service.js';

@Injectable()
export class MerchantApplicationsService {
  constructor(
    @InjectRepository(MerchantApplication)
    private readonly appRepository: Repository<MerchantApplication>,
    @InjectRepository(ReviewDecision)
    private readonly decisionRepository: Repository<ReviewDecision>,
    private readonly usersService: UsersService,
    private readonly policy: ApplicationPolicy,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly riskQueueService: RiskQueueService,
  ) {}

  async create(dto: CreateApplicationDto, actor: User): Promise<MerchantApplication> {
    return this.dataSource.transaction(async (manager) => {
      const app = manager.create(MerchantApplication, {
        ...dto,
        creatorId: actor.id,
        status: ApplicationStatus.DRAFT,
        riskStatus: RiskStatus.PENDING,
      });
      const saved = await manager.save(MerchantApplication, app);

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.APPLICATION_CREATED,
          applicationId: saved.id,
          metadata: {
            businessName: saved.businessName,
            businessType: saved.businessType,
            status: saved.status,
          },
        },
        manager,
      );

      return saved;
    });
  }

  async findAll(
    query: ListApplicationsQueryDto,
    actor: User,
  ): Promise<{ data: MerchantApplication[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.appRepository
      .createQueryBuilder('app')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actor.role === Role.SALES) {
      qb.andWhere('app.creator_id = :creatorId', { creatorId: actor.id });
    }
    if (query.status) {
      qb.andWhere('app.status = :status', { status: query.status });
    }
    if (query.riskStatus) {
      qb.andWhere('app.risk_status = :riskStatus', { riskStatus: query.riskStatus });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string, actor: User): Promise<MerchantApplication> {
    const app = await this.appRepository.findOne({ where: { id } });

    // Return 404 in all unauthorized cases to prevent existence leakage
    if (!app || !this.policy.canRead(actor, app)) {
      throw new NotFoundException('Application not found');
    }

    return app;
  }

  async update(
    id: string,
    dto: UpdateApplicationDto,
    actor: User,
  ): Promise<MerchantApplication> {
    const app = await this.appRepository.findOne({ where: { id } });

    if (!app || !this.policy.canRead(actor, app)) {
      throw new NotFoundException('Application not found');
    }

    if (!this.policy.canEdit(actor, app)) {
      throw new ForbiddenException('Application cannot be edited in its current state');
    }

    const allowed: (keyof UpdateApplicationDto)[] = [
      'businessName',
      'legalBusinessName',
      'businessType',
      'ownerFirstName',
      'ownerLastName',
      'ownerEmail',
      'ownerPhone',
      'requestedMonthlyVolume',
      'businessWebsite',
    ];

    for (const field of allowed) {
      if (dto[field] !== undefined) {
        (app as unknown as Record<string, unknown>)[field] = dto[field];
      }
    }

    return this.appRepository.save(app);
  }

  async submit(id: string, actor: User): Promise<MerchantApplication> {
    const app = await this.appRepository.findOne({ where: { id } });

    if (!app || !this.policy.canRead(actor, app)) {
      throw new NotFoundException('Application not found');
    }

    if (!this.policy.canSubmit(actor, app)) {
      if (app.status === ApplicationStatus.SUBMITTED) {
        throw new ConflictException('Application is already submitted');
      }
      throw new ForbiddenException('Application cannot be submitted in its current state');
    }

    assertValidTransition(app.status, ApplicationStatus.SUBMITTED);

    let riskJobKey: string;
    const saved = await this.dataSource.transaction(async (manager) => {
      const submittedAt = new Date();
      riskJobKey = `${app.id}:${submittedAt.toISOString()}`;

      app.status = ApplicationStatus.SUBMITTED;
      app.submittedAt = submittedAt;
      app.riskJobKey = riskJobKey;

      const result = await manager.save(MerchantApplication, app);

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.APPLICATION_SUBMITTED,
          applicationId: result.id,
          metadata: { status: result.status, riskJobKey },
        },
        manager,
      );

      return result;
    });

    // Enqueue outside the transaction — job is idempotent via riskJobKey
    await this.riskQueueService.enqueueRiskReview(saved.id, saved.riskJobKey!);

    return saved;
  }

  async assignReviewer(
    id: string,
    dto: AssignReviewerDto,
    actor: User,
  ): Promise<MerchantApplication> {
    const app = await this.appRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    if (!this.policy.canAssignReviewer(actor)) {
      throw new ForbiddenException('Only admins can assign reviewers');
    }

    const reviewer = await this.usersService.findById(dto.reviewerId);
    if (!reviewer || reviewer.role !== Role.REVIEWER) {
      throw new BadRequestException('Reviewer not found or user is not a REVIEWER');
    }

    const previousReviewerId = app.assignedReviewerId;

    return this.dataSource.transaction(async (manager) => {
      app.assignedReviewerId = dto.reviewerId;
      const saved = await manager.save(MerchantApplication, app);

      await this.auditService.record(
        {
          actorId: actor.id,
          action: AuditAction.REVIEWER_ASSIGNED,
          applicationId: saved.id,
          metadata: { previousReviewerId, newReviewerId: dto.reviewerId },
        },
        manager,
      );

      return saved;
    });
  }

  async recordDecision(
    id: string,
    dto: RecordDecisionDto,
    actor: User,
  ): Promise<ReviewDecision> {
    const app = await this.appRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    if (!this.policy.canDecide(actor, app)) {
      if (app.status !== ApplicationStatus.UNDER_REVIEW) {
        throw new ForbiddenException(
          'Decisions can only be made on applications under review',
        );
      }
      throw new ForbiddenException('You are not authorized to make decisions on this application');
    }

    const statusMap: Record<Decision, ApplicationStatus> = {
      [Decision.APPROVE]: ApplicationStatus.APPROVED,
      [Decision.REJECT]: ApplicationStatus.REJECTED,
      [Decision.REQUEST_INFO]: ApplicationStatus.INFO_REQUESTED,
    };

    const actionMap: Record<Decision, AuditAction> = {
      [Decision.APPROVE]: AuditAction.DECISION_APPROVED,
      [Decision.REJECT]: AuditAction.DECISION_REJECTED,
      [Decision.REQUEST_INFO]: AuditAction.DECISION_INFO_REQUESTED,
    };

    const nextStatus = statusMap[dto.decision];
    assertValidTransition(app.status, nextStatus);

    return this.dataSource.transaction(async (manager) => {
      const decision = manager.create(ReviewDecision, {
        applicationId: app.id,
        actorId: actor.id,
        decision: dto.decision,
        notes: dto.notes ?? null,
      });
      const savedDecision = await manager.save(ReviewDecision, decision);

      app.status = nextStatus;
      app.reviewedAt = new Date();
      await manager.save(MerchantApplication, app);

      await this.auditService.record(
        {
          actorId: actor.id,
          action: actionMap[dto.decision],
          applicationId: app.id,
          metadata: { decision: dto.decision, notesProvided: !!dto.notes },
        },
        manager,
      );

      return savedDecision;
    });
  }
}
