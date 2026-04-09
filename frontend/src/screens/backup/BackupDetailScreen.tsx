import { BackupOperationStatusCard } from '@/components/backup/BackupOperationStatusCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useBackupProvidersQuery, useBackupQuery, useDeleteBackupMutation, useDownloadBackupFromCloudMutation, useUploadBackupToCloudMutation } from '@/hooks/useBackups';
import { BackupStackParamList } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BackupDetailNav = StackNavigationProp<BackupStackParamList, 'BackupDetail'>;
type BackupDetailRoute = RouteProp<BackupStackParamList, 'BackupDetail'>;

type OperationFeedback = {
  title: string;
  message: string;
  progress: number;
  tone?: 'default' | 'success' | 'error';
};

const INTERNAL_CLOUD_PROVIDER = 'gcp';

const BACKUP_TYPE_LABELS = {
  local: 'Local',
  cloud: 'Backup em nuvem',
  manual: 'Manual',
};

const UPLOAD_STAGES: OperationFeedback[] = [
  { title: 'Preparando upload', message: 'Conferindo o destino na nuvem segura do app.', progress: 20 },
  { title: 'Enviando backup', message: 'Transmitindo o backup para a nuvem.', progress: 65 },
  { title: 'Finalizando upload', message: 'Atualizando o status do backup.', progress: 90 },
];

const DOWNLOAD_STAGES: OperationFeedback[] = [
  { title: 'Solicitando download', message: 'Abrindo a conexão com a nuvem do app.', progress: 25 },
  { title: 'Baixando backup', message: 'Recebendo o conteúdo criptografado do backup.', progress: 70 },
  { title: 'Concluindo download', message: 'Validando a resposta recebida.', progress: 90 },
];

