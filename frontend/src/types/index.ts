// ========================================
// TIPOS GLOBAIS - HELL AUTHENTICATOR FRONTEND
// ========================================

export type Environment = 'development' | 'production' | 'test';
export type TOTPAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';
export type TOTPDigits = 6 | 8;
export type TOTPPeriod = 15 | 30 | 60;
export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'pt-BR' | 'en-US' | 'es-ES';
export type BiometricType = 'fingerprint' | 'face' | 'touch';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type CloudProvider = 'gcp';
export type UserCloudProvider = 'google-drive';
export type BackupType = 'local' | 'cloud' | 'manual';
export type AccountStatus = 'active' | 'inactive' | 'archived';
export type UserCloudConnectionStatus = 'connected' | 'error' | 'disconnected';

// ========================================
// INTERFACES DE AUTENTICAÇÃO
// ========================================

export interface LoginCredentials {
  email: string;
  password: string;
  biometricToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isPremium: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

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

// ========================================
// INTERFACES DE CONTA TOTP
// ========================================

export interface Account {
  id: string;
  name: string;
  issuer?: string;
  secret: string;
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

export interface AccountMetadata {
  category?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, string>;
}

export interface CreateAccountData {
  name: string;
  issuer?: string;
  secret?: string;
  algorithm?: TOTPAlgorithm;
  digits?: TOTPDigits;
  period?: TOTPPeriod;
  icon?: string;
  color?: string;
  metadata?: AccountMetadata;
}

export interface UpdateAccountData {
  name?: string;
  issuer?: string;
  algorithm?: TOTPAlgorithm;
  digits?: TOTPDigits;
  period?: TOTPPeriod;
  icon?: string;
  color?: string;
  metadata?: AccountMetadata;
}

export interface TOTPCode {
  code: string;
  remainingTime: number;
  period: TOTPPeriod;
  expiresAt: Date;
}

// ========================================
// INTERFACES DE BACKUP
// ========================================

export interface Backup {
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

export interface CloudProviderInfo {
  id: CloudProvider;
  label: string;
  description: string;
  authMode: 'access-key' | 'bearer-token' | 'sas-token';
  connectionStatus: 'connected' | 'not-configured';
  verificationStatus: 'verified' | 'failed' | 'skipped';
  verificationMessage?: string;
  lastVerifiedAt?: string;
  supportsAutomaticSetup: boolean;
  supportsCustomPath: boolean;
  requiredEnvVars: string[];
  setupInstructions: string[];
}

export interface UserCloudConnection {
  id: string;
  provider: UserCloudProvider;
  status: UserCloudConnectionStatus;
  accountEmail?: string;
  externalAccountId?: string;
  expiresAt?: string;
  lastVerifiedAt?: string;
  scopes: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectUserCloudProviderData {
  provider: UserCloudProvider;
  accessToken: string;
  refreshToken?: string;
  accountEmail?: string;
  externalAccountId?: string;
  expiresAt?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface StartUserCloudOAuthData {
  provider: UserCloudProvider;
  successRedirectUri?: string;
  errorRedirectUri?: string;
}

export interface StartUserCloudOAuthResult {
  provider: UserCloudProvider;
  authorizationUrl: string;
}

export interface CreateBackupData {
  description: string;
  type: BackupType;
  cloudProvider?: CloudProvider;
  cloudPath?: string;
  retentionDays?: number;
}

export interface RestoreBackupData {
  password: string;
}

// ========================================
// INTERFACES DE NAVEGAÇÃO
// ========================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Splash: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  BiometricSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Accounts: undefined;
  Scanner: undefined;
  Backup: undefined;
  Settings: undefined;
};

export type AccountStackParamList = {
  AccountList: undefined;
  AccountDetail: { accountId: string };
  AddAccount: { qrData?: QRCodeData } | undefined;
  EditAccount: { accountId: string };
  QRScanner: undefined;
  ManualEntry: undefined;
};

export type BackupStackParamList = {
  BackupList: undefined;
  BackupDetail: { backupId: string };
  CreateBackup: undefined;
  RestoreBackup: { backupId: string };
  CloudSettings:
    | {
        oauthStatus?: 'connected' | 'error';
        provider?: UserCloudProvider;
        message?: string;
        accountEmail?: string;
      }
    | undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Security: undefined;
  Notifications: undefined;
  Backup: undefined;
  About: undefined;
};

// ========================================
// INTERFACES DE ESTADO
// ========================================

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricEnabled: boolean;
  biometricType: BiometricType | null;
}

export interface AccountState {
  accounts: Account[];
  selectedAccount: Account | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterCategory: string | null;
  sortBy: 'name' | 'issuer' | 'lastUsed' | 'usageCount';
  sortOrder: 'asc' | 'desc';
}

export interface BackupState {
  backups: Backup[];
  selectedBackup: Backup | null;
  isLoading: boolean;
  error: string | null;
  autoBackupEnabled: boolean;
  lastBackupDate: string | null;
}

export interface AppState {
  theme: Theme;
  language: Language;
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// ========================================
// INTERFACES DE API
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

// ========================================
// INTERFACES DE DISPOSITIVO
// ========================================

export interface DeviceInfo {
  id: string;
  name: string;
  brand: string;
  model: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  uniqueId: string;
  isTablet: boolean;
  isEmulator: boolean;
}

export interface NetworkInfo {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isWifi: boolean;
  isCellular: boolean;
}

// ========================================
// INTERFACES DE PERMISSÕES
// ========================================

export interface PermissionStatus {
  camera: 'granted' | 'denied' | 'blocked' | 'unavailable';
  biometrics: 'granted' | 'denied' | 'blocked' | 'unavailable';
  notifications: 'granted' | 'denied' | 'blocked' | 'unavailable';
  storage: 'granted' | 'denied' | 'blocked' | 'unavailable';
}

// ========================================
// INTERFACES DE QR CODE
// ========================================

export interface QRCodeData {
  type: 'totp' | 'hotp' | 'steam';
  label: string;
  issuer?: string;
  secret: string;
  algorithm?: TOTPAlgorithm;
  digits?: TOTPDigits;
  period?: TOTPPeriod;
  counter?: number;
}

export interface ScannedQRCode {
  data: string;
  type: 'totp' | 'hotp' | 'steam' | 'unknown';
  isValid: boolean;
  parsedData?: QRCodeData;
  error?: string;
}

// ========================================
// INTERFACES DE CRIPTOGRAFIA
// ========================================

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  authTag: string;
  isValid: boolean;
}

export interface DecryptionResult {
  decrypted: string;
  isValid: boolean;
}

// ========================================
// INTERFACES DE CONFIGURAÇÃO
// ========================================

export interface AppConfig {
  apiUrl: string;
  environment: Environment;
  version: string;
  buildNumber: string;
  debug: boolean;
  analytics: boolean;
  crashlytics: boolean;
}

export interface FeatureFlags {
  biometricAuth: boolean;
  cloudBackup: boolean;
  pushNotifications: boolean;
  analytics: boolean;
  betaFeatures: boolean;
}

// ========================================
// TIPOS UTILITÁRIOS
// ========================================

export type NonNullable<T> = T extends null | undefined ? never : T;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

