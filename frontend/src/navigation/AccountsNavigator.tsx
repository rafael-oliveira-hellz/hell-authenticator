import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import { AddAccountScreen } from '@/screens/accounts/AddAccountScreen';
import { AccountDetailScreen } from '@/screens/accounts/AccountDetailScreen';
import { AccountListScreen } from '@/screens/accounts/AccountListScreen';
import { EditAccountScreen } from '@/screens/accounts/EditAccountScreen';
import { ManualEntryScreen } from '@/screens/accounts/ManualEntryScreen';
import { QRScannerScreen } from '@/screens/accounts/QRScannerScreen';
import { AccountStackParamList } from '@/types';

const Stack = createStackNavigator<AccountStackParamList>();

export const AccountsNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      initialRouteName="AccountList"
    >
      <Stack.Screen
        name="AccountList"
        component={AccountListScreen}
        options={{
          title: 'Minhas contas',
        }}
      />
      <Stack.Screen
        name="AccountDetail"
        component={AccountDetailScreen}
        options={{
          title: 'Detalhes da conta',
        }}
      />
      <Stack.Screen
        name="AddAccount"
        component={AddAccountScreen}
        options={{
          title: 'Confirmar conta',
        }}
      />
      <Stack.Screen
        name="EditAccount"
        component={EditAccountScreen}
        options={{
          title: 'Editar conta',
        }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: 'Escanear QR Code',
        }}
      />
      <Stack.Screen
        name="ManualEntry"
        component={ManualEntryScreen}
        options={{
          title: 'Adicionar manualmente',
        }}
      />
    </Stack.Navigator>
  );
};