export const BackupDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<BackupDetailNav>();
  const route = useRoute<BackupDetailRoute>();
  const { backupId } = route.params;

  const { data: backup, isLoading } = useBackupQuery(backupId);
  const { data: providers = [] } = useBackupProvidersQuery();
  const deleteMutation = useDeleteBackupMutation(backupId);
  const uploadMutation = useUploadBackupToCloudMutation(backupId);
  const downloadMutation = useDownloadBackupFromCloudMutation(backupId);

  const [operationFeedback, setOperationFeedback] = useState<OperationFeedback | null>(null);
  const internalCloudProvider = providers.find((provider) => provider.id === INTERNAL_CLOUD_PROVIDER) ?? null;

  useEffect(() => {
    if (!uploadMutation.isPending) {
      return undefined;
    }

    setOperationFeedback(UPLOAD_STAGES[0]);
    let stageIndex = 0;
    const interval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, UPLOAD_STAGES.length - 1);
      setOperationFeedback(UPLOAD_STAGES[stageIndex]);
    }, 900);

    return () => clearInterval(interval);
  }, [uploadMutation.isPending]);

  useEffect(() => {
    if (!downloadMutation.isPending) {
      return undefined;
    }

    setOperationFeedback(DOWNLOAD_STAGES[0]);
    let stageIndex = 0;
    const interval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, DOWNLOAD_STAGES.length - 1);
      setOperationFeedback(DOWNLOAD_STAGES[stageIndex]);
    }, 900);

    return () => clearInterval(interval);
  }, [downloadMutation.isPending]);

  const confirmDelete = () => {
    Alert.alert('Excluir backup', 'Esta ação não pode ser desfeita. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => navigation.goBack(),
            onError: () => Alert.alert('Erro', 'Não foi possível excluir o backup.'),
          }),
      },
    ]);
  };

  const handleUploadToCloud = async () => {
    if (!internalCloudProvider || internalCloudProvider.connectionStatus !== 'connected' || internalCloudProvider.verificationStatus !== 'verified') {
      Alert.alert('Nuvem indisponível', internalCloudProvider?.verificationMessage || 'A nuvem do app não está saudável no backend no momento.');
      return;
    }

    try {
      await uploadMutation.mutateAsync({ cloudProvider: INTERNAL_CLOUD_PROVIDER });
      setOperationFeedback({ title: 'Upload concluído', message: 'Backup enviado com sucesso para a nuvem segura do app.', progress: 100, tone: 'success' });
      Alert.alert('Sucesso', 'Backup enviado para a nuvem com sucesso.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível enviar o backup para a nuvem.';
      setOperationFeedback({ title: 'Falha no upload', message, progress: 100, tone: 'error' });
      Alert.alert('Erro', message);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!internalCloudProvider || internalCloudProvider.connectionStatus !== 'connected' || internalCloudProvider.verificationStatus !== 'verified') {
      Alert.alert('Nuvem indisponível', internalCloudProvider?.verificationMessage || 'A nuvem do app não está saudável no backend no momento.');
      return;
    }

    try {
      const result = await downloadMutation.mutateAsync();
      const payload = typeof result === 'string' ? result : JSON.stringify(result);
      setOperationFeedback({ title: 'Download concluído', message: `Backup baixado com sucesso. Conteúdo recebido: ${payload.length} caracteres.`, progress: 100, tone: 'success' });
      Alert.alert('Sucesso', 'Backup baixado da nuvem com sucesso.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível baixar o backup da nuvem.';
      setOperationFeedback({ title: 'Falha no download', message, progress: 100, tone: 'error' });
      Alert.alert('Erro', message);
    }
  };

  if (isLoading || !backup) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.loadingText, { color: colors.text }]}>Carregando backup...</Text>
        </View>
      </View>
    );
  }

  const cloudState = !internalCloudProvider || internalCloudProvider.connectionStatus !== 'connected'
    ? 'Nuvem indisponível'
    : internalCloudProvider.verificationStatus === 'verified'
      ? 'Nuvem validada'
      : internalCloudProvider.verificationStatus === 'failed'
        ? 'Falha na credencial'
        : 'Verificação pendente';

  const cloudStateColor = !internalCloudProvider || internalCloudProvider.connectionStatus !== 'connected' || internalCloudProvider.verificationStatus === 'failed'
    ? colors.error
    : internalCloudProvider.verificationStatus === 'verified'
      ? colors.success || colors.primary
      : colors.textSecondary;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <View style={styles.heroTopRow}>
          <View style={[styles.heroBadge, { backgroundColor: backup.type === 'cloud' ? colors.primary : colors.surface }]}> 
            <Text style={backup.type === 'cloud' ? styles.heroBadgeTextOnPrimary : [styles.heroBadgeText, { color: colors.text }]}>{BACKUP_TYPE_LABELS[backup.type]}</Text>
          </View>
          <Text style={[styles.heroDate, { color: colors.textSecondary }]}>{new Date(backup.createdAt).toLocaleDateString('pt-BR')}</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{backup.description}</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Checksum {backup.checksum.slice(0, 16)}... • versão {backup.version}</Text>
      </View>

      {operationFeedback ? <BackupOperationStatusCard title={operationFeedback.title} message={operationFeedback.message} progress={operationFeedback.progress} tone={operationFeedback.tone} /> : null}

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>Resumo técnico</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Criado em: {new Date(backup.createdAt).toLocaleString('pt-BR')}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Expira em: {new Date(backup.expiresAt).toLocaleString('pt-BR')}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Tamanho: {backup.size} bytes</Text>
        {backup.cloudPath ? <Text style={[styles.meta, { color: colors.textSecondary }]}>Destino: {backup.cloudPath}</Text> : null}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.cardTitle, { color: colors.text }]}>Status da nuvem</Text>
        <Text style={[styles.statusLine, { color: cloudStateColor }]}>{cloudState}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>A cópia em nuvem usa o fluxo interno do app para garantir consistência do backup.</Text>
        {internalCloudProvider?.verificationMessage ? <Text style={[styles.meta, { color: cloudStateColor }]}>{internalCloudProvider.verificationMessage}</Text> : null}
      </View>

      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('RestoreBackup', { backupId })}>
        <Text style={styles.primaryButtonText}>Restaurar backup</Text>
      </TouchableOpacity>

      {backup.type === 'cloud' ? (
        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }, downloadMutation.isPending && styles.buttonDisabled]} onPress={handleDownloadFromCloud} disabled={downloadMutation.isPending}>
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{downloadMutation.isPending ? 'Baixando...' : 'Baixar da nuvem do app'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }, uploadMutation.isPending && styles.buttonDisabled]} onPress={handleUploadToCloud} disabled={uploadMutation.isPending}>
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{uploadMutation.isPending ? 'Enviando...' : 'Enviar para a nuvem do app'}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.ghostButton, { borderColor: colors.border }]} onPress={() => navigation.navigate('CloudSettings')}>
        <Text style={[styles.ghostButtonText, { color: colors.text }]}>Abrir configurações de nuvem</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.dangerButton, deleteMutation.isPending && styles.buttonDisabled]} onPress={confirmDelete} disabled={deleteMutation.isPending}>
        <Text style={styles.primaryButtonText}>{deleteMutation.isPending ? 'Excluindo...' : 'Excluir backup'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', padding: 16 },
  loadingCard: { borderWidth: 1, borderRadius: 24, padding: 20 },
  loadingText: { fontSize: 18, fontWeight: '700' },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroBadgeTextOnPrimary: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  meta: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  statusLine: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  ghostButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dangerButton: {
    minHeight: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B33A3A',
  },
  buttonDisabled: { opacity: 0.65 },
});



