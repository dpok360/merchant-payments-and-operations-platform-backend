import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MerchantApplication } from './merchant-application.entity';
import { Decision } from '../enums/decision.enum';

@Entity('review_decisions')
@Index(['applicationId'])
export class ReviewDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MerchantApplication, { nullable: false })
  @JoinColumn({ name: 'application_id' })
  application: MerchantApplication;

  @Column({ type: 'uuid', name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'uuid', name: 'actor_id' })
  actorId: string;

  @Column({ type: 'enum', enum: Decision })
  decision: Decision;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
