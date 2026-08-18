import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import type { SeedNote } from '../types';
import rawMockNotesData from '../data/mockNotes.json';
import { seedEvents } from '../data/seedEvents';

const mockNotesData = rawMockNotesData as { notes: SeedNote[] };

const DATABASE_VERSION = 7;

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id               TEXT PRIMARY KEY NOT NULL,
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  created_at_date  TEXT,
  times_opened     INTEGER NOT NULL DEFAULT 0,
  is_read          INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1))
);

CREATE TABLE IF NOT EXISTS note_releases (
  id            TEXT PRIMARY KEY NOT NULL,
  note_id       TEXT NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
  release_date  TEXT NOT NULL,
  deposited_at  TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS user_events (
  id            TEXT PRIMARY KEY NOT NULL,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('recordatorio', 'evento', 'cumpleanos')),
  event_date    TEXT NOT NULL,
  description   TEXT,
  repeat_yearly INTEGER NOT NULL DEFAULT 0 CHECK (repeat_yearly IN (0, 1)),
  remind_days   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_note ON media_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_feedback_note ON user_feedback(note_id);
CREATE INDEX IF NOT EXISTS idx_user_events_date ON user_events(event_date);
CREATE INDEX IF NOT EXISTS idx_note_releases_date ON note_releases(release_date);
`;

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(dateKey: string, offset: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return dayKey(new Date(year, month - 1, day + offset));
}

function releaseMoment(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 13, 0, 0, 0);
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentDbVersion = row?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(SCHEMA_SQL);
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

  const hasTimesOpened = columns.some((column) => column.name === 'times_opened');
  if (!hasTimesOpened) {
    await db.execAsync('ALTER TABLE notes ADD COLUMN times_opened INTEGER NOT NULL DEFAULT 0');
  }

  if (currentDbVersion < 3) {
    await seedDatabase(db);
  }

  if (currentDbVersion < 5) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM media_attachments');
      await txn.runAsync('DELETE FROM user_feedback');
      await txn.runAsync('DELETE FROM notes');
    });
    await seedDatabase(db);
  }

  if (currentDbVersion < 6) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_events (
        id            TEXT PRIMARY KEY NOT NULL,
        title         TEXT NOT NULL,
        type          TEXT NOT NULL CHECK (type IN ('recordatorio', 'evento', 'cumpleanos')),
        event_date    TEXT NOT NULL,
        description   TEXT,
        repeat_yearly INTEGER NOT NULL DEFAULT 0 CHECK (repeat_yearly IN (0, 1)),
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_user_events_date ON user_events(event_date);
    `);
  }

  if (currentDbVersion < 7) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS note_releases (
        id            TEXT PRIMARY KEY NOT NULL,
        note_id       TEXT NOT NULL UNIQUE REFERENCES notes(id) ON DELETE CASCADE,
        release_date  TEXT NOT NULL,
        deposited_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_note_releases_date ON note_releases(release_date);
    `);

    const eventColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(user_events)');
    const hasRemindDays = eventColumns.some((column) => column.name === 'remind_days');
    if (!hasRemindDays) {
      await db.execAsync(
        "ALTER TABLE user_events ADD COLUMN remind_days TEXT NOT NULL DEFAULT ''"
      );
    }

    await seedDefaultEvents(db);
    await backfillMailboxFromLegacyRelease(db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function backfillMailboxFromLegacyRelease(db: SQLiteDatabase) {
  const startDay = await Storage.getItem('release_start_day');
  if (!startDay) {
    return;
  }
  const storedBypass = await Storage.getItem('release_bypass_ids');
  const bypassed = new Set(storedBypass ? storedBypass.split(',').filter(Boolean) : []);
  const pending = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM notes WHERE is_read = 0 ORDER BY created_at ASC'
  );
  const today = dayKey(new Date());
  const now = new Date();

  for (let index = 0; index < pending.length; index++) {
    const note = pending[index];
    const releaseDate = bypassed.has(note.id) ? today : addDays(startDay, index);
    if (releaseDate > today || releaseMoment(releaseDate) > now) {
      break;
    }
    await db.runAsync(
      `INSERT OR IGNORE INTO note_releases (id, note_id, release_date, deposited_at)
       VALUES (?, ?, ?, datetime('now'))`,
      generateId(),
      note.id,
      releaseDate
    );
  }
}

export async function seedDefaultEvents(db: SQLiteDatabase) {
  for (const event of seedEvents) {
    await db.runAsync(
      `INSERT OR IGNORE INTO user_events
         (id, title, type, event_date, description, repeat_yearly, remind_days)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      event.id,
      event.title,
      event.type,
      `2024-${event.monthDay}`,
      event.description ?? null,
      event.remindDays.join(',')
    );
  }
}

export async function seedDatabase(db: SQLiteDatabase) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const note of mockNotesData.notes) {
      await txn.runAsync(
        'INSERT OR IGNORE INTO notes (id, title, message, created_at, created_at_date, is_read) VALUES (?, ?, ?, ?, ?, ?)',
        note.id,
        note.title,
        note.message,
        note.created_at,
        note.createdAtDate ?? null,
        note.is_read ? 1 : 0
      );

      if (note.feedback) {
        await txn.runAsync(
          'INSERT OR IGNORE INTO user_feedback (id, note_id, rating, comment, read_at) VALUES (?, ?, ?, ?, ?)',
          note.feedback.id,
          note.id,
          note.feedback.rating,
          note.feedback.comment ?? null,
          note.feedback.read_at
        );
      }

      for (const media of note.media ?? []) {
        await txn.runAsync(
          'INSERT OR IGNORE INTO media_attachments (id, note_id, type, url, position) VALUES (?, ?, ?, ?, ?)',
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