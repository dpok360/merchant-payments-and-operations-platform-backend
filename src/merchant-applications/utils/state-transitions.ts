import { UnprocessableEntityException } from '@nestjs/common';
import { ApplicationStatus } from '../enums/application-status.enum.js';

const ALLOWED_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED],
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.RISK_FAILED],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.INFO_REQUESTED,
  ],
  [ApplicationStatus.INFO_REQUESTED]: [ApplicationStatus.SUBMITTED],
  [ApplicationStatus.APPROVED]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.RISK_FAILED]: [],
};

export function assertValidTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new UnprocessableEntityException(
      `Invalid status transition from ${from} to ${to}`,
    );
  }
}
