import type { SQLiteDatabase } from 'expo-sqlite';
import type { CalendarEvent, CalendarEventType } from '../types';

interface EventRow {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  description: string | null;
  repeatYearly: number;
  remindDays: string;
  createdAt: string;
}

export interface NewCalendarEvent {
  title: string;
  type: CalendarEventType;
  date: string;
  description: string | null;
  repeatYearly: boolean;
  remindDays: number[];
}

function mapRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    description: row.description,
    repeatYearly: row.repeatYearly === 1,
    remindDays: parseRemindDays(row.remindDays),
    createdAt: row.createdAt,
  };
}

function parseRemindDays(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((offset) => Number.isFinite(offset) && offset >= 0)
    .sort((a, b) => a - b);
}

const SELECT_COLUMNS =
  'id, title, type, event_date AS date, description, repeat_yearly AS repeatYearly, remind_days AS remindDays, created_at AS createdAt';

export async function getAllEvents(db: SQLiteDatabase): Promise<CalendarEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM user_events
     ORDER BY event_date ASC, created_at ASC`
  );
  return rows.map(mapRow);
}

export function matchesDate(event: CalendarEvent, dateKey: string): boolean {
  const year = Number(dateKey.slice(0, 4));
  const monthDay = dateKey.slice(5);
  if (event.repeatYearly) {
    const eventMonthDay = effectiveMonthDay(event.date.slice(5), year);
    return monthDay === eventMonthDay;
  }
  return event.date === dateKey;
}

function effectiveMonthDay(monthDay: string, year: number): string {
  if (monthDay !== '02-29') {
    return monthDay;
  }
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return isLeapYear ? '02-29' : '03-01';
}

export function nextOccurrence(event: CalendarEvent, fromDateKey: string): string | null {
  if (event.repeatYearly) {
    const year = Number(fromDateKey.slice(0, 4));
    let candidate = `${year}-${effectiveMonthDay(event.date.slice(5), year)}`;
    if (candidate < fromDateKey) {
      candidate = `${year + 1}-${effectiveMonthDay(event.date.slice(5), year + 1)}`;
    }
    return candidate;
  }
  return event.date >= fromDateKey ? event.date : null;
}

export async function getTodayEvents(db: SQLiteDatabase): Promise<CalendarEvent[]> {
  const events = await getAllEvents(db);
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayKey = `${today.getFullYear()}-${month}-${day}`;
  return events.filter((event) => matchesDate(event, todayKey));
}

export async function getYearlyEventByMonthDay(
  db: SQLiteDatabase,
  monthDay: string
): Promise<CalendarEvent | null> {
  const events = await getAllEvents(db);
  return events.find((event) => event.repeatYearly && event.date.slice(5) === monthDay) ?? null;
}

export async function insertEvent(
  db: SQLiteDatabase,
  event: NewCalendarEvent
): Promise<CalendarEvent> {
  const id = generateId();
  await db.runAsync(
    `INSERT INTO user_events (id, title, type, event_date, description, repeat_yearly, remind_days)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    event.title.trim(),
    event.type,
    event.date,
    event.description && event.description.trim().length > 0 ? event.description.trim() : null,
    event.repeatYearly ? 1 : 0,
    event.remindDays.join(',')
  );
  const created = await db.getFirstAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS} FROM user_events WHERE id = ?`,
    id
  );
  if (!created) {
    throw new Error('No se pudo crear el evento');
  }
  return mapRow(created);
}

export async function updateEvent(
  db: SQLiteDatabase,
  id: string,
  event: NewCalendarEvent
): Promise<void> {
  await db.runAsync(
    `UPDATE user_events
     SET title = ?, type = ?, event_date = ?, description = ?, repeat_yearly = ?, remind_days = ?
     WHERE id = ?`,
    event.title.trim(),
    event.type,
    event.date,
    event.description && event.description.trim().length > 0 ? event.description.trim() : null,
    event.repeatYearly ? 1 : 0,
    event.remindDays.join(','),
    id
  );
}

export async function deleteEvent(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM user_events WHERE id = ?', id);
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}