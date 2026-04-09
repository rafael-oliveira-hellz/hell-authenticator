# 🔧 Documentação Técnica - Hell Authenticator

## 🏗️ Arquitetura Geral

### Visão de Alto Nível

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Node.js API   │    │   PostgreSQL    │
│   (Mobile App)  │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │ Local   │            │ Redis   │            │ Backup  │
    │ Storage │            │ Cache   │            │ Storage │
    └─────────┘            └─────────┘            └─────────┘
```

### Princípios Arquiteturais

1. **Clean Architecture**: Separação clara entre camadas
2. **SOLID**: Princípios de design orientado a objetos
3. **DRY**: Don't Repeat Yourself
4. **KISS**: Keep It Simple, Stupid
5. **Security First**: Segurança em todas as camadas

## 📱 Frontend (React Native)

### Estrutura de Pastas

```
mobile/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── common/         # Componentes básicos
│   │   ├── forms/          # Componentes de formulário
│   │   └── screens/        # Componentes de tela
│   ├── screens/            # Telas da aplicação
│   │   ├── auth/           # Autenticação
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── scanner/        # Scanner de QR code
│   │   └── settings/       # Configurações
│   ├── navigation/         # Configuração de navegação
│   ├── services/           # Serviços de API
│   ├── store/              # Gerenciamento de estado
│   ├── utils/              # Utilitários
│   ├── hooks/              # Custom hooks
│   ├── types/              # Definições TypeScript
│   ├── constants/          # Constantes da aplicação
│   └── assets/             # Recursos estáticos
├── android/                # Configuração Android
├── ios/                    # Configuração iOS
└── __tests__/              # Testes
```

### Tecnologias Frontend

#### Core
- **React Native**: 0.72+
- **TypeScript**: 5.0+
- **React Navigation**: 6.x
- **React Native Elements**: 3.x

#### Estado e Dados
- **Redux Toolkit**: Gerenciamento de estado
- **React Query**: Cache e sincronização
- **AsyncStorage**: Armazenamento local

#### Segurança
- **React Native Crypto**: Criptografia local
- **React Native Keychain**: Armazenamento seguro
- **React Native Biometrics**: Autenticação biométrica

#### UI/UX
- **React Native Vector Icons**: Ícones
- **React Native Reanimated**: Animações
- **React Native Gesture Handler**: Gestos
- **React Native QR Scanner**: Scanner de QR

#### Testes
- **Jest**: Testes unitários
- **Detox**: Testes E2E
- **React Native Testing Library**: Testes de componentes

### Componentes Principais

#### 1. AuthenticatorApp
```typescript
interface AuthenticatorAppProps {
  theme: Theme;
  isAuthenticated: boolean;
  onBiometricAuth: () => void;
}
```

#### 2. QRCodeScanner
```typescript
interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError: (error: Error) => void;
  isActive: boolean;
}
```

#### 3. TOTPGenerator
```typescript
interface TOTPGeneratorProps {
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
}
```

## 🖥️ Backend (Node.js)

### Estrutura de Pastas

```
backend/
├── src/
│   ├── controllers/        # Controladores
│   ├── services/          # Lógica de negócio
│   ├── repositories/      # Acesso a dados
│   ├── models/            # Modelos de dados
│   ├── middlewares/       # Middlewares
│   ├── routes/            # Rotas da API
│   ├── utils/             # Utilitários
│   ├── types/             # Definições TypeScript
│   ├── config/            # Configurações
│   └── validators/        # Validações
├── tests/                 # Testes
├── docs/                  # Documentação da API
└── scripts/               # Scripts utilitários
```

### Tecnologias Backend

#### Core
- **Node.js**: 18+
- **Fastify**: 4.x+
- **TypeScript**: 5.0+
- **@fastify/cors**: Cross-origin resource sharing

#### Banco de Dados
- **PostgreSQL**: 15+
- **TypeORM**: ORM
- **Redis**: Cache e sessões

#### Autenticação e Segurança
- **JWT**: JSON Web Tokens
- **bcrypt**: Hash de senhas
- **crypto**: Criptografia
- **@fastify/helmet**: Headers de segurança
- **@fastify/rate-limit**: Limitação de taxa

#### Validação e Documentação
- **@fastify/ajv**: Validação de dados com JSON Schema
- **@fastify/swagger**: Documentação da API
- **Jest**: Testes unitários

#### Monitoramento
- **Winston**: Logs
- **@fastify/request-logging**: HTTP request logger
- **Sentry**: Error tracking

### Modelos de Dados

#### User
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
}
```

