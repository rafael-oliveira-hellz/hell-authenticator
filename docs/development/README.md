# 📱 Guia de Desenvolvimento - Hell Authenticator

## 🚀 Passo a Passo de Construção

### Fase 1: Setup Inicial (Semana 1)

#### 1.1 Configuração do Ambiente

```bash
# Instalar dependências globais
npm install -g @react-native-community/cli
npm install -g expo-cli
npm install -g typescript

# Verificar instalações
react-native --version
expo --version
tsc --version
```

#### 1.2 Estrutura do Projeto

```bash
# Criar estrutura de pastas
mkdir hell-authenticator
cd hell-authenticator

# Criar monorepo
mkdir mobile backend shared docs
```

#### 1.3 Configuração do Backend

```bash
cd backend

# Inicializar projeto Node.js
npm init -y

# Instalar dependências principais
npm install fastify typescript ts-node @types/node
npm install @fastify/cors @fastify/helmet @fastify/request-logging winston
npm install bcrypt jsonwebtoken crypto
npm install pg typeorm reflect-metadata
npm install @fastify/ajv @fastify/swagger @fastify/swagger-ui
npm install jest supertest @types/jest @types/supertest

# Dependências de desenvolvimento
npm install -D nodemon @types/bcrypt @types/jsonwebtoken
npm install -D @types/pg
npm install -D eslint prettier husky lint-staged
```

#### 1.4 Configuração do Mobile

```bash
cd ../mobile

# Criar projeto React Native
npx react-native init HellAuthenticator --template react-native-template-typescript

# Instalar dependências principais
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install react-query
npm install react-native-vector-icons
npm install react-native-reanimated react-native-gesture-handler
npm install react-native-crypto react-native-keychain
npm install react-native-biometrics
npm install react-native-qrcode-scanner
npm install @react-native-async-storage/async-storage

# Dependências de desenvolvimento
npm install -D @types/react-native-vector-icons
npm install -D detox jest @testing-library/react-native
```

### Fase 2: Backend - Estrutura Base (Semana 2)

#### 2.1 Configuração TypeScript

```typescript
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### 2.2 Configuração do Banco de Dados

```typescript
// backend/src/config/database.ts
import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Account } from '../models/Account';
import { Backup } from '../models/Backup';
import { Session } from '../models/Session';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'hell_auth',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Account, Backup, Session],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts']
});
```

#### 2.3 Modelos de Dados

```typescript
// backend/src/models/User.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Account } from './Account';
import { Backup } from './Backup';
import { Session } from './Session';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => Account, account => account.user)
  accounts: Account[];

  @OneToMany(() => Backup, backup => backup.user)
  backups: Backup[];

  @OneToMany(() => Session, session => session.user)
  sessions: Session[];
}
```

#### 2.4 Serviços de Autenticação

```typescript
// backend/src/services/AuthService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppDataSource } from '../config/database';
import { FastifyInstance } from 'fastify';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(email: string, password: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Usuário já existe');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.userRepository.create({
      email,
      passwordHash
    });

    return await this.userRepository.save(user);
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: { access: string; refresh: string } }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    const tokens = this.generateTokens(user.id);
    
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return { user, tokens };
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { access: accessToken, refresh: refreshToken };
  }
}
```

### Fase 3: Mobile - Estrutura Base (Semana 3)

#### 3.1 Configuração de Navegação

```typescript
// mobile/src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Scanner" component={ScannerScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

#### 3.2 Configuração do Redux Store

```typescript
// mobile/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import accountsReducer from './slices/accountsSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    accounts: accountsReducer,
    settings: settingsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### 3.3 Slice de Autenticação

```typescript
// mobile/src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '../../services/AuthService';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await AuthService.login(email, password);
    return response;
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erro no login';
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### Fase 4: Funcionalidades Core (Semana 4-6)

#### 4.1 Geração de Códigos TOTP

