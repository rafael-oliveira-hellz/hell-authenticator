module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    './src/services/AuthService.ts': {
      statements: 90
    },
    './src/services/BackupService.ts': {
      statements: 90
    },
    './src/utils/security.ts': {
      statements: 90
    }
  }
};
