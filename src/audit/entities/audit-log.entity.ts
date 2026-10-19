import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../enums/audit-action.enum.js';

@Entity('audit_logs')
@Index(['actorId'])
@Index(['applicationId'])
@Index(['action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
