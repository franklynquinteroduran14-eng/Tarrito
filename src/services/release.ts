import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import type { Note } from '../types';
import { getPendingNotes } from '../db/notes';

const RELEASE_START_KEY = 'release_start_day';
const RELEASE_HOUR = 13;

export interface ReleaseState {
  pendingCount: number;
  availableCount: number;
  nextReleaseAt: Date | null;
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

export function isReleased(note: Note, pending: Note[], startDay: string, now: Date): boolean {
  const index = pending.findIndex((candidate) => candidate.id === note.id);
  if (index === -1) {
    return true;
  }
  return releaseTimeFor(index, startDay).getTime() <= now.getTime();
}

export async function getReleaseState(db: SQLiteDatabase): Promise<ReleaseState> {
  const now = new Date();

  let startDay = await Storage.getItem(RELEASE_START_KEY);
  if (!startDay) {
    startDay = dayKey(now);
    await Storage.setItem(RELEASE_START_KEY, startDay);
  }

  const pending = await getPendingNotes(db);
  let availableCount = 0;
  let nextReleaseAt: Date | null = null;

  for (let index = 0; index < pending.length; index++) {
    const releaseAt = releaseTimeFor(index, startDay);
    if (releaseAt.getTime() <= now.getTime()) {
      availableCount++;
    } else {
      nextReleaseAt = releaseAt;
      break;
    }
  }

  return { pendingCount: pending.length, availableCount, nextReleaseAt };
}

export async function getAvailableNotes(db: SQLiteDatabase): Promise<Note[]> {
  const now = new Date();
  let startDay = await Storage.getItem(RELEASE_START_KEY);
  if (!startDay) {
    startDay = dayKey(now);
    await Storage.setItem(RELEASE_START_KEY, startDay);
  }

  const pending = await getPendingNotes(db);
  return pending.filter((note) => isReleased(note, pending, startDay, now));
}
