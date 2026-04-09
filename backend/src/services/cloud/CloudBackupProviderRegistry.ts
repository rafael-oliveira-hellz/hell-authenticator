import AWS from 'aws-sdk';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';

import { CloudProvider } from '../../types';

export type CloudProviderDescriptor = {
  id: CloudProvider;
  label: string;
  description: string;
  authMode: 'access-key' | 'bearer-token' | 'sas-token';
  connectionStatus: 'connected' | 'not-configured';
  verificationStatus: 'verified' | 'failed' | 'skipped';
  verificationMessage?: string;
  lastVerifiedAt?: string;
  supportsAutomaticSetup: boolean;
  supportsCustomPath: boolean;
  requiredEnvVars: string[];
  setupInstructions: string[];
};

export type CloudUploadInput = {
  userId: string;
  backupId: string;
  data: string;
  cloudPath: string;
};

export type CloudDownloadInput = {
  userId: string;
  backupId: string;
  cloudPath: string;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type HttpRequestOptions = {
  headers?: Record<string, string>;
  body?: string | Buffer;
  expectJson?: boolean;
};

type RequestPerformer = (
  method: HttpMethod,
  targetUrl: string,
  options?: HttpRequestOptions
) => Promise<HttpResponse>;

type WaitFunction = (ms: number) => Promise<void>;

type AwsPromiseResult<T> = {
  promise(): Promise<T>;
};

type AwsS3Like = {
  putObject(params: AWS.S3.PutObjectRequest): AwsPromiseResult<unknown>;
  getObject(params: AWS.S3.GetObjectRequest): AwsPromiseResult<AWS.S3.GetObjectOutput>;
  deleteObject(params: AWS.S3.DeleteObjectRequest): AwsPromiseResult<unknown>;
  headBucket(params: AWS.S3.HeadBucketRequest): AwsPromiseResult<unknown>;
};

type CloudProviderVerificationResult = {
  verificationStatus: 'verified' | 'failed';
  verificationMessage?: string;
};

type CloudBackupProvider = {
  descriptor: CloudProviderDescriptor;
  buildDefaultPath: (input: { userId: string; backupId: string; createdAt: Date }) => string;
  upload: (input: CloudUploadInput) => Promise<void>;
  download: (input: CloudDownloadInput) => Promise<string>;
  delete: (input: CloudDownloadInput) => Promise<void>;
};

type HttpResponse = {
  statusCode: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
};

type CloudBackupProviderRegistryDependencies = {
  requestPerformer?: RequestPerformer;
  wait?: WaitFunction;
  s3Factory?: (config: AWS.S3.ClientConfiguration) => AwsS3Like;
};

const PROVIDER_REQUEST_TIMEOUT_MS = 30000;
const PROVIDER_RETRY_MAX_ATTEMPTS = 3;
const PROVIDER_RETRY_BASE_DELAY_MS = 250;
const PROVIDER_RETRY_MAX_DELAY_MS = 2000;
const RETRIABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRIABLE_AWS_ERROR_CODES = new Set([
  'NetworkingError',
  'TimeoutError',
  'RequestTimeout',
  'Throttling',
  'ThrottlingException',
  'TooManyRequestsException',
  'SlowDown',
  'InternalError',
  'ServiceUnavailable'
]);

class CloudProviderRequestError extends Error {
  statusCode?: number;
  retriable: boolean;

  constructor(message: string, options?: { statusCode?: number; retriable?: boolean }) {
    super(message);
    this.name = 'CloudProviderRequestError';
    this.statusCode = options?.statusCode;
    this.retriable = options?.retriable ?? false;
  }
}

const sanitizeProviderErrorBody = (body: string): string => {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'empty response';
  }

  return normalized.slice(0, 240);
};

const normalizeEnvString = (value?: string): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const encodePathSegments = (cloudPath: string): string =>
  cloudPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const ensureConfigured = (descriptor: CloudProviderDescriptor): void => {
  if (descriptor.connectionStatus !== 'connected') {
    throw new Error(`${descriptor.label} is not configured in the backend environment`);
  }
};

const defaultWait: WaitFunction = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableError = (error: unknown): boolean => {
  if (error instanceof CloudProviderRequestError) {
    return error.retriable;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const awsCode = (error as Error & { code?: string }).code;
  if (awsCode && RETRIABLE_AWS_ERROR_CODES.has(awsCode)) {
    return true;
  }

  return /timeout|timed out|network|socket|econnreset|econnrefused|etimedout|ehostunreach/i.test(error.message);
};

const computeRetryDelay = (attempt: number): number =>
  Math.min(PROVIDER_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)), PROVIDER_RETRY_MAX_DELAY_MS);

