import { BackupOperationStatusCard } from '@/components/backup/BackupOperationStatusCard';
import { useTheme } from '@/contexts/ThemeContext';
import { useBackupQuery, useRestoreBackupMutation } from '@/hooks/useBackups';
import { BackupStackParamList } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type RestoreBackupNav = StackNavigationProp<BackupStackParamList, 'RestoreBackup'>;
type RestoreBackupRoute = RouteProp<BackupStackParamList, 'RestoreBackup'>;

type OperationFeedback = {
  title: string;
  message: string;
  progress: number;
  tone?: 'default' | 'success' | 'error';
};

const RESTORE_STAGES: OperationFeedback[] = [
  { title: 'Preparando restauração', message: 'Validando os dados do backup e a senha informada.', progress: 20 },
  { title: 'Lendo backup', message: 'Carregando o conteúdo criptografado e conferindo integridade.', progress: 55 },
  { title: 'Restaurando contas', message: 'Aplicando as contas restauradas na sua base local.', progress: 85 },
];

export const RestoreBackupScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<RestoreBackupNav>();
  const route = useRoute<RestoreBackupRoute>();

  const { backupId } = route.params;
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<OperationFeedback | null>(null);

  const { data: backup } = useBackupQuery(backupId);
  const restoreMutation = useRestoreBackupMutation(backupId);

  useEffect(() => {
    if (!restoreMutation.isPending) {
      return undefined;
    }

    setFeedback(RESTORE_STAGES[0]);
    let stageIndex = 0;

    const interval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, RESTORE_STAGES.length - 1);
      setFeedback(RESTORE_STAGES[stageIndex]);
    }, 900);

    return () => clearInterval(interval);
  }, [restoreMutation.isPending]);

  const handleRestore = async () => {
    if (!password.trim()) {
      Alert.alert('Validação', 'A senha do backup é obrigatória.');
      return;
    }

    try {
      const result = await restoreMutation.mutateAsync({ password });
      setFeedback({
        title: 'Restauração concluída',
        message: `${result.restoredAccounts} conta(s) restaurada(s) e ${result.skippedAccounts} ignorada(s).`,
        progress: 100,
        tone: 'success',
      });
      Alert.alert('Sucesso', 'Backup restaurado com sucesso.');
      navigation.goBack();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível restaurar o backup.';
      setFeedback({
        title: 'Falha na restauração',
        message,
        progress: 100,
        tone: 'error',
      });
      Alert.alert('Erro', message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Restaurar backup</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Backup: {backup?.description || backupId}</Text>

        {feedback ? (
          <BackupOperationStatusCard
            title={feedback.title}
            message={feedback.message}
            progress={feedback.progress}
            tone={feedback.tone}
          />
        ) : null}

        <Text style={[styles.label, { color: colors.textSecondary }]}>Senha do backup</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Digite a senha"
          placeholderTextColor={colors.textSecondary}
          editable={!restoreMutation.isPending}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />

        <TouchableOpacity
          style={[styles.primary, restoreMutation.isPending && styles.disabledButton]}
          onPress={handleRestore}
          disabled={restoreMutation.isPending}
        >
          <Text style={styles.primaryText}>{restoreMutation.isPending ? 'Restaurando...' : 'Restaurar agora'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  card: { borderRadius: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 13, marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  primary: {
    marginTop: 18,
    backgroundColor: '#D90429',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});
