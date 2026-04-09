export type AccountBackupDataResponse = {
  name: string;
  issuer?: string;
  algorithm: string;
  digits: number;
  period: number;
  icon?: string;
  color?: string;
  hasMetadata: boolean;
};

export type GetAccountBackupDataCommand = {
  userId: string;
  accountId: string;
};

export type GetAccountBackupDataPort = {
  getBackupData: (userId: string, accountId: string) => Promise<AccountBackupDataResponse>;
};

export class GetAccountBackupDataUseCase {
  constructor(private readonly port: GetAccountBackupDataPort) {}

  async execute(command: GetAccountBackupDataCommand): Promise<AccountBackupDataResponse> {
    return this.port.getBackupData(command.userId, command.accountId);
  }
}