const withRetry = async <T>(
  operation: () => Promise<T>,
  options: {
    wait: WaitFunction;
    maxAttempts?: number;
  }
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? PROVIDER_RETRY_MAX_ATTEMPTS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !isRetriableError(error)) {
        throw error;
      }

      await options.wait(computeRetryDelay(attempt));
    }
  }

  throw new Error('Retry loop exited unexpectedly');
};

const performRawRequest = async (
  method: HttpMethod,
  targetUrl: string,
  options?: HttpRequestOptions
): Promise<HttpResponse> => {
  const parsedUrl = new URL(targetUrl);
  const transport = parsedUrl.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise<HttpResponse>((resolve, reject) => {
    let settled = false;
    const request = transport(
      parsedUrl,
      {
        method,
        headers: options?.headers
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          settled = true;
          const body = Buffer.concat(chunks).toString('utf8');
          const statusCode = response.statusCode || 500;

          if (statusCode >= 400) {
            reject(new CloudProviderRequestError(
              `Cloud provider request failed (${statusCode}): ${sanitizeProviderErrorBody(body)}`,
              {
                statusCode,
                retriable: RETRIABLE_STATUS_CODES.has(statusCode)
              }
            ));
            return;
          }

          resolve({
            statusCode,
            body,
            headers: response.headers
          });
        });
      }
    );

    request.setTimeout(PROVIDER_REQUEST_TIMEOUT_MS, () => {
      if (settled) {
        return;
      }

      settled = true;
      request.destroy(new CloudProviderRequestError('Cloud provider request timed out', { retriable: true }));
    });

    request.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error instanceof Error ? error : new CloudProviderRequestError(String(error), { retriable: true }));
    });

    if (options?.body) {
      request.write(options.body);
    }

    request.end();
  });
};

const createRequestPerformer = (wait: WaitFunction = defaultWait): RequestPerformer => {
  return async (method, targetUrl, options) => withRetry(
    () => performRawRequest(method, targetUrl, options),
    { wait }
  );
};

const performRequest = createRequestPerformer();

abstract class BaseCloudBackupProvider implements CloudBackupProvider {
  descriptor: CloudProviderDescriptor;

  protected constructor(descriptor: CloudProviderDescriptor) {
    this.descriptor = descriptor;
  }

  buildDefaultPath({ userId, backupId, createdAt }: { userId: string; backupId: string; createdAt: Date }): string {
    const dateStamp = createdAt.toISOString().slice(0, 10);
    return `${userId}/${dateStamp}/${backupId}.enc`;
  }

  protected ensureConnected(): void {
    ensureConfigured(this.descriptor);
  }

  abstract upload(input: CloudUploadInput): Promise<void>;
  abstract download(input: CloudDownloadInput): Promise<string>;
  abstract delete(input: CloudDownloadInput): Promise<void>;
}

class AwsS3CloudBackupProvider extends BaseCloudBackupProvider {
  private readonly s3?: AWS.S3;
  private readonly bucket?: string;

  constructor() {
    const bucket = normalizeEnvString(process.env.AWS_S3_BUCKET);
    const accessKeyId = normalizeEnvString(process.env.AWS_ACCESS_KEY_ID);
    const secretAccessKey = normalizeEnvString(process.env.AWS_SECRET_ACCESS_KEY);
    const region = normalizeEnvString(process.env.AWS_REGION);
    const endpoint = normalizeEnvString(process.env.AWS_ENDPOINT);

    const connected = Boolean(bucket && accessKeyId && secretAccessKey && region);

    super({
      id: 'aws',
      label: 'AWS S3',
      description: 'IntegraÃ§Ã£o real com bucket S3 usando access key do backend.',
      authMode: 'access-key',
      connectionStatus: connected ? 'connected' : 'not-configured',
      verificationStatus: 'skipped',
      supportsAutomaticSetup: true,
      supportsCustomPath: true,
      requiredEnvVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'],
      setupInstructions: [
        'Configure o bucket com AWS_S3_BUCKET.',
        'Informe AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY vÃ¡lidos.',
        'Em desenvolvimento vocÃª pode apontar AWS_ENDPOINT para o LocalStack.'
      ]
    });

    this.bucket = bucket;

    if (connected) {
      this.s3 = new AWS.S3({
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
        s3ForcePathStyle: Boolean(endpoint)
      });
    }
  }

