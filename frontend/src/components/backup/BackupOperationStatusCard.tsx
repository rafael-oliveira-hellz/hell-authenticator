import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BackupOperationStatusCardProps = {
  title: string;
  message: string;
  progress: number;
  tone?: 'default' | 'success' | 'error';
};

export const BackupOperationStatusCard: React.FC<BackupOperationStatusCardProps> = ({
  title,
  message,
  progress,
  tone = 'default',
}) => {
  const { colors } = useTheme();

  const progressColor = tone === 'success'
    ? '#22C55E'
    : tone === 'error'
      ? colors.error
      : colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.percent, { color: progressColor }]}>{Math.round(progress)}%</Text>
      </View>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { backgroundColor: progressColor, width: `${Math.max(0, Math.min(progress, 100))}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  percent: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
