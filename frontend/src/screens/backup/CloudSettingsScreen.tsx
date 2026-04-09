import { useTheme } from '@/contexts/ThemeContext';
import {
  useBackupProvidersQuery,
  useConnectUserCloudProviderMutation,
  useDisconnectUserCloudProviderMutation,
  useStartUserCloudOAuthMutation,
  useUserCloudConnectionsQuery,
} from '@/hooks/useBackups';
import { BackupStackParamList, UserCloudProvider } from '@/types';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const PERSONAL_PROVIDER_LABELS: Record<UserCloudProvider, string> = {
  'google-drive': 'Google Drive',
};

const PERSONAL_PROVIDER_HINTS: Record<UserCloudProvider, string> = {
  'google-drive': 'Conecte sua conta Google Drive para guardar backups na sua própria nuvem.',
};

const getConnectionLabel = (status: 'connected' | 'not-configured') =>
  status === 'connected' ? 'Configurada' : 'Não configurada';

const getVerificationLabel = (status: 'verified' | 'failed' | 'skipped') => {
  switch (status) {
    case 'verified':
      return 'Credencial verificada';
    case 'failed':
      return 'Falha na verificação';
    default:
      return 'Verificação pendente';
  }
};

type CloudSettingsNavigation = StackNavigationProp<BackupStackParamList, 'CloudSettings'>;
type CloudSettingsRoute = RouteProp<BackupStackParamList, 'CloudSettings'>;

