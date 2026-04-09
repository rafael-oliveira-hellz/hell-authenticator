import { compare } from 'bcrypt';
import { createHash } from 'crypto';
import { LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { Backup } from '../models/Backup';
import { User } from '../models/User';
import {
    BackupResponse,
    CloudProviderResponse,
    CloudProvider,
    CreateBackupRequest,
    RestoreBackupRequest
} from '../types';
import { CreateBackupUseCase } from '../application/use-cases/backup/CreateBackupUseCase';
import { RestoreBackupUseCase } from '../application/use-cases/backup/RestoreBackupUseCase';
import { AccountService } from './AccountService';
import { CloudBackupProviderRegistry } from './cloud/CloudBackupProviderRegistry';
import { EncryptionService } from './EncryptionService';
import { logger } from '../utils/logger';

export class BackupService {
  private backupRepository = AppDataSource.getRepository(Backup);
  private userRepository = AppDataSource.getRepository(User);
  private accountRepository = AppDataSource.getRepository(Account);
  private encryptionService = new EncryptionService();
  private accountService = new AccountService();
  private createBackupUseCase: CreateBackupUseCase;
  private restoreBackupUseCase: RestoreBackupUseCase;
  private cloudProviderRegistry = new CloudBackupProviderRegistry();

  constructor() {
    this.createBackupUseCase = new CreateBackupUseCase({
      createBackup: this.createBackupCore.bind(this)
    });

    this.restoreBackupUseCase = new RestoreBackupUseCase({
      restoreBackup: this.restoreBackupCore.bind(this)
    });
  }

  /**
   * Lista todos os backups de um usuario
   */
  async listBackups(userId: string): Promise<BackupResponse[]> {
    const backups = await this.backupRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' }
    });

    return backups.map(backup => this.backupToResponse(backup));
  }

  /**
   * Obtem um backup especifico
   */
  async getBackup(userId: string, backupId: string): Promise<BackupResponse> {
    const backup = await this.backupRepository.findOne({
      where: { id: backupId, userId, isActive: true }
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    return this.backupToResponse(backup);
  }

  /**
   * Cria um novo backup
   */
  async createBackup(userId: string, data: CreateBackupRequest): Promise<BackupResponse> {
    return this.createBackupUseCase.execute({ userId, data });
  }

  async listCloudProviders(): Promise<CloudProviderResponse[]> {
    const providers = await this.cloudProviderRegistry.list();
    return providers.filter((provider) => provider.id === 'gcp');
  }

  /**
   * Restaura um backup
   */
  async restoreBackup(
    userId: string,
    backupId: string,
    data: RestoreBackupRequest
  ): Promise<{
    restoredAccounts: number;
    skippedAccounts: number;
  }> {
    return this.restoreBackupUseCase.execute({ userId, backupId, data });
  }

  /**
   * Remove um backup
   */
  async deleteBackup(userId: string, backupId: string): Promise<void> {
    const backup = await this.backupRepository.findOne({
      where: { id: backupId, userId, isActive: true }
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (backup.type === 'cloud' && backup.cloudProvider && backup.cloudPath) {
      await this.deleteFromCloud(backup.cloudProvider as CloudProvider, backup.cloudPath, backup.id, userId);
    }

    backup.isActive = false;
    await this.backupRepository.save(backup);
  }

  /**
   * Faz upload de backup para cloud storage
   */
  async uploadToCloud(
    userId: string,
    backupId: string,
    cloudProvider: CloudProvider,
    cloudPath: string
  ): Promise<void> {
    const backup = await this.backupRepository.findOne({
      where: { id: backupId, userId, isActive: true }
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    const provider = this.cloudProviderRegistry.get(cloudProvider);
    const resolvedCloudPath = cloudPath.trim() || provider.buildDefaultPath({
      userId,
      backupId: backup.id,
      createdAt: backup.createdAt
    });

    try {
      await provider.upload({
        userId,
        backupId: backup.id,
        data: backup.data,
        cloudPath: resolvedCloudPath
      });
    } catch (error) {
      throw this.wrapCloudProviderError('upload', provider.descriptor.label, error);
    }

    backup.cloudProvider = cloudProvider;
    backup.cloudPath = resolvedCloudPath;
    backup.type = 'cloud';
    await this.backupRepository.save(backup);
  }

  /**
   * Faz download de backup da cloud storage
   */
  async downloadFromCloud(userId: string, backupId: string): Promise<string> {
    const backup = await this.backupRepository.findOne({
      where: { id: backupId, userId, isActive: true }
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (!backup.cloudProvider || !backup.cloudPath) {
      throw new Error('Backup is not stored in cloud');
    }

    const provider = this.cloudProviderRegistry.get(backup.cloudProvider as CloudProvider);

    try {
      return await provider.download({
        userId,
        backupId: backup.id,
        cloudPath: backup.cloudPath
      });
    } catch (error) {
      throw this.wrapCloudProviderError('download', provider.descriptor.label, error);
    }
  }

  /**
   * Remove backup da cloud storage
   */
  private async deleteFromCloud(cloudProvider: CloudProvider, cloudPath: string, backupId?: string, userId?: string): Promise<void> {
    const provider = this.cloudProviderRegistry.get(cloudProvider);

    try {
      await provider.delete({
        userId: userId || 'unknown',
        backupId: backupId || 'unknown',
        cloudPath
      });
    } catch (error) {
      throw this.wrapCloudProviderError('delete', provider.descriptor.label, error);
    }
  }

  /**
   * Limpa backups expirados do usuario
   */
  async cleanupExpiredBackups(userId: string): Promise<number> {
    const expiredBackups = await this.backupRepository.find({
      where: {
        userId,
        isActive: true,
        expiresAt: LessThan(new Date())
      }
    });

    let deletedCount = 0;

    for (const backup of expiredBackups) {
      try {
        await this.deleteBackup(backup.userId, backup.id);
        deletedCount++;
      } catch (error) {
        logger.error('Failed to delete expired backup', { backupId: backup.id, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return deletedCount;
  }

  /**
   * Obtem estatisticas dos backups do usuario
   */
  async getBackupStats(userId: string): Promise<{
    total: number;
    totalSize: number;
    cloudBackups: number;
    localBackups: number;
    expiredBackups: number;
  }> {
    const backups = await this.backupRepository.find({
      where: { userId, isActive: true }
    });

    const total = backups.length;
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const cloudBackups = backups.filter(b => b.type === 'cloud').length;
    const localBackups = backups.filter(b => b.type === 'local').length;
    const expiredBackups = backups.filter(b => b.isExpired()).length;

    return {
      total,
      totalSize,
      cloudBackups,
      localBackups,
      expiredBackups
    };
  }

  private async createBackupCore(userId: string, data: CreateBackupRequest): Promise<BackupResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    this.validateBackupData(data);

    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true }
    });

    if (accounts.length === 0) {
      throw new Error('No accounts to backup');
    }

    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        preferences: user.preferences
      },
      accounts: await Promise.all(
        accounts.map(async account => {
          return await this.accountService.getDecryptedBackupData(userId, account.id);
        })
      )
    };

    const encryptedData = this.encryptionService.encryptBackupData(backupData);
    const checksum = createHash('sha256').update(encryptedData).digest('hex');
    const size = Buffer.byteLength(encryptedData, 'utf8');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.retentionDays || 30));

    const backup = this.backupRepository.create({
      userId,
      data: encryptedData,
      version: backupData.version,
      description: data.description,
      type: data.type,
      cloudProvider: data.cloudProvider,
      cloudPath: data.cloudPath,
      size,
      checksum,
      isEncrypted: true,
      expiresAt,
      isActive: true
    });

    await this.backupRepository.save(backup);

    if (data.type === 'cloud' && data.cloudProvider) {
      const provider = this.cloudProviderRegistry.get(data.cloudProvider);
      const resolvedCloudPath = data.cloudPath?.trim() || provider.buildDefaultPath({
        userId,
        backupId: backup.id,
        createdAt: backup.createdAt
      });

      try {
        await provider.upload({
          userId,
          backupId: backup.id,
          data: encryptedData,
          cloudPath: resolvedCloudPath
        });
      } catch (error) {
        throw this.wrapCloudProviderError('upload', provider.descriptor.label, error);
      }

      backup.cloudProvider = data.cloudProvider;
      backup.cloudPath = resolvedCloudPath;
      await this.backupRepository.save(backup);
    }

    return this.backupToResponse(backup);
  }

  private async restoreBackupCore(
    userId: string,
    backupId: string,
    data: RestoreBackupRequest
  ): Promise<{
    restoredAccounts: number;
    skippedAccounts: number;
  }> {
    const backup = await this.backupRepository.findOne({
      where: { id: backupId, userId, isActive: true }
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (backup.isExpired()) {
      throw new Error('Backup has expired');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    const backupData = this.encryptionService.decryptBackupData(backup.data);

    if (!backupData.accounts || !Array.isArray(backupData.accounts)) {
      throw new Error('Invalid backup data structure');
    }

    let restoredAccounts = 0;
    let skippedAccounts = 0;

    for (const accountData of backupData.accounts as Array<Partial<Account>>) {
      try {
        await this.accountService.restoreFromBackup(userId, accountData);
        restoredAccounts++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          skippedAccounts++;
        } else {
          throw error;
        }
      }
    }

    return {
      restoredAccounts,
      skippedAccounts
    };
  }

  /**
   * Valida dados de um backup
   */
  private validateBackupData(data: CreateBackupRequest): void {
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Backup description is required');
    }

    if (!data.type || !['local', 'cloud', 'manual'].includes(data.type)) {
      throw new Error('Invalid backup type. Must be local, cloud, or manual');
    }

    if (data.type === 'cloud') {
      if (data.cloudProvider !== 'gcp') {
        throw new Error('Invalid cloud provider. Internal cloud backups must use gcp');
      }
      if (data.cloudPath && data.cloudPath.trim().length === 0) {
        throw new Error('Cloud path cannot be empty when provided');
      }
    }

    if (data.retentionDays && (data.retentionDays < 1 || data.retentionDays > 365)) {
      throw new Error('Retention days must be between 1 and 365');
    }
  }

  /**
   * Converte backup para resposta da API
   */
  private backupToResponse(backup: Backup): BackupResponse {
    return {
      id: backup.id,
      description: backup.description,
      type: backup.type,
      cloudProvider: backup.cloudProvider as CloudProvider | undefined,
      cloudPath: backup.cloudPath ?? undefined,
      size: backup.size,
      checksum: backup.checksum,
      version: backup.version,
      createdAt: backup.createdAt.toISOString(),
      expiresAt: backup.expiresAt.toISOString()
    };
  }

  private wrapCloudProviderError(
    operation: 'upload' | 'download' | 'delete',
    providerLabel: string,
    error: unknown
  ): Error {
    const action = operation === 'upload'
      ? 'upload backup to'
      : operation === 'download'
        ? 'download backup from'
        : 'delete backup from';

    logger.error('Cloud backup provider operation failed', {
      operation,
      provider: providerLabel,
      error: error instanceof Error ? error.message : String(error)
    });

    return new Error(`Failed to ${action} ${providerLabel}`);
  }
}
