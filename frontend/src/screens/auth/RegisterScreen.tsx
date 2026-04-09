import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '@/store';
import { register } from '@/store/slices/authSlice';
import { useTheme } from '@/contexts/ThemeContext';
import { RegisterData } from '@/types';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Erro', 'Você precisa aceitar os termos para continuar.');
      return;
    }

    setIsLoading(true);
    try {
      const data: RegisterData = {
        name,
        email,
        password,
        confirmPassword,
        acceptTerms,
      };

      await dispatch(register(data)).unwrap();
      Alert.alert('Conta criada', 'Sua conta foi criada com sucesso. Faça login para continuar.');
      navigation.navigate('Login' as never);
    } catch (error) {
      Alert.alert('Erro', getErrorMessage(error, 'Falha ao criar a conta.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Criar uma conta elegante e segura</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Monte seu cofre de autenticação em poucos passos.</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nome completo</Text>
          <View style={[styles.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput style={[styles.input, { color: colors.text }]} placeholder="Seu nome" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} autoCapitalize="words" />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>E-mail</Text>
          <View style={[styles.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput style={[styles.input, { color: colors.text }]} placeholder="voce@empresa.com" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Senha</Text>
          <View style={[styles.inputShell, styles.passwordShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput style={[styles.input, styles.passwordInput, { color: colors.text }]} placeholder="Mínimo de 8 caracteres" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirmar senha</Text>
          <View style={[styles.inputShell, styles.passwordShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput style={[styles.input, styles.passwordInput, { color: colors.text }]} placeholder="Repita a senha" placeholderTextColor={colors.textSecondary} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} autoCapitalize="none" />
            <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} style={styles.eyeButton}>
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms((value) => !value)}>
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: acceptTerms ? colors.primary : colors.surface }]}>
              {acceptTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>Aceito os termos de uso e a política de privacidade.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={isLoading}>
            <Text style={styles.primaryButtonText}>{isLoading ? 'Criando conta...' : 'Criar conta'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => navigation.navigate('Login' as never)}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Voltar para login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  inputShell: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    minHeight: 58,
    justifyContent: 'center',
  },
  passwordShell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    minHeight: 54,
  },
  passwordInput: { flex: 1 },
  eyeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.65 },
});
