module.exports = {
  testTimeout: 120000,
  testEnvironment: 'detox/runners/jest/testEnvironment',
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  setupFilesAfterEnv: ['./setup.ts'],
  testMatch: ['**/*.e2e.ts'],
  maxWorkers: 1,
  verbose: true,
};
