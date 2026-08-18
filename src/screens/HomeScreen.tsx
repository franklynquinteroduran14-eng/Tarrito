import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import type { CalendarEvent, Note } from '../types';
import { getNextMailboxLetter } from '../db/notes';
import { getTodayEvents, getYearlyEventByMonthDay } from '../db/events';
import { dayKey, ensureDailyDeposits, getMailboxState, type MailboxState } from '../services/mailbox';
import { scheduleDailyNotifications } from '../services/notifications';
import { playDraw } from '../services/sound';
import { useTheme } from '../theme/ThemeContext';
import Jar from '../components/Jar';
import NoteModal from '../components/NoteModal';
import ReleaseCountdown from '../components/ReleaseCountdown';

function bannerText(event: CalendarEvent): string {
  if (event.description && event.description.trim().length > 0) {
    return event.description;
  }
  return `¡Hoy es ${event.title}! ✨`;
}

async function loadTodayEvent(db: SQLiteDatabase): Promise<CalendarEvent | null> {
  const simulated = await Storage.getItem('simulated_event_date');
  if (simulated) {
    return getYearlyEventByMonthDay(db, simulated);
  }
  const todayEvents = await getTodayEvents(db);
  return todayEvents[0] ?? null;
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [mailboxState, setMailboxState] = useState<MailboxState | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const [todayEvent, setTodayEvent] = useState<CalendarEvent | null>(null);
  const bannerPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!todayEvent) {
      bannerPulse.stopAnimation();
      bannerPulse.setValue(0);
      return;
    }
    bannerPulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(bannerPulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [todayEvent, bannerPulse]);

  const refresh = useCallback(async () => {
    await ensureDailyDeposits(db);
    setMailboxState(await getMailboxState(db));
    setTodayEvent(await loadTodayEvent(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (hintMessage) {
      hintOpacity.setValue(0);
      Animated.timing(hintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [hintMessage, hintOpacity]);

  const showHint = (message: string) => {
    hintOpacity.stopAnimation();
    setHintMessage(message);
    hintOpacity.setValue(0);
    Animated.timing(hintOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleDraw = async () => {
    if (drawing) {
      return;
    }
    setDrawing(true);
    setHintMessage(null);
    try {
      await ensureDailyDeposits(db);
      const state = await getMailboxState(db);
      if (state.pendingCount > 0) {
        const letter = await getNextMailboxLetter(db);
        if (letter) {
          playDraw();
          setNote(letter);
          setModalVisible(true);
          return;
        }
      }
      if (state.nextDepositAt) {
        const arrivesToday = dayKey(state.nextDepositAt) === dayKey(new Date());
        showHint(
          arrivesToday
            ? 'Tu próxima carta llega hoy a la 1:00 PM. ¡Vuelve luego! 💕'
            : 'Tu próxima carta llega mañana a la 1:00 PM. ¡Vuelve luego! 💕'
        );
      } else {
        showHint('El tarro está vacío por ahora… ¡pero pronto llegará más!');
      }
    } finally {
      setDrawing(false);
    }
  };

  const handleSaved = useCallback(async () => {
    await refresh();
    await scheduleDailyNotifications(db);
  }, [db, refresh]);

  const pendingCount = mailboxState?.pendingCount ?? 0;
  const poolCount = mailboxState?.poolCount ?? 0;
  const nextDepositAt = mailboxState?.nextDepositAt ?? null;
  const hasLetters = pendingCount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Tarrito de Notas</Text>
        <Text style={styles.subtitle}>Toca el tarro para abrir tu carta</Text>
      </View>

      {todayEvent && (
        <Animated.View
          style={[
            styles.eventBanner,
            {
              transform: [
                {
                  scale: bannerPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.035],
                  }),
                },
                {
                  translateY: bannerPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.eventBannerText}>{bannerText(todayEvent)}</Text>
        </Animated.View>
      )}

      <View style={styles.jarArea}>
        <Jar onPress={handleDraw} disabled={drawing || !hasLetters} />
      </View>

      <View style={styles.footer}>
        {mailboxState === null ? null : hasLetters ? (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {pendingCount === 1
                ? '1 carta esperando en el buzón'
                : `${pendingCount} cartas esperando en el buzón`}
            </Text>
          </View>
        ) : (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {poolCount === 0
                ? 'El tarro espera nuevas notas'
                : 'El buzón recibe una carta nueva cada día a la 1:00 PM'}
            </Text>
          </View>
        )}

        {!hasLetters && nextDepositAt && (
          <View style={styles.countdownBox}>
            <ReleaseCountdown target={nextDepositAt} />
            <Text style={styles.countdownHint}>
              Las cartas se depositan una por día a la 1:00 PM
            </Text>
          </View>
        )}

        {hintMessage && (
          <Animated.Text style={[styles.hintMessage, { opacity: hintOpacity }]}>
            {hintMessage}
          </Animated.Text>
        )}
      </View>

      <NoteModal
        visible={modalVisible}
        note={note}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
        dismissable={false}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingTop: 84,
    },
    header: {
      alignItems: 'center',
    },
    appName: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 15,
      color: colors.textSecondary,
    },
    eventBanner: {
      marginTop: 18,
      borderRadius: 18,
      backgroundColor: colors.accent,
      paddingHorizontal: 22,
      paddingVertical: 12,
      marginHorizontal: 30,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    eventBannerText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    jarArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      paddingBottom: 64,
      alignItems: 'center',
    },
    counterPill: {
      borderRadius: 20,
      backgroundColor: colors.pillBg,
      paddingHorizontal: 18,
      paddingVertical: 9,
    },
    counterText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    countdownBox: {
      marginTop: 16,
      alignItems: 'center',
    },
    countdownHint: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textSecondary,
    },
    hintMessage: {
      marginTop: 14,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
  });