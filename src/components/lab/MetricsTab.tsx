import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getNotesMetrics, getOpensByNote, resetAppState } from '../../db/notes';
import type { NotesMetrics } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';

export default function MetricsTab() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const [metrics, setMetrics] = useState<NotesMetrics | null>(null);
  const [opens, setOpens] = useState<Array<{ id: string; title: string; timesOpened: number }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMetrics(await getNotesMetrics(db));
    setOpens(await getOpensByNote(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmReset = () => {
    Alert.alert(
      '¿Seguro que quieres reiniciar la aplicación?',
      'Esto marcará todas las notas como no leídas y reiniciará el historial a cero. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, reiniciar',
          style: 'destructive',
          onPress: async () => {
            await resetAppState(db);
            setMessage('Aplicación reiniciada: todas las notas vuelven a estar sin leer ✓');
            await load();
          },
        },
      ]
    );
  };

  const items: Array<{ label: string; value: number }> = metrics
    ? [
        { label: 'Total de notas', value: metrics.total },
        { label: 'Notas leídas', value: metrics.readCount },
        { label: 'Notas por leer', value: metrics.unreadCount },
        { label: 'Aperturas totales', value: metrics.totalOpens },
      ]
    : [];

  return (
    <View>
      <Text style={styles.sectionLabel}>Métricas de lectura</Text>
      <View style={[styles.card, { marginBottom: 10 }]}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[styles.metricRow, index === items.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Aperturas por nota</Text>
      <View style={[styles.card, { marginBottom: 10 }]}>
        {opens.length === 0 ? (
          <Text style={styles.hint}>Todavía no hay aperturas registradas.</Text>
        ) : (
          opens.map((note, index) => (
            <View
              key={note.id}
              style={[styles.metricRow, index === opens.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={[styles.metricLabel, { flex: 1 }]} numberOfLines={1}>
                {note.title}
              </Text>
              <Text style={styles.metricValue}>
                {note.timesOpened} {note.timesOpened === 1 ? 'vez' : 'veces'}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionLabel}>Zona de peligro</Text>
      <Pressable style={styles.buttonDanger} onPress={confirmReset} accessibilityRole="button">
        <Text style={styles.buttonDangerText}>Reiniciar aplicación</Text>
      </Pressable>
      <Text style={[styles.hint, { marginTop: 8, color: colors.textSecondary }]}>
        Marca todas las notas como no leídas y borra las reseñas del historial.
      </Text>

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}
