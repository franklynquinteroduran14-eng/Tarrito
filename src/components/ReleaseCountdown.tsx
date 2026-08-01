import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ReleaseCountdownProps {
  target: Date;
}

function formatRemaining(remainingMs: number): string {
  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

export default function ReleaseCountdown({ target }: ReleaseCountdownProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = useMemo(
    () => Math.max(0, target.getTime() - now),
    [target, now]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Siguiente nota disponible en:</Text>
      <Text style={styles.time}>{formatRemaining(remaining)}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    time: {
      marginTop: 4,
      fontSize: 26,
      fontWeight: '800',
      color: colors.accent,
      fontVariant: ['tabular-nums'],
    },
  });
