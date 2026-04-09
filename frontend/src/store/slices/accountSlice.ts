import { apiService } from '@/services/api';
import { totpService } from '@/services/totp';
import {
    Account,
    AccountState,
    CreateAccountData,
    UpdateAccountData
} from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: AccountState = {
  accounts: [],
  selectedAccount: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filterCategory: null,
  sortBy: 'name',
  sortOrder: 'asc',
};

// Async thunks
export const fetchAccounts = createAsyncThunk(
  'account/fetchAccounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getAccounts();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao carregar contas');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const fetchAccount = createAsyncThunk(
  'account/fetchAccount',
  async (accountId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getAccount(accountId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao carregar conta');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const createAccount = createAsyncThunk(
  'account/createAccount',
  async (data: CreateAccountData, { rejectWithValue }) => {
    try {
      const response = await apiService.createAccount(data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao criar conta');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const updateAccount = createAsyncThunk(
  'account/updateAccount',
  async ({ accountId, data }: { accountId: string; data: UpdateAccountData }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateAccount(accountId, data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao atualizar conta');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'account/deleteAccount',
  async (accountId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteAccount(accountId);
      
      if (response.success) {
        return accountId;
      } else {
        return rejectWithValue(response.error || 'Falha ao deletar conta');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const incrementAccountUsage = createAsyncThunk(
  'account/incrementUsage',
  async (accountId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.incrementAccountUsage(accountId);
      
      if (response.success) {
        return accountId;
      } else {
        return rejectWithValue(response.error || 'Falha ao incrementar uso');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const searchAccounts = createAsyncThunk(
  'account/searchAccounts',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await apiService.searchAccounts(query);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha na busca');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const getAccountStats = createAsyncThunk(
  'account/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getAccountStats();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao obter estatísticas');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

// Slice
const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<Account | null>) => {
      state.selectedAccount = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilterCategory: (state, action: PayloadAction<string | null>) => {
      state.filterCategory = action.payload;
    },
    setSortBy: (state, action: PayloadAction<'name' | 'issuer' | 'lastUsed' | 'usageCount'>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    addAccount: (state, action: PayloadAction<Account>) => {
      state.accounts.push(action.payload);
    },
    updateAccountInList: (state, action: PayloadAction<Account>) => {
      const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
      if (index !== -1) {
        state.accounts[index] = action.payload;
      }
    },
    removeAccountFromList: (state, action: PayloadAction<string>) => {
      state.accounts = state.accounts.filter(acc => acc.id !== action.payload);
      if (state.selectedAccount?.id === action.payload) {
        state.selectedAccount = null;
      }
    },
    generateTOTPForAccount: (state, action: PayloadAction<string>) => {
      const account = state.accounts.find(acc => acc.id === action.payload);
      if (account) {
        totpService.generateTOTP(account);
        // Atualizar a conta com o código TOTP (se necessário)
        const index = state.accounts.findIndex(acc => acc.id === action.payload);
        if (index !== -1) {
          state.accounts[index] = { ...account, lastUsedAt: new Date().toISOString() };
        }
      }
    },
    generateTOTPForAllAccounts: (state) => {
      state.accounts.forEach(account => {
        totpService.generateTOTP(account);
        // Aqui você pode armazenar os códigos TOTP se necessário
      });
    },
  },
  extraReducers: (builder) => {
    // Fetch Accounts
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = action.payload;
        state.error = null;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Account
    builder
      .addCase(fetchAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedAccount = action.payload;
        state.error = null;
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Account
    builder
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts.push(action.payload);
        state.error = null;
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Account
    builder
      .addCase(updateAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
        if (index !== -1) {
          state.accounts[index] = action.payload;
        }
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload;
        }
        state.error = null;
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Account
    builder
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = state.accounts.filter(acc => acc.id !== action.payload);
        if (state.selectedAccount?.id === action.payload) {
          state.selectedAccount = null;
        }
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Increment Usage
    builder
      .addCase(incrementAccountUsage.fulfilled, (state, action) => {
        const account = state.accounts.find(acc => acc.id === action.payload);
        if (account) {
          account.usageCount += 1;
          account.lastUsedAt = new Date().toISOString();
        }
        if (state.selectedAccount?.id === action.payload) {
          state.selectedAccount.usageCount += 1;
          state.selectedAccount.lastUsedAt = new Date().toISOString();
        }
      });

    // Search Accounts
    builder
      .addCase(searchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accounts = action.payload;
        state.error = null;
      })
      .addCase(searchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedAccount,
  setSearchQuery,
  setFilterCategory,
  setSortBy,
  setSortOrder,
  clearError,
  addAccount,
  updateAccountInList,
  removeAccountFromList,
  generateTOTPForAccount,
  generateTOTPForAllAccounts,
} = accountSlice.actions;

// Selectors
export const selectFilteredAndSortedAccounts = (state: { account: AccountState }) => {
  const { accounts, searchQuery, filterCategory, sortBy, sortOrder } = state.account;
  
  let filtered = accounts;
  
  // Aplicar filtro de busca
  if (searchQuery) {
    filtered = filtered.filter(account =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (account.issuer && account.issuer.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }
  
  // Aplicar filtro de categoria
  if (filterCategory) {
    filtered = filtered.filter(account =>
      account.metadata?.category === filterCategory
    );
  }
  
  // Aplicar ordenação
  filtered.sort((a, b) => {
    let aValue: string | number | undefined;
    let bValue: string | number | undefined;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'issuer':
        aValue = a.issuer || '';
        bValue = b.issuer || '';
        break;
      case 'lastUsed':
        aValue = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        bValue = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        break;
      case 'usageCount':
        aValue = a.usageCount;
        bValue = b.usageCount;
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  return filtered;
};

export default accountSlice.reducer;


