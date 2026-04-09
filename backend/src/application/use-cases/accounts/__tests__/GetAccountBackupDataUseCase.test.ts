import { GetAccountBackupDataUseCase } from '../GetAccountBackupDataUseCase';

describe('GetAccountBackupDataUseCase', () => {
  it('delegates backup-data retrieval to port', async () => {
    const expected = {
      name: 'Github',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      hasMetadata: false
    };

    const getBackupData = jest.fn().mockResolvedValue(expected);
    const useCase = new GetAccountBackupDataUseCase({ getBackupData });

    const result = await useCase.execute({ userId: 'user-1', accountId: 'acc-1' });

    expect(getBackupData).toHaveBeenCalledWith('user-1', 'acc-1');
    expect(result).toBe(expected);
  });
});
