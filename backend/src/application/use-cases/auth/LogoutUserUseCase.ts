export type LogoutUserCommand = {
  refreshToken: string;
};

export type LogoutUserPort = {
  logout: (refreshToken: string) => Promise<void>;
};

export class LogoutUserUseCase {
  constructor(private readonly port: LogoutUserPort) {}

  async execute(command: LogoutUserCommand): Promise<void> {
    await this.port.logout(command.refreshToken);
  }
}