```typescript
// mobile/src/services/TOTPService.ts
import crypto from 'react-native-crypto';

export class TOTPService {
  static generateTOTP(secret: string, algorithm: string = 'SHA1', digits: number = 6, period: number = 30): string {
    const counter = Math.floor(Date.now() / 1000 / period);
    const counterBuffer = Buffer.alloc(8);
    
    for (let i = 0; i < 8; i++) {
      counterBuffer[7 - i] = (counter & 0xff);
      counter = counter >> 8;
    }

    const key = Buffer.from(secret, 'base32');
    const hmac = crypto.createHmac(algorithm.toLowerCase(), key);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);

    const modulo = Math.pow(10, digits);
    return (code % modulo).toString().padStart(digits, '0');
  }

  static getTimeRemaining(period: number = 30): number {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
  }
}
```

#### 4.2 Scanner de QR Code

```typescript
// mobile/src/screens/scanner/ScannerScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { useDispatch } from 'react-redux';
import { addAccount } from '../../store/slices/accountsSlice';
import { parseOTPUri } from '../../utils/otpParser';

export const ScannerScreen: React.FC = ({ navigation }) => {
  const dispatch = useDispatch();
  const [isScanning, setIsScanning] = useState(true);

  const handleScan = (event: any) => {
    setIsScanning(false);
    
    try {
      const otpData = parseOTPUri(event.data);
      dispatch(addAccount(otpData));
      
      Alert.alert(
        'Sucesso',
        `Conta ${otpData.name} adicionada com sucesso!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Erro',
        'QR Code inválido. Certifique-se de que é um código de autenticação válido.',
        [{ text: 'OK', onPress: () => setIsScanning(true) }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={handleScan}
        reactivate={isScanning}
        reactivateTimeout={2000}
        showMarker={true}
        markerStyle={styles.marker}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  marker: {
    borderColor: '#FF6B35',
    borderRadius: 10,
    borderWidth: 2
  }
});
```

#### 4.3 Parser de URI OTP

```typescript
// mobile/src/utils/otpParser.ts
export interface OTPData {
  name: string;
  issuer?: string;
  secret: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: 6 | 8;
  period?: number;
}

export function parseOTPUri(uri: string): OTPData {
  if (!uri.startsWith('otpauth://')) {
    throw new Error('URI inválida');
  }

  const url = new URL(uri);
  const params = new URLSearchParams(url.search);

  const secret = params.get('secret');
  if (!secret) {
    throw new Error('Secret não encontrado');
  }

  const name = decodeURIComponent(url.pathname.substring(1));
  const issuer = params.get('issuer') ? decodeURIComponent(params.get('issuer')!) : undefined;
  const algorithm = (params.get('algorithm') as 'SHA1' | 'SHA256' | 'SHA512') || 'SHA1';
  const digits = parseInt(params.get('digits') || '6') as 6 | 8;
  const period = parseInt(params.get('period') || '30');

  return {
    name,
    issuer,
    secret,
    algorithm,
    digits,
    period
  };
}
```

### Fase 5: Segurança e Criptografia (Semana 7)

#### 5.1 Serviço de Criptografia

```typescript
// mobile/src/services/CryptoService.ts
import Keychain from 'react-native-keychain';
import crypto from 'react-native-crypto';

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_SIZE = 32;
  private static readonly IV_SIZE = 16;
  private static readonly TAG_SIZE = 16;

  static async generateKey(): Promise<string> {
    const key = crypto.randomBytes(this.KEY_SIZE);
    return key.toString('base64');
  }

  static async encrypt(data: string, key: string): Promise<string> {
    const iv = crypto.randomBytes(this.IV_SIZE);
    const cipher = crypto.createCipher(this.ALGORITHM, Buffer.from(key, 'base64'));
    
    cipher.setAAD(Buffer.from('hell-auth', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    const result = {
      iv: iv.toString('base64'),
      encrypted,
      tag: tag.toString('base64')
    };
    
    return JSON.stringify(result);
  }

  static async decrypt(encryptedData: string, key: string): Promise<string> {
    const data = JSON.parse(encryptedData);
    const decipher = crypto.createDecipher(this.ALGORITHM, Buffer.from(key, 'base64'));
    
    decipher.setAAD(Buffer.from('hell-auth', 'utf8'));
    decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
    
    let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static async storeSecureItem(key: string, value: string): Promise<void> {
    await Keychain.setInternetCredentials(key, key, value);
  }

  static async getSecureItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      return credentials ? credentials.password : null;
    } catch {
      return null;
    }
  }
}
```

#### 5.2 Autenticação Biométrica

```typescript
// mobile/src/services/BiometricService.ts
import ReactNativeBiometrics from 'react-native-biometrics';

