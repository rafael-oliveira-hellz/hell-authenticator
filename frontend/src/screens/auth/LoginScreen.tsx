import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '@/store';
import { login } from '@/store/slices/authSlice';
import { useTheme } from '@/contexts/ThemeContext';
import { LoginCredentials } from '@/types';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha seu e-mail e sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const credentials: LoginCredentials = { email, password };
      await dispatch(login(credentials)).unwrap();
    } catch (error) {
      Alert.alert('Erro', getErrorMessage(error, 'Falha no login.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      testID="login-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroWrap}>
          <View style={[styles.heroGlow, isDark ? styles.heroGlowDark : styles.heroGlowLight]} />
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.brandRow}>
              <View style={[styles.brandBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.brandBadgeText}>HA</Text>
              </View>
              <Text style={[styles.brandName, { color: colors.textSecondary }]}>Hell Authenticator</Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Segurança bonita, rápida e sob controle.</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Entre para acessar seus códigos, backups e conexões em nuvem com uma experiência mais refinada.</Text>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.metricNumber, { color: colors.text }]}>30s</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>ciclo TOTP</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.metricNumber, { color: colors.text }]}>Cloud</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>backup seguro</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Entrar na sua conta</Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>Use suas credenciais para continuar.</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>E-mail</Text>
          <View style={[styles.inputShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              testID="login-email-input"
              style={[styles.input, { color: colors.text }]}
              placeholder="voce@empresa.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Senha</Text>
          <View style={[styles.inputShell, styles.passwordShell, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              testID="login-password-input"
              style={[styles.input, styles.passwordInput, { color: colors.text }]}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate('ForgotPassword' as never)}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="login-submit-button"
            style={[styles.loginButton, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>{isLoading ? 'Entrando...' : 'Entrar agora'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => navigation.navigate('Register' as never)}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Criar nova conta</Text>
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
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  heroWrap: {
    marginBottom: 20,
  },
  heroGlow: {
    position: 'absolute',
    top: -12,
    right: 24,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroGlowLight: {
    backgroundColor: 'rgba(200,76,54,0.12)',
  },
  heroGlowDark: {
    backgroundColor: 'rgba(255,122,89,0.16)',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 6,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 21,
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
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loginButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
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
  buttonDisabled: {
    opacity: 0.65,
  },
});



