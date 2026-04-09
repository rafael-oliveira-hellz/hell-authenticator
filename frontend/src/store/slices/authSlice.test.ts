jest.mock('@/services/api', () => ({
  apiService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    getCurrentUser: jest.fn(),
    validateToken: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

import reducer, { login, register, validateToken } from './authSlice';
import { AuthState, User } from '@/types';

const createUser = (): User => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
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
      securityAlert: true,
    },
    security: {
      biometricEnabled: false,
      pinEnabled: false,
      pinLength: 6,
      autoLock: 5,
      sessionTimeout: 30,
    },
    backup: {
      autoBackup: false,
      backupFrequency: 7,
      encryptionEnabled: true,
      retentionDays: 30,
    },
  },
  createdAt: '2026-04-09T00:00:00.000Z',
  updatedAt: '2026-04-09T00:00:00.000Z',
});

const initialState: AuthState = {
  user: createUser(),
  tokens: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
  },
  isAuthenticated: true,
  isLoading: true,
  error: 'previous error',
  biometricEnabled: false,
  biometricType: null,
};

describe('authSlice register flow', () => {
  it('keeps the user logged out after a successful register response without tokens', () => {
    const nextState = reducer(
      initialState,
      register.fulfilled(createUser(), 'request-id', {
        name: 'Test User',
        email: 'user@example.com',
        password: '12345678',
        confirmPassword: '12345678',
        acceptTerms: true,
      })
    );

    expect(nextState.isLoading).toBe(false);
    expect(nextState.user).toBeNull();
    expect(nextState.tokens).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
    expect(nextState.error).toBeNull();
  });

  it('keeps the authenticated session when a stale token validation resolves false after login', () => {
    const loggedInState = reducer(
      initialState,
      login.fulfilled(
        {
          user: createUser(),
          tokens: {
            accessToken: 'fresh-access-token',
            refreshToken: 'fresh-refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        },
        'login-request-id',
        {
          email: 'user@example.com',
          password: '12345678',
        }
      )
    );

    const nextState = reducer(loggedInState, validateToken.fulfilled(false, 'stale-validate-request-id'));

    expect(nextState.user).toEqual(createUser());
    expect(nextState.tokens).toEqual({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
    expect(nextState.isAuthenticated).toBe(true);
  });
});
