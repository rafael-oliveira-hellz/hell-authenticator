import { useTheme } from '@/contexts/ThemeContext';
import { AccountStackParamList } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ALGORITHMS = ['SHA1', 'SHA256', 'SHA512'] as const;
const DIGITS = [6, 8] as const;
const PERIODS = [15, 30, 60] as const;

type ManualEntryNav = StackNavigationProp<AccountStackParamList, 'ManualEntry'>;

export const ManualEntryScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<ManualEntryNav>();

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [secret, setSecret] = useState('');
  const [algorithm, setAlgorithm] = useState<typeof ALGORITHMS[number]>('SHA1');
  const [digits, setDigits] = useState<typeof DIGITS[number]>(6);
  const [period, setPeriod] = useState<typeof PERIODS[number]>(30);

  const baseStyles = useMemo(() => ({
    bg: { background: colors.background, card: colors.surface },
    text: { primary: colors.text, secondary: colors.textSecondary },
    accent: { primary: colors.primary, danger: colors.error }
  }), [colors]);

  const sanitizeSecret = (value: string) => value.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  const isBase32 = (value: string) => /^[A-Z2-7]+=*$/.test(value);

  const validate = (): string | null => {
    if (!name.trim()) return 'Nome da conta é obrigatório.';
    if (!secret.trim()) return 'Secret (Base32) é obrigatório.';
    const sanitized = sanitizeSecret(secret);
    if (!isBase32(sanitized) || sanitized.length < 16) return 'Secret inválido. Use Base32 (mínimo 16 chars).';
    if (!ALGORITHMS.includes(algorithm)) return 'Algoritmo inválido.';
    if (!DIGITS.includes(digits)) return 'Dígitos inválidos (6 ou 8).';
    if (!PERIODS.includes(period)) return 'Período inválido (15, 30, 60).';
    return null;
  };

  const handlePreview = () => {
    const error = validate();
    if (error) return Alert.alert('Validação', error);

    navigation.navigate('AddAccount', {
      qrData: {
        type: 'totp',
        label: name.trim(),
        issuer: issuer.trim() || undefined,
        secret: sanitizeSecret(secret),
        algorithm,
        digits,
        period,
      }
    });
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: baseStyles.bg.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: baseStyles.bg.card }]}>
          <Text style={[styles.title, { color: baseStyles.text.primary }]}>Entrada Manual</Text>
          <Text style={[styles.subtitle, { color: baseStyles.text.secondary }]}>Preencha os dados da conta TOTP</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Nome da Conta</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Google"
              placeholderTextColor={baseStyles.text.secondary}
              style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Issuer (opcional)</Text>
            <TextInput
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Ex.: alice@dominio.com"
              placeholderTextColor={baseStyles.text.secondary}
              style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Secret (Base32)</Text>
            <TextInput
              value={secret}
              onChangeText={(v) => setSecret(sanitizeSecret(v))}
              placeholder="JBSWY3DPEHPK3PXP"
              placeholderTextColor={baseStyles.text.secondary}
              autoCapitalize="characters"
              style={[styles.input, { color: baseStyles.text.primary, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inlineFields}>
            <View style={styles.inlineItem}>
              <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Algoritmo</Text>
              <View style={styles.rowButtons}>
                {ALGORITHMS.map(a => (
                  <TouchableOpacity key={a} onPress={() => setAlgorithm(a)} style={[styles.choiceBtn, a === algorithm ? styles.choiceSelected : styles.choiceUnselected]}>
                    <Text style={{ color: baseStyles.text.primary }}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.inlineItem}>
              <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Dígitos</Text>
              <View style={styles.rowButtons}>
                {DIGITS.map(d => (
                  <TouchableOpacity key={d} onPress={() => setDigits(d)} style={[styles.choiceBtn, d === digits ? styles.choiceSelected : styles.choiceUnselected]}>
                    <Text style={{ color: baseStyles.text.primary }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: baseStyles.text.secondary }]}>Período (s)</Text>
            <View style={styles.rowButtons}>
              {PERIODS.map(p => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.choiceBtn, p === period ? styles.choiceSelected : styles.choiceUnselected]}>
                  <Text style={{ color: baseStyles.text.primary }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: baseStyles.accent.primary }]} onPress={handlePreview}>
            <Text style={styles.primaryBtnText}>Visualizar e Salvar</Text>
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
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});








