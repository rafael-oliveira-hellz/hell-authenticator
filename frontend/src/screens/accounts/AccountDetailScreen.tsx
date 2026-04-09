import { useTheme } from '@/contexts/ThemeContext';
import { useAccountQuery, useDeleteAccountMutation } from '@/hooks/useAccounts';
import totpService from '@/services/totp';
import { AccountStackParamList, TOTPCode } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type AccountDetailNav = StackNavigationProp<AccountStackParamList, 'AccountDetail'>;
type AccountDetailRoute = RouteProp<AccountStackParamList, 'AccountDetail'>;

export const AccountDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<AccountDetailNav>();
  const route = useRoute<AccountDetailRoute>();

  const { accountId } = route.params;
  const [totpCode, setTotpCode] = useState<TOTPCode | null>(null);

  const { data: account, isLoading } = useAccountQuery(accountId);

  const deleteMutation = useDeleteAccountMutation(accountId);

  useEffect(() => {
    if (!account) {
      setTotpCode(null);
      return;
    }

    const updateCode = () => {
      try {
        setTotpCode(totpService.generateTOTP(account));
      } catch {
        setTotpCode(null);
      }
    };

    updateCode();
    const id = setInterval(updateCode, 1000);
    return () => clearInterval(id);
  }, [account]);

  const confirmDelete = () => {
    Alert.alert('Excluir conta', 'Esta acao nao pode ser desfeita. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => navigation.goBack(),
            onError: () => Alert.alert('Erro', 'Nao foi possivel excluir a conta.'),
          }),
      },
    ]);
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
        <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{account.issuer || 'Sem issuer'}</Text>

        <View style={styles.codeBox}>
          <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Codigo atual</Text>
          <Text style={[styles.code, { color: colors.text }]}>{totpCode?.code || '------'}</Text>
          <Text style={[styles.timer, { color: totpCode && totpCode.remainingTime <= 5 ? colors.error : colors.textSecondary }]}>
            {totpCode ? `${totpCode.remainingTime}s` : '--'}
          </Text>
        </View>

        <View style={styles.infoList}>
          <Text style={[styles.info, { color: colors.text }]}>Algoritmo: {account.algorithm}</Text>
          <Text style={[styles.info, { color: colors.text }]}>Digitos: {account.digits}</Text>
          <Text style={[styles.info, { color: colors.text }]}>Periodo: {account.period}s</Text>
          <Text style={[styles.info, { color: colors.text }]}>Uso: {account.usageCount}</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EditAccount', { accountId })}
        >
          <Text style={styles.buttonText}>Editar conta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, deleteMutation.isPending && styles.disabledButton]}
          onPress={confirmDelete}
          disabled={deleteMutation.isPending}
        >
          <Text style={styles.buttonText}>{deleteMutation.isPending ? 'Excluindo...' : 'Excluir conta'}</Text>
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
  title: { fontSize: 20, fontWeight: 'bold' },
  name: { fontSize: 26, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  codeBox: { alignItems: 'center', marginBottom: 16 },
  codeLabel: { fontSize: 12 },
  code: { fontSize: 34, fontWeight: '700', fontFamily: 'monospace', marginVertical: 4 },
  timer: { fontSize: 12 },
  infoList: { marginBottom: 20, gap: 4 },
  info: { fontSize: 15 },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#D90429',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disabledButton: { opacity: 0.6 },
});







