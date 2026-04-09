import { useTheme } from '@/contexts/ThemeContext';
import { ScannedQRCode } from '@/types';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { colors } = useTheme();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permissão de Câmera',
            message: 'O app precisa acessar sua câmera para escanear códigos QR',
            buttonNeutral: 'Perguntar depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch {
        setHasPermission(false);
      }
    } else {
      // iOS permissions são solicitadas automaticamente
      setHasPermission(true);
    }
  };

  const handleScanSuccess = (data: string) => {
    setIsScanning(false);
    
    // Parse QR code data
    const scannedData: ScannedQRCode = {
      data,
      type: 'unknown',
      isValid: false,
    };

    // TODO: Implementar parsing do QR code
    // Por enquanto, simula um QR code válido
    if (data.startsWith('otpauth://')) {
      scannedData.type = 'totp';
      scannedData.isValid = true;
      
      Alert.alert(
        'QR Code Detectado',
        'Código QR válido encontrado! Deseja adicionar esta conta?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Adicionar',
            onPress: () => {
              // Navegar para tela de adicionar conta com os dados
              navigation.navigate('Accounts', { screen: 'AddAccount', params: { qrData: scannedData } });
            },
          },
        ]
      );
    } else {
      Alert.alert('QR Code Inválido', 'Este QR code não é um código de autenticação válido.');
    }
  };

  const startScanning = () => {
    if (!hasPermission) {
      Alert.alert(
        'Permissão Necessária',
        'É necessário permitir o acesso à câmera para escanear códigos QR.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Configurações',
            onPress: requestCameraPermission,
          },
        ]
      );
      return;
    }

    setIsScanning(true);
    // TODO: Implementar scanner real
    // Por enquanto, simula um scan
    setTimeout(() => {
      handleScanSuccess('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
    }, 2000);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  if (hasPermission === null) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}>
        <View style={styles.centerContent}>
          <Text style={[
            styles.loadingText,
            { color: colors.text }
          ]}>
            Solicitando permissão...
          </Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}>
        <View style={styles.centerContent}>
          <Text style={[
            styles.permissionIcon,
            { color: colors.textSecondary }
          ]}>
            📷
          </Text>
          <Text style={[
            styles.permissionTitle,
            { color: colors.text }
          ]}>
            Permissão de Câmera Necessária
          </Text>
          <Text style={[
            styles.permissionText,
            { color: colors.textSecondary }
          ]}>
            Para escanear códigos QR, o app precisa acessar sua câmera.
          </Text>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              { backgroundColor: colors.primary }
            ]}
            onPress={requestCameraPermission}
          >
            <Text style={styles.permissionButtonText}>
              Permitir Acesso
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.background }
    ]}>
      {isScanning ? (
        <View style={styles.scannerContainer}>
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>
          
          <View style={styles.scannerInfo}>
            <Text style={[
              styles.scannerText,
              { color: colors.text }
            ]}>
              Posicione o código QR dentro da área
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopScanning}
          >
            <Text style={styles.stopButtonText}>
              Parar Scanner
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={[
            styles.scannerIcon,
            { color: colors.primary }
          ]}>
            📷
          </Text>
          
          <Text style={[
            styles.scannerTitle,
            { color: colors.text }
          ]}>
            Scanner QR Code
          </Text>
          
          <Text style={[
            styles.scannerDescription,
            { color: colors.textSecondary }
          ]}>
            Escaneie códigos QR para adicionar contas de autenticação de forma rápida e segura.
          </Text>
          
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: colors.primary }
            ]}
            onPress={startScanning}
          >
            <Text style={styles.startButtonText}>
              Iniciar Scanner
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => navigation.navigate('Accounts', { screen: 'ManualEntry' })}
          >
            <Text style={[
              styles.manualButtonText,
              { color: colors.primary }
            ]}>
              Entrada Manual
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#D90429',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    top: 'auto',
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    top: 'auto',
    right: 0,
    left: 'auto',
    bottom: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  scannerInfo: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerText: {
    fontSize: 16,
    textAlign: 'center',
  },
  stopButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#D90429',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannerIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  scannerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  scannerDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  startButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualButton: {
    paddingVertical: 8,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});









