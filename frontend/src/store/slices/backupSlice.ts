import apiService from '@/services/api';
import {
    Backup,
    BackupState,
    CloudProvider,
    CreateBackupData,
    RestoreBackupData
} from '@/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: BackupState = {
  backups: [],
  selectedBackup: null,
  isLoading: false,
  error: null,
  autoBackupEnabled: false,
  lastBackupDate: null,
};

// Async thunks
export const fetchBackups = createAsyncThunk(
  'backup/fetchBackups',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getBackups();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao carregar backups');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const fetchBackup = createAsyncThunk(
  'backup/fetchBackup',
  async (backupId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getBackup(backupId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao carregar backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const createBackup = createAsyncThunk(
  'backup/createBackup',
  async (data: CreateBackupData, { rejectWithValue }) => {
    try {
      const response = await apiService.createBackup(data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao criar backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const restoreBackup = createAsyncThunk(
  'backup/restoreBackup',
  async ({ backupId, data }: { backupId: string; data: RestoreBackupData }, { rejectWithValue }) => {
    try {
      const response = await apiService.restoreBackup(backupId, data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao restaurar backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const deleteBackup = createAsyncThunk(
  'backup/deleteBackup',
  async (backupId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteBackup(backupId);
      
      if (response.success) {
        return backupId;
      } else {
        return rejectWithValue(response.error || 'Falha ao deletar backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const uploadBackupToCloud = createAsyncThunk(
  'backup/uploadToCloud',
  async ({ backupId, cloudProvider, cloudPath }: { backupId: string; cloudProvider: CloudProvider; cloudPath: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.uploadBackupToCloud(backupId, cloudProvider, cloudPath);
      
      if (response.success) {
        return { backupId, cloudProvider, cloudPath };
      } else {
        return rejectWithValue(response.error || 'Falha ao fazer upload do backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const downloadBackupFromCloud = createAsyncThunk(
  'backup/downloadFromCloud',
  async (backupId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.downloadBackupFromCloud(backupId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao fazer download do backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const getBackupStats = createAsyncThunk(
  'backup/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getBackupStats();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao obter estatísticas de backup');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const cleanupExpiredBackups = createAsyncThunk(
  'backup/cleanupExpired',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.cleanupExpiredBackups();
      
      if (response.success && response.data !== undefined) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao limpar backups expirados');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

// Slice
const backupSlice = createSlice({
  name: 'backup',
  initialState,
  reducers: {
    setSelectedBackup: (state, action: PayloadAction<Backup | null>) => {
      state.selectedBackup = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setAutoBackupEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoBackupEnabled = action.payload;
    },
    setLastBackupDate: (state, action: PayloadAction<string | null>) => {
      state.lastBackupDate = action.payload;
    },
    addBackup: (state, action: PayloadAction<Backup>) => {
      state.backups.push(action.payload);
    },
    updateBackupInList: (state, action: PayloadAction<Backup>) => {
      const index = state.backups.findIndex(backup => backup.id === action.payload.id);
      if (index !== -1) {
        state.backups[index] = action.payload;
      }
    },
    removeBackupFromList: (state, action: PayloadAction<string>) => {
      state.backups = state.backups.filter(backup => backup.id !== action.payload);
      if (state.selectedBackup?.id === action.payload) {
        state.selectedBackup = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch Backups
    builder
      .addCase(fetchBackups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBackups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.backups = action.payload;
        state.error = null;
      })
      .addCase(fetchBackups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Backup
    builder
      .addCase(fetchBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBackup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedBackup = action.payload;
        state.error = null;
      })
      .addCase(fetchBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Backup
    builder
      .addCase(createBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBackup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.backups.push(action.payload);
        state.lastBackupDate = new Date().toISOString();
        state.error = null;
      })
      .addCase(createBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Restore Backup
    builder
      .addCase(restoreBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreBackup.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // Aqui você pode adicionar lógica adicional após a restauração
      })
      .addCase(restoreBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Backup
    builder
      .addCase(deleteBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBackup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.backups = state.backups.filter(backup => backup.id !== action.payload);
        if (state.selectedBackup?.id === action.payload) {
          state.selectedBackup = null;
        }
        state.error = null;
      })
      .addCase(deleteBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Upload to Cloud
    builder
      .addCase(uploadBackupToCloud.fulfilled, (state, action) => {
        const { backupId, cloudProvider, cloudPath } = action.payload;
        const backup = state.backups.find(b => b.id === backupId);
        if (backup) {
          backup.cloudProvider = cloudProvider;
          backup.cloudPath = cloudPath;
          backup.type = 'cloud';
        }
        if (state.selectedBackup?.id === backupId) {
          state.selectedBackup.cloudProvider = cloudProvider;
          state.selectedBackup.cloudPath = cloudPath;
          state.selectedBackup.type = 'cloud';
        }
      });

    // Get Backup Stats
    builder
      .addCase(getBackupStats.fulfilled, () => {
        // Aqui você pode armazenar estatísticas se necessário
      });

    // Cleanup Expired Backups
    builder
      .addCase(cleanupExpiredBackups.fulfilled, (state, action) => {
        // Remover backups expirados da lista local
        const deletedCount = action.payload;
        if (deletedCount > 0) {
          // Atualizar lista removendo backups expirados
          state.backups = state.backups.filter(backup => {
            const expiresAt = new Date(backup.expiresAt);
            return expiresAt > new Date();
          });
        }
      });
  },
});

export const {
  setSelectedBackup,
  clearError,
  setAutoBackupEnabled,
  setLastBackupDate,
  addBackup,
  updateBackupInList,
  removeBackupFromList,
} = backupSlice.actions;

// Selectors
export const selectBackupsByType = (state: { backup: BackupState }, type: string) => {
  return state.backup.backups.filter(backup => backup.type === type);
};

export const selectCloudBackups = (state: { backup: BackupState }) => {
  return state.backup.backups.filter(backup => backup.type === 'cloud');
};

export const selectLocalBackups = (state: { backup: BackupState }) => {
  return state.backup.backups.filter(backup => backup.type === 'local');
};

export const selectExpiredBackups = (state: { backup: BackupState }) => {
  return state.backup.backups.filter(backup => {
    const expiresAt = new Date(backup.expiresAt);
    return expiresAt <= new Date();
  });
};

export default backupSlice.reducer;





