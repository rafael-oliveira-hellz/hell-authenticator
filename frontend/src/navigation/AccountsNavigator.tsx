import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AccountStackParamList } from '@/types';

// Importar telas (serão criadas posteriormente)
import { AccountListScreen } from '@/screens/accounts/AccountListScreen';
import { AccountDetailScreen } from '@/screens/accounts/AccountDetailScreen';
import { AddAccountScreen } from '@/screens/accounts/AddAccountScreen';
import { EditAccountScreen } from '@/screens/accounts/EditAccountScreen';
import { QRScannerScreen } from '@/screens/accounts/QRScannerScreen';
import { ManualEntryScreen } from '@/screens/accounts/ManualEntryScreen';

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
          title: 'Minhas Contas',
        }}
      />
      <Stack.Screen 
        name="AccountDetail" 
        component={AccountDetailScreen}
        options={{
          title: 'Detalhes da Conta',
        }}
      />
      <Stack.Screen 
        name="AddAccount" 
        component={AddAccountScreen}
        options={{
          title: 'Adicionar Conta',
        }}
      />
      <Stack.Screen 
        name="EditAccount" 
        component={EditAccountScreen}
        options={{
          title: 'Editar Conta',
        }}
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen}
        options={{
          title: 'Scanner QR Code',
        }}
      />
      <Stack.Screen 
        name="ManualEntry" 
        component={ManualEntryScreen}
        options={{
          title: 'Entrada Manual',
        }}
      />
    </Stack.Navigator>
  );
};
