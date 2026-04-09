import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User';

@Entity('user_cloud_connections')
@Index(['userId', 'provider'], { unique: true })
export class UserCloudConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  provider!: 'google-drive';

  @Column({ type: 'varchar', length: 30, default: 'connected' })
  status!: 'connected' | 'error' | 'disconnected';

  @Column({ type: 'text', nullable: true })
  encryptedAccessToken!: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedRefreshToken!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountEmail!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalAccountId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt!: Date | null;

  @Column({ type: 'jsonb', default: [] })
  scopes!: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.cloudConnections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
