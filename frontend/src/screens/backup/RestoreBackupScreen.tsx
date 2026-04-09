import { useTheme } from '@/contexts/ThemeContext';
import { useBackupQuery, useRestoreBackupMutation } from '@/hooks/useBackups';
import { BackupStackParamList } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type RestoreBackupNav = StackNavigationProp<BackupStackParamList, 'RestoreBackup'>;
type RestoreBackupRoute = RouteProp<BackupStackParamList, 'RestoreBackup'>;

export const RestoreBackupScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<RestoreBackupNav>();
  const route = useRoute<RestoreBackupRoute>();

  const { backupId } = route.params;
  const [password, setPassword] = useState('');

  const { data: backup } = useBackupQuery(backupId);

  const restoreMutation = useRestoreBackupMutation(backupId);

  const handleRestore = async () => {
    if (!password.trim()) {
      Alert.alert('Validacao', 'Senha do backup e obrigatoria.');
      return;
    }
    try {
      await restoreMutation.mutateAsync({ password });
      Alert.alert('Sucesso', 'Backup restaurado com sucesso.');
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel restaurar o backup.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Restaurar backup</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Backup: {backup?.description || backupId}</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Senha do backup</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Digite a senha"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />

        <TouchableOpacity style={[styles.primary, restoreMutation.isPending && styles.disabledButton]} onPress={handleRestore} disabled={restoreMutation.isPending}>
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







