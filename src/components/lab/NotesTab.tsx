import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import PressableScale from '../PressableScale';
import { getAllNotesForAdmin, isNoteDeposited } from '../../db/notes';
import { forceDepositNote, removeForcedDeposit } from '../../services/mailbox';
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
  const [depositedIds, setDepositedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<AdminNote | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const allNotes = await getAllNotesForAdmin(db);
    setNotes(allNotes);
    const deposited = new Set<string>();
    for (const note of allNotes) {
      if (await isNoteDeposited(db, note.id)) {
        deposited.add(note.id);
      }
    }
    setDepositedIds(deposited);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleDeposit = async (id: string) => {
    if (depositedIds.has(id)) {
      await removeForcedDeposit(db, id);
      setDepositedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setMessage('Depósito quitado: la nota vuelve a esperar su día aleatorio.');
    } else {
      await forceDepositNote(db, id);
      setDepositedIds((prev) => new Set(prev).add(id));
      setMessage('Depositada en el buzón ✓ Será la próxima carta al abrir el tarro.');
    }
  };

  const readCount = notes.filter((note) => note.is_read).length;

  const renderCard = (note: AdminNote) => {
    const isDeposited = depositedIds.has(note.id);
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
            {isDeposited
              ? '📬 Ya está en el buzón: la leerá en cuanto abra el tarro.'
              : 'En espera: solo se revelará cuando el buzón la deposite.'}
          </Text>
        )}
        <Text style={styles.noteCardMeta}>
          ✍️ {formatDateTime(note.created_at)} · 👁 {note.timesOpened}{' '}
          {note.timesOpened === 1 ? 'apertura' : 'aperturas'}
        </Text>

        {!note.is_read && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
            <PressableScale
              style={[styles.forceButton, isDeposited && styles.forceButtonActive]}
              onPress={() => toggleDeposit(note.id)}
              scaleTo={0.93}
              accessibilityLabel={
                isDeposited
                  ? `Quitar ${note.title} del buzón`
                  : `Depositar ${note.title} en el buzón`
              }
            >
              <Text style={[styles.forceButtonText, isDeposited && styles.forceButtonTextActive]}>
                {isDeposited ? '📬 En el buzón · Quitar' : '📬 Depositar en el buzón'}
              </Text>
            </PressableScale>
          </View>
        )}
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
        countOpen={false}
      />
    </View>
  );
}