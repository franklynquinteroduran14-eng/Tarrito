import type { CalendarEventType } from '../types';

export interface EventTypeMeta {
  label: string;
  icon: string;
  color: string;
}

export const EVENT_TYPE_META: Record<CalendarEventType, EventTypeMeta> = {
  recordatorio: { label: 'Recordatorio', icon: '⏰', color: '#4A90D9' },
  evento: { label: 'Evento especial', icon: '✨', color: '#E0A03D' },
  cumpleanos: { label: 'Cumpleaños', icon: '🎂', color: '#E0538C' },
};

export const EVENT_TYPE_IDS = Object.keys(EVENT_TYPE_META) as CalendarEventType[];
