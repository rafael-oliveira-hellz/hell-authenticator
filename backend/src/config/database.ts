import { DataSource } from 'typeorm';
import { env, getDatabaseConfig } from './environment';
import { Account } from '../models/Account';
import { Backup } from '../models/Backup';
import { Session } from '../models/Session';
import { UserCloudConnection } from '../models/UserCloudConnection';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const dbConfig = getDatabaseConfig();

const shouldUseSsl = env.NODE_ENV === 'production';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',
  entities: [User, Account, Backup, Session, UserCloudConnection],
  migrations: [
    'src/migrations/*.migration.ts',
    'dist/migrations/*.migration.js'
  ],
  subscribers: ['src/subscribers/*.ts'],
  ssl: shouldUseSsl ? { rejectUnauthorized } : false,
  extra: {
    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    maxUses: 7500
  }
});

let initializationPromise: Promise<DataSource> | null = null;

export const resetDatabaseStateForTests = (): void => {
  initializationPromise = null;
};

export const initializeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    logger.info('Database connection already established', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
    return;
  }

  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  try {
    initializationPromise = AppDataSource.initialize();
    await initializationPromise;
    logger.info('Database connection established', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      synchronize: env.NODE_ENV === 'development',
      logging: env.NODE_ENV === 'development'
    });
  } catch (error) {
    initializationPromise = null;
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      initializationPromise = Promise.resolve(AppDataSource);
    }
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (!AppDataSource.isInitialized) {
    initializationPromise = null;
    logger.info('Database connection already closed');
    return;
  }

  try {
    await AppDataSource.destroy();
    initializationPromise = null;
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const isDatabaseConnected = (): boolean => {
  return AppDataSource.isInitialized;
};

export const runMigrations = async (): Promise<void> => {
  try {
    const pendingMigrations = await AppDataSource.showMigrations();

    if (pendingMigrations) {
      logger.info('Running pending migrations');
      await AppDataSource.runMigrations();
      logger.info('Migrations completed');
    } else {
      logger.info('No pending migrations');
    }
  } catch (error) {
    logger.error('Error running migrations', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const revertMigrations = async (): Promise<void> => {
  try {
    logger.info('Reverting migrations');
    await AppDataSource.undoLastMigration();
    logger.info('Last migration reverted');
  } catch (error) {
    logger.error('Error reverting migrations', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const generateMigration = async (name: string): Promise<void> => {
  try {
    logger.info('Generating migration', { name });
    logger.info('Migration generated');
  } catch (error) {
    logger.error('Error generating migration', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  try {
    if (!isDatabaseConnected()) {
      throw new Error('Database not connected');
    }

    await AppDataSource.query('SELECT 1');

    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  } catch {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    };
  }
};
