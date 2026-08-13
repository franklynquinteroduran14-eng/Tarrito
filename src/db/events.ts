import type { SQLiteDatabase } from 'expo-sqlite';
import type { CalendarEvent, CalendarEventType } from '../types';

interface EventRow {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  description: string | null;
  repeatYearly: number;
  createdAt: string;
}

export interface NewCalendarEvent {
  title: string;
  type: CalendarEventType;
  date: string;
  description: string | null;
  repeatYearly: boolean;
}

function mapRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.date,
    description: row.description,
    repeatYearly: row.repeatYearly === 1,
    createdAt: row.createdAt,
  };
}

const SELECT_COLUMNS = 'id, title, type, event_date AS date, description, repeat_yearly AS repeatYearly, created_at AS createdAt';

export async function getEventsBetween(
  db: SQLiteDatabase,
  fromDate: string,
  toDate: string
): Promise<CalendarEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM user_events
     WHERE event_date BETWEEN ? AND ?
     ORDER BY event_date ASC, created_at ASC`,
    fromDate,
    toDate
  );
  return rows.map(mapRow);
}

export async function getEventsByDate(
  db: SQLiteDatabase,
  date: string
): Promise<CalendarEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM user_events
     WHERE event_date = ?
     ORDER BY created_at ASC`,
    date
  );
  return rows.map(mapRow);
}

export async function getAllEvents(db: SQLiteDatabase): Promise<CalendarEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM user_events
     ORDER BY event_date ASC, created_at ASC`
  );
  return rows.map(mapRow);
}

export async function insertEvent(
  db: SQLiteDatabase,
  event: NewCalendarEvent
): Promise<CalendarEvent> {
  const id = generateId();
  await db.runAsync(
    `INSERT INTO user_events (id, title, type, event_date, description, repeat_yearly)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    event.title.trim(),
    event.type,
    event.date,
    event.description && event.description.trim().length > 0 ? event.description.trim() : null,
    event.repeatYearly ? 1 : 0
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
     SET title = ?, type = ?, event_date = ?, description = ?, repeat_yearly = ?
     WHERE id = ?`,
    event.title.trim(),
    event.type,
    event.date,
    event.description && event.description.trim().length > 0 ? event.description.trim() : null,
    event.repeatYearly ? 1 : 0,
    id
  );
}

export async function deleteEvent(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM user_events WHERE id = ?', id);
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}