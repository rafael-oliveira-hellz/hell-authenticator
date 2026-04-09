import { config } from 'dotenv';
import { logger } from '../utils/logger';
import {
  AwsConfig,
  CorsConfig,
  DatabaseConfig,
  EncryptionConfig,
  Environment,
  JwtConfig,
  LogsConfig,
  MonitoringConfig,
  RedisConfig,
  SecurityConfig
} from '../types';

// Carregar variáveis de ambiente
config();

interface EnvironmentConfig {
  // Configurações gerais
  NODE_ENV: Environment;
  PORT: number;
  HOST: string;
  
  // Banco de dados
  DATABASE: DatabaseConfig;
  
  // Redis
  REDIS: RedisConfig;
  
  // JWT
  JWT: JwtConfig;
  
  // Criptografia
  ENCRYPTION: EncryptionConfig;
  
  // AWS
  AWS: AwsConfig;
  
  // Monitoramento
  MONITORING: MonitoringConfig;
  
  // Logs
  LOGS: LogsConfig;
  
  // CORS
  CORS: CorsConfig;
  
  // Segurança
  SECURITY: SecurityConfig;
}

// Detectar se está rodando localmente
const isLocal = process.env.NODE_ENV === 'development' || 
                process.env.NODE_ENV === 'test' || 
                !process.env.NODE_ENV;

const normalizeEnvString = (value?: string): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

// Configuração baseada no ambiente
const getConfig = (): EnvironmentConfig => {
  if (isLocal) {
    // Configuração para desenvolvimento local (Docker)
    return {
      NODE_ENV: (process.env.NODE_ENV as Environment) || 'development',
      PORT: parseInt(process.env.PORT || '3000'),
      HOST: process.env.HOST || '0.0.0.0',
      
      DATABASE: {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'hell_auth_user',
        password: process.env.DB_PASSWORD || 'hell_auth_password',
        database: process.env.DB_NAME || 'hell_auth_dev',
        url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'hell_auth_user'}:${process.env.DB_PASSWORD || 'hell_auth_password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'hell_auth_dev'}`
      },
      
      REDIS: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'hell_auth_redis_password',
        url: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD || 'hell_auth_redis_password'}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
      },
      
      JWT: {
        secret: process.env.JWT_SECRET || 'hell_auth_jwt_secret_dev_very_long_and_secure_key_2025',
        expiresIn: process.env.JWT_EXPIRES_IN || '60m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS512'
      },
      
      ENCRYPTION: {
        key: normalizeEnvString(process.env.ENCRYPTION_KEY) || '0123456789abcdef0123456789abcdef'
      },
      
      AWS: {
        endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
      },
      
      MONITORING: {
        prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
        prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        sentryDsn: process.env.SENTRY_DSN
      },
      
      LOGS: {
        level: process.env.LOG_LEVEL || 'debug'
      },
      
      CORS: {
        origins: process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:8080',
          'http://localhost:8081'
        ]
      },
      
      SECURITY: {
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
      }
    };
  } else {
    // Configuração para produção
    return {
      NODE_ENV: 'production',
      PORT: parseInt(process.env.PORT || '3000'),
      HOST: process.env.HOST || '0.0.0.0',
      
      DATABASE: {
        type: 'postgres',
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
        url: process.env.DATABASE_URL!
      },
      
      REDIS: {
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD!,
        url: process.env.REDIS_URL!
      },
      
      JWT: {
        secret: process.env.JWT_SECRET!,
        expiresIn: process.env.JWT_EXPIRES_IN || '60m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS512'
      },
      
      ENCRYPTION: {
        key: normalizeEnvString(process.env.ENCRYPTION_KEY)!
      },
      
      AWS: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      },
      
      MONITORING: {
        prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
        prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        sentryDsn: process.env.SENTRY_DSN
      },
      
      LOGS: {
        level: process.env.LOG_LEVEL || 'info'
      },
      
      CORS: {
        origins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://hellauthenticator.com']
      },
      
      SECURITY: {
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
      }
    };
  }
};

// Configuração global
export const env = getConfig();

// Validação de configuração crítica
export const validateConfig = (): void => {
  const requiredFields = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DATABASE_URL'
  ];

  const missingFields = requiredFields.filter(field => !process.env[field]);

  if (missingFields.length > 0 && !isLocal) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }

  // Validações específicas
  if (env.JWT.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const normalizedEncryptionKey = normalizeEnvString(env.ENCRYPTION.key) || '';
  const isLegacy32CharKey = normalizedEncryptionKey.length === 32;
  const isHex64Key = /^[0-9a-fA-F]{64}$/.test(normalizedEncryptionKey);

  if (!isLegacy32CharKey && !isHex64Key) {
    throw new Error('ENCRYPTION_KEY must be 64-char hex or 32-char UTF-8 string');
  }
};

// Função para obter configuração específica
export const getDatabaseConfig = (): DatabaseConfig => ({
  type: 'postgres',
  host: env.DATABASE.host,
  port: env.DATABASE.port,
  username: env.DATABASE.username,
  password: env.DATABASE.password,
  database: env.DATABASE.database,
  url: env.DATABASE.url
});

export const getRedisConfig = (): RedisConfig => ({
  host: env.REDIS.host,
  port: env.REDIS.port,
  password: env.REDIS.password,
  url: env.REDIS.url
});

export const getAwsConfig = (): AwsConfig => ({
  region: env.AWS.region,
  accessKeyId: env.AWS.accessKeyId,
  secretAccessKey: env.AWS.secretAccessKey,
  endpoint: env.AWS.endpoint
});

// Log da configuração (sem dados sensíveis)
export const logConfig = (): void => {
  logger.info('🔧 Environment Configuration:');
  logger.info(`   Environment: ${env.NODE_ENV}`);
  logger.info(`   Port: ${env.PORT}`);
  logger.info(`   Database: ${env.DATABASE.host}:${env.DATABASE.port}/${env.DATABASE.database}`);
  logger.info(`   Redis: ${env.REDIS.host}:${env.REDIS.port}`);
  logger.info(`   AWS Region: ${env.AWS.region}`);
  logger.info(`   CORS Origins: ${env.CORS.origins.join(', ')}`);
  logger.info(`   Prometheus: ${env.MONITORING.prometheusEnabled ? 'Enabled' : 'Disabled'}`);
  logger.info(`   Log Level: ${env.LOGS.level}`);
};



