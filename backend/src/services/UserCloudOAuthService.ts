import { createHash, randomBytes } from 'crypto';
import { FastifyReply } from 'fastify';
import {
  StartUserCloudOAuthRequest,
  StartUserCloudOAuthResponse,
  UserCloudProvider,
} from '../types';
import { EncryptionService } from './EncryptionService';
import { UserCloudConnectionService } from './UserCloudConnectionService';

type OAuthProviderConfig = {
  provider: UserCloudProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl?: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type OAuthStatePayload = {
  userId: string;
  provider: UserCloudProvider;
  codeVerifier: string;
  successRedirectUri?: string;
  errorRedirectUri?: string;
  createdAt: string;
};

type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
};

type OAuthProfile = {
  externalAccountId?: string;
  accountEmail?: string;
  metadata?: Record<string, unknown>;
};

const STATE_TTL_MS = 10 * 60 * 1000;

const base64UrlEncode = (value: Buffer): string =>
  value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const createCodeVerifier = () => base64UrlEncode(randomBytes(48));

const createCodeChallenge = (verifier: string) =>
  base64UrlEncode(createHash('sha256').update(verifier).digest());

const buildRedirectUrl = (baseUrl: string, params: Record<string, string | undefined>) => {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

const getEnvValue = (key: string): string | undefined => {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

export class UserCloudOAuthService {
  private readonly encryptionService = new EncryptionService();
  private readonly connectionService = new UserCloudConnectionService();

  async startAuthorization(
    userId: string,
    request: StartUserCloudOAuthRequest
  ): Promise<StartUserCloudOAuthResponse> {
    const providerConfig = this.getProviderConfig(request.provider);
    const codeVerifier = createCodeVerifier();
    const codeChallenge = createCodeChallenge(codeVerifier);
    const state = this.encryptionService.encrypt(
      JSON.stringify({
        userId,
        provider: request.provider,
        codeVerifier,
        successRedirectUri: request.successRedirectUri,
        errorRedirectUri: request.errorRedirectUri,
        createdAt: new Date().toISOString(),
      } satisfies OAuthStatePayload)
    );

    const authorizationUrl = new URL(providerConfig.authorizeUrl);
    authorizationUrl.searchParams.set('client_id', providerConfig.clientId);
    authorizationUrl.searchParams.set('redirect_uri', providerConfig.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('token_access_type', 'offline');
    authorizationUrl.searchParams.set('scope', providerConfig.scopes.join(' '));

    authorizationUrl.searchParams.set('access_type', 'offline');
    authorizationUrl.searchParams.set('prompt', 'consent');
    authorizationUrl.searchParams.set('include_granted_scopes', 'true');

    return {
      provider: request.provider,
      authorizationUrl: authorizationUrl.toString(),
    };
  }

  async handleCallback(query: Record<string, string | undefined>, reply: FastifyReply): Promise<void> {
    const stateParam = query.state;
    if (!stateParam) {
      this.sendHtmlResponse(reply, 400, 'Conexão inválida', 'O estado da autorização está ausente.');
      return;
    }

    const state = this.parseState(stateParam);
    if (!state) {
      this.redirectOrRenderError(reply, undefined, 'Não foi possível validar a autorização iniciada.');
      return;
    }

    if (Date.now() - new Date(state.createdAt).getTime() > STATE_TTL_MS) {
      this.redirectOrRenderError(reply, state.errorRedirectUri, 'A autorização expirou. Inicie a conexão novamente.');
      return;
    }

    if (query.error) {
      this.redirectOrRenderError(reply, state.errorRedirectUri, `O provedor retornou um erro: ${query.error}`);
      return;
    }

    const authorizationCode = query.code;
    if (!authorizationCode) {
      this.redirectOrRenderError(reply, state.errorRedirectUri, 'O código de autorização não foi recebido do provedor.');
      return;
    }

    try {
      const providerConfig = this.getProviderConfig(state.provider);
      const tokens = await this.exchangeCodeForTokens(providerConfig, authorizationCode, state.codeVerifier);
      const profile = await this.fetchProfile(providerConfig, tokens.accessToken);

      await this.connectionService.connectProvider(state.userId, {
        provider: state.provider,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        accountEmail: profile.accountEmail,
        externalAccountId: profile.externalAccountId,
        metadata: profile.metadata,
      });

      if (state.successRedirectUri) {
        reply.redirect(
          buildRedirectUrl(state.successRedirectUri, {
            provider: state.provider,
            status: 'connected',
            accountEmail: profile.accountEmail,
          })
        );
        return;
      }

      this.sendHtmlResponse(
        reply,
        200,
        'Conta conectada com sucesso',
        `${providerConfig.label} foi conectado com sucesso. Você já pode voltar para o app Hell Authenticator.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao concluir a autenticação do provedor.';
      this.redirectOrRenderError(reply, state.errorRedirectUri, message);
    }
  }

  private parseState(state: string): OAuthStatePayload | null {
    try {
      return JSON.parse(this.encryptionService.decrypt(state)) as OAuthStatePayload;
    } catch {
      return null;
    }
  }

  private redirectOrRenderError(reply: FastifyReply, errorRedirectUri: string | undefined, message: string) {
    if (errorRedirectUri) {
      reply.redirect(buildRedirectUrl(errorRedirectUri, { status: 'error', message }));
      return;
    }

    this.sendHtmlResponse(reply, 400, 'Falha na conexão', message);
  }

  private sendHtmlResponse(reply: FastifyReply, statusCode: number, title: string, message: string) {
    reply
      .status(statusCode)
      .type('text/html; charset=utf-8')
      .send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
      main { max-width: 420px; background:#111827; border:1px solid #334155; border-radius:16px; padding:24px; box-shadow:0 20px 45px rgba(0,0,0,.25); }
      h1 { margin:0 0 12px; font-size:24px; }
      p { margin:0; line-height:1.5; color:#cbd5e1; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`);
  }

  private getProviderConfig(provider: UserCloudProvider): OAuthProviderConfig {
    if (provider !== 'google-drive') {
      throw new Error('Unsupported OAuth provider');
    }

    const clientId = getEnvValue('GOOGLE_DRIVE_OAUTH_CLIENT_ID');
    const clientSecret = getEnvValue('GOOGLE_DRIVE_OAUTH_CLIENT_SECRET');
    const redirectUri = getEnvValue('GOOGLE_DRIVE_OAUTH_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google Drive OAuth is not configured on the backend.');
    }

    return {
      provider,
      label: 'Google Drive',
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'],
      clientId,
      clientSecret,
      redirectUri,
    };
  }

  private async exchangeCodeForTokens(
    providerConfig: OAuthProviderConfig,
    authorizationCode: string,
    codeVerifier: string
  ): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      code: authorizationCode,
      grant_type: 'authorization_code',
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      redirect_uri: providerConfig.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(typeof payload.error_description === 'string' ? payload.error_description : `Failed to exchange OAuth code for ${providerConfig.label}`);
    }

    const accessToken = typeof payload.access_token === 'string' ? payload.access_token : undefined;
    if (!accessToken) {
      throw new Error(`OAuth token response for ${providerConfig.label} did not include access_token`);
    }

    const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : undefined;

    return {
      accessToken,
      refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
      scopes: typeof payload.scope === 'string' ? payload.scope.split(/\s+/).filter(Boolean) : providerConfig.scopes,
    };
  }

  private async fetchProfile(
    providerConfig: OAuthProviderConfig,
    accessToken: string
  ): Promise<OAuthProfile> {
    const response = await fetch(providerConfig.profileUrl!, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error('Failed to fetch Google account profile');
    }

    return {
      externalAccountId: typeof payload.sub === 'string' ? payload.sub : undefined,
      accountEmail: typeof payload.email === 'string' ? payload.email : undefined,
      metadata: {
        name: typeof payload.name === 'string' ? payload.name : undefined,
        picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      },
    };
  }
}
