import { useTheme } from '@/contexts/ThemeContext';
import { useBackupProvidersQuery, useCreateBackupMutation, useUserCloudConnectionsQuery } from '@/hooks/useBackups';
import { BackupStackParamList, BackupType, CreateBackupData } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type CreateBackupNav = StackNavigationProp<BackupStackParamList, 'CreateBackup'>;

type BackupOption = {
  value: BackupType;
  label: string;
  description: string;
};

const INTERNAL_CLOUD_PROVIDER = 'gcp';

const BACKUP_OPTIONS: BackupOption[] = [
  {
    value: 'local',
    label: 'Local',
    description: 'Salva um backup criptografado para uso imediato no app.',
  },
  {
    value: 'cloud',
    label: 'Backup em nuvem',
    description: 'Envia o backup para a nuvem segura do app, sem expor detalhes de infraestrutura.',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Cria um backup pensado para exportação controlada pelo usuário.',
  },
];

export const CreateBackupScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<CreateBackupNav>();
  const { data: providers = [] } = useBackupProvidersQuery();
  const { data: userConnections = [] } = useUserCloudConnectionsQuery();

  const [description, setDescription] = useState('');
  const [type, setType] = useState<BackupType>('local');
  const [cloudPath, setCloudPath] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useCreateBackupMutation();

  const selectedType = useMemo(
    () => BACKUP_OPTIONS.find((item) => item.value === type) ?? BACKUP_OPTIONS[0],
    [type],
  );

  const internalCloudProvider = providers.find((provider) => provider.id === INTERNAL_CLOUD_PROVIDER) ?? null;
  const connectedPersonalClouds = userConnections.filter((connection) => connection.status === 'connected');

  const handleCreate = async () => {
    if (!description.trim()) {
      Alert.alert('Validação', 'Informe uma descrição para o backup.');
      return;
    }

    const payload: CreateBackupData = {
      description: description.trim(),
      type,
      retentionDays: Number(retentionDays) || 30,
      cloudProvider: type === 'cloud' ? INTERNAL_CLOUD_PROVIDER : undefined,
      cloudPath: type === 'cloud' && cloudPath.trim() ? cloudPath.trim() : undefined,
    };

    try {
      await createMutation.mutateAsync(payload);
      Alert.alert('Sucesso', 'Backup criado com sucesso.');
      navigation.goBack();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível criar o backup.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Criar backup</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Escolha um formato disponível e deixe o app cuidar da maior parte do processo.</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Descrição</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex.: Backup semanal"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Destino</Text>
        <View style={styles.choiceColumn}>
          {BACKUP_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setType(item.value)}
              style={[
                styles.choiceCard,
                item.value === type ? styles.choiceCardSelected : styles.choiceCardUnselected,
                { borderColor: item.value === type ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.choiceTitle, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.choiceDescription, { color: colors.textSecondary }]}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'cloud' ? (
          <>
            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Fluxo automático</Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>O backup será enviado para a nuvem segura do Hell Authenticator. A infraestrutura interna fica transparente para você.</Text>
              <Text style={[styles.summaryText, { color: internalCloudProvider?.verificationStatus === 'failed' ? colors.error : colors.textSecondary }]}>Status da nuvem do app: {!internalCloudProvider ? 'Indisponível' : internalCloudProvider.verificationStatus === 'verified' ? 'Verificada' : internalCloudProvider.verificationStatus === 'failed' ? 'Falha na verificação' : 'Verificação pendente'}</Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Contas pessoais conectadas: {connectedPersonalClouds.length}</Text>
            </View>

            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced((value) => !value)}>
              <Text style={[styles.advancedToggleText, { color: colors.primary }]}>
                {showAdvanced ? 'Ocultar caminho avançado' : 'Definir caminho avançado'}
              </Text>
            </TouchableOpacity>

            {showAdvanced ? (
              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Caminho interno</Text>
                <TextInput
                  value={cloudPath}
                  onChangeText={setCloudPath}
                  placeholder="Ex.: user-1/2026-04/meu-backup.enc"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
              </View>
            ) : null}
          </>
        ) : (
          <View style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Como este backup será criado</Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{selectedType.description}</Text>
          </View>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>Retenção (dias)</Text>
        <TextInput
          value={retentionDays}
          onChangeText={setRetentionDays}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />

        <TouchableOpacity style={[styles.primary, createMutation.isPending && styles.disabledButton]} onPress={handleCreate} disabled={createMutation.isPending}>
          <Text style={styles.primaryText}>{createMutation.isPending ? 'Criando...' : 'Criar backup'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  choiceColumn: { gap: 10 },
  fieldBlock: { marginTop: 8 },
  choiceCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  choiceCardSelected: { backgroundColor: '#E6F0FF' },
  choiceCardUnselected: { backgroundColor: 'transparent' },
  choiceTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  choiceDescription: { fontSize: 13, lineHeight: 18 },
  summaryCard: { marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 14 },
  summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  summaryText: { fontSize: 13, lineHeight: 18 },
  advancedToggle: { marginTop: 12 },
  advancedToggleText: { fontSize: 14, fontWeight: '600' },
  primary: {
    marginTop: 20,
    backgroundColor: '#D90429',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabledButton: { opacity: 0.6 },
});
