import type { SQLiteDatabase } from 'expo-sqlite';
import type { CalendarEvent, WidgetCalendarData, WidgetData, WidgetUpcomingEvent } from '../types';
import { getMailboxPendingCount } from '../db/notes';
import { getAllEvents, nextOccurrence } from '../db/events';
import { dayKey, getMailboxState } from './mailbox';

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAY_LABELS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function upcomingEvents(
  events: CalendarEvent[],
  fromKey: string,
  limit = 4
): WidgetUpcomingEvent[] {
  return events
    .map((event) => {
      const occurrence = nextOccurrence(event, fromKey);
      if (occurrence === null) {
        return null;
      }
      return {
        id: event.id,
        title: event.title,
        type: event.type,
        dateKey: occurrence,
        daysUntil: daysBetween(fromKey, occurrence),
      };
    })
    .filter((event): event is WidgetUpcomingEvent => event !== null)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.daysUntil - b.daysUntil)
    .slice(0, limit);
}

function todayCalendarData(now: Date, events: CalendarEvent[]): WidgetCalendarData {
  return {
    todayDay: now.getDate(),
    todayMonth: MONTH_LABELS[now.getMonth()],
    todayWeekday: WEEKDAY_LABELS[now.getDay()],
    upcoming: upcomingEvents(events, dayKey(now)),
  };
}

/**
 * Read-model limpio para los widgets nativos de Android (react-native-android-widget).
 * Solo consultas: estado del buzón para el widget del tarro y próximos eventos
 * para el widget del calendario.
 */
export async function getWidgetData(db: SQLiteDatabase): Promise<WidgetData> {
  const [pendingLetters, events, mailboxState] = await Promise.all([
    getMailboxPendingCount(db),
    getAllEvents(db),
    getMailboxState(db),
  ]);
  const now = new Date();
  return {
    jar: {
      pendingLetters,
      nextDepositAt: mailboxState.nextDepositAt?.toISOString() ?? null,
    },
    calendar: todayCalendarData(now, events),
  };
}