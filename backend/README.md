# Hell Authenticator Backend

Backend API para o Hell Authenticator, construído com Fastify, TypeScript e PostgreSQL.

## 🚀 Tecnologias

- **Fastify**: Framework web rápido e eficiente
- **TypeScript**: Tipagem estática
- **PostgreSQL**: Banco de dados relacional
- **Redis**: Cache e sessões
- **TypeORM**: ORM para PostgreSQL
- **JWT**: Autenticação
- **Prometheus**: Métricas e monitoramento
- **Docker**: Containerização

## 📋 Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

## 🛠️ Instalação

1. **Clonar o repositório**
```bash
git clone <repository-url>
cd hell-authenticator/backend
```

2. **Instalar dependências**
```bash
npm install
```

3. **Configurar variáveis de ambiente**
```bash
cp env.example .env
# Editar .env com suas configurações
```

4. **Iniciar serviços com Docker Compose**
```bash
# Na raiz do projeto
docker-compose up -d postgres redis prometheus grafana localstack
```

5. **Executar migrações**
```bash
npm run migrate
```

6. **Iniciar em modo desenvolvimento**
```bash
npm run dev
```

## 🏃‍♂️ Scripts Disponíveis

- `npm run dev`: Inicia em modo desenvolvimento com hot-reload
- `npm run build`: Compila o projeto
- `npm run start`: Inicia em modo produção
- `npm run test`: Executa testes
- `npm run lint`: Verifica código com ESLint
- `npm run type-check`: Verifica tipos TypeScript
- `npm run migrate`: Executa migrações do banco
- `npm run seed`: Popula banco com dados de teste

## 📁 Estrutura do Projeto

```
src/
├── config/          # Configurações
│   ├── database.ts  # Configuração do banco
│   └── environment.ts # Variáveis de ambiente
├── models/          # Entidades TypeORM
│   ├── User.ts
│   ├── Account.ts
│   ├── Backup.ts
│   └── Session.ts
├── plugins/         # Plugins Fastify
│   ├── cors.ts
│   ├── helmet.ts
│   ├── prometheus.ts
│   ├── rate-limit.ts
│   └── swagger.ts
├── routes/          # Rotas da API
│   ├── auth.ts
│   ├── accounts.ts
│   ├── backup.ts
│   └── health.ts
├── services/        # Lógica de negócio
├── types/           # Tipos TypeScript
│   └── index.ts
├── utils/           # Utilitários
└── app.ts           # Aplicação principal
```

## 🔧 Configuração

### Variáveis de Ambiente

Copie `env.example` para `.env` e configure:

```env
# Ambiente
NODE_ENV=development
PORT=3000

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=hell_auth_user
DB_PASSWORD=hell_auth_password
DB_NAME=hell_auth_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=hell_auth_redis_password

# JWT
JWT_SECRET=sua_chave_secreta_muito_longa
JWT_EXPIRES_IN=60m

# Criptografia
ENCRYPTION_KEY=chave_de_32_caracteres_exata
```

## 📊 Monitoramento

- **Health Check**: `GET /health`
- **Métricas Prometheus**: `GET /metrics`
- **Documentação Swagger**: `GET /docs`

## 🔒 Segurança

- Rate limiting global
- Headers de segurança (Helmet)
- CORS configurado
- Validação de entrada com JSON Schema
- Criptografia AES-256 para dados sensíveis

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar com coverage
npm run test:coverage

# Executar em modo watch
npm run test:watch
```

## 🐳 Docker

```bash
# Build da imagem
docker build -t hell-auth-backend .

# Executar container
docker run -p 3000:3000 hell-auth-backend
```

## 📈 Métricas

O backend expõe métricas Prometheus em `/metrics`:

- `http_request_duration_seconds`: Duração das requisições
- `http_requests_total`: Total de requisições
- `http_requests_in_progress`: Requisições em andamento

## 🔄 Migrações

```bash
# Gerar nova migração
npm run migrate:generate

# Executar migrações
npm run migrate

# Reverter última migração
npm run migrate:revert
```

## 📝 Logs

Logs estruturados com Winston:

- **Development**: Pretty print colorido
- **Production**: JSON estruturado
- **Níveis**: error, warn, info, debug

## 🚀 Deploy

1. Build da aplicação
2. Configurar variáveis de produção
3. Executar migrações
4. Iniciar aplicação

```bash
npm run build
NODE_ENV=production npm start
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](../LICENSE) para detalhes.

