import { AppDataSource } from '../config/database';
import { UserCloudConnection } from '../models/UserCloudConnection';
import {
  ConnectUserCloudProviderRequest,
  UserCloudConnectionResponse,
  UserCloudProvider,
} from '../types';
import { EncryptionService } from './EncryptionService';

export class UserCloudConnectionService {
  private readonly connectionRepository = AppDataSource.getRepository(UserCloudConnection);
  private readonly encryptionService = new EncryptionService();

  async listConnections(userId: string): Promise<UserCloudConnectionResponse[]> {
    const connections = await this.connectionRepository.find({
      where: { userId },
      order: { provider: 'ASC' },
    });

    return connections.map((connection) => this.toResponse(connection));
  }

  async connectProvider(userId: string, payload: ConnectUserCloudProviderRequest): Promise<UserCloudConnectionResponse> {
    if (!payload.accessToken || payload.accessToken.trim().length === 0) {
      throw new Error('Access token is required');
    }

    const existingConnection = await this.connectionRepository.findOne({
      where: {
        userId,
        provider: payload.provider,
      },
    });

    const connection = existingConnection ?? this.connectionRepository.create({
      userId,
      provider: payload.provider,
    });

    connection.status = 'connected';
    connection.encryptedAccessToken = this.encryptionService.encrypt(payload.accessToken.trim());
    connection.encryptedRefreshToken = payload.refreshToken?.trim()
      ? this.encryptionService.encrypt(payload.refreshToken.trim())
      : null;
    connection.accountEmail = payload.accountEmail?.trim() || null;
    connection.externalAccountId = payload.externalAccountId?.trim() || null;
    connection.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    connection.lastVerifiedAt = new Date();
    connection.scopes = payload.scopes ?? [];
    connection.metadata = payload.metadata ?? {};

    await this.connectionRepository.save(connection);
    return this.toResponse(connection);
  }

  async disconnectProvider(userId: string, provider: UserCloudProvider): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: {
        userId,
        provider,
      },
    });

    if (!connection) {
      throw new Error('User cloud connection not found');
    }

    connection.status = 'disconnected';
    connection.encryptedAccessToken = null;
    connection.encryptedRefreshToken = null;
    connection.expiresAt = null;
    connection.lastVerifiedAt = null;
    await this.connectionRepository.save(connection);
  }

  private toResponse(connection: UserCloudConnection): UserCloudConnectionResponse {
    return {
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      accountEmail: connection.accountEmail ?? undefined,
      externalAccountId: connection.externalAccountId ?? undefined,
      expiresAt: connection.expiresAt?.toISOString(),
      lastVerifiedAt: connection.lastVerifiedAt?.toISOString(),
      scopes: connection.scopes ?? [],
      metadata: connection.metadata ?? {},
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }
}
