import { useTheme } from '@/contexts/ThemeContext';
import { useBackupQuery, useDeleteBackupMutation } from '@/hooks/useBackups';
import { BackupStackParamList } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BackupDetailNav = StackNavigationProp<BackupStackParamList, 'BackupDetail'>;
type BackupDetailRoute = RouteProp<BackupStackParamList, 'BackupDetail'>;

export const BackupDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<BackupDetailNav>();
  const route = useRoute<BackupDetailRoute>();

  const { backupId } = route.params;

  const { data: backup, isLoading } = useBackupQuery(backupId);

  const deleteMutation = useDeleteBackupMutation(backupId);

  const confirmDelete = () => {
    Alert.alert('Excluir backup', 'Esta acao nao pode ser desfeita. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => navigation.goBack(),
            onError: () => Alert.alert('Erro', 'Nao foi possivel excluir o backup.'),
          }),
      },
    ]);
  };

  if (isLoading || !backup) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Carregando backup...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>{backup.description}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Tipo: {backup.type}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Criado: {new Date(backup.createdAt).toLocaleString()}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Expira: {new Date(backup.expiresAt).toLocaleString()}</Text>

        <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('RestoreBackup', { backupId })}>
          <Text style={styles.buttonText}>Restaurar backup</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.danger, deleteMutation.isPending && styles.disabledButton]} onPress={confirmDelete} disabled={deleteMutation.isPending}>
          <Text style={styles.buttonText}>{deleteMutation.isPending ? 'Excluindo...' : 'Excluir backup'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  card: { borderRadius: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  meta: { fontSize: 14, marginBottom: 6 },
  primary: { marginTop: 16, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  danger: { marginTop: 10, backgroundColor: '#D90429', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});