export class BiometricService {
  private static rnBiometrics = new ReactNativeBiometrics();

  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  static async authenticate(reason: string = 'Autentique-se para acessar o app'): Promise<boolean> {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({ promptMessage: reason });
      return success;
    } catch {
      return false;
    }
  }

  static async createKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        const { publicKey } = await this.rnBiometrics.createKeys();
        return { publicKey, privateKey: '' };
      }
      
      return null;
    } catch {
      return null;
    }
  }
}
```

### Fase 6: Interface e UX (Semana 8-10)

#### 6.1 Tema e Estilos

```typescript
// mobile/src/theme/index.ts
export const theme = {
  colors: {
    primary: '#FF6B35',
    secondary: '#F7931E',
    background: '#1A1A1A',
    surface: '#2D2D2D',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    error: '#FF4444',
    success: '#00C851',
    warning: '#FFBB33',
    info: '#33B5E5'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold'
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold'
    },
    h3: {
      fontSize: 20,
      fontWeight: '600'
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal'
    },
    caption: {
      fontSize: 14,
      fontWeight: 'normal'
    }
  }
};
```

#### 6.2 Componente de Código TOTP

```typescript
// mobile/src/components/TOTPCode.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TOTPService } from '../services/TOTPService';
import { theme } from '../theme';

interface TOTPCodeProps {
  secret: string;
  name: string;
  issuer?: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: 6 | 8;
  period?: number;
}

export const TOTPCode: React.FC<TOTPCodeProps> = ({
  secret,
  name,
  issuer,
  algorithm = 'SHA1',
  digits = 6,
  period = 30
}) => {
  const [code, setCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    const updateCode = () => {
      const newCode = TOTPService.generateTOTP(secret, algorithm, digits, period);
      setCode(newCode);
      
      const remaining = TOTPService.getTimeRemaining(period);
      setTimeRemaining(remaining);
      
      const progressValue = (period - remaining) / period;
      Animated.timing(progress, {
        toValue: progressValue,
        duration: 1000,
        useNativeDriver: false
      }).start();
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);

    return () => clearInterval(interval);
  }, [secret, algorithm, digits, period]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        {issuer && <Text style={styles.issuer}>{issuer}</Text>}
      </View>
      
      <View style={styles.codeContainer}>
        <Text style={styles.code}>{code}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })}
          ]} 
        />
        <Text style={styles.timeRemaining}>{timeRemaining}s</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm
  },
  header: {
    marginBottom: theme.spacing.sm
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text
  },
  issuer: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary
  },
  codeContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md
  },
  code: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    letterSpacing: 4
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative'
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2
  },
  timeRemaining: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs
  }
});
```

### Fase 7: Testes e Qualidade (Semana 11-12)

#### 7.1 Testes Unitários

```typescript
// mobile/src/services/__tests__/TOTPService.test.ts
import { TOTPService } from '../TOTPService';

