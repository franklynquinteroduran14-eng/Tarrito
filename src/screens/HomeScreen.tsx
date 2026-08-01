import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import type { Note } from '../types';
import { getRandomUnreadNote, getUnreadCount } from '../db/notes';
import Jar from '../components/Jar';
import NoteModal from '../components/NoteModal';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState(false);
  const emptyOpacity = useRef(new Animated.Value(0)).current;

  const refreshCount = useCallback(async () => {
    setUnreadCount(await getUnreadCount(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refreshCount();
    }, [refreshCount])
  );

  const handleDraw = async () => {
    if (drawing) {
      return;
    }
    setDrawing(true);
    emptyOpacity.stopAnimation();
    try {
      const randomNote = await getRandomUnreadNote(db);
      if (randomNote) {
        setEmptyMessage(false);
        setNote(randomNote);
        setModalVisible(true);
      } else {
        setEmptyMessage(true);
        Animated.timing(emptyOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    } finally {
      setDrawing(false);
    }
  };

  const handleSaved = useCallback(() => {
    refreshCount();
  }, [refreshCount]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>El Tarro de Notas</Text>
        <Text style={styles.subtitle}>Toca el tarro para sacar una sorpresa</Text>
      </View>

      <View style={styles.jarArea}>
        <Jar onPress={handleDraw} disabled={drawing} />
      </View>

      <View style={styles.footer}>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>
            {unreadCount === 1
              ? '1 nota espera dentro'
              : `${unreadCount} notas esperan dentro`}
          </Text>
        </View>
        <Animated.Text style={[styles.emptyMessage, { opacity: emptyOpacity }]}>
          El tarro está vacío por ahora… ¡pero pronto llegará más!
        </Animated.Text>
      </View>

      <NoteModal
        visible={modalVisible}
        note={note}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    paddingTop: 84,
  },
  header: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#5C4033',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#B08D7C',
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
    backgroundColor: '#FBEBDC',
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8A5A48',
  },
  emptyMessage: {
    marginTop: 14,
    fontSize: 14,
    color: '#B08D7C',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
