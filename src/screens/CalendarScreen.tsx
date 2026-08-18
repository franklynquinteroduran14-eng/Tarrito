import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { CalendarEvent } from '../types';
import { getAllEvents } from '../db/events';
import { EVENT_TYPE_IDS, EVENT_TYPE_META } from '../constants/eventTypes';
import { formatDateKey, toDateKey } from '../utils/date';
import { useTheme } from '../theme/ThemeContext';
import PressableScale from '../components/PressableScale';
import EventModal from '../components/EventModal';

LocaleConfig.locales['es'] = {
  monthNames: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ],
  monthNamesShort: [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

interface VisibleMonth {
  year: number;
  month: number;
}

function monthPrefix(month: VisibleMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}

function monthLabel(month: VisibleMonth): string {
  const date = new Date(month.year, month.month - 1, 1);
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const { colors, mode } = useTheme();
  const styles = createStyles(colors);

  const todayKey = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [monthLabelText, setMonthLabelText] = useState<string>(() =>
    monthLabel({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    })
  );
  const monthOpacity = useRef(new Animated.Value(1)).current;
  const monthTranslate = useRef(new Animated.Value(0)).current;
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const load = useCallback(async () => {
    setAllEvents(await getAllEvents(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const monthPrefixKey = monthPrefix(visibleMonth);

  const markedDates = useMemo(() => {
    const marked: Record<
      string,
      {
        dots: Array<{ key: string; color: string }>;
        marked: boolean;
        selected?: boolean;
        selectedColor?: string;
        selectedTextColor?: string;
      }
    > = {};
    for (const event of allEvents) {
      const key = event.repeatYearly
        ? `${visibleMonth.year}-${event.date.slice(5)}`
        : event.date;
      if (!key.startsWith(monthPrefixKey)) {
        continue;
      }
      const dots = marked[key]?.dots ?? [];
      const color = EVENT_TYPE_META[event.type].color;
      if (!dots.some((dot) => dot.color === color)) {
        dots.push({ key: event.type, color });
      }
      marked[key] = { dots, marked: true };
    }
    if (marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.accent,
        selectedTextColor: '#FFFFFF',
      };
    }
    return marked;
  }, [allEvents, selectedDate, visibleMonth, monthPrefixKey, colors.accent]);

  const selectedEvents = useMemo(
    () =>
      allEvents.filter((event) =>
        event.repeatYearly ? event.date.slice(5) === selectedDate.slice(5) : event.date === selectedDate
      ),
    [allEvents, selectedDate]
  );

  const openCreateModal = () => {
    setEditingEvent(null);
    setEventModalVisible(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventModalVisible(true);
  };

  const closeModal = () => {
    setEventModalVisible(false);
    setEditingEvent(null);
  };

  const handleMonthChange = (month: { year: number; month: number }) => {
    setVisibleMonth({ year: month.year, month: month.month });
    Animated.parallel([
      Animated.timing(monthOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(monthTranslate, { toValue: -10, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setMonthLabelText(monthLabel({ year: month.year, month: month.month }));
      monthTranslate.setValue(10);
      Animated.parallel([
        Animated.timing(monthOpacity, { toValue: 1, duration: 170, useNativeDriver: true }),
        Animated.timing(monthTranslate, { toValue: 0, duration: 170, useNativeDriver: true }),
      ]).start();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario</Text>
        <Text style={styles.subtitle}>Tus fechas especiales</Text>
        <Animated.View
          style={[
            styles.monthBadge,
            { opacity: monthOpacity, transform: [{ translateY: monthTranslate }] },
          ]}
        >
          <Text style={styles.monthBadgeText}>{monthLabelText}</Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarCard}>
          <Calendar
            key={mode}
            current={`${visibleMonth.year}-${String(visibleMonth.month).padStart(2, '0')}-01`}
            firstDay={1}
            enableSwipeMonths
            markedDates={markedDates}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            onMonthChange={handleMonthChange}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.accent,
              dayTextColor: colors.textPrimary,
              textDisabledColor: colors.border,
              dotColor: colors.accent,
              monthTextColor: colors.textPrimary,
              arrowColor: colors.accent,
              textMonthFontWeight: '800',
              textDayFontWeight: '600',
              textDayHeaderFontWeight: '700',
            }}
          />
          <View style={styles.legend}>
            {EVENT_TYPE_IDS.map((eventType) => {
              const meta = EVENT_TYPE_META[eventType];
              return (
                <View key={eventType} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                  <Text style={styles.legendText}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.dayPanel}>
          <View style={styles.dayPanelHeader}>
            <View style={styles.dayPanelHeaderText}>
              <Text style={styles.dayPanelDate}>
                {formatDateKey(selectedDate)}
                {selectedDate === todayKey ? ' · Hoy' : ''}
              </Text>
              <Text style={styles.dayPanelCount}>
                {selectedEvents.length > 0
                  ? `${selectedEvents.length} ${
                      selectedEvents.length === 1 ? 'evento' : 'eventos'
                    }`
                  : 'Sin nada guardado'}
              </Text>
            </View>
            <PressableScale
              style={styles.addButton}
              onPress={openCreateModal}
              scaleTo={0.92}
              accessibilityLabel="Agregar evento"
            >
              <Text style={styles.addButtonText}>＋ Evento</Text>
            </PressableScale>
          </View>

          {selectedEvents.map((event) => {
            const meta = EVENT_TYPE_META[event.type];
            return (
              <PressableScale
                key={event.id}
                style={styles.eventRow}
                onPress={() => openEditModal(event)}
                scaleTo={0.98}
                accessibilityLabel={`Editar ${event.title}`}
              >
                <View style={[styles.eventIcon, { backgroundColor: colors.accentSoft }]}>
                  <Text style={styles.eventIconText}>{meta.icon}</Text>
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.eventTitleRow}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    {event.repeatYearly && (
                      <View style={styles.repeatBadge}>
                        <Text style={styles.repeatBadgeText}>↻ Cada año</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.eventMeta} numberOfLines={1}>
                    {meta.label}
                    {event.description ? ` · ${event.description}` : ''}
                  </Text>
                </View>
                <Text style={styles.eventEditHint}>›</Text>
              </PressableScale>
            );
          })}

          {selectedEvents.length === 0 && (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyDayIcon}>🌙</Text>
              <Text style={styles.emptyDayText}>
                Nada para este día. Toca “＋ Evento” para guardar un recuerdo.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <EventModal
        visible={eventModalVisible}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        onClose={closeModal}
        onChanged={load}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 76,
      paddingHorizontal: 24,
      paddingBottom: 16,
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      color: colors.textSecondary,
    },
    monthBadge: {
      marginTop: 12,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    monthBadgeText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.accent,
      textTransform: 'capitalize',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },
    calendarCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingTop: 12,
      paddingHorizontal: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 14,
      rowGap: 6,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 4,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    dayPanel: {
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    dayPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    dayPanelHeaderText: {
      flex: 1,
      marginRight: 10,
    },
    dayPanelDate: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      textTransform: 'capitalize',
    },
    dayPanelCount: {
      marginTop: 3,
      fontSize: 12,
      color: colors.textSecondary,
    },
    addButton: {
      borderRadius: 16,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 10,
    },
    eventIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventIconText: {
      fontSize: 18,
    },
    rowBody: {
      flex: 1,
      marginLeft: 12,
    },
    eventTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      flexShrink: 1,
    },
    eventMeta: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
    repeatBadge: {
      borderRadius: 8,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    repeatBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.accent,
    },
    eventEditHint: {
      marginLeft: 6,
      fontSize: 18,
      color: colors.textSecondary,
    },
    emptyDay: {
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 12,
    },
    emptyDayIcon: {
      fontSize: 30,
    },
    emptyDayText: {
      marginTop: 8,
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });