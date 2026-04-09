import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const AboutScreen: React.FC = () => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 16,
      backgroundColor: colors.primary,
      marginBottom: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoText: {
      color: colors.white,
      fontSize: 24,
      fontWeight: 'bold',
    },
    appName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    version: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    description: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
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
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text,
    },
    infoValue: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    link: {
      color: colors.primary,
      textDecorationLine: 'underline',
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
  });

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>HA</Text>
        </View>
        <Text style={styles.appName}>Hell Authenticator</Text>
        <Text style={styles.version}>Versão 1.0.0</Text>
        <Text style={styles.description}>
          Autenticador seguro e confiável para suas contas online.
          Proteja seus dados com criptografia de ponta a ponta.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações</Text>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Desenvolvedor</Text>
          <Text style={styles.infoValue}>Hell Team</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Licença</Text>
          <Text style={styles.infoValue}>MIT</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Última atualização</Text>
          <Text style={styles.infoValue}>14/08/2025</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Links</Text>

        <TouchableOpacity style={styles.infoItem} onPress={() => openLink('https://github.com/hell-team/hell-authenticator')}>
          <Text style={styles.infoLabel}>GitHub</Text>
          <Text style={[styles.infoValue, styles.link]}>Ver código</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoItem} onPress={() => openLink('https://hell-authenticator.com/privacy')}>
          <Text style={styles.infoLabel}>Política de Privacidade</Text>
          <Text style={[styles.infoValue, styles.link]}>Ler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoItem} onPress={() => openLink('https://hell-authenticator.com/terms')}>
          <Text style={styles.infoLabel}>Termos de Uso</Text>
          <Text style={[styles.infoValue, styles.link]}>Ler</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Verificar atualizações</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
