# Hell Authenticator

Um aplicativo autenticador multiplataforma (iOS e Android) inspirado no Microsoft Authenticator e Google Authenticator, com recursos avancados de seguranca e interface moderna.

## Visao Geral

O Hell Authenticator e uma solucao completa de autenticacao de dois fatores (2FA) que permite aos usuarios gerenciar codigos TOTP (Time-based One-Time Password) de forma segura e intuitiva. O aplicativo suporta escaneamento de QR codes de outros autenticadores populares e oferece recursos avancados de backup e sincronizacao.

## Funcionalidades Principais

- Escaneamento de QR codes (Microsoft Authenticator, Google Authenticator)
- Geracao de codigos TOTP em tempo real
- Backup e restauracao de contas
- Interface moderna e responsiva
- Suporte a multiplas contas
- Modo escuro/claro
- Biometria (Face ID, Touch ID, Fingerprint)
- Sincronizacao entre dispositivos
- Exportacao/Importacao de contas

## Plataformas Suportadas

- iOS (iPhone e iPad)
- Android (Smartphones e Tablets)

## Arquitetura

- Frontend: React Native com TypeScript
- Backend: Node.js com Fastify e TypeScript
- Banco de Dados: PostgreSQL
- Autenticacao: JWT + Biometria
- Criptografia: AES-256 para dados sensiveis

## Documentacao

- [Documentacao de Negocio](./docs/business/README.md)
- [Documentacao Tecnica](./docs/technical/README.md)
- [Guia de Desenvolvimento](./docs/development/README.md)
- [Guia de Seguranca](./docs/security/README.md)

## Tecnologias

### Frontend

- React Native 0.81+
- TypeScript 5.0+
- React Navigation 6

### Backend

- Node.js 18+
- Fastify 4.x+
- TypeScript 5.0+
- PostgreSQL 15+
- JWT
- bcrypt
- crypto

### DevOps

- Docker
- GitHub Actions
- Snyk Security
- Jest
- Detox (E2E Testing)

## Quick Start

```bash
# Clone o repositorio
git clone https://github.com/seu-usuario/hell-authenticator.git
cd hell-authenticator

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Licenca

Este projeto esta licenciado sob a Licenca MIT.

## Contribuicao

Contribuicoes sao bem-vindas. Consulte a documentacao do projeto para alinhar padroes e fluxo de desenvolvimento.

## Suporte

Para suporte e duvidas:

- Email: suporte@hellauthenticator.com
- Issues: [GitHub Issues](https://github.com/seu-usuario/hell-authenticator/issues)
