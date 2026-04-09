import apiService from '@/services/api';
import {
  Backup,
  CloudProvider,
  CloudProviderInfo,
  ConnectUserCloudProviderData,
  CreateBackupData,
  RestoreBackupData,
  StartUserCloudOAuthData,
  StartUserCloudOAuthResult,
  UserCloudConnection,
  UserCloudProvider,
} from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const backupQueryKeys = {
  list: ['backups'] as const,
  providers: ['backup-providers'] as const,
  userConnections: ['backup-user-cloud-connections'] as const,
  detail: (backupId: string) => ['backup', backupId] as const,
};

export function useBackupProvidersQuery() {
  return useQuery<CloudProviderInfo[]>({
    queryKey: backupQueryKeys.providers,
    queryFn: async () => {
      const response = await apiService.getBackupProviders();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao carregar provedores de backup');
      }
      return response.data;
    },
  });
}

export function useBackupsQuery() {
  return useQuery<Backup[]>({
    queryKey: backupQueryKeys.list,
    queryFn: async () => {
      const response = await apiService.getBackups();
      if (!response.success) {
        throw new Error(response.error || 'Falha ao carregar backups');
      }
      return response.data || [];
    },
  });
}

export function useUserCloudConnectionsQuery() {
  return useQuery<UserCloudConnection[]>({
    queryKey: backupQueryKeys.userConnections,
    queryFn: async () => {
      const response = await apiService.getUserCloudConnections();
      if (!response.success) {
        throw new Error(response.error || 'Falha ao carregar conexões em nuvem');
      }
      return response.data || [];
    },
  });
}

export function useBackupQuery(backupId: string) {
  return useQuery<Backup>({
    queryKey: backupQueryKeys.detail(backupId),
    queryFn: async () => {
      const response = await apiService.getBackup(backupId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao carregar backup');
      }
      return response.data;
    },
  });
}

export function useCreateBackupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBackupData) => {
      const response = await apiService.createBackup(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao criar backup');
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: backupQueryKeys.list });
    },
  });
}

export function useDeleteBackupMutation(backupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiService.deleteBackup(backupId);
      if (!response.success) {
        throw new Error(response.error || 'Falha ao deletar backup');
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: backupQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: backupQueryKeys.detail(backupId) }),
      ]);
    },
  });
}

export function useRestoreBackupMutation(backupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RestoreBackupData) => {
      const response = await apiService.restoreBackup(backupId, payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao restaurar backup');
      }
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['account-stats'] }),
      ]);
    },
  });
}

export function useUploadBackupToCloudMutation(backupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { cloudProvider: CloudProvider; cloudPath?: string }) => {
      const response = await apiService.uploadBackupToCloud(
        backupId,
        payload.cloudProvider,
        payload.cloudPath ?? ''
      );

      if (!response.success) {
        throw new Error(response.error || 'Falha ao enviar backup para a nuvem');
      }

      return payload;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: backupQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: backupQueryKeys.detail(backupId) }),
      ]);
    },
  });
}

export function useDownloadBackupFromCloudMutation(backupId: string) {
  return useMutation({
    mutationFn: async () => {
      const response = await apiService.downloadBackupFromCloud(backupId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao baixar backup da nuvem');
      }

      return response.data;
    },
  });
}

export function useConnectUserCloudProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConnectUserCloudProviderData) => {
      const response = await apiService.connectUserCloudProvider(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao conectar conta em nuvem');
      }
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: backupQueryKeys.userConnections });
    },
  });
}

export function useStartUserCloudOAuthMutation() {
  return useMutation<StartUserCloudOAuthResult, Error, StartUserCloudOAuthData>({
    mutationFn: async (payload) => {
      const response = await apiService.startUserCloudOAuth(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao iniciar a conexão OAuth');
      }
      return response.data;
    },
  });
}

export function useDisconnectUserCloudProviderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: UserCloudProvider) => {
      const response = await apiService.disconnectUserCloudProvider(provider);
      if (!response.success) {
        throw new Error(response.error || 'Falha ao desconectar conta em nuvem');
      }
      return provider;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: backupQueryKeys.userConnections });
    },
  });
}
