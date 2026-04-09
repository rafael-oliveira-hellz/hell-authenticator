import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomTabNavigationOptions, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

import { HomeScreen } from '@/screens/main/HomeScreen';
import { AccountsNavigator } from '@/navigation/AccountsNavigator';
import { ScannerScreen } from '@/screens/main/ScannerScreen';
import { BackupNavigator } from '@/navigation/BackupNavigator';
import { SettingsNavigator } from '@/navigation/SettingsNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_META: Record<keyof MainTabParamList, { label: string; icon: string }> = {
  Home: { label: 'Início', icon: '⌂' },
  Accounts: { label: 'Contas', icon: '◫' },
  Scanner: { label: 'Scanner', icon: '◉' },
  Backup: { label: 'Backup', icon: '☁' },
  Settings: { label: 'Ajustes', icon: '⚙' },
};

type ThemeColors = {
  primary: string;
  textSecondary: string;
  card: string;
};

type TabIconProps = {
  color: string;
  focused: boolean;
  symbol: string;
};

const TabIcon: React.FC<TabIconProps> = ({ color, focused, symbol }) => (
  <Text style={[styles.tabIcon, focused ? styles.tabIconFocused : styles.tabIconDefault, { color }]}>{symbol}</Text>
);

const createScreenOptions = (colors: ThemeColors): BottomTabNavigationOptions => ({
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    height: 72,
    borderRadius: 24,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.card,
    borderTopWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  tabBarItemStyle: {
    borderRadius: 18,
    marginHorizontal: 4,
    marginVertical: 4,
  },
});

const createTabOptions = (label: string, symbol: string): BottomTabNavigationOptions => ({
  tabBarLabel: label,
  tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} symbol={symbol} />,
});

export const MainNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator screenOptions={createScreenOptions(colors)}>
      <Tab.Screen name="Home" component={HomeScreen} options={createTabOptions(TAB_META.Home.label, TAB_META.Home.icon)} />
      <Tab.Screen name="Accounts" component={AccountsNavigator} options={createTabOptions(TAB_META.Accounts.label, TAB_META.Accounts.icon)} />
      <Tab.Screen name="Scanner" component={ScannerScreen} options={createTabOptions(TAB_META.Scanner.label, TAB_META.Scanner.icon)} />
      <Tab.Screen name="Backup" component={BackupNavigator} options={createTabOptions(TAB_META.Backup.label, TAB_META.Backup.icon)} />
      <Tab.Screen name="Settings" component={SettingsNavigator} options={createTabOptions(TAB_META.Settings.label, TAB_META.Settings.icon)} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    marginTop: 4,
  },
  tabIconDefault: {
    fontSize: 20,
  },
  tabIconFocused: {
    fontSize: 22,
  },
});
