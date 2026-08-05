import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import type { Note } from '../types';
import { getUnreadCount } from '../db/notes';
import { getNoteById } from '../db/notes';
import { getAvailableNotes, getReleaseState, type ReleaseState } from '../services/release';
import { clearForcedNoteId, getForcedNoteId } from '../services/release';
import { scheduleDailyNotifications } from '../services/notifications';
import { getSimulatedEvent, type SpecialEvent } from '../data/specialEvents';
import { playDraw } from '../services/sound';
import { useTheme } from '../theme/ThemeContext';
import Jar from '../components/Jar';
import NoteModal from '../components/NoteModal';
import ReleaseCountdown from '../components/ReleaseCountdown';

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [unreadCount, setUnreadCount] = useState(0);
  const [releaseState, setReleaseState] = useState<ReleaseState | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const [todayEvent, setTodayEvent] = useState<SpecialEvent | null>(null);
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
    setUnreadCount(await getUnreadCount(db));
    setReleaseState(await getReleaseState(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      getSimulatedEvent().then(setTodayEvent);
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
      const forcedId = await getForcedNoteId();
      if (forcedId) {
        const forcedNote = await getNoteById(db, forcedId);
        if (forcedNote) {
          await clearForcedNoteId();
          playDraw();
          setNote(forcedNote);
          setModalVisible(true);
          return;
        }
      }
      const available = await getAvailableNotes(db);
      const randomNote = pickRandom(available);
      if (randomNote) {
        playDraw();
        setNote(randomNote);
        setModalVisible(true);
      } else if (releaseState && releaseState.pendingCount > 0) {
        showHint('La siguiente nota se libera hoy a la 1:00 PM. ¡Vuelve luego! 💕');
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

  const availableCount = releaseState?.availableCount ?? 0;
  const pendingCount = releaseState?.pendingCount ?? 0;
  const hasAvailable = availableCount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>El Tarro de Notas</Text>
        <Text style={styles.subtitle}>Toca el tarro para sacar una sorpresa</Text>
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
          <Text style={styles.eventBannerText}>{todayEvent.homeBannerMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.jarArea}>
        <Jar onPress={handleDraw} disabled={drawing || !hasAvailable} />
      </View>

      <View style={styles.footer}>
        {releaseState === null ? null : hasAvailable ? (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {availableCount === 1
                ? '1 nota lista para abrir'
                : `${availableCount} notas listas para abrir`}
            </Text>
          </View>
        ) : (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {pendingCount === 0
                ? 'El tarro espera nuevas notas'
                : `${pendingCount} ${pendingCount === 1 ? 'nota espera' : 'notas esperan'} dentro`}
            </Text>
          </View>
        )}

        {releaseState && !hasAvailable && releaseState.nextReleaseAt && (
          <View style={styles.countdownBox}>
            <ReleaseCountdown target={releaseState.nextReleaseAt} />
            <Text style={styles.countdownHint}>Las notas se liberan una por día a la 1:00 PM</Text>
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
