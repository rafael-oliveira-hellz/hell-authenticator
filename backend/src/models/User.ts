import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Account } from './Account';
import { Backup } from './Backup';
import { Session } from './Session';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isPremium!: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  loginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  preferences!: {
    theme: 'light' | 'dark' | 'auto';
    language: 'pt-BR' | 'en-US' | 'es-ES';
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
      newAccount: boolean;
      backupReminder: boolean;
      securityAlert: boolean;
    };
    security: {
      biometricEnabled: boolean;
      biometricType?: 'fingerprint' | 'face' | 'touch';
      pinEnabled: boolean;
      pinLength: number;
      autoLock: number;
      sessionTimeout: number;
    };
    backup: {
      autoBackup: boolean;
      backupFrequency: number;
      cloudProvider?: 'aws' | 'gcp' | 'azure' | 'dropbox' | 'onedrive';
      encryptionEnabled: boolean;
      retentionDays: number;
    };
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Account, account => account.user, { cascade: true })
  accounts!: Account[];

  @OneToMany(() => Backup, backup => backup.user, { cascade: true })
  backups!: Backup[];

  @OneToMany(() => Session, session => session.user, { cascade: true })
  sessions!: Session[];

  isLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  canLogin(): boolean {
    return this.isActive && !this.isLocked();
  }

  incrementLoginAttempts(): void {
    this.loginAttempts++;
    if (this.loginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockedUntil = null;
  }

  toJSON(): Partial<User> {
    return Object.fromEntries(
      Object.entries(this).filter(([key]) => key !== 'passwordHash' && key !== 'emailVerificationToken')
    ) as Partial<User>;
  }
}


