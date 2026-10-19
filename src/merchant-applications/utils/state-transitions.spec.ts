import { UnprocessableEntityException } from '@nestjs/common';
import { assertValidTransition } from './state-transitions.js';
import { ApplicationStatus } from '../enums/application-status.enum.js';

describe('assertValidTransition', () => {
  it('DRAFT → SUBMITTED is valid', () => {
    expect(() => assertValidTransition(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)).not.toThrow();
  });

  it('SUBMITTED → UNDER_REVIEW is valid', () => {
    expect(() => assertValidTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)).not.toThrow();
  });

  it('UNDER_REVIEW → APPROVED is valid', () => {
    expect(() => assertValidTransition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED)).not.toThrow();
  });

  it('INFO_REQUESTED → SUBMITTED is valid', () => {
    expect(() => assertValidTransition(ApplicationStatus.INFO_REQUESTED, ApplicationStatus.SUBMITTED)).not.toThrow();
  });

  it('DRAFT → APPROVED throws 422', () => {
    expect(() => assertValidTransition(ApplicationStatus.DRAFT, ApplicationStatus.APPROVED))
      .toThrow(UnprocessableEntityException);
  });

  it('APPROVED → SUBMITTED throws 422', () => {
    expect(() => assertValidTransition(ApplicationStatus.APPROVED, ApplicationStatus.SUBMITTED))
      .toThrow(UnprocessableEntityException);
  });

  it('APPROVED → APPROVED throws 422', () => {
    expect(() => assertValidTransition(ApplicationStatus.APPROVED, ApplicationStatus.APPROVED))
      .toThrow(UnprocessableEntityException);
  });

  it('REJECTED → SUBMITTED throws 422', () => {
    expect(() => assertValidTransition(ApplicationStatus.REJECTED, ApplicationStatus.SUBMITTED))
      .toThrow(UnprocessableEntityException);
  });
});
