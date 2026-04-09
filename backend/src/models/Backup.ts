import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity('backups')
@Index(['userId', 'createdAt'])
export class Backup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  data!: string; // Encrypted data

  @Column({ type: 'varchar', length: 50 })
  version!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: 'local' | 'cloud' | 'manual';

  @Column({ type: 'varchar', length: 20, nullable: true })
  cloudProvider!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cloudPath!: string | null;

  @Column({ type: 'bigint' })
  size!: number;

  @Column({ type: 'varchar', length: 64 })
  checksum!: string;

  @Column({ type: 'boolean', default: true })
  isEncrypted!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => User, user => user.backups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  getSizeInMB(): number {
    return Math.round((this.size / (1024 * 1024)) * 100) / 100;
  }

  getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  toJSON(): Partial<Backup> {
    return Object.fromEntries(Object.entries(this).filter(([key]) => key !== 'data')) as Partial<Backup>;
  }
}

