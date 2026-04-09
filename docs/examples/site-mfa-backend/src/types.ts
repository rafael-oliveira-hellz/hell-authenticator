export type TotpAlgorithm = 'sha1' | 'sha256' | 'sha512';

export interface JwtPayload {
  userId: string;
  type?: 'access' | 'refresh';
}

export interface RequestUser {
  id: string;
  email: string;
}

export interface SetupResponse {
  otpauthUrl: string;
  secretMasked: string;
}

export interface VerifySetupBody {
  code: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface MfaVerifyLoginBody {
  challengeId: string;
  code?: string;
  recoveryCode?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}


