import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import PressableScale from '../PressableScale';
import { getAllEvents } from '../../db/events';
import type { CalendarEvent } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';

const SIMULATED_EVENT_KEY = 'simulated_event_date';

export default function EventsTab() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const [yearlyEvents, setYearlyEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Storage.getItem(SIMULATED_EVENT_KEY).then(setSelectedDate);
    getAllEvents(db).then((events) =>
      setYearlyEvents(events.filter((event) => event.repeatYearly))
    );
  }, [db]);

  const apply = async (date: string | null) => {
    if (date === null) {
      await Storage.removeItem(SIMULATED_EVENT_KEY);
    } else {
      await Storage.setItem(SIMULATED_EVENT_KEY, date);
    }
    setSelectedDate(date);
    setMessage(
      date === null
        ? 'Fecha real restaurada: el banner volverá a seguir el calendario ✓'
        : 'Aplicado ✓ Cambia a la pestaña "Tarro" para ver el banner.'
    );
  };

  const previewEvent =
    yearlyEvents.find((event) => event.date.slice(5) === selectedDate) ?? null;

  return (
    <View>
      <Text style={styles.sectionLabel}>Simular un evento especial</Text>
      <View style={{ rowGap: 8 }}>
        <PressableScale
          style={[styles.card, selectedDate === null && styles.cardSelected]}
          onPress={() => apply(null)}
          scaleTo={0.98}
          accessibilityState={{ selected: selectedDate === null }}
        >
          <View style={styles.row}>
            <Text style={{ fontSize: 17 }}>📅</Text>
            <Text style={styles.label}>Sin evento (fecha real)</Text>
            {selectedDate === null && <Text style={{ color: colors.accent, fontWeight: '800' }}>✓</Text>}
          </View>
        </PressableScale>
        {yearlyEvents.map((event) => {
          const monthDay = event.date.slice(5);
          const isSelected = selectedDate === monthDay;
          return (
            <PressableScale
              key={event.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => apply(monthDay)}
              scaleTo={0.98}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.row}>
                <Text style={{ fontSize: 17 }}>🎉</Text>
                <Text style={styles.label} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.smallButtonText, { fontSize: 12 }]}>{monthDay}</Text>
                {isSelected && <Text style={{ color: colors.accent, fontWeight: '800' }}>✓</Text>}
              </View>
            </PressableScale>
          );
        })}
      </View>

      {message && <Text style={styles.message}>{message}</Text>}

      <Text style={styles.sectionLabel}>Vista previa</Text>
      <View style={[styles.card, { marginBottom: 6 }]}>
        {previewEvent ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
              {previewEvent.description ?? `¡Hoy es ${previewEvent.title}! ✨`}
            </Text>
            <Text style={[styles.hint, { marginTop: 8 }]}>
              Estos eventos viven en tu calendario y se pueden editar o eliminar allí.
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>No hay evento simulado: se muestra el del calendario real.</Text>
        )}
      </View>

      <PressableScale
        style={styles.smallButton}
        onPress={() => apply(null)}
        scaleTo={0.97}
      >
        <Text style={styles.smallButtonText}>Restablecer fecha real</Text>
      </PressableScale>
    </View>
  );
}