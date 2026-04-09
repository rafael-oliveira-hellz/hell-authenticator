import apiService from '@/services/api';
import { Account, CreateAccountData, UpdateAccountData } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type AccountStats = {
  total: number;
  active: number;
  totalUsage: number;
  mostUsed: Account | null;
};

export const accountQueryKeys = {
  list: ['accounts'] as const,
  stats: ['account-stats'] as const,
  detail: (accountId: string) => ['account', accountId] as const,
};

export function useAccountsQuery() {
  return useQuery<Account[]>({
    queryKey: accountQueryKeys.list,
    queryFn: async () => {
      const response = await apiService.getAccounts();
      if (!response.success) {
        throw new Error(response.error || 'Falha ao carregar contas');
      }
      return response.data || [];
    },
  });
}

export function useAccountQuery(accountId: string) {
  return useQuery<Account>({
    queryKey: accountQueryKeys.detail(accountId),
    queryFn: async () => {
      const response = await apiService.getAccount(accountId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao carregar conta');
      }
      return response.data;
    },
  });
}

export function useAccountStatsQuery() {
  return useQuery<AccountStats>({
    queryKey: accountQueryKeys.stats,
    queryFn: async () => {
      const response = await apiService.getAccountStats();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao carregar estatisticas');
      }
      return response.data;
    },
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAccountData) => {
      const response = await apiService.createAccount(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao criar conta');
      }
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.stats }),
      ]);
    },
  });
}

export function useUpdateAccountMutation(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAccountData) => {
      const response = await apiService.updateAccount(accountId, payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao atualizar conta');
      }
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.stats }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail(accountId) }),
      ]);
    },
  });
}

export function useDeleteAccountMutation(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiService.deleteAccount(accountId);
      if (!response.success) {
        throw new Error(response.error || 'Falha ao deletar conta');
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.list }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.stats }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.detail(accountId) }),
      ]);
    },
  });
}