  async upload({ data, cloudPath }: CloudUploadInput): Promise<void> {
    this.ensureConnected();
    await withRetry(
      () => this.s3!.putObject({
        Bucket: this.bucket!,
        Key: cloudPath,
        Body: data,
        ContentType: 'application/octet-stream'
      }).promise().then(() => undefined),
      { wait: defaultWait }
    );
  }

  async download({ cloudPath }: CloudDownloadInput): Promise<string> {
    this.ensureConnected();
    const response = await withRetry(
      () => this.s3!.getObject({
        Bucket: this.bucket!,
        Key: cloudPath
      }).promise(),
      { wait: defaultWait }
    );

    return response.Body?.toString('utf8') || '';
  }

  async delete({ cloudPath }: CloudDownloadInput): Promise<void> {
    this.ensureConnected();
    await withRetry(
      () => this.s3!.deleteObject({
        Bucket: this.bucket!,
        Key: cloudPath
      }).promise().then(() => undefined),
      { wait: defaultWait }
    );
  }
}

class GcpStorageCloudBackupProvider extends BaseCloudBackupProvider {
  private readonly accessToken?: string;
  private readonly bucket?: string;

  constructor() {
    const accessToken = normalizeEnvString(process.env.GCP_ACCESS_TOKEN);
    const bucket = normalizeEnvString(process.env.GCP_BUCKET);
    const connected = Boolean(accessToken && bucket);

    super({
      id: 'gcp',
      label: 'Google Cloud Storage',
      description: 'IntegraÃ§Ã£o real com GCS via JSON API e token Bearer.',
      authMode: 'bearer-token',
      connectionStatus: connected ? 'connected' : 'not-configured',
      verificationStatus: 'skipped',
      supportsAutomaticSetup: true,
      supportsCustomPath: true,
      requiredEnvVars: ['GCP_ACCESS_TOKEN', 'GCP_BUCKET'],
      setupInstructions: [
        'Crie um access token com permissÃ£o de storage.objects.',
        'Defina o bucket em GCP_BUCKET.'
      ]
    });

    this.accessToken = accessToken;
    this.bucket = bucket;
  }

  async upload({ data, cloudPath }: CloudUploadInput): Promise<void> {
    this.ensureConnected();

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucket!)}/o?uploadType=media&name=${encodeURIComponent(cloudPath)}`;
    await performRequest('POST', uploadUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': Buffer.byteLength(data, 'utf8').toString()
      },
      body: data
    });
  }

  async download({ cloudPath }: CloudDownloadInput): Promise<string> {
    this.ensureConnected();
    const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucket!)}/o/${encodeURIComponent(cloudPath)}?alt=media`;
    const response = await performRequest('GET', downloadUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`
      }
    });

    return response.body;
  }

  async delete({ cloudPath }: CloudDownloadInput): Promise<void> {
    this.ensureConnected();
    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucket!)}/o/${encodeURIComponent(cloudPath)}`;
    await performRequest('DELETE', deleteUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`
      }
    });
  }
}

class AzureBlobCloudBackupProvider extends BaseCloudBackupProvider {
  private readonly account?: string;
  private readonly container?: string;
  private readonly sasToken?: string;

  constructor() {
    const account = normalizeEnvString(process.env.AZURE_STORAGE_ACCOUNT);
    const container = normalizeEnvString(process.env.AZURE_STORAGE_CONTAINER);
    const sasToken = normalizeEnvString(process.env.AZURE_STORAGE_SAS_TOKEN);
    const connected = Boolean(account && container && sasToken);

    super({
      id: 'azure',
      label: 'Azure Blob Storage',
      description: 'IntegraÃ§Ã£o real com Azure Blob via SAS token.',
      authMode: 'sas-token',
      connectionStatus: connected ? 'connected' : 'not-configured',
      verificationStatus: 'skipped',
      supportsAutomaticSetup: true,
      supportsCustomPath: true,
      requiredEnvVars: ['AZURE_STORAGE_ACCOUNT', 'AZURE_STORAGE_CONTAINER', 'AZURE_STORAGE_SAS_TOKEN'],
      setupInstructions: [
        'Informe a conta e o container do Azure Blob.',
        'Defina um SAS token com permissÃ£o de leitura, escrita e exclusÃ£o.'
      ]
    });

    this.account = account;
    this.container = container;
    this.sasToken = sasToken;
  }

  async upload({ data, cloudPath }: CloudUploadInput): Promise<void> {
    this.ensureConnected();
    await performRequest('PUT', this.getBlobUrl(cloudPath), {
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': 'application/octet-stream',
        'Content-Length': Buffer.byteLength(data, 'utf8').toString()
      },
      body: data
    });
  }

  async download({ cloudPath }: CloudDownloadInput): Promise<string> {
    this.ensureConnected();
    const response = await performRequest('GET', this.getBlobUrl(cloudPath));
    return response.body;
  }

  async delete({ cloudPath }: CloudDownloadInput): Promise<void> {
    this.ensureConnected();
    await performRequest('DELETE', this.getBlobUrl(cloudPath));
  }

  private getBlobUrl(cloudPath: string): string {
    const encodedPath = encodePathSegments(cloudPath);
    const queryPrefix = this.sasToken!.startsWith('?') ? this.sasToken! : `?${this.sasToken!}`;
    return `https://${this.account!}.blob.core.windows.net/${this.container!}/${encodedPath}${queryPrefix}`;
  }
}

