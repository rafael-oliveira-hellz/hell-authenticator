import {
    AppNotification,
    AppState,
    Language,
    Theme
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: AppState = {
  theme: 'auto',
  language: 'pt-BR',
  isOnline: true,
  isLoading: false,
  error: null,
  notifications: [],
};

// Async thunks
export const checkNetworkStatus = createAsyncThunk(
  'app/checkNetworkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const netInfo = await NetInfo.fetch();
      return {
        isConnected: netInfo.isConnected || false,
        isInternetReachable: netInfo.isInternetReachable || false,
        type: netInfo.type,
        isWifi: netInfo.type === 'wifi',
        isCellular: netInfo.type === 'cellular',
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const loadAppSettings = createAsyncThunk(
  'app/loadSettings',
  async (_, { rejectWithValue }) => {
    try {
      const [theme, language] = await AsyncStorage.multiGet([
        'app_theme',
        'app_language'
      ]);
      
      return {
        theme: (theme[1] as Theme) || 'auto',
        language: (language[1] as Language) || 'pt-BR',
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const saveAppSettings = createAsyncThunk(
  'app/saveSettings',
  async ({ theme, language }: { theme: Theme; language: Language }, { rejectWithValue }) => {
    try {
      await AsyncStorage.multiSet([
        ['app_theme', theme],
        ['app_language', language]
      ]);
      
      return { theme, language };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const checkPermissions = createAsyncThunk(
  'app/checkPermissions',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implementar verificação de permissões
      // Por enquanto, retorna valores padrão
      return {
        camera: 'granted' as const,
        biometrics: 'granted' as const,
        notifications: 'granted' as const,
        storage: 'granted' as const,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

// Slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action: PayloadAction<Omit<AppNotification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: AppNotification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
        read: false,
      };
      state.notifications.unshift(notification);
      
      // Manter apenas as últimas 50 notificações
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    clearReadNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.read);
    },
  },
  extraReducers: (builder) => {
    // Check Network Status
    builder
      .addCase(checkNetworkStatus.fulfilled, (state, action) => {
        state.isOnline = action.payload.isConnected && action.payload.isInternetReachable;
      })
      .addCase(checkNetworkStatus.rejected, (state) => {
        state.isOnline = false;
      });

    // Load App Settings
    builder
      .addCase(loadAppSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadAppSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.theme = action.payload.theme;
        state.language = action.payload.language;
      })
      .addCase(loadAppSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Save App Settings
    builder
      .addCase(saveAppSettings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(saveAppSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.theme = action.payload.theme;
        state.language = action.payload.language;
      })
      .addCase(saveAppSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setTheme,
  setLanguage,
  setOnlineStatus,
  setLoading,
  setError,
  clearError,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearNotifications,
  clearReadNotifications,
} = appSlice.actions;

// Selectors
export const selectUnreadNotifications = (state: { app: AppState }) => {
  return state.app.notifications.filter(notification => !notification.read);
};

export const selectNotificationsByType = (state: { app: AppState }, type: AppNotification['type']) => {
  return state.app.notifications.filter(notification => notification.type === type);
};

export const selectRecentNotifications = (state: { app: AppState }, count: number = 10) => {
  return state.app.notifications.slice(0, count);
};

export const selectNotificationCount = (state: { app: AppState }) => {
  return state.app.notifications.length;
};

export const selectUnreadNotificationCount = (state: { app: AppState }) => {
  return state.app.notifications.filter(notification => !notification.read).length;
};

export default appSlice.reducer;
