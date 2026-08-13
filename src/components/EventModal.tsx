import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSQLiteContext } from 'expo-sqlite';
import type { CalendarEvent, CalendarEventType } from '../types';
import { deleteEvent, insertEvent, updateEvent } from '../db/events';
import { EVENT_TYPE_IDS, EVENT_TYPE_META } from '../constants/eventTypes';
import { formatDateKey, toDateKey } from '../utils/date';
import { useTheme } from '../theme/ThemeContext';
import PressableScale from './PressableScale';

interface EventModalProps {
  visible: boolean;
  selectedDate: string | null;
  editingEvent: CalendarEvent | null;
  onClose: () => void;
  onChanged: () => void;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function EventModal({
  visible,
  selectedDate,
  editingEvent,
  onClose,
  onChanged,
}: EventModalProps) {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEventType>('recordatorio');
  const [date, setDate] = useState<string>(toDateKey(new Date()));
  const [description, setDescription] = useState('');
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.9);
    cardTranslateY.setValue(30);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 16,
        stiffness: 160,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, backdropOpacity, cardScale, cardTranslateY, cardOpacity]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editingEvent) {
      setTitle(editingEvent.title);
      setType(editingEvent.type);
      setDate(editingEvent.date);
      setDescription(editingEvent.description ?? '');
      setRepeatYearly(editingEvent.repeatYearly);
    } else {
      setTitle('');
      setType('recordatorio');
      setDate(selectedDate ?? toDateKey(new Date()));
      setDescription('');
      setRepeatYearly(false);
    }
    setSaving(false);
    setError(null);
    setShowPicker(false);
  }, [visible, editingEvent, selectedDate]);

  const selectType = (next: CalendarEventType) => {
    setType(next);
    if (next === 'cumpleanos' && !editingEvent) {
      setRepeatYearly(true);
    }
  };

  const onPickerChange = (_: unknown, picked?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (picked) {
      setDate(toDateKey(picked));
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError('Escribe un título para el evento.');
      return;
    }
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: trimmedTitle,
        type,
        date,
        description: description.trim().length > 0 ? description.trim() : null,
        repeatYearly,
      };
      if (editingEvent) {
        await updateEvent(db, editingEvent.id, payload);
      } else {
        await insertEvent(db, payload);
      }
      onChanged();
      onClose();
    } catch {
      setError('No se pudo guardar el evento. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingEvent) {
      return;
    }
    Alert.alert('Eliminar evento', `¿Quieres eliminar “${editingEvent.title}”?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(db, editingEvent.id);
          onChanged();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.title}>
                {editingEvent ? 'Editar evento' : 'Nuevo evento'}
              </Text>

              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                placeholder="¿Qué recordamos hoy?…"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />

              <Text style={styles.label}>Tipo</Text>
              <View style={styles.typeRow}>
                {EVENT_TYPE_IDS.map((eventType) => {
                  const meta = EVENT_TYPE_META[eventType];
                  const isSelected = type === eventType;
                  return (
                    <PressableScale
                      key={eventType}
                      style={[
                        styles.typeChip,
                        isSelected && {
                          borderColor: meta.color,
                          backgroundColor: colors.accentSoft,
                        },
                      ]}
                      onPress={() => selectType(eventType)}
                      scaleTo={0.94}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={styles.typeChipIcon}>{meta.icon}</Text>
                      <Text
                        style={[
                          styles.typeChipText,
                          isSelected && { color: meta.color, fontWeight: '800' },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              <Text style={styles.label}>Fecha</Text>
              <PressableScale
                style={[styles.input, styles.dateButton]}
                onPress={() => setShowPicker(true)}
                scaleTo={0.98}
                accessibilityLabel="Cambiar fecha"
              >
                <Text style={styles.dateButtonText}>{formatDateKey(date)}</Text>
                <Text style={styles.dateButtonIcon}>📅</Text>
              </PressableScale>

              {showPicker && (
                <DateTimePicker
                  value={parseDateKey(date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  locale="es-ES"
                  onChange={onPickerChange}
                />
              )}

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Un detalle extra para este día…"
                placeholderTextColor={colors.textSecondary}
                multiline
                value={description}
                onChangeText={setDescription}
                maxLength={200}
              />

              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text style={styles.switchTitle}>Repetir cada año</Text>
                  <Text style={styles.switchHint}>
                    Se marcará este mismo día todos los años
                  </Text>
                </View>
                <Switch
                  value={repeatYearly}
                  onValueChange={setRepeatYearly}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <PressableScale
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                scaleTo={0.97}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Guardando…' : editingEvent ? 'Guardar cambios' : 'Agregar evento'}
                </Text>
              </PressableScale>

              {editingEvent && (
                <PressableScale
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  scaleTo={0.97}
                >
                  <Text style={styles.deleteButtonText}>Eliminar evento</Text>
                </PressableScale>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.backdrop,
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 22,
      paddingVertical: 40,
    },
    card: {
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderRadius: 26,
      paddingHorizontal: 24,
      paddingTop: 26,
      paddingBottom: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 12,
    },
    scrollContent: {
      paddingBottom: 8,
    },
    closeButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    closeText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '700',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginRight: 40,
    },
    label: {
      marginTop: 18,
      marginBottom: 8,
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    input: {
      borderRadius: 16,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textBody,
    },
    descriptionInput: {
      minHeight: 80,
      maxHeight: 130,
      textAlignVertical: 'top',
    },
    typeRow: {
      flexDirection: 'row',
      columnGap: 8,
    },
    typeChip: {
      flex: 1,
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    typeChipIcon: {
      fontSize: 18,
    },
    typeChipText: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      textTransform: 'capitalize',
    },
    dateButtonIcon: {
      fontSize: 16,
    },
    switchRow: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.accentSoft,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    switchText: {
      flex: 1,
      marginRight: 12,
    },
    switchTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    switchHint: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
    errorText: {
      marginTop: 12,
      textAlign: 'center',
      color: colors.error,
      fontSize: 13,
    },
    saveButton: {
      marginTop: 20,
      borderRadius: 18,
      backgroundColor: colors.accent,
      paddingVertical: 15,
      alignItems: 'center',
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    saveButtonDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    deleteButton: {
      marginTop: 10,
      borderRadius: 18,
      backgroundColor: colors.pillBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 13,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '700',
    },
  });