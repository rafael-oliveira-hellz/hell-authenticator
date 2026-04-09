import { TokenResponse } from '../../../types';

export type RefreshTokenCommand = {
  refreshToken: string;
};

export type RefreshTokenPort = {
  refreshToken: (token: string) => Promise<TokenResponse>;
};

export class RefreshTokenUseCase {
  constructor(private readonly port: RefreshTokenPort) {}

  async execute(command: RefreshTokenCommand): Promise<TokenResponse> {
    return this.port.refreshToken(command.refreshToken);
  }
}
