import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SettingsMainScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const settingsItems = [
    {
      title: 'Segurança',
      subtitle: 'Biometria, PIN e configurações de segurança',
      icon: 'Seg',
      onPress: () => navigation.navigate('Security' as never),
    },
    {
      title: 'Notificações',
      subtitle: 'Configurar alertas e notificações',
      icon: 'Not',
      onPress: () => navigation.navigate('Notifications' as never),
    },
    {
      title: 'Backup',
      subtitle: 'Configurar backup automático e nuvem',
      icon: 'Bkp',
      onPress: () => navigation.navigate('Backup' as never),
    },
    {
      title: 'Sobre',
      subtitle: 'Informações do app e versão',
      icon: 'Info',
      onPress: () => navigation.navigate('About' as never),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.userSection, { backgroundColor: colors.surface }]}> 
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Usuário'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email || 'usuario@exemplo.com'}</Text>
        </View>
      </View>

      <View style={[styles.settingsSection, { backgroundColor: colors.surface }]}> 
        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={item.onPress}
          >
            <Text style={styles.settingIcon}>{item.icon}</Text>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.settingArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.logoutSection, { backgroundColor: colors.surface }]}> 
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userSection: {
    padding: 20,
    marginBottom: 10,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  settingsSection: {
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  settingIcon: {
    fontSize: 14,
    fontWeight: '700',
    width: 36,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  settingArrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutSection: {
    padding: 20,
  },
  logoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
