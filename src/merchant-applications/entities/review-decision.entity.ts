import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { MerchantApplication } from './merchant-application.entity.js';
import { Decision } from '../enums/decision.enum.js';

@Entity('review_decisions')
@Index(['applicationId'])
export class ReviewDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MerchantApplication, { nullable: false })
  @JoinColumn({ name: 'application_id' })
  application: MerchantApplication;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'actor_id' })
  actorId: string;

  @Column({ type: 'enum', enum: Decision })
  decision: Decision;

  @Column({ nullable: true, length: 2000 })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
