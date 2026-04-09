import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('accounts')
@Index(['userId', 'name'], { unique: true })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  issuer!: string | null;

  @Column({ type: 'text' })
  secret!: string; // Encrypted secret

  @Column({ type: 'varchar', length: 10, default: 'SHA1' })
  algorithm!: 'SHA1' | 'SHA256' | 'SHA512';

  @Column({ type: 'int', default: 6 })
  digits!: 6 | 8;

  @Column({ type: 'int', default: 30 })
  period!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon!: string | null; // URL do icone ou nome do icone

  @Column({ type: 'varchar', length: 7, nullable: true })
  color!: string | null; // Cor do icone

  @Column({ type: 'text', nullable: true })
  metadata!: string | null; // Encrypted metadata JSON

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, user => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  incrementUsage(): void {
    this.usageCount++;
    this.lastUsedAt = new Date();
  }

  getDisplayName(): string {
    return this.issuer ? `${this.issuer} (${this.name})` : this.name;
  }

  toJSON(): Partial<Account> {
    return Object.fromEntries(Object.entries(this).filter(([key]) => key !== 'secret')) as Partial<Account>;
  }

  getBackupData(): Partial<Account> {
    return {
      name: this.name,
      issuer: this.issuer ?? undefined,
      secret: this.secret,
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period,
      icon: this.icon ?? undefined,
      color: this.color ?? undefined,
      metadata: this.metadata ?? undefined,
      isActive: this.isActive
    };
  }
}