export const CloudSettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<CloudSettingsNavigation>();
  const route = useRoute<CloudSettingsRoute>();
  const { data: providers = [], isLoading: isLoadingProviders, refetch: refetchProviders } = useBackupProvidersQuery();
  const { data: connections = [], isLoading: isLoadingConnections, refetch: refetchConnections } = useUserCloudConnectionsQuery();
  const connectMutation = useConnectUserCloudProviderMutation();
  const startOAuthMutation = useStartUserCloudOAuthMutation();
  const disconnectMutation = useDisconnectUserCloudProviderMutation();
  const handledOauthMessageRef = useRef<string | null>(null);

  const [manualProvider, setManualProvider] = useState<UserCloudProvider | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  const internalCloud = useMemo(() => providers.find((provider) => provider.id === 'gcp') ?? null, [providers]);

  useEffect(() => {
    const oauthStatus = route.params?.oauthStatus;
    const provider = route.params?.provider;
    const message = route.params?.message;
    const callbackAccountEmail = route.params?.accountEmail;

    if (!oauthStatus || !provider) {
      return;
    }

    const dedupeKey = `${oauthStatus}:${provider}:${message ?? ''}:${callbackAccountEmail ?? ''}`;
    if (handledOauthMessageRef.current === dedupeKey) {
      return;
    }

    handledOauthMessageRef.current = dedupeKey;

    Promise.all([refetchProviders(), refetchConnections()]).catch(() => undefined);

    if (oauthStatus === 'connected') {
      Alert.alert(
        'Conta conectada',
        callbackAccountEmail
          ? `${PERSONAL_PROVIDER_LABELS[provider]} conectado com sucesso para ${callbackAccountEmail}.`
          : `${PERSONAL_PROVIDER_LABELS[provider]} conectado com sucesso.`
      );
    } else {
      Alert.alert('Falha na conexão', message || `Não foi possível conectar ${PERSONAL_PROVIDER_LABELS[provider]}.`);
    }

    navigation.setParams({
      oauthStatus: undefined,
      provider: undefined,
      message: undefined,
      accountEmail: undefined,
    });
  }, [navigation, refetchConnections, refetchProviders, route.params]);

  const resetForm = () => {
    setManualProvider(null);
    setAccessToken('');
    setRefreshToken('');
    setAccountEmail('');
  };

  const handleStartOAuth = async (provider: UserCloudProvider) => {
    try {
      const result = await startOAuthMutation.mutateAsync({
        provider,
        successRedirectUri: 'hellauthenticator://backup/cloud-settings',
        errorRedirectUri: 'hellauthenticator://backup/cloud-settings',
      });
      await Linking.openURL(result.authorizationUrl);
      Alert.alert(
        'Autorização iniciada',
        `A página de autorização do ${PERSONAL_PROVIDER_LABELS[provider]} foi aberta no navegador. Quando a conexão terminar, o app será chamado de volta automaticamente.`
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível iniciar a autorização OAuth.';
      Alert.alert('Erro', message);
    }
  };

  const handleConnect = async (provider: UserCloudProvider) => {
    if (!accessToken.trim()) {
      Alert.alert('Validação', 'Informe um access token para conectar a conta.');
      return;
    }

    try {
      await connectMutation.mutateAsync({
        provider,
        accessToken: accessToken.trim(),
        refreshToken: refreshToken.trim() || undefined,
        accountEmail: accountEmail.trim() || undefined,
      });

      Alert.alert('Conta conectada', `${PERSONAL_PROVIDER_LABELS[provider]} conectado com sucesso.`);
      resetForm();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível conectar a conta em nuvem.';
      Alert.alert('Erro', message);
    }
  };

  const handleDisconnect = (provider: UserCloudProvider) => {
    Alert.alert('Desconectar conta', `Deseja desconectar ${PERSONAL_PROVIDER_LABELS[provider]}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          try {
            await disconnectMutation.mutateAsync(provider);
            Alert.alert('Conta desconectada', `${PERSONAL_PROVIDER_LABELS[provider]} foi desconectado.`);
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Não foi possível desconectar a conta.';
            Alert.alert('Erro', message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Nuvem do app</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          O Hell Authenticator usa uma nuvem interna para o fluxo automático de backup. A infraestrutura real fica transparente para você.
        </Text>

        {isLoadingProviders ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>Carregando status da nuvem do app...</Text>
        ) : !internalCloud ? (
          <Text style={[styles.helperText, { color: colors.error }]}>A nuvem interna do app não está disponível no backend.</Text>
        ) : (
          <View style={[styles.providerCard, { borderColor: colors.border }]}>
            <Text style={[styles.providerTitle, { color: colors.text }]}>{internalCloud.label}</Text>
            <Text style={[styles.providerDescription, { color: colors.textSecondary }]}>{internalCloud.description}</Text>
            <Text style={[styles.providerMeta, { color: colors.textSecondary }]}>Ambiente: {getConnectionLabel(internalCloud.connectionStatus)}</Text>
            <Text
              style={[
                styles.providerMeta,
                { color: internalCloud.verificationStatus === 'failed' ? colors.error : internalCloud.verificationStatus === 'verified' ? (colors.success || colors.primary) : colors.textSecondary },
              ]}
            >
              Verificação: {getVerificationLabel(internalCloud.verificationStatus)}
            </Text>
            {internalCloud.verificationMessage ? (
              <Text style={[styles.providerMeta, { color: colors.textSecondary }]}>Detalhe: {internalCloud.verificationMessage}</Text>
            ) : null}
            {internalCloud.lastVerifiedAt ? (
              <Text style={[styles.providerMeta, { color: colors.textSecondary }]}>Última verificação: {new Date(internalCloud.lastVerifiedAt).toLocaleString('pt-BR')}</Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Suas contas conectadas</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Conecte o Google Drive para salvar backups diretamente na sua própria conta de armazenamento.
        </Text>
        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
          O fluxo principal usa autorização OAuth em navegador externo e retorna automaticamente para o app. A conexão manual por token fica disponível apenas como fallback avançado.
        </Text>

        {isLoadingConnections ? (
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>Carregando contas conectadas...</Text>
        ) : (
          (Object.keys(PERSONAL_PROVIDER_LABELS) as UserCloudProvider[]).map((provider) => {
            const connection = connections.find((item) => item.provider === provider);
            const isConnected = connection?.status === 'connected';

            return (
              <View key={provider} style={[styles.providerCard, { borderColor: colors.border }]}>
                <Text style={[styles.providerTitle, { color: colors.text }]}>{PERSONAL_PROVIDER_LABELS[provider]}</Text>
                <Text style={[styles.providerDescription, { color: colors.textSecondary }]}>{PERSONAL_PROVIDER_HINTS[provider]}</Text>

                <Text style={[styles.providerMeta, { color: isConnected ? (colors.success || colors.primary) : colors.textSecondary }]}>
                  Status: {isConnected ? 'Conta conectada' : 'Conta não conectada'}
                </Text>

                {connection?.accountEmail ? (
                  <Text style={[styles.providerMeta, { color: colors.textSecondary }]}>Conta: {connection.accountEmail}</Text>
                ) : null}

                {connection?.lastVerifiedAt ? (
                  <Text style={[styles.providerMeta, { color: colors.textSecondary }]}>Última validação: {new Date(connection.lastVerifiedAt).toLocaleString('pt-BR')}</Text>
                ) : null}

                {isConnected ? (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => handleDisconnect(provider)}
                    disabled={disconnectMutation.isPending}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar conta'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: colors.primary }, startOAuthMutation.isPending && styles.disabledButton]}
                      onPress={() => handleStartOAuth(provider)}
                      disabled={startOAuthMutation.isPending}
                    >
                      <Text style={styles.primaryButtonText}>{startOAuthMutation.isPending ? 'Abrindo autorização...' : `Conectar com ${PERSONAL_PROVIDER_LABELS[provider]}`}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.manualToggle} onPress={() => {
                      setManualProvider(manualProvider === provider ? null : provider);
                    }}>
                      <Text style={[styles.manualToggleText, { color: colors.primary }]}>
                        {manualProvider === provider ? 'Ocultar conexão manual' : 'Usar token manualmente'}
                      </Text>
                    </TouchableOpacity>

                    {manualProvider === provider ? (
                      <View style={styles.formWrap}>
                        <Text style={[styles.manualHint, { color: colors.textSecondary }]}>
                          Use este modo apenas para testes avançados ou quando você já tiver um token emitido pelo provedor.
                        </Text>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Access token</Text>
                        <TextInput
                          value={accessToken}
                          onChangeText={setAccessToken}
                          placeholder="Cole o token de acesso do serviço"
                          placeholderTextColor={colors.textSecondary}
                          autoCapitalize="none"
                          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Refresh token (opcional)</Text>
                        <TextInput
                          value={refreshToken}
                          onChangeText={setRefreshToken}
                          placeholder="Use se o provedor disponibilizar"
                          placeholderTextColor={colors.textSecondary}
                          autoCapitalize="none"
                          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail da conta (opcional)</Text>
                        <TextInput
                          value={accountEmail}
                          onChangeText={setAccountEmail}
                          placeholder="Ex.: usuario@provedor.com"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        />

                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: colors.primary }, connectMutation.isPending && styles.disabledButton]}
                          onPress={() => handleConnect(provider)}
                          disabled={connectMutation.isPending}
                        >
                          <Text style={styles.primaryButtonText}>{connectMutation.isPending ? 'Conectando...' : `Salvar conexão ${PERSONAL_PROVIDER_LABELS[provider]}`}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  sectionSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  noticeText: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  helperText: { fontSize: 14, lineHeight: 20 },
  providerCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  providerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  providerDescription: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  providerMeta: { fontSize: 12, lineHeight: 18 },
  formWrap: { marginTop: 12 },
  manualHint: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  manualToggle: { marginTop: 12 },
  manualToggleText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  primaryButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
});
