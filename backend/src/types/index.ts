// ========================================
// TIPOS GLOBAIS - HELL AUTHENTICATOR
// ========================================
export type Environment = 'development' | 'production' | 'test';
export type TOTPAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';
export type TOTPDigits = 6 | 8;
export type TOTPPeriod = 15 | 30 | 60;
export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'pt-BR' | 'en-US' | 'es-ES';
export type NotificationType = 'push' | 'email' | 'sms';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'dropbox' | 'onedrive';
export type BackupType = 'local' | 'cloud' | 'manual';
export type SessionStatus = 'active' | 'expired' | 'revoked';
export type AccountStatus = 'active' | 'inactive' | 'archived';
export type UserRole = 'user' | 'admin' | 'premium';
export type BiometricType = 'fingerprint' | 'face' | 'touch';

// ========================================
// INTERFACES DE CONFIGURAÇÃO
// ========================================
export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  url: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  algorithm: 'HS512';
}

export interface EncryptionConfig {
  key: string;
}

export interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export interface MonitoringConfig {
  prometheusEnabled: boolean;
  prometheusPort: number;
  sentryDsn?: string;
}

export interface LogsConfig {
  level: string;
}

export interface CorsConfig {
  origins: string[];
}

export interface SecurityConfig {
  rateLimitMax: number;
  rateLimitWindow: string;
}

// ========================================
// INTERFACES DE REQUISIÇÃO
// ========================================
export interface LoginRequest {
  email: string;
  password: string;
  biometricToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
}

export interface CreateAccountRequest {
  name: string;
  issuer?: string;
  secret: string;
  algorithm?: TOTPAlgorithm;
  digits?: TOTPDigits;
  period?: TOTPPeriod;
  icon?: string;
  color?: string;
  metadata?: AccountMetadata;
}

export interface UpdateAccountRequest {
  name?: string;
  issuer?: string;
  algorithm?: TOTPAlgorithm;
  digits?: TOTPDigits;
  period?: TOTPPeriod;
  icon?: string;
  color?: string;
  metadata?: AccountMetadata;
}

export interface CreateBackupRequest {
  description: string;
  type: BackupType;
  cloudProvider?: CloudProvider;
  cloudPath?: string;
  retentionDays?: number;
}

export interface RestoreBackupRequest {
  password: string;
}

// ========================================
// INTERFACES DE RESPOSTA
// ========================================
export interface LoginResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isPremium: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AccountResponse {
  id: string;
  name: string;
  issuer?: string;
  algorithm: TOTPAlgorithm;
  digits: TOTPDigits;
  period: TOTPPeriod;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
  icon?: string;
  color?: string;
  metadata?: AccountMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface BackupResponse {
  id: string;
  description: string;
  type: BackupType;
  cloudProvider?: CloudProvider;
  cloudPath?: string;
  size: number;
  checksum: string;
  version: string;
  createdAt: string;
  expiresAt: string;
}

// ========================================
// INTERFACES DE SAÚDE E MONITORAMENTO
// ========================================
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: Environment;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    aws: ServiceHealth;
  };
  system: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
}

export interface ServiceHealth {
  status: 'ok' | 'error';
  responseTime?: number;
  error?: string;
}

// ========================================
// INTERFACES DE PREFERÊNCIAS E METADADOS
// ========================================
export interface UserPreferences {
  theme: Theme;
  language: Language;
  notifications: NotificationSettings;
  security: SecuritySettings;
  backup: BackupSettings;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  newAccount: boolean;
  backupReminder: boolean;
  securityAlert: boolean;
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  biometricType?: BiometricType;
  pinEnabled: boolean;
  pinLength: number;
  autoLock: number; // minutos
  sessionTimeout: number; // minutos
}

export interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: number; // dias
  cloudProvider?: CloudProvider;
  encryptionEnabled: boolean;
  retentionDays: number;
}

export interface AccountMetadata {
  category?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, string>;
}

export interface DeviceInfo {
  type: DeviceType;
  os: string;
  version: string;
  browser?: string;
  browserVersion?: string;
  screenResolution?: string;
  timezone: string;
  language: string;
}

export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  ip: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ========================================
// INTERFACES DE ERRO E LOG
// ========================================
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

export interface MetricsData {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
  accounts: {
    total: number;
    active: number;
    averagePerUser: number;
  };
  backups: {
    total: number;
    successful: number;
    failed: number;
    totalSize: number;
  };
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
}

// ========================================
// INTERFACES DE AUTENTICAÇÃO
// ========================================
export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    isPremium: boolean;
  };
}

// ========================================
// TIPOS UTILITÁRIOS
// ========================================
export type NonNullable<T> = T extends null | undefined ? never : T;
