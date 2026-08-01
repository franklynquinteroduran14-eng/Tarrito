import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import type { HistoryNote, Note } from '../types';
import { getReadHistory } from '../db/notes';
import { formatDateTime } from '../utils/date';
import StarRating from '../components/StarRating';
import NoteModal from '../components/NoteModal';

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
  const [history, setHistory] = useState<HistoryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryNote | null>(null);

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
        onPress={() => setSelected(item)}
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
        <Text style={styles.title}>Recuerdos</Text>
        <Text style={styles.subtitle}>
          {history.length > 0
            ? `${history.length} ${history.length === 1 ? 'nota guardada' : 'notas guardadas'} en el tarro`
            : 'Tus notas leídas, guardadas para siempre'}
        </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  header: {
    paddingTop: 76,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5C4033',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#B08D7C',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFDFB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0E4DA',
    shadowColor: '#B5876B',
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
    color: '#5C4033',
  },
  cardReadAt: {
    marginTop: 5,
    fontSize: 12,
    color: '#B08D7C',
  },
  mediaBadge: {
    borderRadius: 12,
    backgroundColor: '#FBEFE6',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mediaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A5A48',
  },
  cardStars: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  cardComment: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B4F3F',
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
    color: '#5C4033',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#B08D7C',
    textAlign: 'center',
  },
});