class GoogleDriveCloudBackupProvider extends BaseCloudBackupProvider {
  private readonly accessToken?: string;
  private readonly folderId?: string;

  constructor() {
    const accessToken = normalizeEnvString(process.env.GOOGLE_DRIVE_ACCESS_TOKEN);
    const folderId = normalizeEnvString(process.env.GOOGLE_DRIVE_FOLDER_ID);
    const connected = Boolean(accessToken);

    super({
      id: 'google-drive',
      label: 'Google Drive',
      description: 'IntegraÃ§Ã£o real com Google Drive usando upload multipart.',
      authMode: 'bearer-token',
      connectionStatus: connected ? 'connected' : 'not-configured',
      verificationStatus: 'skipped',
      supportsAutomaticSetup: true,
      supportsCustomPath: true,
      requiredEnvVars: ['GOOGLE_DRIVE_ACCESS_TOKEN'],
      setupInstructions: [
        'Informe um access token do Google Drive com permissÃ£o de arquivos.',
        'Opcionalmente defina GOOGLE_DRIVE_FOLDER_ID para concentrar os backups em uma pasta especÃ­fica.'
      ]
    });

    this.accessToken = accessToken;
    this.folderId = folderId;
  }

  async upload({ data, cloudPath }: CloudUploadInput): Promise<void> {
    this.ensureConnected();

    const existingFileId = await this.findFileId(cloudPath);
    const metadata = {
      name: this.getDriveFileName(cloudPath),
      ...(this.folderId ? { parents: [this.folderId] } : {})
    };
    const boundary = `hell-auth-boundary-${Date.now()}`;
    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/octet-stream',
      '',
      data,
      `--${boundary}--`
    ].join('\r\n');

    const baseUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    await performRequest(existingFileId ? 'PATCH' as HttpMethod : 'POST', baseUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(multipartBody, 'utf8').toString()
      },
      body: multipartBody
    });
  }

  async download({ cloudPath }: CloudDownloadInput): Promise<string> {
    this.ensureConnected();
    const fileId = await this.findFileId(cloudPath);
    if (!fileId) {
      throw new Error('Google Drive file not found for provided backup path');
    }

    const response = await performRequest('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`
      }
    });

    return response.body;
  }

  async delete({ cloudPath }: CloudDownloadInput): Promise<void> {
    this.ensureConnected();
    const fileId = await this.findFileId(cloudPath);
    if (!fileId) {
      return;
    }

    await performRequest('DELETE', `https://www.googleapis.com/drive/v3/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`
      }
    });
  }

  private async findFileId(cloudPath: string): Promise<string | null> {
    const q = `name='${this.getDriveFileName(cloudPath).replace(/'/g, "\\'")}' and trashed=false`;
    const spaces = this.folderId ? 'drive' : 'appDataFolder';
    const queryUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=${encodeURIComponent(spaces)}&fields=files(id,name)`;

    const response = await performRequest('GET', queryUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken!}`
      }
    });

    const payload = JSON.parse(response.body) as { files?: Array<{ id: string }> };
    return payload.files?.[0]?.id || null;
  }

  private getDriveFileName(cloudPath: string): string {
    return cloudPath.replace(/[\\/]+/g, '__');
  }
}

