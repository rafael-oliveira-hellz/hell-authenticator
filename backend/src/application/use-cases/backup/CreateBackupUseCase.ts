import { BackupResponse, CreateBackupRequest } from '../../../types';

export type CreateBackupCommand = {
  userId: string;
  data: CreateBackupRequest;
};

export type CreateBackupPort = {
  createBackup: (userId: string, data: CreateBackupRequest) => Promise<BackupResponse>;
};

export class CreateBackupUseCase {
  constructor(private readonly port: CreateBackupPort) {}

  async execute(command: CreateBackupCommand): Promise<BackupResponse> {
    return this.port.createBackup(command.userId, command.data);
  }
}
