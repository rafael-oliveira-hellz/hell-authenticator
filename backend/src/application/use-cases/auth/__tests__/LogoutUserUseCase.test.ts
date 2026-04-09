import { LogoutUserUseCase } from '../LogoutUserUseCase';

describe('LogoutUserUseCase', () => {
  it('delegates logout execution to port', async () => {
    const logout = jest.fn<Promise<void>, [string]>().mockResolvedValue();
    const useCase = new LogoutUserUseCase({ logout });

    await useCase.execute({ refreshToken: 'refresh-token' });

    expect(logout).toHaveBeenCalledWith('refresh-token');
  });
});
