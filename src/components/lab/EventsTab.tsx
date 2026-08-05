import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import PressableScale from '../PressableScale';
import {
  getSimulatedEventDate,
  setSimulatedEventDate,
  specialEvents,
  type SpecialEvent,
} from '../../data/specialEvents';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';

export default function EventsTab() {
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [preview, setPreview] = useState<SpecialEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSimulatedEventDate().then(setSelectedDate);
  }, []);

  const apply = async (date: string | null) => {
    await setSimulatedEventDate(date);
    setSelectedDate(date);
    setPreview(date ? (specialEvents.find((event) => event.date === date) ?? null) : null);
    setMessage(
      date === null
        ? 'Fecha real restaurada: el banner volverá a seguir el calendario ✓'
        : 'Aplicado ✓ Cambia a la pestaña "Tarro" para ver el banner.'
    );
  };

  const previewEvent =
    preview ?? (selectedDate ? (specialEvents.find((event) => event.date === selectedDate) ?? null) : null);

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
        {specialEvents.map((event) => {
          const isSelected = selectedDate === event.date;
          return (
            <PressableScale
              key={`${event.date}-${event.title}`}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => apply(event.date)}
              scaleTo={0.98}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.row}>
                <Text style={{ fontSize: 17 }}>🎉</Text>
                <Text style={styles.label} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.smallButtonText, { fontSize: 12 }]}>{event.date}</Text>
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
              {previewEvent.homeBannerMessage}
            </Text>
            <Text style={[styles.hint, { marginTop: 8 }]}>
              Notificación: {previewEvent.notificationMessage}
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
