import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  getCurrentUser,
  validateToken,
  logout,
  clearAuth,
} from '@/store/slices/authSlice';
import { User, AuthTokens } from '@/types';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, tokens, isAuthenticated, error } = useAppSelector((state) => state.auth);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isValid = await dispatch(validateToken()).unwrap();

        if (isValid) {
          await dispatch(getCurrentUser()).unwrap();
        }
      } catch {
        // The validation thunk is responsible for invalid token cleanup.
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [dispatch]);

  const login = (_authTokens: AuthTokens, _userData: User) => {
    // State is updated by Redux after successful login flow.
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch {
      // Force cleanup even if API logout fails.
      dispatch(clearAuth());
    }
  };

  const clearError = () => {
    // Placeholder for future explicit error reset action.
  };

  const refreshUser = async () => {
    try {
      await dispatch(getCurrentUser()).unwrap();
    } catch {
      // Keep current session state on refresh failure.
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated,
    isLoading: !isInitialized,
    error,
    login,
    logout: handleLogout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
