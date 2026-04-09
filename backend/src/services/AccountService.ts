import { randomBytes } from 'crypto';
import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { User } from '../models/User';
import {
    AccountMetadata,
    AccountResponse,
    CreateAccountRequest,
    TOTPPeriod,
    UpdateAccountRequest
} from '../types';
import { CreateAccountUseCase } from '../application/use-cases/accounts/CreateAccountUseCase';
import {
  AccountBackupDataResponse,
  GetAccountBackupDataUseCase
} from '../application/use-cases/accounts/GetAccountBackupDataUseCase';
import { EncryptionService } from './EncryptionService';

export class AccountService {
  private accountRepository = AppDataSource.getRepository(Account);
  private userRepository = AppDataSource.getRepository(User);
  private encryptionService = new EncryptionService();
  private createAccountUseCase: CreateAccountUseCase;
  private getAccountBackupDataUseCase: GetAccountBackupDataUseCase;
  private readonly base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  constructor() {
    this.createAccountUseCase = new CreateAccountUseCase({
      createAccount: this.createAccountCore.bind(this)
    });

    this.getAccountBackupDataUseCase = new GetAccountBackupDataUseCase({
      getBackupData: this.getBackupDataCore.bind(this)
    });
  }

  /**
   * Lista todas as contas de um usuário
   */
  async listAccounts(userId: string): Promise<AccountResponse[]> {
    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true },
      order: { name: 'ASC' }
    });

    return accounts.map(account => this.accountToResponse(account));
  }

  /**
   * Obtém uma conta específica
   */
  async getAccount(userId: string, accountId: string): Promise<AccountResponse> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return this.accountToResponse(account);
  }

  /**
   * Cria uma nova conta TOTP
   */
  async createAccount(userId: string, data: CreateAccountRequest): Promise<AccountResponse> {
    return this.createAccountUseCase.execute({ userId, data });
  }

  /**
   * Atualiza uma conta existente
   */
  async updateAccount(
    userId: string,
    accountId: string,
    data: UpdateAccountRequest
  ): Promise<AccountResponse> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (data.name && data.name !== account.name) {
      const existingAccount = await this.accountRepository.findOne({
        where: { userId, name: data.name, isActive: true }
      });

      if (existingAccount) {
        throw new Error('Account with this name already exists');
      }
    }

    if (data.name) account.name = data.name;
    if (data.issuer !== undefined) account.issuer = data.issuer;
    if (data.algorithm) account.algorithm = data.algorithm;
    if (data.digits) account.digits = data.digits;
    if (data.period) account.period = data.period;
    if (data.icon !== undefined) account.icon = data.icon;
    if (data.color !== undefined) account.color = data.color;

    if (data.metadata !== undefined) {
      account.metadata = this.encryptionService.encrypt(JSON.stringify(data.metadata));
    }

    await this.accountRepository.save(account);

    return this.accountToResponse(account);
  }

  /**
   * Remove uma conta (soft delete)
   */
  async deleteAccount(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    account.isActive = false;
    await this.accountRepository.save(account);
  }

  /**
   * Incrementa o contador de uso de uma conta
   */
  async incrementUsage(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    account.incrementUsage();
    await this.accountRepository.save(account);
  }

  /**
   * Obtém dados de backup de uma conta para o CLIENTE (sem expor secret TOTP puro)
   */
  async getBackupData(userId: string, accountId: string): Promise<AccountBackupDataResponse> {
    return this.getAccountBackupDataUseCase.execute({ userId, accountId });
  }

  /**
   * Obtém dados de backup de uma conta PARA USO INTERNO DO BACKEND
   * (inclui secret TOTP descriptografado, nunca exposto diretamente na API)
   */
  async getDecryptedBackupData(userId: string, accountId: string): Promise<{
    name: string;
    issuer?: string;
    secret: string;
    algorithm: string;
    digits: number;
    period: number;
    icon?: string;
    color?: string;
    metadata?: AccountMetadata;
  }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const decryptedData = this.encryptionService.decryptAccountData({
      secret: account.secret,
      metadata: account.metadata ?? undefined
    });

    return {
      name: account.name,
      issuer: account.issuer ?? undefined,
      secret: decryptedData.secret,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      icon: account.icon ?? undefined,
      color: account.color ?? undefined,
      metadata: decryptedData.metadata
    };
  }

  /**
   * Restaura uma conta a partir de dados de backup
   */
  async restoreFromBackup(userId: string, backupData: Partial<Account>): Promise<AccountResponse> {
    if (!backupData.name || !backupData.secret) {
      throw new Error('Invalid backup data: name and secret are required');
    }

    const existingAccount = await this.accountRepository.findOne({
      where: { userId, name: backupData.name, isActive: true }
    });

    if (existingAccount) {
      throw new Error('Account with this name already exists');
    }

    let metadata: AccountMetadata | undefined;
    if (backupData.metadata) {
      if (typeof backupData.metadata === 'string') {
        try {
          metadata = JSON.parse(backupData.metadata) as AccountMetadata;
        } catch {
          metadata = undefined;
        }
      } else if (typeof backupData.metadata === 'object') {
        metadata = backupData.metadata as AccountMetadata;
      }
    }

    const encryptedData = this.encryptionService.encryptAccountData({
      secret: backupData.secret,
      metadata
    });

    const account = this.accountRepository.create({
      userId,
      name: backupData.name,
      issuer: backupData.issuer,
      secret: encryptedData.secret,
      algorithm: backupData.algorithm || 'SHA1',
      digits: backupData.digits || 6,
      period: backupData.period || 30,
      icon: backupData.icon,
      color: backupData.color,
      metadata: encryptedData.metadata,
      isActive: true,
      usageCount: 0
    });

    await this.accountRepository.save(account);

    return this.accountToResponse(account);
  }

  /**
   * Busca contas por nome ou issuer
   */
  async searchAccounts(userId: string, query: string): Promise<AccountResponse[]> {
    const accounts = await this.accountRepository
      .createQueryBuilder('account')
      .where('account.userId = :userId', { userId })
      .andWhere('account.isActive = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(account.name) LIKE LOWER(:query) OR LOWER(account.issuer) LIKE LOWER(:query))',
        { query: `%${query}%` }
      )
      .orderBy('account.name', 'ASC')
      .getMany();

    return accounts.map(account => this.accountToResponse(account));
  }

  /**
   * Obtém estatísticas das contas do usuário
   */
  async getAccountStats(userId: string): Promise<{
    total: number;
    active: number;
    totalUsage: number;
    mostUsed: AccountResponse | null;
  }> {
    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true }
    });

    const total = accounts.length;
    const active = accounts.filter(a => a.isActive).length;
    const totalUsage = accounts.reduce((sum, a) => sum + a.usageCount, 0);
    const mostUsed = accounts.length > 0
      ? this.accountToResponse(accounts.reduce((max, a) => a.usageCount > max.usageCount ? a : max))
      : null;

    return {
      total,
      active,
      totalUsage,
      mostUsed
    };
  }

  private async createAccountCore(userId: string, data: CreateAccountRequest): Promise<AccountResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    this.validateAccountData(data);

    const existingAccount = await this.accountRepository.findOne({
      where: { userId, name: data.name, isActive: true }
    });

    if (existingAccount) {
      throw new Error('Account with this name already exists');
    }

    const secret = data.secret ? data.secret.trim().toUpperCase() : this.generateSecret();

    const encryptedData = this.encryptionService.encryptAccountData({
      secret,
      metadata: data.metadata
    });

    const account = this.accountRepository.create({
      userId,
      name: data.name,
      issuer: data.issuer,
      secret: encryptedData.secret,
      algorithm: data.algorithm || 'SHA1',
      digits: data.digits || 6,
      period: data.period || 30,
      icon: data.icon,
      color: data.color,
      metadata: encryptedData.metadata,
      isActive: true,
      usageCount: 0
    });

    await this.accountRepository.save(account);

    return this.accountToResponse(account);
  }

  private async getBackupDataCore(userId: string, accountId: string): Promise<AccountBackupDataResponse> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      name: account.name,
      issuer: account.issuer ?? undefined,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      icon: account.icon ?? undefined,
      color: account.color ?? undefined,
      hasMetadata: !!account.metadata
    };
  }

  /**
   * Valida dados de uma conta
   */
  private validateAccountData(data: CreateAccountRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Account name is required');
    }

    if (data.secret) {
      const sanitizedSecret = data.secret.trim().toUpperCase();
      if (!/^[A-Z2-7]+=*$/.test(sanitizedSecret) || sanitizedSecret.length < 16) {
        throw new Error('Account secret must be valid Base32 with at least 16 characters');
      }
    }

    if (data.algorithm && !['SHA1', 'SHA256', 'SHA512'].includes(data.algorithm)) {
      throw new Error('Invalid algorithm. Must be SHA1, SHA256, or SHA512');
    }

    if (data.digits && ![6, 8].includes(data.digits)) {
      throw new Error('Invalid digits. Must be 6 or 8');
    }

    if (data.period && ![15, 30, 60].includes(data.period)) {
      throw new Error('Invalid period. Must be 15, 30, or 60 seconds');
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      throw new Error('Invalid color format. Must be a valid hex color (e.g., #FF0000)');
    }
  }

  /**
   * Converte conta para resposta da API
   */
  private accountToResponse(account: Account): AccountResponse {
    const decryptedData = this.encryptionService.decryptAccountData({
      secret: account.secret,
      metadata: account.metadata ?? undefined
    });

    return {
      id: account.id,
      name: account.name,
      issuer: account.issuer ?? undefined,
      secret: decryptedData.secret,
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period as TOTPPeriod,
      isActive: account.isActive,
      usageCount: account.usageCount,
      lastUsedAt: account.lastUsedAt?.toISOString(),
      icon: account.icon ?? undefined,
      color: account.color ?? undefined,
      metadata: decryptedData.metadata,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };
  }

  private generateSecret(length: number = 32): string {
    return Array.from(randomBytes(length), (value) => this.base32Alphabet[value % this.base32Alphabet.length]).join('');
  }
}
