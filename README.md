# Hell Authenticator 🔥

Um aplicativo autenticador multiplataforma (iOS e Android) inspirado no Microsoft Authenticator e Google Authenticator, com recursos avançados de segurança e interface moderna.

## 📋 Visão Geral

O Hell Authenticator é uma solução completa de autenticação de dois fatores (2FA) que permite aos usuários gerenciar códigos TOTP (Time-based One-Time Password) de forma segura e intuitiva. O aplicativo suporta escaneamento de QR codes de outros autenticadores populares e oferece recursos avançados de backup e sincronização.

## 🚀 Funcionalidades Principais

- ✅ Escaneamento de QR codes (Microsoft Authenticator, Google Authenticator)
- ✅ Geração de códigos TOTP em tempo real
- ✅ Backup e restauração de contas
- ✅ Interface moderna e responsiva
- ✅ Suporte a múltiplas contas
- ✅ Modo escuro/claro
- ✅ Biometria (Face ID, Touch ID, Fingerprint)
- ✅ Sincronização entre dispositivos
- ✅ Exportação/Importação de contas

## 📱 Plataformas Suportadas

- **iOS** (iPhone e iPad)
- **Android** (Smartphones e Tablets)

## 🏗️ Arquitetura

- **Frontend**: React Native com TypeScript
- **Backend**: Node.js com Express e TypeScript
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT + Biometria
- **Criptografia**: AES-256 para dados sensíveis

## 📚 Documentação

- [📖 Documentação de Negócio](./docs/business/README.md)
- [🔧 Documentação Técnica](./docs/technical/README.md)
- [📱 Guia de Desenvolvimento](./docs/development/README.md)
- [🔒 Guia de Segurança](./docs/security/README.md)

## 🛠️ Tecnologias

### Frontend
- React Native 0.72+
- TypeScript 5.0+
- React Navigation 6
- React Native Elements
- React Native Crypto
- React Native QR Scanner

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

## 🚀 Quick Start

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/hell-authenticator.git
cd hell-authenticator

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Executar backend
npm run dev:backend

# Executar aplicativo
npm run dev:mobile
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia o [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre nosso código de conduta e o processo para enviar pull requests.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através de:
- Email: suporte@hellauthenticator.com
- Issues: [GitHub Issues](https://github.com/seu-usuario/hell-authenticator/issues)

---

**Hell Authenticator** - Segurança com estilo 🔥
