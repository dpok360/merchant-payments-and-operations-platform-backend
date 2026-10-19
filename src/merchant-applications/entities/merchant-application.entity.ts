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
import { User } from '../../users/entities/user.entity';
import { ApplicationStatus } from '../enums/application-status.enum';
import { RiskStatus } from '../enums/risk-status.enum';

@Entity('merchant_applications')
@Index(['creatorId'])
@Index(['status'])
@Index(['assignedReviewerId'])
export class MerchantApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  businessName: string;

  @Column({ type: 'varchar' })
  legalBusinessName: string;

  @Column({ type: 'varchar' })
  businessType: string;

  @Column({ type: 'varchar' })
  ownerFirstName: string;

  @Column({ type: 'varchar' })
  ownerLastName: string;

  @Column({ type: 'varchar' })
  ownerEmail: string;

  @Column({ type: 'varchar', nullable: true })
  ownerPhone: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  requestedMonthlyVolume: number | null;

  @Column({ type: 'varchar', nullable: true })
  businessWebsite: string | null;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.DRAFT })
  status: ApplicationStatus;

  @Column({ type: 'enum', enum: RiskStatus, default: RiskStatus.PENDING })
  riskStatus: RiskStatus;

  @Column({ type: 'int', nullable: true })
  riskScore: number | null;

  @Column({ type: 'jsonb', nullable: true })
  riskMetadata: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ type: 'uuid', name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_reviewer_id' })
  assignedReviewer: User | null;

  @Column({ type: 'uuid', name: 'assigned_reviewer_id', nullable: true })
  assignedReviewerId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  riskProcessedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  riskJobKey: string | null;

  @VersionColumn()
  version: number;
}
