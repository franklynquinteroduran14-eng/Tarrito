import type { SQLiteDatabase } from 'expo-sqlite';
import type { HistoryNote, MediaAttachment, Note, UserFeedback } from '../types';

export async function getUnreadCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM notes WHERE is_read = 0'
  );
  return row?.count ?? 0;
}

export async function getPendingNotes(db: SQLiteDatabase): Promise<Note[]> {
  const rows = await db.getAllAsync<Omit<Note, 'is_read'> & { is_read: number }>(
    'SELECT id, title, message, created_at, is_read FROM notes WHERE is_read = 0 ORDER BY created_at ASC'
  );
  return rows.map((row) => ({ ...row, is_read: row.is_read === 1 }));
}

export async function getNoteMedia(
  db: SQLiteDatabase,
  noteId: string
): Promise<MediaAttachment[]> {
  return db.getAllAsync<MediaAttachment>(
    'SELECT id, note_id, type, url, position FROM media_attachments WHERE note_id = ? ORDER BY position ASC',
    noteId
  );
}

export async function getNoteFeedback(
  db: SQLiteDatabase,
  noteId: string
): Promise<UserFeedback | null> {
  const row = await db.getFirstAsync<UserFeedback>(
    'SELECT id, note_id, rating, comment, read_at FROM user_feedback WHERE note_id = ?',
    noteId
  );
  return row ?? null;
}

export async function getReadHistory(db: SQLiteDatabase): Promise<HistoryNote[]> {
  const rows = await db.getAllAsync<Omit<HistoryNote, 'is_read'> & { is_read: number }>(
    `SELECT n.id, n.title, n.message, n.created_at, n.is_read,
            f.rating, f.comment, f.read_at,
            (SELECT COUNT(*) FROM media_attachments m WHERE m.note_id = n.id) AS media_count,
            (SELECT GROUP_CONCAT(m.type) FROM media_attachments m WHERE m.note_id = n.id) AS media_types
     FROM notes n
     JOIN user_feedback f ON f.note_id = n.id
     WHERE n.is_read = 1
     ORDER BY f.read_at DESC`
  );
  return rows.map((row) => ({ ...row, is_read: row.is_read === 1 }));
}

export async function saveFeedbackAndMarkRead(
  db: SQLiteDatabase,
  noteId: string,
  rating: number,
  comment: string
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO user_feedback (id, note_id, rating, comment, read_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(note_id) DO UPDATE SET
         rating = excluded.rating,
         comment = excluded.comment,
         read_at = excluded.read_at`,
      generateId(),
      noteId,
      rating,
      comment.length > 0 ? comment : null
    );
    await txn.runAsync('UPDATE notes SET is_read = 1 WHERE id = ?', noteId);
  });
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
