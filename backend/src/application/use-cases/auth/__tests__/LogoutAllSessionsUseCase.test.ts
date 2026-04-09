import { LogoutAllSessionsUseCase } from '../LogoutAllSessionsUseCase';

describe('LogoutAllSessionsUseCase', () => {
  it('delegates logoutAll execution to port', async () => {
    const logoutAll = jest.fn<Promise<void>, [string]>().mockResolvedValue();
    const useCase = new LogoutAllSessionsUseCase({ logoutAll });

    await useCase.execute({ userId: 'user-1' });

    expect(logoutAll).toHaveBeenCalledWith('user-1');
  });
});
