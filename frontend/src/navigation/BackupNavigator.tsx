import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BackupStackParamList } from '@/types';

// Importar telas (serão criadas posteriormente)
import { BackupListScreen } from '@/screens/backup/BackupListScreen';
import { BackupDetailScreen } from '@/screens/backup/BackupDetailScreen';
import { CreateBackupScreen } from '@/screens/backup/CreateBackupScreen';
import { RestoreBackupScreen } from '@/screens/backup/RestoreBackupScreen';
import { CloudSettingsScreen } from '@/screens/backup/CloudSettingsScreen';

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
          title: 'Detalhes do Backup',
        }}
      />
      <Stack.Screen 
        name="CreateBackup" 
        component={CreateBackupScreen}
        options={{
          title: 'Criar Backup',
        }}
      />
      <Stack.Screen 
        name="RestoreBackup" 
        component={RestoreBackupScreen}
        options={{
          title: 'Restaurar Backup',
        }}
      />
      <Stack.Screen 
        name="CloudSettings" 
        component={CloudSettingsScreen}
        options={{
          title: 'Configurações Cloud',
        }}
      />
    </Stack.Navigator>
  );
};
