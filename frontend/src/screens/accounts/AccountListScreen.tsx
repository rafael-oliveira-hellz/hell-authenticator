import { useTheme } from '@/contexts/ThemeContext';
import { useAccountsQuery } from '@/hooks/useAccounts';
import { Account, AccountStackParamList } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type AccountListNavigationProp = StackNavigationProp<AccountStackParamList, 'AccountList'>;

const ListSeparator = () => <View style={styles.separator} />;

export const AccountListScreen: React.FC = () => {
  const navigation = useNavigation<AccountListNavigationProp>();
  const { isDark, colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useAccountsQuery();

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

  const handleAccountPress = (account: Account) => {
    navigation.navigate('AccountDetail', { accountId: account.id });
  };

  const handleAddAccount = () => {
    navigation.navigate('AddAccount');
  };

  const renderAccountItem = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={[styles.accountItem, { backgroundColor: colors.card }]}
      onPress={() => handleAccountPress(item)}
    >
      <View style={styles.accountInfo}>
        <Text style={[styles.accountName, { color: colors.text }]}>{item.name}</Text>
        {item.issuer && <Text style={[styles.accountIssuer, { color: colors.textSecondary }]}>{item.issuer}</Text>}
        <Text style={[styles.accountUsage, { color: colors.textSecondary }]}>Usado {item.usageCount} vezes</Text>
      </View>

      <View style={styles.accountStatus}>
        <View style={[styles.statusIndicator, item.isActive ? styles.statusActive : styles.statusInactive]} />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>??</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conta encontrada</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery ? 'Tente ajustar sua busca' : 'Adicione sua primeira conta para começar'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddAccount}>
          <Text style={styles.addButtonText}>Adicionar Conta</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface }]}
          placeholder="Buscar contas..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredAccounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={isDark ? '#FFFFFF' : colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={ListSeparator}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={handleAddAccount}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D9',
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  accountInfo: { flex: 1 },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountIssuer: {
    fontSize: 14,
    marginBottom: 4,
  },
  accountUsage: { fontSize: 12 },
  accountStatus: { marginLeft: 12 },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: { backgroundColor: '#34C759' },
  statusInactive: { backgroundColor: '#D90429' },
  separator: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
