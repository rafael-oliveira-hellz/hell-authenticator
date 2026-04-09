import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types';

// Importar telas (serão criadas posteriormente)
import { HomeScreen } from '@/screens/main/HomeScreen';
import { AccountsNavigator } from '@/navigation/AccountsNavigator';
import { ScannerScreen } from '@/screens/main/ScannerScreen';
import { BackupNavigator } from '@/navigation/BackupNavigator';
import { SettingsNavigator } from '@/navigation/SettingsNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          // tabBarIcon: ({ color, size }) => (
          //   <Icon name="home" size={size} color={color} />
          // ),
        }}
      />
      <Tab.Screen 
        name="Accounts" 
        component={AccountsNavigator}
        options={{
          tabBarLabel: 'Contas',
          // tabBarIcon: ({ color, size }) => (
          //   <Icon name="key" size={size} color={color} />
          // ),
        }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{
          tabBarLabel: 'Scanner',
          // tabBarIcon: ({ color, size }) => (
          //   <Icon name="qrcode" size={size} color={color} />
          // ),
        }}
      />
      <Tab.Screen 
        name="Backup" 
        component={BackupNavigator}
        options={{
          tabBarLabel: 'Backup',
          // tabBarIcon: ({ color, size }) => (
          //   <Icon name="cloud" size={size} color={color} />
          // ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Configurações',
          // tabBarIcon: ({ color, size }) => (
          //   <Icon name="settings" size={size} color={color} />
          // ),
        }}
      />
    </Tab.Navigator>
  );
};
