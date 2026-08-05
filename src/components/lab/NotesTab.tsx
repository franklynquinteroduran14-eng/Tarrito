import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import PressableScale from '../PressableScale';
import { getAllNotesForAdmin } from '../../db/notes';
import { clearForcedNoteId, getForcedNoteId, setForcedNoteId } from '../../services/release';
import { formatDateTime } from '../../utils/date';
import type { AdminNote } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';
import StarRating from '../StarRating';
import NoteModal from '../NoteModal';

export default function NotesTab() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [forcedId, setForcedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminNote | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNotes(await getAllNotesForAdmin(db));
    setForcedId(await getForcedNoteId());
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleForced = async (id: string) => {
    if (forcedId === id) {
      await clearForcedNoteId();
      setForcedId(null);
      setMessage('Nota forzada quitada: el tarro vuelve a sacar al azar.');
    } else {
      await setForcedNoteId(id);
      setForcedId(id);
      setMessage('Nota forzada ✓ Será la primera en salir al tocar el tarro.');
    }
  };

  const readCount = notes.filter((note) => note.is_read).length;

  const renderCard = (note: AdminNote) => {
    const isForced = forcedId === note.id;
    return (
      <Pressable
        key={note.id}
        style={({ pressed }) => [styles.noteCard, pressed && styles.noteCardPressed]}
        onPress={() => setPreview(note)}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${note.title}`}
      >
        <View style={styles.noteCardHeader}>
          <Text style={styles.noteCardTitle} numberOfLines={1}>
            {note.title}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: note.is_read ? colors.accentSoft : colors.pillBg },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: note.is_read ? colors.accent : colors.textSecondary },
              ]}
            >
              {note.is_read ? 'Leída' : '🔒 Reservada'}
            </Text>
          </View>
        </View>

        {note.is_read ? (
          <>
            <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <StarRating value={note.rating ?? 0} size={16} />
            </View>
            {note.comment && note.comment.trim().length > 0 && (
              <Text style={styles.noteCardComment} numberOfLines={2}>
                “{note.comment}”
              </Text>
            )}
            {note.read_at && (
              <Text style={styles.noteCardMeta}>🕐 Leída el {formatDateTime(note.read_at)}</Text>
            )}
          </>
        ) : (
          <Text style={styles.noteCardMeta}>
            En borrador: solo se revelará su contenido y reseña cuando ella la abra.
          </Text>
        )}
        <Text style={styles.noteCardMeta}>
          ✍️ {formatDateTime(note.created_at)} · 👁 {note.timesOpened}{' '}
          {note.timesOpened === 1 ? 'apertura' : 'aperturas'}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
          <PressableScale
            style={[styles.forceButton, isForced && styles.forceButtonActive]}
            onPress={() => toggleForced(note.id)}
            scaleTo={0.93}
            accessibilityLabel={
              isForced ? `Quitar ${note.title} como forzada` : `Forzar ${note.title} como siguiente`
            }
          >
            <Text style={[styles.forceButtonText, isForced && styles.forceButtonTextActive]}>
              {isForced ? '🎯 Forzada · Quitar' : '🎯 Forzar siguiente'}
            </Text>
          </PressableScale>
        </View>
      </Pressable>
    );
  };

  return (
    <View>
      <View style={styles.counterPill}>
        <Text style={styles.counterText}>
          {readCount} de {notes.length} notas leídas
        </Text>
      </View>

      {message && <Text style={styles.message}>{message}</Text>}

      <Text style={styles.sectionLabel}>Todas las notas</Text>
      {notes.map(renderCard)}

      <NoteModal
        visible={preview !== null}
        note={preview}
        onClose={() => setPreview(null)}
        readOnly
      />
    </View>
  );
}
