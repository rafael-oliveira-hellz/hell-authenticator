import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import { BackupDetailScreen } from '@/screens/backup/BackupDetailScreen';
import { BackupListScreen } from '@/screens/backup/BackupListScreen';
import { CloudSettingsScreen } from '@/screens/backup/CloudSettingsScreen';
import { CreateBackupScreen } from '@/screens/backup/CreateBackupScreen';
import { RestoreBackupScreen } from '@/screens/backup/RestoreBackupScreen';
import { BackupStackParamList } from '@/types';

const Stack = createStackNavigator<BackupStackParamList>();

export const BackupNavigator: React.FC = () => {
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
      initialRouteName="BackupList"
    >
      <Stack.Screen
        name="BackupList"
        component={BackupListScreen}
        options={{
          title: 'Backups',
        }}
      />
      <Stack.Screen
        name="BackupDetail"
        component={BackupDetailScreen}
        options={{
          title: 'Detalhes do backup',
        }}
      />
      <Stack.Screen
        name="CreateBackup"
        component={CreateBackupScreen}
        options={{
          title: 'Criar backup',
        }}
      />
      <Stack.Screen
        name="RestoreBackup"
        component={RestoreBackupScreen}
        options={{
          title: 'Restaurar backup',
        }}
      />
      <Stack.Screen
        name="CloudSettings"
        component={CloudSettingsScreen}
        options={{
          title: 'Provedores de nuvem',
        }}
      />
    </Stack.Navigator>
  );
};
