import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import {
  Account,
  ApiResponse,
  AuthTokens,
  Backup,
  CreateAccountData,
  CreateBackupData,
  LoginCredentials,
  RegisterData,
  RestoreBackupData,
  UpdateAccountData,
  User,
} from '@/types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  constructor() {
    this.baseURL = this.resolveBaseURL();

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.api.interceptors.request.use(
      async (config) => {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('Sem conexao com a internet');
        }

        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.api(originalRequest);
              })
              .catch((refreshError) => Promise.reject(refreshError));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
              throw new Error('Refresh token nao encontrado');
            }

            const response = await this.refreshAuthToken(refreshToken);
            const newAccessToken = response.data?.accessToken;

            if (!newAccessToken) {
              throw new Error('Resposta invalida de refresh token');
            }

            await this.setAccessToken(newAccessToken);
            await this.setRefreshToken(response.data?.refreshToken || '');

            this.api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            this.processQueue(null, newAccessToken);

            return this.api(originalRequest);
          } catch (refreshError) {
            const normalizedError = this.normalizeError(refreshError);
            this.processQueue(normalizedError, null);
            await this.clearTokens();
            throw normalizedError;
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private resolveBaseURL(): string {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }

    if (!__DEV__) {
      return 'https://api.hellauthenticator.com/api';
    }

    return 'http://localhost:3000/api';
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as { message?: string; error?: string } | undefined;
      const message = responseData?.message || responseData?.error;

      if (message) {
        return new Error(message);
      }

      if (error.code === 'ECONNABORTED') {
        return new Error('Tempo de resposta da API esgotado');
      }

      if (error.message.includes('Network Error')) {
        return new Error('Nao foi possivel conectar ao backend');
      }
    }

    return new Error('Erro desconhecido');
  }

  private wrapSuccess<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
    };
  }

  private processQueue(error: unknown, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('accessToken');
    } catch {
      return null;
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('refreshToken');
    } catch {
      return null;
    }
  }

  private async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem('accessToken', token);
  }

  private async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem('refreshToken', token);
  }

  private async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    const response = await this.api.post('/auth/login', credentials);
    return this.wrapSuccess(response.data);
  }

  async register(data: RegisterData): Promise<ApiResponse<User>> {
    const response = await this.api.post('/auth/register', data);
    return this.wrapSuccess(response.data.user);
  }

  async refreshAuthToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    const response = await this.api.post('/auth/refresh', { refreshToken });
    return this.wrapSuccess(response.data);
  }

  async logout(): Promise<ApiResponse<void>> {
    const refreshToken = await this.getRefreshToken();

    try {
      if (refreshToken) {
        await this.api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout errors
    } finally {
      await this.clearTokens();
    }

    return { success: true };
  }

  async logoutAll(): Promise<ApiResponse<void>> {
    const response = await this.api.post('/auth/logout-all');
    await this.clearTokens();
    return this.wrapSuccess(response.data);
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.api.get('/auth/me');
    return this.wrapSuccess(response.data.user);
  }

  async validateToken(): Promise<ApiResponse<boolean>> {
    const token = await this.getAccessToken();

    if (!token) {
      return this.wrapSuccess(false);
    }

    const response = await this.api.post('/auth/validate', { token });
    return this.wrapSuccess(response.data.valid === true);
  }

  async getAccounts(): Promise<ApiResponse<Account[]>> {
    const response = await this.api.get('/accounts');
    return this.wrapSuccess(response.data.accounts ?? response.data);
  }

  async getAccount(accountId: string): Promise<ApiResponse<Account>> {
    const response = await this.api.get(`/accounts/${accountId}`);
    return this.wrapSuccess(response.data.account ?? response.data);
  }

  async createAccount(data: CreateAccountData): Promise<ApiResponse<Account>> {
    const response = await this.api.post('/accounts', data);
    return this.wrapSuccess(response.data.account ?? response.data);
  }

  async updateAccount(accountId: string, data: UpdateAccountData): Promise<ApiResponse<Account>> {
    const response = await this.api.put(`/accounts/${accountId}`, data);
    return this.wrapSuccess(response.data.account ?? response.data);
  }

  async deleteAccount(accountId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/accounts/${accountId}`);
    return this.wrapSuccess(response.data);
  }

  async incrementAccountUsage(accountId: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/accounts/${accountId}/increment-usage`);
    return this.wrapSuccess(response.data);
  }

  async searchAccounts(query: string): Promise<ApiResponse<Account[]>> {
    const response = await this.api.get('/accounts/search', {
      params: { q: query },
    });
    return this.wrapSuccess(response.data.accounts ?? response.data);
  }

  async getAccountStats(): Promise<ApiResponse<{
    total: number;
    active: number;
    totalUsage: number;
    mostUsed: Account | null;
  }>> {
    const response = await this.api.get('/accounts/stats');
    return this.wrapSuccess(response.data);
  }

  async getAccountBackupData(accountId: string): Promise<ApiResponse<Partial<Account>>> {
    const response = await this.api.get(`/accounts/${accountId}/backup-data`);
    return this.wrapSuccess(response.data);
  }

  async getBackups(): Promise<ApiResponse<Backup[]>> {
    const response = await this.api.get('/backup');
    return this.wrapSuccess(response.data.backups ?? response.data);
  }

  async getBackup(backupId: string): Promise<ApiResponse<Backup>> {
    const response = await this.api.get(`/backup/${backupId}`);
    return this.wrapSuccess(response.data.backup ?? response.data);
  }

  async createBackup(data: CreateBackupData): Promise<ApiResponse<Backup>> {
    const response = await this.api.post('/backup', data);
    return this.wrapSuccess(response.data.backup ?? response.data);
  }

  async restoreBackup(
    backupId: string,
    data: RestoreBackupData
  ): Promise<ApiResponse<{ restoredAccounts: number; skippedAccounts: number }>> {
    const response = await this.api.post(`/backup/${backupId}/restore`, data);
    return this.wrapSuccess(response.data);
  }

  async deleteBackup(backupId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/backup/${backupId}`);
    return this.wrapSuccess(response.data);
  }

  async uploadBackupToCloud(backupId: string, cloudProvider: string, cloudPath: string): Promise<ApiResponse<void>> {
    const response = await this.api.post(`/backup/${backupId}/upload-to-cloud`, {
      cloudProvider,
      cloudPath,
    });
    return this.wrapSuccess(response.data);
  }

  async downloadBackupFromCloud(backupId: string): Promise<ApiResponse<string>> {
    const response = await this.api.get(`/backup/${backupId}/download-from-cloud`);
    return this.wrapSuccess(response.data);
  }

  async getBackupStats(): Promise<ApiResponse<{
    total: number;
    totalSize: number;
    cloudBackups: number;
    localBackups: number;
    expiredBackups: number;
  }>> {
    const response = await this.api.get('/backup/stats');
    return this.wrapSuccess(response.data);
  }

  async cleanupExpiredBackups(): Promise<ApiResponse<number>> {
    const response = await this.api.post('/backup/cleanup-expired');
    return this.wrapSuccess(response.data);
  }

  async healthCheck(): Promise<ApiResponse<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  }>> {
    const response = await this.api.get('/../health');
    return this.wrapSuccess(response.data);
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      const response = await this.validateToken();
      return response.success && response.data === true;
    } catch {
      return false;
    }
  }

  async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await AsyncStorage.multiGet(['accessToken', 'refreshToken']);

    return {
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
    };
  }
}

export const apiService = new ApiService();
export default apiService;
