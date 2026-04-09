import { LoginRequest, LoginResponse } from '../../../types';

export type LoginUserCommand = {
  data: LoginRequest;
  ipAddress: string;
  userAgent: string;
};

export type LoginUserPort = {
  login: (data: LoginRequest, ipAddress: string, userAgent: string) => Promise<LoginResponse>;
};

export class LoginUserUseCase {
  constructor(private readonly port: LoginUserPort) {}

  async execute(command: LoginUserCommand): Promise<LoginResponse> {
    return this.port.login(command.data, command.ipAddress, command.userAgent);
  }
}