#### Account
```typescript
interface Account {
  id: string;
  userId: string;
  name: string;
  issuer: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Backup
```typescript
interface Backup {
  id: string;
  userId: string;
  data: string; // Encrypted
  version: string;
  createdAt: Date;
  expiresAt: Date;
}
```

### APIs Principais

#### Autenticação
```typescript
// POST /api/auth/register
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
  biometricToken?: string;
}

// POST /api/auth/refresh
interface RefreshRequest {
  refreshToken: string;
}
```

#### Contas
```typescript
// GET /api/accounts
// POST /api/accounts
interface CreateAccountRequest {
  name: string;
  issuer: string;
  secret: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: 6 | 8;
  period?: number;
}

// PUT /api/accounts/:id
// DELETE /api/accounts/:id
```

#### Backup
```typescript
// POST /api/backup
interface CreateBackupRequest {
  accounts: Account[];
  settings: UserPreferences;
}

// GET /api/backup/:id
// DELETE /api/backup/:id
```

## 🗄️ Banco de Dados

### Esquema Principal

```sql
-- Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Contas de autenticação
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  issuer VARCHAR(255),
  secret VARCHAR(255) NOT NULL,
  algorithm VARCHAR(10) DEFAULT 'SHA1',
  digits INTEGER DEFAULT 6,
  period INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backups
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL, -- Encrypted
  version VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Sessões
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_backups_user_id ON backups(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
```

### Migrações

```typescript
// Exemplo de migração
export class CreateUsersTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_premium BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users;`);
  }
}
```

## 🔐 Segurança

### Criptografia

#### Dados Sensíveis
- **Senhas**: bcrypt com salt rounds 12
- **Secrets TOTP**: AES-256-GCM
- **Backups**: AES-256-GCM com chave derivada
- **Tokens**: JWT com assinatura HMAC-SHA256

#### Armazenamento Local
- **iOS**: Keychain Services
- **Android**: Android Keystore
- **Chaves**: RSA 2048 bits

### Autenticação

#### Métodos Suportados
1. **Email/Senha**: Autenticação tradicional
2. **Biometria**: Face ID, Touch ID, Fingerprint
3. **PIN**: Código numérico de 4-6 dígitos
4. **Padrão**: Padrão de desbloqueio

#### Fluxo de Autenticação
```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant B as Backend
    participant D as Database

    U->>A: Login Request
    A->>B: POST /auth/login
    B->>D: Validate Credentials
    D->>B: User Data
    B->>A: JWT Tokens
    A->>A: Store Tokens Securely
    A->>U: Dashboard
```

### Validação de Dados

#### Frontend
```typescript
// Validação de formulários
const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required()
});
```

#### Backend
```typescript
// Validação de entrada com JSON Schema
const createAccountSchema = {
  type: 'object',
  required: ['name', 'secret'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    issuer: { type: 'string', maxLength: 255 },
    secret: { 
      type: 'string', 
      minLength: 16, 
      maxLength: 255,
      pattern: '^[A-Z2-7]+=*$'
    },
    algorithm: { 
      type: 'string', 
      enum: ['SHA1', 'SHA256', 'SHA512'],
      default: 'SHA1'
    },
    digits: { 
      type: 'number', 
      enum: [6, 8],
      default: 6
    },
    period: { 
      type: 'number', 
      minimum: 15, 
      maximum: 60,
      default: 30
    }
  }
};
```

## 🧪 Testes

### Estratégia de Testes

#### Frontend
- **Unit Tests**: Jest + React Native Testing Library
- **Integration Tests**: Jest + Detox
- **E2E Tests**: Detox
- **Coverage**: 80% mínimo

#### Backend
- **Unit Tests**: Jest
- **Integration Tests**: Jest + Supertest
- **Database Tests**: Jest + Testcontainers
- **Coverage**: 90% mínimo

### Exemplos de Testes

#### Frontend - Componente
```typescript
describe('TOTPGenerator', () => {
  it('should generate correct TOTP code', () => {
    const { getByText } = render(
      <TOTPGenerator 
        secret="JBSWY3DPEHPK3PXP"
        algorithm="SHA1"
        digits={6}
        period={30}
      />
    );
    
    expect(getByText(/\d{6}/)).toBeInTheDocument();
  });
});
```

#### Backend - Service
```typescript
describe('AuthService', () => {
  it('should authenticate valid credentials', async () => {
    const user = await authService.authenticate(
      'user@example.com',
      'password123'
    );
    
    expect(user).toBeDefined();
    expect(user.email).toBe('user@example.com');
  });
});
```

## 🚀 Deploy e DevOps

### CI/CD Pipeline

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
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run type-check

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: docker build -t hell-authenticator .
```

### Docker

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:android
RUN npm run build:ios

CMD ["npm", "start"]
```

### Monitoramento

#### Métricas
- **Performance**: Response time, throughput
- **Erros**: Error rate, error types
- **Usuários**: Active users, session duration
- **Segurança**: Failed login attempts, suspicious activity

#### Logs
```typescript
// Winston configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 📊 Performance

### Otimizações Frontend

#### React Native
- **Hermes Engine**: JavaScript engine otimizado
- **Flipper**: Debugging e profiling
- **Code Splitting**: Carregamento sob demanda
- **Image Optimization**: Compressão de imagens

#### Cache Strategy
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
});
```

### Otimizações Backend

#### Database
- **Connection Pooling**: Pool de conexões
- **Query Optimization**: Índices otimizados
- **Read Replicas**: Para leituras
- **Caching**: Redis para dados frequentes

#### API
- **Compression**: Gzip/Brotli
- **Rate Limiting**: Proteção contra abuso
- **CORS**: Configuração adequada
- **Helmet**: Headers de segurança

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (.env)
```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hell_auth
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# External Services
SENTRY_DSN=https://your-sentry-dsn
SNYK_TOKEN=your-snyk-token
```

#### Frontend (.env)
```env
# API
API_BASE_URL=https://api.hellauthenticator.com
API_TIMEOUT=10000

# Features
ENABLE_BIOMETRICS=true
ENABLE_CLOUD_BACKUP=true
ENABLE_ANALYTICS=false

# Security
PIN_LENGTH=6
SESSION_TIMEOUT=300000
```

## 📚 Recursos Adicionais

### Documentação da API
- **Swagger UI**: `/api/docs`
- **OpenAPI Spec**: `/api/docs/swagger.json`
- **Postman Collection**: Disponível no repositório

### Guias de Desenvolvimento
- [Guia de Contribuição](./CONTRIBUTING.md)
- [Padrões de Código](./CODING_STANDARDS.md)
- [Guia de Segurança](./SECURITY.md)
- [Guia de Deploy](./DEPLOYMENT.md)

### Ferramentas de Desenvolvimento
- **VS Code Extensions**: Lista recomendada
- **Prettier**: Formatação de código
- **ESLint**: Linting
- **Husky**: Git hooks

---

**Documento criado em**: Agosto 2025  
**Versão**: 1.0  
**Próxima revisão**: Outubro 2025
