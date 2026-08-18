import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import {
  getMailboxPendingCount,
  getUpcomingLettersCount,
} from '../db/notes';

const LAST_PROCESSED_DAY_KEY = 'mailbox_last_day';
const RELEASE_HOUR = 13;

export interface MailboxState {
  pendingCount: number;
  poolCount: number;
  nextDepositAt: Date | null;
  lastDepositDate: string | null;
}

export function dayKey(date: Date): string {
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
  return new Date(year, month - 1, day, RELEASE_HOUR, 0, 0, 0);
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function depositOne(db: SQLiteDatabase, releaseDate: string): Promise<boolean> {
  const candidate = await db.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM notes
     WHERE is_read = 0
       AND id NOT IN (SELECT note_id FROM note_releases)
     ORDER BY RANDOM()
     LIMIT 1`
  );
  if (!candidate) {
    return false;
  }
  await db.runAsync(
    `INSERT OR IGNORE INTO note_releases (id, note_id, release_date, deposited_at)
     VALUES (?, ?, ?, datetime('now'))`,
    generateId(),
    candidate.id,
    releaseDate
  );
  return true;
}

async function hasDepositOn(db: SQLiteDatabase, dateKey: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM note_releases WHERE release_date = ?',
    dateKey
  );
  return (row?.count ?? 0) > 0;
}

/**
 * Deposita 1 carta aleatoria por cada día cuya 1:00 PM ya haya pasado.
 * Las cartas pendientes se acumulan si el usuario no abre la app.
 */
export async function ensureDailyDeposits(db: SQLiteDatabase): Promise<void> {
  const now = new Date();
  const today = dayKey(now);
  let cursor = await Storage.getItem(LAST_PROCESSED_DAY_KEY);

  if (!cursor) {
    cursor = today;
  }

  while (today > cursor) {
    cursor = addDays(cursor, 1);
    if (releaseMoment(cursor) <= now) {
      await depositOne(db, cursor);
    }
  }

  if (releaseMoment(today) <= now && !(await hasDepositOn(db, today))) {
    await depositOne(db, today);
  }

  await Storage.setItem(LAST_PROCESSED_DAY_KEY, today);
}

export async function getMailboxState(db: SQLiteDatabase): Promise<MailboxState> {
  const [pendingCount, poolCount, cursor] = await Promise.all([
    getMailboxPendingCount(db),
    getUpcomingLettersCount(db),
    Storage.getItem(LAST_PROCESSED_DAY_KEY),
  ]);
  const lastDepositDate = await getLastDepositDate(db);
  const now = new Date();
  const today = dayKey(now);

  let nextDepositAt: Date | null = null;
  if (poolCount > 0) {
    const depositDoneToday =
      cursor === today && releaseMoment(today).getTime() <= now.getTime();
    nextDepositAt = depositDoneToday ? releaseMoment(addDays(today, 1)) : releaseMoment(today);
  }

  return { pendingCount, poolCount, nextDepositAt, lastDepositDate };
}

export async function getLastDepositDate(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ release_date: string | null }>(
    'SELECT MAX(release_date) AS release_date FROM note_releases'
  );
  return row?.release_date ?? null;
}

export async function forceDepositNote(db: SQLiteDatabase, noteId: string): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO note_releases (id, note_id, release_date, deposited_at)
     VALUES (?, ?, ?, datetime('now'))`,
    generateId(),
    noteId,
    dayKey(new Date())
  );
}

export async function removeForcedDeposit(db: SQLiteDatabase, noteId: string): Promise<void> {
  await db.runAsync('DELETE FROM note_releases WHERE note_id = ?', noteId);
}