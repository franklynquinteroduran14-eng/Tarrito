import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import cancelScheduledNotificationAsync from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import {
  SchedulableTriggerInputTypes,
  type NotificationContentInput,
  type NotificationTriggerInput,
} from 'expo-notifications/build/Notifications.types';
import type { CalendarEvent } from '../types';
import { getMailboxPendingCount, getUpcomingLettersCount } from '../db/notes';
import { getAllEvents, nextOccurrence, getTodayEvents } from '../db/events';
import { dayKey } from './mailbox';

/*
 * Nota importante: importamos los módulos internos de expo-notifications
 * directamente en lugar de `import * as Notifications from 'expo-notifications'`.
 *
 * La entrada principal (build/index.js) evalúa `DevicePushTokenAutoRegistration.fx`,
 * que registra automáticamente un listener de push tokens (addPushTokenListener) al
 * importarse. En Expo Go (SDK 53+) esto dispara la alerta de "push notifications
 * remotos no disponibles", aunque la app solo use notificaciones locales.
 *
 * Esta app usa únicamente la API de notificaciones locales:
 * scheduleNotificationAsync, cancelScheduledNotificationAsync, requestPermissionsAsync
 * y setNotificationHandler. Ninguno de esos módulos toca tokens remotos.
 */

export const CHANNEL_IDS = {
  daily: 'daily-reminders',
  events: 'event-reminders',
} as const;

export type ScheduleSlot = 'morning' | 'release' | 'evening';

export interface SlotTime {
  hour: number;
  minute: number;
}

const TIME_KEYS: Record<ScheduleSlot, string> = {
  morning: 'notif_time_morning',
  release: 'notif_time_release',
  evening: 'notif_time_evening',
};

const DEFAULT_TIMES: Record<ScheduleSlot, SlotTime> = {
  morning: { hour: 5, minute: 30 },
  release: { hour: 13, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

const GOOD_MORNING_EMOJIS = ['💖', '💕', '💗', '❤️', '💓', '✨'];
const RELEASE_MESSAGE = '¡Tienes una nueva carta esperándote en el tarro! 📬';

const SLOT_KEYS = {
  morning: 'notif_slot_morning',
  release: 'notif_slot_release',
  evening: 'notif_slot_evening',
  special: 'notif_slot_special',
} as const;

const EVENT_REMINDER_KEY_PREFIX = 'notif_event_reminder_';

export function configureNotificationHandler() {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }
  await setNotificationChannelAsync(CHANNEL_IDS.daily, {
    name: 'Notificaciones Diarias',
    importance: AndroidImportance.DEFAULT,
    sound: 'daily_notification',
    vibrationPattern: [0, 250, 250, 250],
  }).catch(() => {});
  await setNotificationChannelAsync(CHANNEL_IDS.events, {
    name: 'Eventos Especiales',
    importance: AndroidImportance.HIGH,
    sound: 'event_notification',
    vibrationPattern: [0, 300, 200, 300],
  }).catch(() => {});
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const result = await requestPermissionsAsync();
  return result.granted;
}

function pickRandomMorningEmoji(): string {
  return GOOD_MORNING_EMOJIS[Math.floor(Math.random() * GOOD_MORNING_EMOJIS.length)];
}

async function loadSlotTime(slot: ScheduleSlot): Promise<SlotTime> {
  const stored = await Storage.getItem(TIME_KEYS[slot]);
  if (!stored) {
    return DEFAULT_TIMES[slot];
  }
  const [hour, minute] = stored.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return DEFAULT_TIMES[slot];
  }
  return {
    hour: Math.min(23, Math.max(0, hour)),
    minute: Math.min(59, Math.max(0, minute)),
  };
}

export async function getScheduleTimes(): Promise<Record<ScheduleSlot, SlotTime>> {
  const [morning, release, evening] = await Promise.all([
    loadSlotTime('morning'),
    loadSlotTime('release'),
    loadSlotTime('evening'),
  ]);
  return { morning, release, evening };
}

export async function setScheduleTime(slot: ScheduleSlot, hour: number, minute: number): Promise<void> {
  const safeHour = Math.min(23, Math.max(0, hour));
  const safeMinute = Math.min(59, Math.max(0, minute));
  await Storage.setItem(
    TIME_KEYS[slot],
    `${String(safeHour).padStart(2, '0')}:${String(safeMinute).padStart(2, '0')}`
  );
}

export async function resetScheduleTimes(): Promise<void> {
  await Promise.all([
    Storage.removeItem(TIME_KEYS.morning),
    Storage.removeItem(TIME_KEYS.release),
    Storage.removeItem(TIME_KEYS.evening),
  ]);
}

async function scheduleSlot(
  slotKey: string,
  content: NotificationContentInput,
  trigger: NotificationTriggerInput
): Promise<void> {
  const existingId = await Storage.getItem(slotKey);
  if (existingId) {
    await cancelScheduledNotificationAsync(existingId).catch(() => {});
  }
  const id = await scheduleNotificationAsync({ content, trigger });
  await Storage.setItem(slotKey, id);
}

