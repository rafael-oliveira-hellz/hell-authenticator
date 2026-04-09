import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity('sessions')
@Index(['refreshToken'], { unique: true })
@Index(['userId', 'createdAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  refreshToken!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accessToken!: string | null;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'varchar', length: 20 })
  deviceType!: 'mobile' | 'tablet' | 'desktop';

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  revokedReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isValid(): boolean {
    return this.isActive && !this.isExpired() && !this.isRevoked();
  }

  revoke(reason?: string): void {
    this.isActive = false;
    this.revokedAt = new Date();
    this.revokedReason = reason || 'Manual revocation';
  }

  updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }

  getDeviceInfo(): string {
    const parts: string[] = [];
    if (this.browser) parts.push(this.browser);
    if (this.os) parts.push(this.os);
    if (this.deviceType) parts.push(this.deviceType);
    return parts.join(' - ') || 'Unknown device';
  }

  toJSON(): Partial<Session> {
    return Object.fromEntries(
      Object.entries(this).filter(([key]) => key !== 'refreshToken' && key !== 'accessToken')
    ) as Partial<Session>;
  }
}


