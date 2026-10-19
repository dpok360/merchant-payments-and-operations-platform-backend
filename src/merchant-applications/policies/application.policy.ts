import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity.js';
import { Role } from '../../users/enums/role.enum.js';
import { MerchantApplication } from '../entities/merchant-application.entity.js';
import { ApplicationStatus } from '../enums/application-status.enum.js';

const EDITABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.INFO_REQUESTED,
];

@Injectable()
export class ApplicationPolicy {
  canRead(user: User, app: MerchantApplication): boolean {
    if (user.role === Role.ADMIN || user.role === Role.REVIEWER) return true;
    return app.creatorId === user.id;
  }

  canEdit(user: User, app: MerchantApplication): boolean {
    if (!EDITABLE_STATUSES.includes(app.status)) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.SALES) return app.creatorId === user.id;
    return false;
  }

  canSubmit(user: User, app: MerchantApplication): boolean {
    const submittableStatuses = [ApplicationStatus.DRAFT, ApplicationStatus.INFO_REQUESTED];
    if (!submittableStatuses.includes(app.status)) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.SALES) return app.creatorId === user.id;
    return false;
  }

  canDecide(user: User, app: MerchantApplication): boolean {
    if (app.status !== ApplicationStatus.UNDER_REVIEW) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.REVIEWER) return app.assignedReviewerId === user.id;
    return false;
  }

  canAssignReviewer(user: User): boolean {
    return user.role === Role.ADMIN;
  }
}