const buildProviders = (): CloudBackupProvider[] => [
  new GoogleDriveCloudBackupProvider(),
  new AwsS3CloudBackupProvider(),
  new GcpStorageCloudBackupProvider(),
  new AzureBlobCloudBackupProvider()
];

export class CloudBackupProviderRegistry {
  private readonly providers = new Map<CloudProvider, CloudBackupProvider>();
  private readonly requestPerformer: RequestPerformer;

  constructor(dependencies: CloudBackupProviderRegistryDependencies = {}) {
    this.requestPerformer = dependencies.requestPerformer ?? createRequestPerformer(dependencies.wait);
    for (const provider of buildProviders()) {
      this.providers.set(provider.descriptor.id, provider);
    }
  }

  async list(): Promise<CloudProviderDescriptor[]> {
    const providers = Array.from(this.providers.values());
    return Promise.all(providers.map((provider) => this.describeProvider(provider)));
  }

  get(providerId: CloudProvider): CloudBackupProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error('Invalid cloud provider');
    }

    return provider;
  }

  private async describeProvider(provider: CloudBackupProvider): Promise<CloudProviderDescriptor> {
    const baseDescriptor = provider.descriptor;
    const lastVerifiedAt = new Date().toISOString();

    if (baseDescriptor.connectionStatus !== 'connected') {
      return {
        ...baseDescriptor,
        verificationStatus: 'skipped',
        verificationMessage: 'Provider is not configured in the backend environment',
        lastVerifiedAt
      };
    }

    const verification = await this.verifyProviderCredentials(provider);

    return {
      ...baseDescriptor,
      verificationStatus: verification.verificationStatus,
      verificationMessage: verification.verificationMessage,
      lastVerifiedAt
    };
  }

  private async verifyProviderCredentials(provider: CloudBackupProvider): Promise<CloudProviderVerificationResult> {
    try {
      switch (provider.descriptor.id) {
        case 'aws':
          {
          const bucket = normalizeEnvString(process.env.AWS_S3_BUCKET)!;
          const accessKeyId = normalizeEnvString(process.env.AWS_ACCESS_KEY_ID)!;
          const secretAccessKey = normalizeEnvString(process.env.AWS_SECRET_ACCESS_KEY)!;
          const region = normalizeEnvString(process.env.AWS_REGION)!;
          const endpoint = normalizeEnvString(process.env.AWS_ENDPOINT);
          const s3 = new AWS.S3({
            accessKeyId,
            secretAccessKey,
            region,
            endpoint,
            s3ForcePathStyle: Boolean(endpoint)
          });

          await withRetry(
            () => s3.headBucket({
              Bucket: bucket
            }).promise().then(() => undefined),
            { wait: defaultWait }
          );
          return { verificationStatus: 'verified' };
        }
        case 'gcp': {
          const bucket = normalizeEnvString(process.env.GCP_BUCKET)!;
          const accessToken = normalizeEnvString(process.env.GCP_ACCESS_TOKEN)!;
          await this.requestPerformer(
            'GET',
            `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          );
          return { verificationStatus: 'verified' };
        }
        case 'azure': {
          const account = normalizeEnvString(process.env.AZURE_STORAGE_ACCOUNT)!;
          const container = normalizeEnvString(process.env.AZURE_STORAGE_CONTAINER)!;
          const sasToken = normalizeEnvString(process.env.AZURE_STORAGE_SAS_TOKEN)!;
          const queryPrefix = sasToken.startsWith('?') ? sasToken.slice(1) : sasToken;
          await this.requestPerformer(
            'GET',
            `https://${account}.blob.core.windows.net/${container}?restype=container&comp=metadata&${queryPrefix}`
          );
          return { verificationStatus: 'verified' };
        }
        case 'google-drive': {
          const accessToken = normalizeEnvString(process.env.GOOGLE_DRIVE_ACCESS_TOKEN)!;
          await this.requestPerformer(
            'GET',
            'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          );
          return { verificationStatus: 'verified' };
        }
        default:
          return {
            verificationStatus: 'failed',
            verificationMessage: 'Unknown provider'
          };
      }
    } catch (error) {
      return {
        verificationStatus: 'failed',
        verificationMessage: error instanceof Error ? error.message : 'Unable to verify cloud provider credentials'
      };
    }
  }
}

