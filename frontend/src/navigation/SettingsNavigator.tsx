import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsStackParamList } from '@/types';

// Importar telas (serão criadas posteriormente)
import { SettingsMainScreen } from '@/screens/settings/SettingsMainScreen';
import { SecurityScreen } from '@/screens/settings/SecurityScreen';
import { NotificationsScreen } from '@/screens/settings/NotificationsScreen';
import { BackupSettingsScreen } from '@/screens/settings/BackupSettingsScreen';
import { AboutScreen } from '@/screens/settings/AboutScreen';

const Stack = createStackNavigator<SettingsStackParamList>();

export const SettingsNavigator: React.FC = () => {
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
      initialRouteName="SettingsMain"
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsMainScreen}
        options={{
          title: 'Configurações',
        }}
      />
      <Stack.Screen 
        name="Security" 
        component={SecurityScreen}
        options={{
          title: 'Segurança',
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          title: 'Notificações',
        }}
      />
      <Stack.Screen 
        name="Backup" 
        component={BackupSettingsScreen}
        options={{
          title: 'Backup',
        }}
      />
      <Stack.Screen 
        name="About" 
        component={AboutScreen}
        options={{
          title: 'Sobre',
        }}
      />
    </Stack.Navigator>
  );
};
