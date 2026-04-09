import { RefreshTokenUseCase } from '../RefreshTokenUseCase';

describe('RefreshTokenUseCase', () => {
  it('delegates refresh execution to port', async () => {
    const expected = {
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
      tokenType: 'Bearer'
    };

    const refreshToken = jest.fn<Promise<typeof expected>, [string]>().mockResolvedValue(expected);
    const useCase = new RefreshTokenUseCase({ refreshToken });

    const result = await useCase.execute({ refreshToken: 'old-rt' });

    expect(refreshToken).toHaveBeenCalledWith('old-rt');
    expect(result).toBe(expected);
  });
});
