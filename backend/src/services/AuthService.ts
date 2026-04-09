import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { env } from '../config/environment';
import { Session } from '../models/Session';
import { User } from '../models/User';
import {
  AuthenticatedRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TokenResponse,
  UserResponse
} from '../types';
import { logger } from '../utils/logger';
import { LoginUserUseCase } from '../application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../application/use-cases/auth/RefreshTokenUseCase';
import { LogoutUserUseCase } from '../application/use-cases/auth/LogoutUserUseCase';
import { LogoutAllSessionsUseCase } from '../application/use-cases/auth/LogoutAllSessionsUseCase';
import { RedisSessionStore } from './RedisSessionStore';
import { SessionRecord, SessionStore } from './SessionStore';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private sessionRepository = AppDataSource.getRepository(Session);
  private sessionStore: SessionStore;
  private loginUserUseCase: LoginUserUseCase;
  private refreshTokenUseCase: RefreshTokenUseCase;
  private logoutUserUseCase: LogoutUserUseCase;
  private logoutAllSessionsUseCase: LogoutAllSessionsUseCase;

  constructor(sessionStore: SessionStore = new RedisSessionStore()) {
    this.sessionStore = sessionStore;
    this.loginUserUseCase = new LoginUserUseCase({
      login: this.loginCore.bind(this)
    });
    this.refreshTokenUseCase = new RefreshTokenUseCase({
      refreshToken: this.refreshTokenCore.bind(this)
    });
    this.logoutUserUseCase = new LogoutUserUseCase({
      logout: this.logoutCore.bind(this)
    });
    this.logoutAllSessionsUseCase = new LogoutAllSessionsUseCase({
      logoutAll: this.logoutAllCore.bind(this)
    });
  }

  async register(data: RegisterRequest): Promise<UserResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const passwordHash = await hash(data.password, 12);

    const user = this.userRepository.create({
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      isActive: true,
      isPremium: false,
      isEmailVerified: false,
      preferences: {
        theme: 'auto',
        language: 'pt-BR',
        notifications: {
          push: true,
          email: true,
          sms: false,
          newAccount: true,
          backupReminder: true,
          securityAlert: true
        },
        security: {
          biometricEnabled: false,
          pinEnabled: false,
          pinLength: 6,
          autoLock: 5,
          sessionTimeout: 30
        },
        backup: {
          autoBackup: false,
          backupFrequency: 7,
          encryptionEnabled: true,
          retentionDays: 30
        }
      }
    });

    await this.userRepository.save(user);

    return this.userToResponse(user);
  }

  async login(data: LoginRequest, ipAddress: string, userAgent: string): Promise<LoginResponse> {
    return this.loginUserUseCase.execute({
      data,
      ipAddress,
      userAgent
    });
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.refreshTokenUseCase.execute({ refreshToken });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.logoutUserUseCase.execute({ refreshToken });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.logoutAllSessionsUseCase.execute({ userId });
  }

  private async logoutCore(refreshToken: string): Promise<void> {
    await this.sessionStore.revoke(refreshToken, 'User logout');

    try {
      const session = await this.sessionRepository.findOne({
        where: { refreshToken }
      });

      if (session) {
        session.revoke('User logout');
        await this.sessionRepository.save(session);
      }
    } catch (error) {
      logger.warn('Failed to persist logout in audit session store', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async logoutAllCore(userId: string): Promise<void> {
    await this.sessionStore.revokeAllByUser(userId, 'Logout all sessions');

    try {
      const sessions = await this.sessionRepository.find({
        where: { userId, isActive: true }
      });

      for (const session of sessions) {
        session.revoke('Logout all sessions');
      }

      if (sessions.length > 0) {
        await this.sessionRepository.save(sessions);
      }
    } catch (error) {
      logger.warn('Failed to persist logout-all in audit session store', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async validateToken(token: string): Promise<AuthenticatedRequest['user']> {
    try {
      const decoded = verify(token, env.JWT.secret, {
        algorithms: [env.JWT.algorithm]
      }) as { userId: string };

      const user = await this.userRepository.findOne({
        where: { id: decoded.userId, isActive: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        isPremium: user.isPremium
      };
    } catch {
      throw new Error('Invalid token');
    }
  }

  private async loginCore(data: LoginRequest, ipAddress: string, userAgent: string): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { email: data.email.toLowerCase() }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    if (user.isLocked()) {
      throw new Error('Account is temporarily locked');
    }

    const isPasswordValid = await compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      user.incrementLoginAttempts();
      await this.userRepository.save(user);
      throw new Error('Invalid credentials');
    }

    user.resetLoginAttempts();
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user.id);

    await this.createSession(user.id, tokens.accessToken, tokens.refreshToken, ipAddress, userAgent);

    return {
      user: this.userToResponse(user),
      tokens
    };
  }

  private async refreshTokenCore(refreshToken: string): Promise<TokenResponse> {
    const session = await this.sessionStore.findByRefreshToken(refreshToken);

    if (!session || !this.isSessionValid(session)) {
      throw new Error('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: session.userId, isActive: true }
    });

    if (!user) {
      throw new Error('User account is disabled');
    }

    const tokens = await this.generateTokens(session.userId);

    const rotatedSession: SessionRecord = {
      ...session,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      lastUsedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.parseExpiration(env.JWT.refreshExpiresIn) * 1000).toISOString(),
      isActive: true,
      revokedAt: undefined,
      revokedReason: undefined
    };

    await this.sessionStore.rotateRefreshToken(refreshToken, rotatedSession);
    await this.syncAuditSessionOnRefresh(refreshToken, tokens.refreshToken, tokens.accessToken);

    return tokens;
  }

  private async generateTokens(userId: string): Promise<TokenResponse> {
    const accessTokenExpiresIn = this.parseExpiration(env.JWT.expiresIn);
    const refreshTokenExpiresIn = this.parseExpiration(env.JWT.refreshExpiresIn);

    const accessToken = sign(
      { userId },
      env.JWT.secret,
      { expiresIn: accessTokenExpiresIn, algorithm: env.JWT.algorithm }
    );

    const refreshToken = sign(
      { userId, type: 'refresh' },
      env.JWT.secret,
      { expiresIn: refreshTokenExpiresIn, algorithm: env.JWT.algorithm }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn,
      tokenType: 'Bearer'
    };
  }

  private async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + this.parseExpiration(env.JWT.refreshExpiresIn) * 1000);

    const sessionRecord: SessionRecord = {
      userId,
      refreshToken,
      accessToken,
      ipAddress,
      userAgent,
      deviceType: this.detectDeviceType(userAgent),
      browser: this.detectBrowser(userAgent),
      os: this.detectOS(userAgent),
      location: 'Unknown',
      isActive: true,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await this.sessionStore.create(sessionRecord);

    try {
      const auditSession = this.sessionRepository.create({
        userId,
        refreshToken,
        accessToken,
        ipAddress,
        userAgent,
        deviceType: sessionRecord.deviceType,
        browser: sessionRecord.browser,
        os: sessionRecord.os,
        location: sessionRecord.location,
        expiresAt
      });

      await this.sessionRepository.save(auditSession);
    } catch (error) {
      logger.warn('Failed to persist session in audit store', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async syncAuditSessionOnRefresh(
    previousRefreshToken: string,
    nextRefreshToken: string,
    accessToken: string
  ): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { refreshToken: previousRefreshToken }
      });

      if (!session) {
        return;
      }

      session.refreshToken = nextRefreshToken;
      session.accessToken = accessToken;
      session.updateLastUsed();
      await this.sessionRepository.save(session);
    } catch (error) {
      logger.warn('Failed to sync refreshed token in audit store', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private isSessionValid(session: SessionRecord): boolean {
    if (!session.isActive) {
      return false;
    }

    if (session.revokedAt) {
      return false;
    }

    return new Date(session.expiresAt) > new Date();
  }

  private userToResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isPremium: user.isPremium,
      preferences: user.preferences,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  private detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const ua = userAgent.toLowerCase();

    if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
      return 'mobile';
    }

    if (/tablet|ipad/i.test(ua)) {
      return 'tablet';
    }

    return 'desktop';
  }

  private detectBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';

    return 'Unknown';
  }

  private detectOS(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios')) return 'iOS';

    return 'Unknown';
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}


