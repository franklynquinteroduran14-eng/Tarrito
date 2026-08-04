import type { SQLiteDatabase } from 'expo-sqlite';
import mockNotesData from '../data/mockNotes.json';

const DATABASE_VERSION = 2;

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id               TEXT PRIMARY KEY NOT NULL,
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_date  TEXT,
  is_read          INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1))
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id          TEXT PRIMARY KEY NOT NULL,
  note_id     TEXT NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  read_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_attachments (
  id          TEXT PRIMARY KEY NOT NULL,
  note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('image', 'video_link', 'short_video')),
  url         TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_media_note ON media_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_feedback_note ON user_feedback(note_id);
`;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentDbVersion = row?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(SCHEMA_SQL);
    await seedDatabase(db);
  }

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(notes)');
  const hasCreatedAtDate = columns.some((column) => column.name === 'created_at_date');
  if (!hasCreatedAtDate) {
    await db.execAsync(
      `ALTER TABLE notes ADD COLUMN created_at_date TEXT;
       UPDATE notes
         SET created_at_date = strftime('%d-%m-%Y', created_at)
         WHERE created_at_date IS NULL;`
    );
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export async function seedDatabase(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM notes');
  const count = row?.count ?? 0;
  if (count > 0) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const note of mockNotesData.notes) {
      await txn.runAsync(
        'INSERT INTO notes (id, title, message, created_at, created_at_date, is_read) VALUES (?, ?, ?, ?, ?, ?)',
        note.id,
        note.title,
        note.message,
        note.created_at,
        note.createdAtDate ?? null,
        note.is_read ? 1 : 0
      );

      if (note.feedback) {
        await txn.runAsync(
          'INSERT INTO user_feedback (id, note_id, rating, comment, read_at) VALUES (?, ?, ?, ?, ?)',
          note.feedback.id,
          note.id,
          note.feedback.rating,
          note.feedback.comment ?? null,
          note.feedback.read_at
        );
      }

      for (const media of note.media ?? []) {
        await txn.runAsync(
          'INSERT INTO media_attachments (id, note_id, type, url, position) VALUES (?, ?, ?, ?, ?)',
          media.id,
          note.id,
          media.type,
          media.url,
          media.position
        );
      }
    }
  });
}
