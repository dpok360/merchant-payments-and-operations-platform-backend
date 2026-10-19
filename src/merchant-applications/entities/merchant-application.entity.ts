import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { ApplicationStatus } from '../enums/application-status.enum.js';
import { RiskStatus } from '../enums/risk-status.enum.js';

@Entity('merchant_applications')
@Index(['creatorId'])
@Index(['status'])
@Index(['assignedReviewerId'])
export class MerchantApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessName: string;

  @Column()
  legalBusinessName: string;

  @Column()
  businessType: string;

  @Column()
  ownerFirstName: string;

  @Column()
  ownerLastName: string;

  @Column()
  ownerEmail: string;

  @Column({ nullable: true })
  ownerPhone: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  requestedMonthlyVolume: number;

  @Column({ nullable: true })
  businessWebsite: string;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.DRAFT })
  status: ApplicationStatus;

  @Column({ type: 'enum', enum: RiskStatus, default: RiskStatus.PENDING })
  riskStatus: RiskStatus;

  @Column({ nullable: true, type: 'int' })
  riskScore: number;

  @Column({ type: 'jsonb', nullable: true })
  riskMetadata: Record<string, unknown>;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_reviewer_id' })
  assignedReviewer: User | null;

  @Column({ name: 'assigned_reviewer_id', nullable: true })
  assignedReviewerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  submittedAt: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  reviewedAt: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  riskProcessedAt: Date | null;

  @Column({ nullable: true })
  riskJobKey: string | null;

  @VersionColumn()
  version: number;
}
