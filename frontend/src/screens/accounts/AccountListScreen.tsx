import { useTheme } from '@/contexts/ThemeContext';
import { useAccountsQuery } from '@/hooks/useAccounts';
import { Account, AccountStackParamList } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type AccountListNavigationProp = StackNavigationProp<AccountStackParamList, 'AccountList'>;

type QuickAction = {
  key: 'scan' | 'manual';
  label: string;
  description: string;
  onPress: () => void;
};

export const AccountListScreen: React.FC = () => {
  const navigation = useNavigation<AccountListNavigationProp>();
  const { isDark, colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const { data: accounts = [], isLoading, refetch } = useAccountsQuery();

  const quickActions = useMemo<QuickAction[]>(() => [
    {
      key: 'scan',
      label: 'Escanear QR Code',
      description: 'Importe uma conta em segundos lendo o QR do serviço.',
      onPress: () => navigation.navigate('QRScanner'),
    },
    {
      key: 'manual',
      label: 'Adicionar manualmente',
      description: 'Crie uma conta com fluxo guiado e secret automático.',
      onPress: () => navigation.navigate('ManualEntry'),
    },
  ], [navigation]);

  const filteredAccounts = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return accounts;
    }

    return accounts.filter((account) => {
      const name = account.name.toLowerCase();
      const issuer = account.issuer?.toLowerCase() || '';
      return name.includes(normalized) || issuer.includes(normalized);
    });
  }, [accounts, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const renderAccountItem = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={[styles.accountItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('AccountDetail', { accountId: item.id })}
    >
      <View style={[styles.monogram, { backgroundColor: colors.surface }]}>
        <Text style={[styles.monogramText, { color: colors.primary }]}>{item.name.slice(0, 1).toUpperCase()}</Text>
      </View>

      <View style={styles.accountInfo}>
        <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.accountIssuer, { color: colors.textSecondary }]}>{item.issuer || 'Sem emissor definido'}</Text>
        <Text style={[styles.accountUsage, { color: colors.textSecondary }]}>Uso total: {item.usageCount}</Text>
      </View>

      <View style={styles.accountStatus}>
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.error }]} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>{item.isActive ? 'Ativa' : 'Inativa'}</Text>
      </View>
    </TouchableOpacity>
  );

  const emptyState = (
    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conta por aqui</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery
          ? 'Ajuste sua busca para encontrar a conta desejada.'
          : 'Comece importando por QR Code ou adicionando manualmente.'}
      </Text>
      {!searchQuery ? (
        <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => setIsFabMenuOpen(true)}>
          <Text style={styles.emptyButtonText}>Escolher como adicionar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.heroTitle, { color: colors.text }]}>Suas contas</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Busque, abra detalhes e adicione novas entradas a partir deste hub.</Text>
        <View style={[styles.searchShell, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nome ou emissor"
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredAccounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={isDark ? '#FFFFFF' : colors.primary} />}
        ListEmptyComponent={emptyState}
      />

      {isFabMenuOpen ? (
        <Pressable style={styles.backdrop} onPress={() => setIsFabMenuOpen(false)}>
          <View style={styles.fabMenuContainer}>
            {quickActions.map((action) => (
              <Pressable key={action.key} style={[styles.fabMenuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {
                setIsFabMenuOpen(false);
                action.onPress();
              }}>
                <Text style={[styles.fabMenuTitle, { color: colors.text }]}>{action.label}</Text>
                <Text style={[styles.fabMenuDescription, { color: colors.textSecondary }]}>{action.description}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      ) : null}

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setIsFabMenuOpen((value) => !value)}>
        <Text style={styles.fabText}>{isFabMenuOpen ? '×' : '+'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  searchShell: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  searchInput: {
    minHeight: 50,
    fontSize: 15,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  accountItem: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monogram: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  monogramText: {
    fontSize: 20,
    fontWeight: '800',
  },
  accountInfo: { flex: 1 },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  accountIssuer: {
    fontSize: 13,
    marginBottom: 4,
  },
  accountUsage: {
    fontSize: 12,
  },
  accountStatus: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 12,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 18, 23, 0.28)',
  },
  fabMenuContainer: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 272,
    gap: 12,
  },
  fabMenuItem: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  fabMenuTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  fabMenuDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: -1,
  },
});