async function cancelSlot(slotKey: string): Promise<void> {
  const existingId = await Storage.getItem(slotKey);
  if (existingId) {
    await cancelScheduledNotificationAsync(existingId).catch(() => {});
    await Storage.removeItem(slotKey);
  }
}

function dailyTrigger(hour: number, minute: number, channelId: string): NotificationTriggerInput {
  return {
    type: SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId,
  };
}

function secondsTrigger(seconds: number, channelId: string): NotificationTriggerInput {
  return {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    channelId,
  };
}

export async function scheduleDailyNotifications(db: SQLiteDatabase): Promise<void> {
  const [pendingCount, poolCount, times] = await Promise.all([
    getMailboxPendingCount(db),
    getUpcomingLettersCount(db),
    getScheduleTimes(),
  ]);

  await scheduleSlot(
    SLOT_KEYS.morning,
    { title: 'Buenos días mi amor', body: pickRandomMorningEmoji() },
    dailyTrigger(times.morning.hour, times.morning.minute, CHANNEL_IDS.daily)
  );

  if (poolCount > 0) {
    await scheduleSlot(
      SLOT_KEYS.release,
      { title: 'Nueva carta en el tarro', body: RELEASE_MESSAGE },
      dailyTrigger(times.release.hour, times.release.minute, CHANNEL_IDS.daily)
    );
  } else {
    await cancelSlot(SLOT_KEYS.release);
  }

  if (pendingCount === 0) {
    await cancelSlot(SLOT_KEYS.evening);
    return;
  }

  const body =
    pendingCount === 1
      ? 'Tienes una carta esperando en el buzón :3'
      : `Tienes ${pendingCount} cartas esperando en el buzón, no dejes a Franklyn esperando por tu respuesta :3`;

  await scheduleSlot(
    SLOT_KEYS.evening,
    { title: 'Cartas del tarro', body },
    dailyTrigger(times.evening.hour, times.evening.minute, CHANNEL_IDS.daily)
  );
}

function dateAt(dateKey: string, hour: number, minute: number, dayOffset = 0): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day + dayOffset, hour, minute, 0, 0);
}

function reminderBody(event: CalendarEvent, offset: number): string {
  if (offset === 0) {
    return `¡Hoy es ${event.title}! ✨`;
  }
  return `Solo faltan ${offset} ${offset === 1 ? 'día' : 'días'} para ${event.title} ✨`;
}

export async function cancelEventReminders(eventId: string): Promise<void> {
  const key = EVENT_REMINDER_KEY_PREFIX + eventId;
  const stored = await Storage.getItem(key);
  if (!stored) {
    return;
  }
  for (const id of stored.split(',').filter(Boolean)) {
    await cancelScheduledNotificationAsync(id).catch(() => {});
  }
  await Storage.removeItem(key);
}

/**
 * Programa las notificaciones de antelación de un evento (0/3/5/7 días antes,
 * siempre a las 9:00 AM). Para eventos anuales usa la próxima ocurrencia.
 */
export async function scheduleEventReminders(
  db: SQLiteDatabase,
  event: CalendarEvent
): Promise<void> {
  await cancelEventReminders(event.id);
  if (event.remindDays.length === 0) {
    return;
  }
  const occurrence = nextOccurrence(event, dayKey(new Date()));
  if (occurrence === null) {
    return;
  }
  const ids: string[] = [];
  for (const offset of event.remindDays) {
    const target = dateAt(occurrence, 9, 0, -offset);
    if (target.getTime() <= Date.now()) {
      continue;
    }
    const id = await scheduleNotificationAsync({
      content: {
        title: event.title,
        body: reminderBody(event, offset),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: target,
        channelId: CHANNEL_IDS.events,
      },
    });
    ids.push(id);
  }
  await Storage.setItem(EVENT_REMINDER_KEY_PREFIX + event.id, ids.join(','));
}

export async function rescheduleAllEventReminders(db: SQLiteDatabase): Promise<void> {
  const events = await getAllEvents(db);
  for (const event of events) {
    await scheduleEventReminders(db, event);
  }
}

export async function forceTestNotification(): Promise<void> {
  await scheduleNotificationAsync({
    content: {
      title: 'Nota de prueba 🔔',
      body: 'Notificación diaria de prueba. Si la ves, todo funciona. 💕',
    },
    trigger: secondsTrigger(1, CHANNEL_IDS.daily),
  });
}

export async function forceTestEventNotification(db: SQLiteDatabase): Promise<void> {
  const todayEvents = await getTodayEvents(db);
  const event = todayEvents[0] ?? null;
  await scheduleNotificationAsync({
    content: {
      title: event?.title ?? 'Evento especial',
      body: event?.description ?? 'Hoy es un día especial para nosotros ✨',
    },
    trigger: secondsTrigger(1, CHANNEL_IDS.events),
  });
}