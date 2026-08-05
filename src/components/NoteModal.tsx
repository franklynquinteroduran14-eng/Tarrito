import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { MediaAttachment, Note } from '../types';
import { getNoteFeedback, getNoteMedia, incrementTimesOpened, saveFeedbackAndMarkRead } from '../db/notes';
import { formatDate } from '../utils/date';
import { useTheme } from '../theme/ThemeContext';
import StarRating from './StarRating';

interface NoteModalProps {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
  onSaved?: () => void;
  readOnly?: boolean;
  dismissable?: boolean;
}

function MediaItem({ item }: { item: MediaAttachment }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  if (item.type === 'image') {
    return <Image source={{ uri: item.url }} style={styles.mediaImage} resizeMode="cover" />;
  }
  return (
    <TouchableOpacity
      style={styles.mediaLink}
      onPress={() => Linking.openURL(item.url)}
      accessibilityRole="link"
    >
      <Text style={styles.mediaLinkIcon}>▶</Text>
      <Text style={styles.mediaLinkText}>
        {item.type === 'video_link' ? 'Ver video' : 'Ver video corto'}
      </Text>
    </TouchableOpacity>
  );
}

export default function NoteModal({
  visible,
  note,
  onClose,
  onSaved,
  readOnly = false,
  dismissable = true,
}: NoteModalProps) {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [readAt, setReadAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.85);
    cardTranslateY.setValue(40);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 15,
        stiffness: 160,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [visible, backdropOpacity, cardScale, cardTranslateY, cardOpacity]);

  useEffect(() => {
    if (!note) {
      return;
    }
    setMedia([]);
    setRating(0);
    setComment('');
    setReadAt(null);
    setError(null);
    getNoteMedia(db, note.id).then(setMedia);
    getNoteFeedback(db, note.id).then((feedback) => {
      if (feedback) {
        setRating(feedback.rating);
        setComment(feedback.comment ?? '');
        setReadAt(feedback.read_at);
      }
    });
    incrementTimesOpened(db, note.id);
  }, [db, note]);

  const handleSave = async () => {
    if (!note || rating < 1 || saving) {
      if (rating < 1) {
        setError('Toca las estrellas para calificar esta nota antes de guardarla.');
      }
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveFeedbackAndMarkRead(db, note.id, rating, comment.trim());
      onSaved?.();
      onClose();
    } catch {
      setError('No se pudo guardar tu respuesta. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismissable ? onClose : () => {}}
    >
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
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {dismissable && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              )}

              {note ? (
                <>
                  <Text style={[styles.title, !dismissable && styles.titleNoClose]}>
                    {note.title}
                  </Text>
                  <Text style={styles.date}>{formatDate(note.created_at)}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.message}>{note.message}</Text>

                  {media.length > 0 && (
                    <View style={styles.mediaSection}>
                      <Text style={styles.sectionLabel}>Para acompañar esta nota</Text>
                      {media.map((item) => (
                        <MediaItem key={item.id} item={item} />
                      ))}
                    </View>
                  )}

                  <Text style={styles.writtenBy}>
                    Escrito por Franklyn el {note.createdAtDate ?? formatDate(note.created_at)}
                  </Text>

                  <View style={styles.feedbackSection}>
                    {readOnly ? (
                      <>
                        <Text style={styles.feedbackTitle}>
                          {readAt ? `Tu respuesta · leída ${formatDate(readAt)}` : 'Tu respuesta'}
                        </Text>
                        <StarRating value={rating} size={30} />
                        {comment.trim().length > 0 ? (
                          <View style={styles.readOnlyComment}>
                            <Text style={styles.readOnlyCommentText}>“{comment}”</Text>
                          </View>
                        ) : (
                          <Text style={styles.noComment}>No dejó comentario esta vez.</Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.feedbackTitle}>¿Qué te pareció?</Text>
                        <StarRating value={rating} onChange={setRating} size={36} />
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Escribe aquí lo que sentiste al leerla…"
                          placeholderTextColor={colors.textSecondary}
                          multiline
                          value={comment}
                          onChangeText={setComment}
                        />
                        {error && <Text style={styles.errorText}>{error}</Text>}
                        <TouchableOpacity
                          style={[styles.saveButton, (saving || rating === 0) && styles.saveButtonDisabled]}
                          onPress={handleSave}
                          disabled={saving || rating === 0}
                          accessibilityRole="button"
                        >
                          <Text style={styles.saveButtonText}>
                            {saving ? 'Guardando…' : 'Guardar y marcar como leída'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              ) : null}
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
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      marginRight: 40,
    },
    titleNoClose: {
      marginRight: 0,
    },
    date: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    message: {
      fontSize: 16,
      lineHeight: 25,
      color: colors.textBody,
    },
    mediaSection: {
      marginTop: 22,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    mediaImage: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
    },
    mediaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
      backgroundColor: colors.accentSoft,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    mediaLinkIcon: {
      color: colors.accent,
      fontSize: 15,
    },
    mediaLinkText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '600',
    },
    writtenBy: {
      marginTop: 22,
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.textSecondary,
      opacity: 0.75,
      textAlign: 'right',
    },
    feedbackSection: {
      marginTop: 26,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 20,
    },
    feedbackTitle: {
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 14,
    },
    commentInput: {
      marginTop: 18,
      minHeight: 88,
      maxHeight: 140,
      borderRadius: 16,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textBody,
      textAlignVertical: 'top',
    },
    errorText: {
      marginTop: 10,
      textAlign: 'center',
      color: colors.error,
      fontSize: 13,
    },
    readOnlyComment: {
      marginTop: 16,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    readOnlyCommentText: {
      fontSize: 15,
      lineHeight: 23,
      color: colors.textPrimary,
      fontStyle: 'italic',
    },
    noComment: {
      marginTop: 16,
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
    },
    saveButton: {
      marginTop: 18,
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
  });
