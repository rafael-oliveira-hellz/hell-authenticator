import { LoginRequest, LoginResponse } from '../../../../types';
import { LoginUserUseCase } from '../LoginUserUseCase';

describe('LoginUserUseCase', () => {
  it('delegates login execution to port', async () => {
    const expected: LoginResponse = {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        isActive: true,
        isPremium: false,
        preferences: {
          theme: 'auto',
          language: 'pt-BR',
          notifications: {
            push: true,
            email: true,
            sms: false,
            newAccount: true,
            backupReminder: true,
            securityAlert: true
          },
          security: {
            biometricEnabled: false,
            pinEnabled: false,
            pinLength: 6,
            autoLock: 5,
            sessionTimeout: 30
          },
          backup: {
            autoBackup: false,
            backupFrequency: 7,
            encryptionEnabled: true,
            retentionDays: 30
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tokens: {
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        tokenType: 'Bearer'
      }
    };

    const login = jest.fn<Promise<LoginResponse>, [LoginRequest, string, string]>().mockResolvedValue(expected);
    const useCase = new LoginUserUseCase({ login });

    const command = {
      data: { email: 'user@example.com', password: 'secret' },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    };

    const result = await useCase.execute(command);

    expect(login).toHaveBeenCalledWith(command.data, command.ipAddress, command.userAgent);
    expect(result).toBe(expected);
  });
});
