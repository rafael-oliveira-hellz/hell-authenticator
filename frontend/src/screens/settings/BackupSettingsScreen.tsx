import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const BackupSettingsScreen: React.FC = () => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    button: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    flexOne: {
      flex: 1,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Backup automático</Text>

        <View style={styles.settingItem}>
          <View style={styles.flexOne}>
            <Text style={styles.settingLabel}>Backup na nuvem</Text>
            <Text style={styles.settingDescription}>
              Fazer backup automático dos seus dados na nuvem
            </Text>
          </View>
          <Switch value />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.flexOne}>
            <Text style={styles.settingLabel}>Backup local</Text>
            <Text style={styles.settingDescription}>
              Salvar backup localmente no dispositivo
            </Text>
          </View>
          <Switch value={false} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequência</Text>

        <View style={styles.settingItem}>
          <View style={styles.flexOne}>
            <Text style={styles.settingLabel}>Backup diario</Text>
            <Text style={styles.settingDescription}>
              Fazer backup todos os dias às 02:00
            </Text>
          </View>
          <Switch value />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Retenção</Text>

        <View style={styles.settingItem}>
          <View style={styles.flexOne}>
            <Text style={styles.settingLabel}>Manter por 30 dias</Text>
            <Text style={styles.settingDescription}>
              Excluir backups mais antigos que 30 dias
            </Text>
          </View>
          <Switch value />
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Fazer backup agora</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
