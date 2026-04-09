import { useTheme } from '@/contexts/ThemeContext';
import { useBackupProvidersQuery, useBackupsQuery } from '@/hooks/useBackups';
import { Backup, BackupStackParamList, CloudProviderInfo } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BackupListNav = StackNavigationProp<BackupStackParamList, 'BackupList'>;

const BACKUP_TYPE_LABELS: Record<Backup['type'], string> = {
  local: 'Local',
  cloud: 'Backup em nuvem',
  manual: 'Manual',
};

const getProviderStatusLabel = (provider?: CloudProviderInfo | null): string => {
  if (!provider) {
    return 'Nuvem não encontrada';
  }

  if (provider.connectionStatus !== 'connected') {
    return 'Nuvem indisponível';
  }

  switch (provider.verificationStatus) {
    case 'verified':
      return 'Nuvem validada';
    case 'failed':
      return 'Falha na credencial';
    default:
      return 'Verificação pendente';
  }
};

export const BackupListScreen: React.FC = () => {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation<BackupListNav>();

  const { data: backups = [], isLoading, refetch } = useBackupsQuery();
  const { data: providers = [] } = useBackupProvidersQuery();

  const renderItem = ({ item }: { item: Backup }) => {
    const provider = item.cloudProvider ? providers.find((candidate) => candidate.id === item.cloudProvider) ?? null : null;
    const providerStatusColor =
      !provider || provider.connectionStatus !== 'connected' || provider.verificationStatus === 'failed'
        ? colors.error
        : provider.verificationStatus === 'verified'
          ? colors.success || colors.primary
          : colors.textSecondary;

    return (
      <TouchableOpacity style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('BackupDetail', { backupId: item.id })}>
        <View style={styles.itemTopRow}>
          <View style={[styles.badge, { backgroundColor: item.type === 'cloud' ? colors.primary : colors.surface }]}> 
            <Text style={item.type === 'cloud' ? styles.badgeTextOnPrimary : [styles.badgeText, { color: colors.text }]}>{BACKUP_TYPE_LABELS[item.type]}</Text>
          </View>
          <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</Text>
        </View>

        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.description}</Text>
        <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Expira em {new Date(item.expiresAt).toLocaleDateString('pt-BR')} • {item.size} bytes</Text>

        {item.cloudProvider ? <Text style={[styles.itemStatus, { color: providerStatusColor }]}>Status da nuvem: {getProviderStatusLabel(provider)}</Text> : null}
        {item.cloudPath ? <Text style={[styles.itemPath, { color: colors.textSecondary }]}>{item.cloudPath}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.heroTitle, { color: colors.text }]}>Seus backups</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Acompanhe cópias locais, manuais e em nuvem com um visual mais claro e confiável.</Text>
      </View>

      <FlatList
        data={backups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={isDark ? '#FFFFFF' : colors.primary} />}
        ListEmptyComponent={
          <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum backup criado ainda</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Crie um backup local ou em nuvem para proteger seu cofre antes da próxima emergência.</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('CreateBackup')}>
              <Text style={styles.emptyButtonText}>Criar primeiro backup</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('CreateBackup')}>
        <Text style={styles.fabText}>Novo</Text>
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
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    flexGrow: 1,
  },
  item: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badgeTextOnPrimary: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  itemMeta: {
    fontSize: 13,
    lineHeight: 19,
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  itemPath: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyWrap: {
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    minWidth: 78,
    height: 58,
    borderRadius: 22,
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
    fontSize: 15,
    fontWeight: '800',
  },
});



