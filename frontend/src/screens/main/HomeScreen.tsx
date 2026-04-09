import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAccountsQuery, useAccountStatsQuery } from '@/hooks/useAccounts';
import { totpService } from '@/services/totp';
import { Account, TOTPCode } from '@/types';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [totpCodes, setTotpCodes] = useState<Map<string, TOTPCode>>(new Map());

  const { data: accounts = [], refetch: refetchAccounts } = useAccountsQuery();
  const { data: stats, refetch: refetchStats } = useAccountStatsQuery();

  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);
  const recentActiveAccounts = useMemo(() => activeAccounts.slice(0, 4), [activeAccounts]);

  const updateTOTPCodes = useCallback(() => {
    const nextCodes = new Map<string, TOTPCode>();
    accounts.forEach((account) => nextCodes.set(account.id, totpService.generateTOTP(account)));
    setTotpCodes(nextCodes);
  }, [accounts]);

  useEffect(() => {
    updateTOTPCodes();
    const interval = setInterval(updateTOTPCodes, 1000);
    return () => clearInterval(interval);
  }, [updateTOTPCodes]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAccounts(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const quickActions = [
    {
      label: 'Escanear QR',
      hint: 'Importe um serviço em segundos',
      accent: colors.primary,
      onPress: () => navigation.navigate('Accounts', { screen: 'QRScanner' }),
    },
    {
      label: 'Adicionar manualmente',
      hint: 'Monte uma conta com fluxo guiado',
      accent: colors.secondary,
      onPress: () => navigation.navigate('Accounts', { screen: 'ManualEntry' }),
    },
    {
      label: 'Criar backup',
      hint: 'Proteja suas contas agora',
      accent: '#D98E04',
      onPress: () => navigation.navigate('Backup', { screen: 'CreateBackup' }),
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFFFFF' : colors.primary} />}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.kicker, { color: colors.textSecondary }]}>Painel principal</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>Olá, {user?.name || 'usuário'}.</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Seus códigos ficam prontos aqui, com acesso rápido às ações que mais importam.</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total ?? accounts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>contas no cofre</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.statValue, { color: colors.text }]}>{stats?.active ?? activeAccounts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ativas agora</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acesso rápido</Text>
      </View>
      <View style={styles.actionsColumn}>
        {quickActions.map((action) => (
          <TouchableOpacity key={action.label} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={action.onPress}>
            <View style={[styles.actionAccent, { backgroundColor: action.accent }]} />
            <View style={styles.actionTextWrap}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
              <Text style={[styles.actionHint, { color: colors.textSecondary }]}>{action.hint}</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Códigos recentes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Accounts', { screen: 'AccountList' })}>
          <Text style={[styles.sectionLink, { color: colors.primary }]}>Ver tudo</Text>
        </TouchableOpacity>
      </View>

      {recentActiveAccounts.length > 0 ? (
        recentActiveAccounts.map((account: Account) => {
          const code = totpCodes.get(account.id);
          const isUrgent = Boolean(code && code.remainingTime <= 5);

          return (
            <TouchableOpacity
              key={account.id}
              style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Accounts', { screen: 'AccountDetail', params: { accountId: account.id } })}
            >
              <View style={styles.accountLeft}>
                <View style={[styles.accountMonogram, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.accountMonogramText, { color: colors.primary }]}>{account.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                  <Text style={[styles.accountIssuer, { color: colors.textSecondary }]}>{account.issuer || 'Conta sem emissor'}</Text>
                </View>
              </View>

              <View style={styles.codeWrap}>
                <Text style={[styles.codeValue, { color: colors.text }]}>{code?.code || '------'}</Text>
                <Text style={[styles.codeTimer, { color: isUrgent ? colors.error : colors.textSecondary }]}>{code ? formatTime(code.remainingTime) : '--:--'}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Seu cofre ainda está vazio</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Comece adicionando a primeira conta por QR Code ou manualmente.</Text>
          <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Accounts', { screen: 'QRScanner' })}>
            <Text style={styles.emptyButtonText}>Adicionar primeira conta</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 36 },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    marginBottom: 22,
  },
  kicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionsColumn: {
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionAccent: {
    width: 12,
    height: 42,
    borderRadius: 8,
    marginRight: 14,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 28,
    marginLeft: 12,
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountMonogram: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  accountMonogramText: {
    fontSize: 20,
    fontWeight: '800',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  accountIssuer: {
    fontSize: 13,
  },
  codeWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  codeTimer: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyButton: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
