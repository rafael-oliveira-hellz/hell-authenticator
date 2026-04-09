import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { totpService } from '@/services/totp';
import { useAccountsQuery, useAccountStatsQuery } from '@/hooks/useAccounts';
import { Account, TOTPCode } from '@/types';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [totpCodes, setTotpCodes] = useState<Map<string, TOTPCode>>(new Map());

  const {
    data: accounts = [],
    refetch: refetchAccounts,
  } = useAccountsQuery();

  const {
    data: stats,
    refetch: refetchStats,
  } = useAccountStatsQuery();

  const activeAccounts = useMemo(() => {
    return accounts.filter(account => account.isActive);
  }, [accounts]);

  const recentActiveAccounts = useMemo(() => {
    return activeAccounts.slice(0, 5);
  }, [activeAccounts]);

  const updateTOTPCodes = useCallback(() => {
    const newCodes = new Map<string, TOTPCode>();
    accounts.forEach(account => {
      newCodes.set(account.id, totpService.generateTOTP(account));
    });
    setTotpCodes(newCodes);
  }, [accounts]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTOTPCodes();
    }, 1000);

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

  const handleAccountPress = (account: Account) => {
    navigation.navigate('Accounts', { screen: 'AccountDetail', params: { accountId: account.id } });
  };

  const handleAddAccount = () => {
    navigation.navigate('Accounts', { screen: 'AddAccount' });
  };

  const handleScanQR = () => {
    navigation.navigate('Accounts', { screen: 'QRScanner' });
  };

  const formatTime = (seconds: number) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? '#FFFFFF' : colors.primary}
        />
      }
    >
      <View style={[
        styles.header,
        { backgroundColor: colors.surface }
      ]}>
        <View style={styles.welcomeSection}>
          <Text style={[
            styles.welcomeText,
            { color: colors.textSecondary }
          ]}>
            Bem-vindo de volta,
          </Text>
          <Text style={[
            styles.userName,
            { color: colors.text }
          ]}>
            {user?.name || 'Usuario'}
          </Text>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              { color: colors.text }
            ]}>
              {stats?.total ?? accounts.length}
            </Text>
            <Text style={[
              styles.statLabel,
              { color: colors.textSecondary }
            ]}>
              Contas
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              { color: colors.text }
            ]}>
              {stats?.active ?? activeAccounts.length}
            </Text>
            <Text style={[
              styles.statLabel,
              { color: colors.textSecondary }
            ]}>
              Ativas
            </Text>
          </View>
        </View>
      </View>

      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <Text style={[
          styles.sectionTitle,
          { color: colors.text }
        ]}>
          Acoes Rapidas
        </Text>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.card }
            ]}
            onPress={handleAddAccount}
          >
            <Text style={styles.actionIcon}>+</Text>
            <Text style={[
              styles.actionText,
              { color: colors.text }
            ]}>
              Adicionar Conta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.card }
            ]}
            onPress={handleScanQR}
          >
            <Text style={styles.actionIcon}>QR</Text>
            <Text style={[
              styles.actionText,
              { color: colors.text }
            ]}>
              Scanner QR
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[
        styles.section,
        { backgroundColor: colors.surface }
      ]}>
        <View style={styles.sectionHeader}>
          <Text style={[
            styles.sectionTitle,
            { color: colors.text }
          ]}>
            Contas Recentes
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Accounts', { screen: 'AccountList' })}>
            <Text style={[
              styles.seeAllText,
              { color: colors.primary }
            ]}>
              Ver todas
            </Text>
          </TouchableOpacity>
        </View>

        {recentActiveAccounts.length > 0 ? (
          recentActiveAccounts.map(account => {
            const totpCode = totpCodes.get(account.id);
            return (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountCard,
                  { backgroundColor: colors.card }
                ]}
                onPress={() => handleAccountPress(account)}
              >
                <View style={styles.accountInfo}>
                  <Text style={[
                    styles.accountName,
                    { color: colors.text }
                  ]}>
                    {account.name}
                  </Text>
                  {account.issuer && (
                    <Text style={[
                      styles.accountIssuer,
                      { color: colors.textSecondary }
                    ]}>
                      {account.issuer}
                    </Text>
                  )}
                </View>

                <View style={styles.totpSection}>
                  <Text style={[
                    styles.totpCode,
                    { color: colors.text }
                  ]}>
                    {totpCode?.code || '------'}
                  </Text>
                  <Text style={[
                    styles.totpTimer,
                    { color: totpCode && totpCode.remainingTime <= 5 ? colors.error : colors.textSecondary }
                  ]}>
                    {totpCode ? formatTime(totpCode.remainingTime) : '--:--'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={[
              styles.emptyIcon,
              { color: colors.textSecondary }
            ]}>
              *
            </Text>
            <Text style={[
              styles.emptyText,
              { color: colors.textSecondary }
            ]}>
              Nenhuma conta adicionada ainda
            </Text>
            <TouchableOpacity
              style={[
                styles.addFirstButton,
                { backgroundColor: colors.primary }
              ]}
              onPress={handleAddAccount}
            >
              <Text style={styles.addFirstButtonText}>
                Adicionar primeira conta
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 10,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 10,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountIssuer: {
    fontSize: 14,
  },
  totpSection: {
    alignItems: 'flex-end',
  },
  totpCode: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  totpTimer: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  addFirstButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});





