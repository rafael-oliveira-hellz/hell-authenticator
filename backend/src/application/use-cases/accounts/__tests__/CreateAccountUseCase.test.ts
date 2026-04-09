import { CreateAccountUseCase } from '../CreateAccountUseCase';

describe('CreateAccountUseCase', () => {
  it('delegates account creation to port', async () => {
    const expected = { id: 'acc-1' };
    const createAccount = jest.fn().mockResolvedValue(expected);
    const useCase = new CreateAccountUseCase({ createAccount });

    const result = await useCase.execute({
      userId: 'user-1',
      data: {
        name: 'Github',
        secret: 'JBSWY3DPEHPK3PXP',
        period: 30
      }
    });

    expect(createAccount).toHaveBeenCalledWith('user-1', {
      name: 'Github',
      secret: 'JBSWY3DPEHPK3PXP',
      period: 30
    });
    expect(result).toBe(expected);
  });
});
