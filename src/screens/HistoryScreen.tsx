import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import type { HistoryNote, Note } from '../types';
import { getReadHistory } from '../db/notes';
import { formatDateTime } from '../utils/date';
import { playOpen } from '../services/sound';
import { useTheme } from '../theme/ThemeContext';
import StarRating from '../components/StarRating';
import NoteModal from '../components/NoteModal';
import PressableScale from '../components/PressableScale';
import SettingsModal from '../components/SettingsModal';

function mediaBadge(note: HistoryNote): { icon: string; label: string } | null {
  if (note.media_count === 0 || !note.media_types) {
    return null;
  }
  const hasImage = note.media_types.includes('image');
  if (note.media_count === 1) {
    return hasImage ? { icon: '🖼️', label: 'Con imagen' } : { icon: '🎬', label: 'Con video' };
  }
  return hasImage ? { icon: '🖼️', label: `${note.media_count} adjuntos` } : { icon: '🎬', label: `${note.media_count} videos` };
}

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [history, setHistory] = useState<HistoryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryNote | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistory(await getReadHistory(db));
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const renderCard = ({ item }: { item: HistoryNote }) => {
    const badge = mediaBadge(item);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => {
          playOpen();
          setSelected(item);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Releer ${item.title}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardReadAt}>🕐 Leída el {formatDateTime(item.read_at)}</Text>
          </View>
          {badge && (
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeText}>
                {badge.icon} {badge.label}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardStars}>
          <StarRating value={item.rating} size={22} />
        </View>
        {item.comment && item.comment.trim().length > 0 && (
          <Text style={styles.cardComment} numberOfLines={2}>
            “{item.comment}”
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Recuerdos</Text>
          <Text style={styles.subtitle}>
            {history.length > 0
              ? `${history.length} ${history.length === 1 ? 'nota guardada' : 'notas guardadas'} en el tarro`
              : 'Tus notas leídas, guardadas para siempre'}
          </Text>
        </View>
        <PressableScale
          style={styles.settingsButton}
          onPress={() => setSettingsVisible(true)}
          scaleTo={0.88}
          accessibilityLabel="Abrir ajustes"
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </PressableScale>
      </View>

      {loading ? (
        <View style={styles.center} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏺</Text>
              <Text style={styles.emptyTitle}>Todavía no hay recuerdos</Text>
              <Text style={styles.emptyText}>
                Aún no has abierto ninguna nota del tarro. ¡Abre la primera para empezar a guardar
                recuerdos!
              </Text>
            </View>
          }
        />
      )}

      <NoteModal
        visible={selected !== null}
        note={selected as Note | null}
        onClose={() => setSelected(null)}
        readOnly
      />

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
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
      paddingBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerText: {
      flex: 1,
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
    settingsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.pillBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsIcon: {
      fontSize: 20,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 110,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    cardPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 10,
    },
    cardHeaderText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    cardReadAt: {
      marginTop: 5,
      fontSize: 12,
      color: colors.textSecondary,
    },
    mediaBadge: {
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    mediaBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    cardStars: {
      marginTop: 12,
      alignSelf: 'flex-start',
    },
    cardComment: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textBody,
      fontStyle: 'italic',
    },
    center: {
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 90,
      paddingHorizontal: 36,
    },
    emptyIcon: {
      fontSize: 56,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
