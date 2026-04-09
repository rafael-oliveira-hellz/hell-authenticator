import { useTheme } from '@/contexts/ThemeContext';
import { useAccountQuery, useUpdateAccountMutation } from '@/hooks/useAccounts';
import { AccountStackParamList, TOTPAlgorithm, TOTPDigits, TOTPPeriod, UpdateAccountData } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type EditAccountNav = StackNavigationProp<AccountStackParamList, 'EditAccount'>;
type EditAccountRoute = RouteProp<AccountStackParamList, 'EditAccount'>;

export const EditAccountScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<EditAccountNav>();
  const route = useRoute<EditAccountRoute>();

  const { accountId } = route.params;

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [algorithm, setAlgorithm] = useState<TOTPAlgorithm>('SHA1');
  const [digits, setDigits] = useState<TOTPDigits>(6);
  const [period, setPeriod] = useState<TOTPPeriod>(30);

  const { data: account, isLoading } = useAccountQuery(accountId);

  useEffect(() => {
    if (!account) {
      return;
    }

    setName(account.name);
    setIssuer(account.issuer || '');
    setAlgorithm(account.algorithm);
    setDigits(account.digits);
    setPeriod(account.period);
  }, [account]);

  const updateMutation = useUpdateAccountMutation(accountId);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validação', 'Nome da conta é obrigatório.');
      return;
    }

    const payload: UpdateAccountData = {
      name: name.trim(),
      issuer: issuer.trim() || undefined,
      algorithm,
      digits,
      period,
    };

    try {
      await updateMutation.mutateAsync(payload);
      Alert.alert('Sucesso', 'Conta atualizada com sucesso.');
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a conta.');
    }
  };

  if (isLoading || !account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Carregando conta...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Editar conta</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome da conta"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Emissor</Text>
          <TextInput
            value={issuer}
            onChangeText={setIssuer}
            placeholder="Ex.: Google Workspace"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Algoritmo</Text>
          <View style={styles.choiceRow}>
            {(['SHA1', 'SHA256', 'SHA512'] as TOTPAlgorithm[]).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setAlgorithm(item)}
                style={[styles.choice, { borderColor: item === algorithm ? colors.primary : colors.border }]}
              >
                <Text style={{ color: colors.text }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Dígitos</Text>
          <View style={styles.choiceRow}>
            {[6, 8].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setDigits(item as TOTPDigits)}
                style={[styles.choice, { borderColor: item === digits ? colors.primary : colors.border }]}
              >
                <Text style={{ color: colors.text }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Período (s)</Text>
          <View style={styles.choiceRow}>
            {[15, 30, 60].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setPeriod(item as TOTPPeriod)}
                style={[styles.choice, { borderColor: item === period ? colors.primary : colors.border }]}
              >
                <Text style={{ color: colors.text }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, updateMutation.isPending && styles.disabledButton]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          <Text style={styles.saveButtonText}>{updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { borderRadius: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  choiceRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  choice: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  saveButton: {
    marginTop: 10,
    backgroundColor: '#D90429',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabledButton: { opacity: 0.6 },
});







