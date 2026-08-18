import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import PressableScale from '../PressableScale';
import {
  forceTestEventNotification,
  forceTestNotification,
  getScheduleTimes,
  resetScheduleTimes,
  scheduleDailyNotifications,
  setScheduleTime,
  type ScheduleSlot,
  type SlotTime,
} from '../../services/notifications';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';

const SLOTS: Array<{ id: ScheduleSlot; label: string; icon: string }> = [
  { id: 'morning', label: 'Buenos días', icon: '🌅' },
  { id: 'release', label: 'Nueva carta', icon: '📬' },
  { id: 'evening', label: 'Recordatorio', icon: '🌙' },
];

const DEFAULT_TIMES: Record<ScheduleSlot, SlotTime> = {
  morning: { hour: 5, minute: 30 },
  release: { hour: 13, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function NotificationsTab() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const [times, setTimes] = useState<Record<ScheduleSlot, SlotTime>>(DEFAULT_TIMES);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getScheduleTimes().then(setTimes);
  }, []);

  const adjust = (slot: ScheduleSlot, deltaHour: number, deltaMinute: number) => {
    setTimes((prev) => {
      const current = prev[slot];
      const hour = (current.hour + deltaHour + 24) % 24;
      const minute = (current.minute + deltaMinute + 60) % 60;
      return { ...prev, [slot]: { hour, minute } };
    });
  };

  const save = async () => {
    await setScheduleTime('morning', times.morning.hour, times.morning.minute);
    await setScheduleTime('release', times.release.hour, times.release.minute);
    await setScheduleTime('evening', times.evening.hour, times.evening.minute);
    await scheduleDailyNotifications(db);
    setMessage('Horarios guardados y notificaciones reprogramadas ✓');
  };

  const restore = async () => {
    await resetScheduleTimes();
    await scheduleDailyNotifications(db);
    setTimes(DEFAULT_TIMES);
    setMessage('Horarios restaurados a los valores por defecto ✓');
  };

  const testRegular = async () => {
    await forceTestNotification();
    setMessage('Notificación regular enviada, se muestra al instante ✓');
  };

  const testEvent = async () => {
    await forceTestEventNotification(db);
    setMessage('Notificación de evento enviada, se muestra al instante ✓');
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Horarios diarios</Text>
      {SLOTS.map((slot) => (
        <View key={slot.id} style={[styles.card, { marginBottom: 10 }]}>
          <View style={styles.row}>
            <Text style={{ fontSize: 17 }}>{slot.icon}</Text>
            <Text style={styles.label}>{slot.label}</Text>
            <Text style={styles.timeText}>
              {pad(times[slot.id].hour)}:{pad(times[slot.id].minute)}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: 10, justifyContent: 'space-between' }]}>
            <View style={styles.row}>
              <PressableScale
                style={styles.stepperButton}
                onPress={() => adjust(slot.id, -1, 0)}
                scaleTo={0.85}
                accessibilityLabel={`Restar una hora a ${slot.label}`}
              >
                <Text style={styles.stepperText}>−</Text>
              </PressableScale>
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '700' }}>hora</Text>
              <PressableScale
                style={styles.stepperButton}
                onPress={() => adjust(slot.id, 1, 0)}
                scaleTo={0.85}
                accessibilityLabel={`Sumar una hora a ${slot.label}`}
              >
                <Text style={styles.stepperText}>+</Text>
              </PressableScale>
            </View>
            <View style={styles.row}>
              <PressableScale
                style={styles.stepperButton}
                onPress={() => adjust(slot.id, 0, -5)}
                scaleTo={0.85}
                accessibilityLabel={`Restar cinco minutos a ${slot.label}`}
              >
                <Text style={styles.stepperText}>−</Text>
              </PressableScale>
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '700' }}>min</Text>
              <PressableScale
                style={styles.stepperButton}
                onPress={() => adjust(slot.id, 0, 5)}
                scaleTo={0.85}
                accessibilityLabel={`Sumar cinco minutos a ${slot.label}`}
              >
                <Text style={styles.stepperText}>+</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      ))}

      <View style={{ rowGap: 8 }}>
        <PressableScale style={styles.buttonPrimary} onPress={save}>
          <Text style={styles.buttonPrimaryText}>Guardar horarios</Text>
        </PressableScale>
        <PressableScale style={styles.smallButton} onPress={restore} scaleTo={0.97}>
          <Text style={styles.smallButtonText}>Restaurar por defecto (5:30 · 13:00 · 20:00)</Text>
        </PressableScale>
      </View>

      {message && <Text style={styles.message}>{message}</Text>}

      <Text style={styles.sectionLabel}>Prueba de notificaciones</Text>
      <View style={{ rowGap: 8 }}>
        <PressableScale style={styles.buttonPrimary} onPress={testRegular}>
          <Text style={styles.buttonPrimaryText}>🔔 Forzar notificación regular (al instante)</Text>
        </PressableScale>
        <PressableScale style={styles.buttonPrimary} onPress={testEvent}>
          <Text style={styles.buttonPrimaryText}>🎉 Forzar notificación del evento de hoy (al instante)</Text>
        </PressableScale>
      </View>

      <Text style={[styles.hint, { marginTop: 10 }]}>
        Canales de Android: "Notificaciones Diarias" (sonido diario) y "Eventos Especiales" (sonido
        propio). Los sonidos personalizados de canal aplican en build nativo; en Expo Go suenan con
        el tono del sistema.
      </Text>
    </View>
  );
}
