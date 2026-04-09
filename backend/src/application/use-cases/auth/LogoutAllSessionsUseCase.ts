export type LogoutAllSessionsCommand = {
  userId: string;
};

export type LogoutAllSessionsPort = {
  logoutAll: (userId: string) => Promise<void>;
};

export class LogoutAllSessionsUseCase {
  constructor(private readonly port: LogoutAllSessionsPort) {}

  async execute(command: LogoutAllSessionsCommand): Promise<void> {
    await this.port.logoutAll(command.userId);
  }
}
