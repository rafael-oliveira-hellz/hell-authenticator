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

import reducer, { register } from './authSlice';
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
});
