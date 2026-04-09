import { CreateBackupUseCase } from '../CreateBackupUseCase';

describe('CreateBackupUseCase', () => {
  it('delegates backup creation to port', async () => {
    const expected = { id: 'backup-1' };
    const createBackup = jest.fn().mockResolvedValue(expected);
    const useCase = new CreateBackupUseCase({ createBackup });

    const result = await useCase.execute({
      userId: 'user-1',
      data: {
        description: 'daily',
        type: 'manual'
      }
    });

    expect(createBackup).toHaveBeenCalledWith('user-1', { description: 'daily', type: 'manual' });
    expect(result).toBe(expected);
  });
});
