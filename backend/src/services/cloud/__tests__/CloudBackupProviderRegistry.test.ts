const mockS3 = {
  putObject: jest.fn(),
  getObject: jest.fn(),
  deleteObject: jest.fn(),
  headBucket: jest.fn()
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3)
}));

import { CloudBackupProviderRegistry } from '../CloudBackupProviderRegistry';

describe('CloudBackupProviderRegistry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_REGION;
    delete process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('marks unconfigured providers as skipped during active verification', async () => {
    const registry = new CloudBackupProviderRegistry({
      requestPerformer: jest.fn()
    });

    const providers = await registry.list();
    const googleDrive = providers.find((provider) => provider.id === 'google-drive');

    expect(googleDrive).toMatchObject({
      connectionStatus: 'not-configured',
      verificationStatus: 'skipped'
    });
    expect(googleDrive?.verificationMessage).toContain('not configured');
  });

  it('actively verifies google drive credentials from the providers catalog', async () => {
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN = 'token-123';
    const requestPerformer = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: '{}',
      headers: {}
    });

    const registry = new CloudBackupProviderRegistry({ requestPerformer });
    const providers = await registry.list();
    const googleDrive = providers.find((provider) => provider.id === 'google-drive');

    expect(requestPerformer).toHaveBeenCalledWith(
      'GET',
      'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
      {
        headers: {
          Authorization: 'Bearer token-123'
        }
      }
    );
    expect(googleDrive).toMatchObject({
      connectionStatus: 'connected',
      verificationStatus: 'verified'
    });
    expect(googleDrive?.lastVerifiedAt).toBeTruthy();
  });

  it('reports failed verification when google drive credentials are invalid', async () => {
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN = 'invalid-token';
    const requestPerformer = jest.fn().mockRejectedValue(new Error('invalid token'));

    const registry = new CloudBackupProviderRegistry({ requestPerformer });
    const providers = await registry.list();
    const googleDrive = providers.find((provider) => provider.id === 'google-drive');

    expect(googleDrive).toMatchObject({
      connectionStatus: 'connected',
      verificationStatus: 'failed',
      verificationMessage: 'invalid token'
    });
  });

  it('retries transient AWS upload failures before succeeding', async () => {
    process.env.AWS_S3_BUCKET = 'bucket';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
    process.env.AWS_REGION = 'us-east-1';

    mockS3.putObject
      .mockReturnValueOnce({
        promise: () => Promise.reject(Object.assign(new Error('temporary network issue'), { code: 'NetworkingError' }))
      })
      .mockReturnValueOnce({
        promise: () => Promise.resolve({})
      });

    const registry = new CloudBackupProviderRegistry();

    await registry.get('aws').upload({
      userId: 'user-1',
      backupId: 'backup-1',
      data: 'encrypted-payload',
      cloudPath: 'smoke-tests/aws/backup.enc'
    });

    expect(mockS3.putObject).toHaveBeenCalledTimes(2);
  });
});
