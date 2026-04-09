import { useTheme } from '@/contexts/ThemeContext';
import { useCreateAccountMutation } from '@/hooks/useAccounts';
import totpService from '@/services/totp';
import { Account, AccountStackParamList, CreateAccountData, TOTPAlgorithm, TOTPCode, TOTPDigits, TOTPPeriod } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ALGORITHMS: TOTPAlgorithm[] = ['SHA1', 'SHA256', 'SHA512'];
const DIGITS: TOTPDigits[] = [6, 8];
const PERIODS: TOTPPeriod[] = [15, 30, 60];

type ManualEntryNav = StackNavigationProp<AccountStackParamList, 'ManualEntry'>;

export const ManualEntryScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<ManualEntryNav>();

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [secret, setSecret] = useState(() => totpService.generateSecret());
  const [algorithm, setAlgorithm] = useState<TOTPAlgorithm>('SHA1');
  const [digits, setDigits] = useState<TOTPDigits>(6);
  const [period, setPeriod] = useState<TOTPPeriod>(30);
  const [preview, setPreview] = useState<TOTPCode | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createAccountMutation = useCreateAccountMutation();

  const baseStyles = useMemo(() => ({
    bg: { background: colors.background, card: colors.surface },
    text: { primary: colors.text, secondary: colors.textSecondary },
    accent: { primary: colors.primary },
  }), [colors]);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const tempAccount: Account = {
          id: 'preview',
          name: name || 'Conta',
          issuer,
          secret,
          algorithm,
          digits,
          period,
          isActive: true,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setPreview(totpService.generateTOTP(tempAccount));
      } catch {
        setPreview(null);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [algorithm, digits, issuer, name, period, secret]);

  const validate = (): string | null => {
    if (!name.trim()) {
      return 'Informe o nome da conta.';
    }

    const sanitizedSecret = totpService.sanitizeSecret(secret);
    if (!sanitizedSecret || sanitizedSecret.length < 16 || !totpService.validateSecret(sanitizedSecret)) {
      return 'O secret precisa estar em Base32 e ter pelo menos 16 caracteres.';
    }

    return null;
  };

  const handleRegenerateSecret = () => {
    setSecret(totpService.generateSecret());
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validação', error);
      return;
    }

    const payload: CreateAccountData = {
      name: name.trim(),
      issuer: issuer.trim() || undefined,
      secret: totpService.sanitizeSecret(secret),
      algorithm,
      digits,
      period,
    };

    try {
      await createAccountMutation.mutateAsync(payload);
      Alert.alert('Sucesso', 'Conta adicionada com sucesso.');
      navigation.navigate('AccountList');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível salvar a conta.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: baseStyles.bg.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: baseStyles.bg.card }]}>
          <Text style={[styles.title, { color: baseStyles.text.primary }]}>Adicionar conta manualmente</Text>
          <Text style={[styles.subtitle, { color: baseStyles.text.secondary }]}>
            Preencha o básico e deixe o app gerar um secret seguro para você.
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Google"
              placeholderTextColor={baseStyles.text.secondary}
              style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Serviço ou emissor</Text>
            <TextInput
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Ex.: Conta pessoal"
              placeholderTextColor={baseStyles.text.secondary}
              style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]}
            />
          </View>

          <View style={[styles.previewCard, { borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: baseStyles.text.secondary }]}>Código atual</Text>
            <Text style={[styles.previewCode, { color: baseStyles.text.primary }]}>{preview?.code || '------'}</Text>
            <Text
              style={[
                styles.previewTime,
                { color: preview && preview.remainingTime <= 5 ? colors.error : baseStyles.text.secondary },
              ]}
            >
              {preview ? `${preview.remainingTime}s restantes` : 'Aguardando dados válidos'}
            </Text>
          </View>

          <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced((value) => !value)}>
            <Text style={[styles.advancedToggleText, { color: colors.primary }]}>
              {showAdvanced ? 'Ocultar opções avançadas' : 'Importar ou editar secret manualmente'}
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Secret (Base32)</Text>
                <TextInput
                  value={secret}
                  onChangeText={(value) => setSecret(totpService.sanitizeSecret(value))}
                  placeholder="JBSWY3DPEHPK3PXP"
                  placeholderTextColor={baseStyles.text.secondary}
                  autoCapitalize="characters"
                  style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]}
                />
                <TouchableOpacity onPress={handleRegenerateSecret} style={styles.secondaryAction}>
                  <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Gerar novo secret</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inlineFields}>
                <View style={styles.inlineItem}>
                  <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Algoritmo</Text>
                  <View style={styles.rowButtons}>
                    {ALGORITHMS.map((item) => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setAlgorithm(item)}
                        style={[styles.choiceBtn, item === algorithm ? styles.choiceSelected : styles.choiceUnselected]}
                      >
                        <Text style={{ color: baseStyles.text.primary }}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inlineItem}>
                  <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Dígitos</Text>
                  <View style={styles.rowButtons}>
                    {DIGITS.map((item) => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => setDigits(item)}
                        style={[styles.choiceBtn, item === digits ? styles.choiceSelected : styles.choiceUnselected]}
                      >
                        <Text style={{ color: baseStyles.text.primary }}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Período (s)</Text>
                <View style={styles.rowButtons}>
                  {PERIODS.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setPeriod(item)}
                      style={[styles.choiceBtn, item === period ? styles.choiceSelected : styles.choiceUnselected]}
                    >
                      <Text style={{ color: baseStyles.text.primary }}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: baseStyles.accent.primary }, createAccountMutation.isPending && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={createAccountMutation.isPending}
          >
            <Text style={styles.primaryBtnText}>
              {createAccountMutation.isPending ? 'Salvando...' : 'Salvar conta'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  card: { borderRadius: 12, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  previewCard: {
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewLabel: { fontSize: 12, marginBottom: 4 },
  previewCode: { fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace' },
  previewTime: { fontSize: 12, marginTop: 4 },
  advancedToggle: { marginBottom: 12 },
  advancedToggleText: { fontSize: 14, fontWeight: '600' },
  secondaryAction: { marginTop: 8 },
  secondaryActionText: { fontSize: 13, fontWeight: '600' },
  inlineFields: { flexDirection: 'row', gap: 12 },
  inlineItem: { flex: 1 },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderColor: '#D9D9D9',
  },
  choiceSelected: { borderColor: '#D90429', backgroundColor: '#E6F0FF' },
  choiceUnselected: { backgroundColor: 'transparent' },
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { opacity: 0.6 },
});
