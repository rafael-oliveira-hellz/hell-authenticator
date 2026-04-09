import { useTheme } from '@/contexts/ThemeContext';
import { useBackupsQuery } from '@/hooks/useBackups';
import { Backup, BackupStackParamList } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BackupListNav = StackNavigationProp<BackupStackParamList, 'BackupList'>;

export const BackupListScreen: React.FC = () => {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation<BackupListNav>();

  const { data: backups = [], isLoading, refetch } = useBackupsQuery();

  const renderItem = ({ item }: { item: Backup }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('BackupDetail', { backupId: item.id })}
    >
      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.description}</Text>
      <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
        Tipo: {item.type} | Criado: {new Date(item.createdAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={backups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refetch()}
            tintColor={isDark ? '#FFFFFF' : colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhum backup encontrado.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBackup')}
      >
        <Text style={styles.fabText}>+ Backup</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 90 },
  item: { borderRadius: 10, padding: 14, marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  itemMeta: { fontSize: 12 },
  emptyWrap: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#D90429',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  fabText: { color: '#FFFFFF', fontWeight: '700' },
});





