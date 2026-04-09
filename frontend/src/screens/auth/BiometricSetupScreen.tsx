import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch } from '@/store';
import { setupBiometric } from '@/store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export const BiometricSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    // Detectar tipo de biometria disponível
    detectBiometricType();
  }, []);

  const detectBiometricType = async () => {
    try {
      // TODO: Implementar detecção de biometria
      setBiometricType('fingerprint');
    } catch {
      setBiometricType('fingerprint');
    }
  };

  const handleSetupBiometric = async () => {
    setIsLoading(true);
    try {
      await dispatch(setupBiometric()).unwrap();
      Alert.alert(
        'Sucesso',
        'Biometria configurada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Falha ao configurar biometria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login' as never);
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'fingerprint':
        return '👆';
      case 'face':
        return '👤';
      case 'touch':
        return '👆';
      default:
        return '🔐';
    }
  };

  const getBiometricName = () => {
    switch (biometricType) {
      case 'fingerprint':
        return 'Impressão Digital';
      case 'face':
        return 'Face ID';
      case 'touch':
        return 'Touch ID';
      default:
        return 'Biometria';
    }
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.background }
    ]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[
            styles.icon,
            { color: colors.primary }
          ]}>
            {getBiometricIcon()}
          </Text>
          
          <Text style={[
            styles.title,
            { color: colors.text }
          ]}>
            Configurar {getBiometricName()}
          </Text>
          
          <Text style={[
            styles.subtitle,
            { color: colors.textSecondary }
          ]}>
            Use sua {getBiometricName().toLowerCase()} para fazer login de forma rápida e segura
          </Text>
        </View>

        <View style={styles.benefits}>
          <Text style={[
            styles.benefitsTitle,
            { color: colors.text }
          ]}>
            Benefícios:
          </Text>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>⚡</Text>
            <Text style={[
              styles.benefitText,
              { color: colors.textSecondary }
            ]}>
              Login mais rápido
            </Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🔒</Text>
            <Text style={[
              styles.benefitText,
              { color: colors.textSecondary }
            ]}>
              Máxima segurança
            </Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>🎯</Text>
            <Text style={[
              styles.benefitText,
              { color: colors.textSecondary }
            ]}>
              Sem necessidade de senha
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.setupButton,
              { backgroundColor: colors.primary },
              isLoading && styles.setupButtonDisabled
            ]}
            onPress={handleSetupBiometric}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.setupButtonText}>
                Configurar {getBiometricName()}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={[
              styles.skipButtonText,
              { color: colors.textSecondary }
            ]}>
              Pular por enquanto
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  benefits: {
    marginBottom: 40,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
  },
  actions: {
    alignItems: 'center',
  },
  setupButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 16,
  },
});




