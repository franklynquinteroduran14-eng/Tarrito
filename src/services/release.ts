import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import type { Note } from '../types';
import { getLastReadAt, getPendingNotes } from '../db/notes';
import { parseSqliteUtc } from '../utils/date';

const RELEASE_START_KEY = 'release_start_day';
const RELEASE_BYPASS_KEY = 'release_bypass_ids';
const FORCED_NOTE_KEY = 'forced_note_id';
const RELEASE_HOUR = 13;

export interface ReleaseState {
  pendingCount: number;
  availableCount: number;
  nextReleaseAt: Date | null;
}

export interface DailyReadState {
  alreadyReadToday: boolean;
  nextReadAt: Date | null;
}

const EMPTY_BYPASS: ReadonlySet<string> = new Set();

export async function getReleaseBypassIds(): Promise<Set<string>> {
  const stored = await Storage.getItem(RELEASE_BYPASS_KEY);
  return new Set(stored ? stored.split(',').filter(Boolean) : []);
}

export async function addReleaseBypassIds(ids: string[]): Promise<void> {
  const current = await getReleaseBypassIds();
  for (const id of ids) {
    current.add(id);
  }
  await Storage.setItem(RELEASE_BYPASS_KEY, [...current].join(','));
}

export async function getForcedNoteId(): Promise<string | null> {
  return Storage.getItem(FORCED_NOTE_KEY);
}

export async function setForcedNoteId(id: string): Promise<void> {
  await Storage.setItem(FORCED_NOTE_KEY, id);
}

export async function clearForcedNoteId(): Promise<void> {
  await Storage.removeItem(FORCED_NOTE_KEY);
}

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function releaseTimeFor(dayOffset: number, startDay: string): Date {
  const [year, month, day] = startDay.split('-').map(Number);
  return new Date(year, month - 1, day + dayOffset, RELEASE_HOUR, 0, 0, 0);
}

export function isReleased(
  note: Note,
  pending: Note[],
  startDay: string,
  now: Date,
  bypassed: ReadonlySet<string> = EMPTY_BYPASS
): boolean {
  if (bypassed.has(note.id)) {
    return true;
  }
  const index = pending.findIndex((candidate) => candidate.id === note.id);
  if (index === -1) {
    return true;
  }
  return releaseTimeFor(index, startDay).getTime() <= now.getTime();
}

export async function getReleaseStartDay(): Promise<string> {
  let startDay = await Storage.getItem(RELEASE_START_KEY);
  if (!startDay) {
    startDay = dayKey(new Date());
    await Storage.setItem(RELEASE_START_KEY, startDay);
  }
  return startDay;
}

export async function getReleaseState(db: SQLiteDatabase): Promise<ReleaseState> {
  const now = new Date();
  const startDay = await getReleaseStartDay();

  const pending = await getPendingNotes(db);
  const bypassed = await getReleaseBypassIds();
  let availableCount = 0;
  let nextReleaseAt: Date | null = null;

  for (let index = 0; index < pending.length; index++) {
    const note = pending[index];
    if (bypassed.has(note.id)) {
      availableCount++;
      continue;
    }
    const releaseAt = releaseTimeFor(index, startDay);
    if (releaseAt.getTime() <= now.getTime()) {
      availableCount++;
    } else if (nextReleaseAt === null) {
      nextReleaseAt = releaseAt;
    }
  }

  return { pendingCount: pending.length, availableCount, nextReleaseAt };
}

export async function getAvailableNotes(db: SQLiteDatabase): Promise<Note[]> {
  const now = new Date();
  const startDay = await getReleaseStartDay();

  const pending = await getPendingNotes(db);
  const bypassed = await getReleaseBypassIds();
  return pending.filter((note) => isReleased(note, pending, startDay, now, bypassed));
}

function nextDayAtReleaseHour(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, RELEASE_HOUR, 0, 0, 0);
}

export async function getDailyReadState(db: SQLiteDatabase): Promise<DailyReadState> {
  const lastReadAt = await getLastReadAt(db);
  if (!lastReadAt) {
    return { alreadyReadToday: false, nextReadAt: null };
  }
  const lastReadDate = parseSqliteUtc(lastReadAt);
  const now = new Date();
  if (dayKey(lastReadDate) === dayKey(now)) {
    return { alreadyReadToday: true, nextReadAt: nextDayAtReleaseHour(now) };
  }
  return { alreadyReadToday: false, nextReadAt: null };
}
