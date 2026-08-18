import type { SQLiteDatabase } from 'expo-sqlite';
import type { CalendarEvent, WidgetData, WidgetNextEvent } from '../types';
import { getMailboxPendingCount } from '../db/notes';
import { getAllEvents, nextOccurrence } from '../db/events';
import { dayKey } from './mailbox';

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function nearestNextEvent(events: CalendarEvent[], fromKey: string): WidgetNextEvent | null {
  let best: { event: CalendarEvent; occurrence: string } | null = null;
  for (const event of events) {
    const occurrence = nextOccurrence(event, fromKey);
    if (occurrence === null) {
      continue;
    }
    if (best === null || occurrence < best.occurrence) {
      best = { event, occurrence };
    }
  }
  if (best === null) {
    return null;
  }
  return {
    title: best.event.title,
    dateKey: best.occurrence,
    daysUntil: daysBetween(fromKey, best.occurrence),
  };
}

/**
 * Read-model limpio para futuros widgets de Android (react-native-android-widget).
 * Solo consultas: cartas pendientes del buzón y el próximo evento del calendario.
 */
export async function getWidgetData(db: SQLiteDatabase): Promise<WidgetData> {
  const [pendingLetters, events] = await Promise.all([
    getMailboxPendingCount(db),
    getAllEvents(db),
  ]);
  return {
    pendingLetters,
    nextEvent: nearestNextEvent(events, dayKey(new Date())),
  };
}