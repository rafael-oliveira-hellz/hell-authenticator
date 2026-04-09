import { RestoreBackupUseCase } from '../RestoreBackupUseCase';

describe('RestoreBackupUseCase', () => {
  it('delegates backup restore to port', async () => {
    const expected = { restoredAccounts: 2, skippedAccounts: 1 };
    const restoreBackup = jest.fn().mockResolvedValue(expected);
    const useCase = new RestoreBackupUseCase({ restoreBackup });

    const result = await useCase.execute({
      userId: 'user-1',
      backupId: 'backup-1',
      data: { password: 'secret' }
    });

    expect(restoreBackup).toHaveBeenCalledWith('user-1', 'backup-1', { password: 'secret' });
    expect(result).toBe(expected);
  });
});