describe('TOTPService', () => {
  const testSecret = 'JBSWY3DPEHPK3PXP';
  const testAlgorithm = 'SHA1';
  const testDigits = 6;
  const testPeriod = 30;

  describe('generateTOTP', () => {
    it('should generate a 6-digit code', () => {
      const code = TOTPService.generateTOTP(testSecret, testAlgorithm, testDigits, testPeriod);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate consistent codes for same time window', () => {
      const code1 = TOTPService.generateTOTP(testSecret, testAlgorithm, testDigits, testPeriod);
      const code2 = TOTPService.generateTOTP(testSecret, testAlgorithm, testDigits, testPeriod);
      expect(code1).toBe(code2);
    });

    it('should generate different codes for different algorithms', () => {
      const sha1Code = TOTPService.generateTOTP(testSecret, 'SHA1', testDigits, testPeriod);
      const sha256Code = TOTPService.generateTOTP(testSecret, 'SHA256', testDigits, testPeriod);
      expect(sha1Code).not.toBe(sha256Code);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return a number between 0 and period', () => {
      const remaining = TOTPService.getTimeRemaining(testPeriod);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(testPeriod);
    });
  });
});
```

#### 7.2 Testes de Integração

```typescript
// backend/src/__tests__/auth.test.ts
import request from 'supertest';
import { app } from '../app';
import { AppDataSource } from '../config/database';

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 409 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('access');
      expect(response.body.tokens).toHaveProperty('refresh');
    });
  });
});
```

### Fase 8: Deploy e CI/CD (Semana 13)

#### 8.1 Configuração Docker

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
```

#### 8.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: hell_auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:password@postgres:5432/hell_auth
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

#### 8.3 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/test_db
      
      - name: Run security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker image
        run: |
          docker build -t hell-authenticator:${{ github.sha }} .
          docker push hell-authenticator:${{ github.sha }}
```

## 📋 Checklist de Desenvolvimento

### ✅ Fase 1: Setup (Semana 1)
- [ ] Ambiente de desenvolvimento configurado
- [ ] Estrutura de pastas criada
- [ ] Dependências instaladas
- [ ] Configurações básicas

### ✅ Fase 2: Backend Base (Semana 2)
- [ ] Configuração TypeScript
- [ ] Conexão com banco de dados
- [ ] Modelos de dados
- [ ] Serviços de autenticação

### ✅ Fase 3: Mobile Base (Semana 3)
- [ ] Configuração React Native
- [ ] Navegação configurada
- [ ] Redux store
- [ ] Slice de autenticação

### ✅ Fase 4: Funcionalidades Core (Semana 4-6)
- [ ] Geração de códigos TOTP
- [ ] Scanner de QR code
- [ ] Parser de URI OTP
- [ ] Interface básica

### ✅ Fase 5: Segurança (Semana 7)
- [ ] Criptografia de dados
- [ ] Autenticação biométrica
- [ ] Armazenamento seguro
- [ ] Validações de segurança

### ✅ Fase 6: Interface (Semana 8-10)
- [ ] Tema e estilos
- [ ] Componentes principais
- [ ] Animações
- [ ] Responsividade

### ✅ Fase 7: Testes (Semana 11-12)
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes E2E
- [ ] Cobertura de código

### ✅ Fase 8: Deploy (Semana 13)
- [ ] Configuração Docker
- [ ] CI/CD pipeline
- [ ] Monitoramento
- [ ] Documentação final

## 🚀 Próximos Passos

### Imediato
1. Configurar ambiente de desenvolvimento
2. Implementar estrutura base do backend
3. Configurar projeto React Native
4. Implementar autenticação básica

### Curto Prazo
1. Desenvolver funcionalidades core
2. Implementar segurança
3. Criar interface de usuário
4. Configurar testes

### Médio Prazo
1. Otimizar performance
2. Implementar recursos avançados
3. Configurar deploy
4. Preparar para produção

---

**Documento criado em**: Agosto 2025  
**Versão**: 1.0  
**Próxima revisão**: Outubro 2025
