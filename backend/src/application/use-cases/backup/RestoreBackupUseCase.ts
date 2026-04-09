import { RestoreBackupRequest } from '../../../types';

export type RestoreBackupResult = {
  restoredAccounts: number;
  skippedAccounts: number;
};

export type RestoreBackupCommand = {
  userId: string;
  backupId: string;
  data: RestoreBackupRequest;
};

export type RestoreBackupPort = {
  restoreBackup: (userId: string, backupId: string, data: RestoreBackupRequest) => Promise<RestoreBackupResult>;
};

export class RestoreBackupUseCase {
  constructor(private readonly port: RestoreBackupPort) {}

  async execute(command: RestoreBackupCommand): Promise<RestoreBackupResult> {
    return this.port.restoreBackup(command.userId, command.backupId, command.data);
  }
}
