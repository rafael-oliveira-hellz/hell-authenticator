import { apiService } from '@/services/api';
import {
    AuthState,
    AuthTokens,
    BiometricType,
    LoginCredentials,
    RegisterData,
    User
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  biometricEnabled: false,
  biometricType: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        // Armazenar tokens
        await AsyncStorage.setItem('accessToken', response.data.tokens.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
        
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha no login');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await apiService.register(data);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha no registro');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logout();
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      return true;
    } catch (error) {
      // Sempre limpar tokens localmente, mesmo se a API falhar
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const logoutAll = createAsyncThunk(
  'auth/logoutAll',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logoutAll();
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      return true;
    } catch (error) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getCurrentUser();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Falha ao obter usuário');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const validateToken = createAsyncThunk(
  'auth/validateToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.validateToken();
      return response.success && response.data === true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const checkBiometricSupport = createAsyncThunk(
  'auth/checkBiometricSupport',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implementar verificação de biometria
      // Por enquanto, retorna false
      return {
        supported: false,
        type: null as BiometricType | null
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

export const setupBiometric = createAsyncThunk(
  'auth/setupBiometric',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Implementar configuração de biometria
      return {
        success: true,
        type: 'fingerprint' as BiometricType
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setBiometricType: (state, action: PayloadAction<BiometricType>) => {
      state.biometricType = action.payload;
    },
    updateUserPreferences: (state, action: PayloadAction<Partial<User['preferences']>>) => {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Logout All
    builder
      .addCase(logoutAll.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutAll.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutAll.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });

    // Get Current User
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Validate Token
    builder
      .addCase(validateToken.fulfilled, (state, action) => {
        if (!action.payload) {
          state.user = null;
          state.tokens = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(validateToken.rejected, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
      });

    // Check Biometric Support
    builder
      .addCase(checkBiometricSupport.fulfilled, (state, action) => {
        state.biometricEnabled = action.payload.supported;
        state.biometricType = action.payload.type;
      });

    // Setup Biometric
    builder
      .addCase(setupBiometric.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.biometricEnabled = true;
          state.biometricType = action.payload.type;
        }
      });
  },
});

export const {
  setUser,
  setTokens,
  clearAuth,
  setError,
  clearError,
  setBiometricEnabled,
  setBiometricType,
  updateUserPreferences,
} = authSlice.actions;

export default authSlice.reducer;
