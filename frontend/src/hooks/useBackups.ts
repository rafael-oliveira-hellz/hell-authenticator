import apiService from '@/services/api';
import { Backup, CreateBackupData, RestoreBackupData } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const backupQueryKeys = {
  list: ['backups'] as const,
  detail: (backupId: string) => ['backup', backupId] as const,
};

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
