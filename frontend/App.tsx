import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { LogBox, NativeModules, StatusBar, StyleSheet, View } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { store, useAppDispatch } from '@/store';
import {
  checkNetworkStatus,
  checkPermissions,
  loadAppSettings,
  setOnlineStatus,
} from '@/store/slices/appSlice';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
  'AsyncStorage has been extracted from react-native core',
]);

const hasSafeAreaNativeModule = Boolean((NativeModules as Record<string, unknown>).RNCSafeAreaContext);

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await dispatch(loadAppSettings()).unwrap();
        await dispatch(checkNetworkStatus()).unwrap();
        await dispatch(checkPermissions()).unwrap();
      } catch {
        // Inicializacao best-effort; erros individuais sao tratados nos slices.
      }
    };

    initializeApp();
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      dispatch(setOnlineStatus(Boolean(state.isConnected && state.isInternetReachable)));
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent
      />
      <AppNavigator />
      <Toast />
    </NavigationContainer>
  );
};

const SafeAreaBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (hasSafeAreaNativeModule) {
    return <SafeAreaProvider>{children}</SafeAreaProvider>;
  }

  return <View style={styles.root}>{children}</View>;
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaBoundary>
            <ThemeProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </ThemeProvider>
          </SafeAreaBoundary>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
