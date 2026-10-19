import { ApplicationPolicy } from './application.policy.js';
import { Role } from '../../users/enums/role.enum.js';
import { ApplicationStatus } from '../enums/application-status.enum.js';
import { User } from '../../users/entities/user.entity.js';
import { MerchantApplication } from '../entities/merchant-application.entity.js';

function makeUser(role: Role, id = 'user-1'): User {
  return { id, role, email: 'test@test.com', isActive: true } as User;
}

function makeApp(creatorId: string, reviewerId: string | null, status: ApplicationStatus): MerchantApplication {
  return { id: 'app-1', creatorId, assignedReviewerId: reviewerId, status } as MerchantApplication;
}

describe('ApplicationPolicy', () => {
  let policy: ApplicationPolicy;

  beforeEach(() => { policy = new ApplicationPolicy(); });

  describe('canRead', () => {
    it('ADMIN can read any application', () => {
      expect(policy.canRead(makeUser(Role.ADMIN), makeApp('other', null, ApplicationStatus.DRAFT))).toBe(true);
    });

    it('REVIEWER can read any application', () => {
      expect(policy.canRead(makeUser(Role.REVIEWER), makeApp('other', null, ApplicationStatus.DRAFT))).toBe(true);
    });

    it('SALES can read own application', () => {
      expect(policy.canRead(makeUser(Role.SALES, 'u1'), makeApp('u1', null, ApplicationStatus.DRAFT))).toBe(true);
    });

    it('SALES cannot read another users application', () => {
      expect(policy.canRead(makeUser(Role.SALES, 'u1'), makeApp('u2', null, ApplicationStatus.DRAFT))).toBe(false);
    });
  });

  describe('canEdit', () => {
    it('SALES can edit own DRAFT application', () => {
      expect(policy.canEdit(makeUser(Role.SALES, 'u1'), makeApp('u1', null, ApplicationStatus.DRAFT))).toBe(true);
    });

    it('SALES cannot edit APPROVED application', () => {
      expect(policy.canEdit(makeUser(Role.SALES, 'u1'), makeApp('u1', null, ApplicationStatus.APPROVED))).toBe(false);
    });

    it('ADMIN can edit any editable application', () => {
      expect(policy.canEdit(makeUser(Role.ADMIN), makeApp('other', null, ApplicationStatus.INFO_REQUESTED))).toBe(true);
    });

    it('REVIEWER cannot edit', () => {
      expect(policy.canEdit(makeUser(Role.REVIEWER), makeApp('other', null, ApplicationStatus.DRAFT))).toBe(false);
    });
  });

  describe('canDecide', () => {
    it('Assigned REVIEWER can decide on UNDER_REVIEW application', () => {
      expect(policy.canDecide(makeUser(Role.REVIEWER, 'r1'), makeApp('u1', 'r1', ApplicationStatus.UNDER_REVIEW))).toBe(true);
    });

    it('Unassigned REVIEWER cannot decide', () => {
      expect(policy.canDecide(makeUser(Role.REVIEWER, 'r2'), makeApp('u1', 'r1', ApplicationStatus.UNDER_REVIEW))).toBe(false);
    });

    it('SALES cannot decide', () => {
      expect(policy.canDecide(makeUser(Role.SALES, 'u1'), makeApp('u1', null, ApplicationStatus.UNDER_REVIEW))).toBe(false);
    });

    it('ADMIN can decide', () => {
      expect(policy.canDecide(makeUser(Role.ADMIN), makeApp('u1', null, ApplicationStatus.UNDER_REVIEW))).toBe(true);
    });

    it('Returns false when not UNDER_REVIEW', () => {
      expect(policy.canDecide(makeUser(Role.REVIEWER, 'r1'), makeApp('u1', 'r1', ApplicationStatus.DRAFT))).toBe(false);
    });
  });
});
