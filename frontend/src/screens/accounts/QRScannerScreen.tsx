import { useTheme } from '@/contexts/ThemeContext';
import totpService from '@/services/totp';
import { AccountStackParamList, QRCodeData } from '@/types';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useRef } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';

type QRScannerNav = StackNavigationProp<AccountStackParamList, 'QRScanner'>;

export const QRScannerScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<QRScannerNav>();
  const isFocused = useIsFocused();
  const hasScannedRef = useRef(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const handleRead = useCallback((data: string) => {
    if (hasScannedRef.current) {
      return;
    }

    const parsed = totpService.parseQRCodeURI(data);
    if (!parsed || parsed.type !== 'totp') {
      hasScannedRef.current = true;
      Alert.alert('QR inválido', 'Este QR Code não contém um otpauth TOTP válido.', [
        { text: 'OK', onPress: () => { hasScannedRef.current = false; } },
      ]);
      return;
    }

    const qrData: QRCodeData = {
      type: 'totp',
      label: parsed.label,
      issuer: parsed.issuer,
      secret: parsed.secret,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
    };

    hasScannedRef.current = true;
    navigation.navigate('AddAccount', { qrData });
  }, [navigation]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!codes.length) {
        return;
      }

      const first = codes[0];
      if (first.value) {
        handleRead(first.value);
      }
    },
  });

  if (!hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Scanner QR</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Permita acesso à câmera para escanear um QR Code TOTP.</Text>
        </View>
        <View style={styles.body}>
          <TouchableOpacity style={styles.scanButton} onPress={requestPermission}>
            <Text style={styles.scanButtonText}>Permitir câmera</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.navigate('ManualEntry')}>
            <Text style={[styles.link, { color: colors.primary }]}>Adicionar manualmente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Scanner QR</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Câmera traseira indisponível neste dispositivo.</Text>
        </View>
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => navigation.navigate('ManualEntry')}>
            <Text style={[styles.link, { color: colors.primary }]}>Adicionar manualmente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Scanner QR</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Aponte para um QR Code no formato `otpauth://`.</Text>
      </View>

      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          codeScanner={codeScanner}
        />
        <View style={styles.overlay}>
          <View style={styles.marker} />
        </View>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.navigate('ManualEntry')}>
          <Text style={[styles.link, { color: colors.primary }]}>Adicionar manualmente</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  cameraContainer: { flex: 1, overflow: 'hidden', borderRadius: 12, margin: 12 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marker: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#D90429',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanButton: {
    backgroundColor: '#D90429',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  scanButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: { padding: 16, alignItems: 'center' },
  link: { fontSize: 16, fontWeight: '600' },
});




