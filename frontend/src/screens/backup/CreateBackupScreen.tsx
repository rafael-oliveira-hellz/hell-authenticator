import { useTheme } from '@/contexts/ThemeContext';
import { useCreateBackupMutation } from '@/hooks/useBackups';
import { BackupStackParamList, BackupType, CloudProvider, CreateBackupData } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type CreateBackupNav = StackNavigationProp<BackupStackParamList, 'CreateBackup'>;

const TYPES: BackupType[] = ['local', 'cloud', 'manual'];
const PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'azure', 'dropbox', 'onedrive'];

export const CreateBackupScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<CreateBackupNav>();

  const [description, setDescription] = useState('');
  const [type, setType] = useState<BackupType>('local');
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>('aws');
  const [cloudPath, setCloudPath] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');

  const createMutation = useCreateBackupMutation();

  const handleCreate = async () => {
    if (!description.trim()) {
      Alert.alert('Validacao', 'Descricao e obrigatoria.');
      return;
    }

    const payload: CreateBackupData = {
      description: description.trim(),
      type,
      retentionDays: Number(retentionDays) || 30,
      cloudProvider: type === 'cloud' ? cloudProvider : undefined,
      cloudPath: type === 'cloud' ? (cloudPath.trim() || undefined) : undefined,
    };

    try {
      await createMutation.mutateAsync(payload);
      Alert.alert('Sucesso', 'Backup criado com sucesso.');
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel criar o backup.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Descricao</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex.: Backup semanal"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Tipo</Text>
        <View style={styles.choiceRow}>
          {TYPES.map((item) => (
            <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.choice, { borderColor: item === type ? colors.primary : colors.border }]}>
              <Text style={{ color: colors.text }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'cloud' && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Provider</Text>
            <View style={styles.choiceRow}>
              {PROVIDERS.map((item) => (
                <TouchableOpacity key={item} onPress={() => setCloudProvider(item)} style={[styles.choice, { borderColor: item === cloudProvider ? colors.primary : colors.border }]}>
                  <Text style={{ color: colors.text }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Caminho cloud</Text>
            <TextInput
              value={cloudPath}
              onChangeText={setCloudPath}
              placeholder="Ex.: backups/2026-03"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          </>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>Retencao (dias)</Text>
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
  scroll: { padding: 16 },
  card: { borderRadius: 12, padding: 16 },
  label: { fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
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






