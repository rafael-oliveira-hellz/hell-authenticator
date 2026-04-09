import { useTheme } from '@/contexts/ThemeContext';
import { useCreateAccountMutation } from '@/hooks/useAccounts';
import totpService from '@/services/totp';
import { Account, AccountStackParamList, CreateAccountData, QRCodeData, TOTPAlgorithm, TOTPCode, TOTPDigits, TOTPPeriod } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type AddAccountNav = StackNavigationProp<AccountStackParamList, 'AddAccount'>;
type AddAccountRoute = RouteProp<AccountStackParamList, 'AddAccount'>;

export const AddAccountScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<AddAccountNav>();
  const route = useRoute<AddAccountRoute>();

  const initial = (route.params?.qrData || null) as QRCodeData | null;

  const [name, setName] = useState<string>(initial?.label || '');
  const [issuer, setIssuer] = useState<string>(initial?.issuer || '');
  const [secret, setSecret] = useState<string>(initial?.secret || '');
  const [algorithm, setAlgorithm] = useState<TOTPAlgorithm>(initial?.algorithm || 'SHA1');
  const [digits, setDigits] = useState<TOTPDigits>(initial?.digits || 6);
  const [period, setPeriod] = useState<TOTPPeriod>(initial?.period || 30);
  const [preview, setPreview] = useState<TOTPCode | null>(null);

  const baseStyles = useMemo(() => ({
    bg: { background: colors.background, card: colors.surface },
    text: { primary: colors.text, secondary: colors.textSecondary },
    accent: { primary: colors.primary, danger: colors.error }
  }), [colors]);

  const createAccountMutation = useCreateAccountMutation();

  const sanitizeSecret = (value: string) => value.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  const isBase32 = (value: string) => /^[A-Z2-7]+=*$/.test(value);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        if (!secret) {
          setPreview(null);
          return;
        }

        const tempAccount: Account = {
          id: 'temp',
          name,
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
  }, [name, issuer, secret, algorithm, digits, period]);

  const validate = (): string | null => {
    if (!name.trim()) return 'Nome da conta e obrigatorio.';
    if (!secret.trim()) return 'Secret (Base32) e obrigatorio.';
    const sanitized = sanitizeSecret(secret);
    if (!isBase32(sanitized) || sanitized.length < 16) return 'Secret invalido. Use Base32 (minimo 16 chars).';
    if (![6, 8].includes(digits)) return 'Digitos invalidos (6 ou 8).';
    if (![15, 30, 60].includes(period)) return 'Periodo invalido (15, 30, 60).';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) return Alert.alert('Validacao', error);

    const payload: CreateAccountData = {
      name: name.trim(),
      issuer: issuer.trim() || undefined,
      secret: sanitizeSecret(secret),
      algorithm,
      digits,
      period,
    };

    try {
      await createAccountMutation.mutateAsync(payload);
      Alert.alert('Sucesso', 'Conta criada com sucesso.');
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel criar a conta.');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: baseStyles.bg.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: baseStyles.bg.card }]}>
          <Text style={[styles.title, { color: baseStyles.text.primary }]}>Adicionar Conta</Text>
          <Text style={[styles.subtitle, { color: baseStyles.text.secondary }]}>Revise os dados e salve</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Nome</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Ex.: Google" placeholderTextColor={baseStyles.text.secondary} style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Issuer (opcional)</Text>
            <TextInput value={issuer} onChangeText={setIssuer} placeholder="Ex.: alice@dominio.com" placeholderTextColor={baseStyles.text.secondary} style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]} />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Secret (Base32)</Text>
            <TextInput value={secret} onChangeText={(v) => setSecret(sanitizeSecret(v))} placeholder="JBSWY3DPEHPK3PXP" placeholderTextColor={baseStyles.text.secondary} autoCapitalize="characters" style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]} />
          </View>

          <View style={styles.inlineFields}>
            <View style={styles.inlineItem}>
              <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Algoritmo</Text>
              <View style={styles.rowButtons}>
                {(['SHA1', 'SHA256', 'SHA512'] as TOTPAlgorithm[]).map(a => (
                  <TouchableOpacity key={a} onPress={() => setAlgorithm(a)} style={[styles.choiceBtn, a === algorithm ? styles.choiceSelected : styles.choiceUnselected]}>
                    <Text style={{ color: baseStyles.text.primary }}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inlineItem}>
              <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Digitos</Text>
              <View style={styles.rowButtons}>
                {([6, 8] as TOTPDigits[]).map(d => (
                  <TouchableOpacity key={d} onPress={() => setDigits(d)} style={[styles.choiceBtn, d === digits ? styles.choiceSelected : styles.choiceUnselected]}>
                    <Text style={{ color: baseStyles.text.primary }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Periodo (s)</Text>
            <View style={styles.rowButtons}>
              {([15, 30, 60] as TOTPPeriod[]).map(p => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.choiceBtn, p === period ? styles.choiceSelected : styles.choiceUnselected]}>
                  <Text style={{ color: baseStyles.text.primary }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.preview}>
            <Text style={[styles.previewLabel, { color: baseStyles.text.secondary }]}>Previa do TOTP</Text>
            <Text style={[styles.previewCode, { color: baseStyles.text.primary }]}>{preview?.code || '------'}</Text>
            <Text style={[styles.previewTime, { color: preview && preview.remainingTime <= 5 ? colors.error : baseStyles.text.secondary }]}>
              {preview ? `${preview.remainingTime}s restantes` : '-'}
            </Text>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: baseStyles.accent.primary }, createAccountMutation.isPending && styles.disabledButton]} onPress={handleSubmit} disabled={createAccountMutation.isPending}>
            <Text style={styles.primaryBtnText}>{createAccountMutation.isPending ? 'Salvando...' : 'Salvar Conta'}</Text>
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
  subtitle: { fontSize: 14, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  inlineFields: { flexDirection: 'row', gap: 12 },
  inlineItem: { flex: 1 },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderColor: '#D9D9D9' },
  choiceSelected: { borderColor: '#D90429', backgroundColor: '#E6F0FF' },
  choiceUnselected: { backgroundColor: 'transparent' },
  preview: { marginTop: 12, alignItems: 'center' },
  previewLabel: { fontSize: 12, marginBottom: 4 },
  previewCode: { fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace' },
  previewTime: { fontSize: 12, marginTop: 2 },
  primaryBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { opacity: 0.6 },
});










