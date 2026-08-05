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
import { getUnreadCount } from '../db/notes';
import { getSimulatedEvent, getTodayEvent } from '../data/specialEvents';

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
  const unreadCount = await getUnreadCount(db);
  const times = await getScheduleTimes();

  await scheduleSlot(
    SLOT_KEYS.morning,
    { title: 'Buenos días mi amor', body: pickRandomMorningEmoji() },
    dailyTrigger(times.morning.hour, times.morning.minute, CHANNEL_IDS.daily)
  );

  if (unreadCount > 0) {
    await scheduleSlot(
      SLOT_KEYS.release,
      { title: 'Nueva carta en el tarro', body: RELEASE_MESSAGE },
      dailyTrigger(times.release.hour, times.release.minute, CHANNEL_IDS.daily)
    );
  } else {
    await cancelSlot(SLOT_KEYS.release);
  }

  if (unreadCount === 0) {
    await cancelSlot(SLOT_KEYS.evening);
    return;
  }

  const body =
    unreadCount === 1
      ? 'Recuerda que tienes una nota por leer :3'
      : `Recuerda que tienes ${unreadCount} notas por leer, no dejes a Franklyn esperando por tu respuesta :3`;

  await scheduleSlot(
    SLOT_KEYS.evening,
    { title: 'Notas del tarro', body },
    dailyTrigger(times.evening.hour, times.evening.minute, CHANNEL_IDS.daily)
  );
}

export async function scheduleTodaySpecialEvent(): Promise<void> {
  const event = getTodayEvent();
  if (!event) {
    return;
  }

  const today = new Date();
  const dateKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const flagKey = `notif_special_sent_${dateKey}`;

  const alreadySent = await Storage.getItem(flagKey);
  if (alreadySent) {
    return;
  }

  const scheduledAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0);
  const trigger: NotificationTriggerInput =
    scheduledAt.getTime() > Date.now()
      ? {
          type: SchedulableTriggerInputTypes.DATE,
          date: scheduledAt,
          channelId: CHANNEL_IDS.events,
        }
      : secondsTrigger(5, CHANNEL_IDS.events);

  await scheduleSlot(
    SLOT_KEYS.special,
    { title: event.title, body: event.notificationMessage },
    trigger
  );
  await Storage.setItem(flagKey, '1');
}

export async function forceTestNotification(): Promise<void> {
  await scheduleNotificationAsync({
    content: {
      title: 'Nota de prueba 🔔',
      body: 'Notificación diaria de prueba. Si la ves, todo funciona. 💕',
    },
    trigger: secondsTrigger(5, CHANNEL_IDS.daily),
  });
}

export async function forceTestEventNotification(): Promise<void> {
  const event = await getSimulatedEvent();
  await scheduleNotificationAsync({
    content: {
      title: event?.title ?? 'Evento especial',
      body: event?.notificationMessage ?? 'Hoy es un día especial para nosotros ✨',
    },
    trigger: secondsTrigger(5, CHANNEL_IDS.events),
  });
}
