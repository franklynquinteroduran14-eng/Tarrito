import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { getUnreadCount } from '../db/notes';
import { getTodayEvent } from '../data/specialEvents';

const CHANNEL_ID = 'daily-reminders';

const GOOD_MORNING_EMOJIS = ['💖', '💕', '💗', '❤️', '💓', '✨'];
const RELEASE_MESSAGE = '¡Tienes una nueva carta esperándote en el tarro! 📬';

const SLOT_KEYS = {
  morning: 'notif_slot_morning',
  release: 'notif_slot_release',
  evening: 'notif_slot_evening',
  special: 'notif_slot_special',
} as const;

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios diarios',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

function pickRandomMorningEmoji(): string {
  return GOOD_MORNING_EMOJIS[Math.floor(Math.random() * GOOD_MORNING_EMOJIS.length)];
}

async function scheduleSlot(
  slotKey: string,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput
): Promise<void> {
  const existingId = await Storage.getItem(slotKey);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }
  const id = await Notifications.scheduleNotificationAsync({ content, trigger });
  await Storage.setItem(slotKey, id);
}

async function cancelSlot(slotKey: string): Promise<void> {
  const existingId = await Storage.getItem(slotKey);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
    await Storage.removeItem(slotKey);
  }
}

function dailyTrigger(hour: number, minute: number): Notifications.NotificationTriggerInput {
  return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID };
}

export async function scheduleDailyNotifications(db: SQLiteDatabase): Promise<void> {
  const unreadCount = await getUnreadCount(db);

  await scheduleSlot(
    SLOT_KEYS.morning,
    { title: 'Buenos días mi amor', body: pickRandomMorningEmoji() },
    dailyTrigger(5, 30)
  );

  if (unreadCount > 0) {
    await scheduleSlot(SLOT_KEYS.release, { title: 'Nueva carta en el tarro', body: RELEASE_MESSAGE }, dailyTrigger(13, 0));
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

  await scheduleSlot(SLOT_KEYS.evening, { title: 'Notas del tarro', body }, dailyTrigger(20, 0));
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
  const trigger: Notifications.NotificationTriggerInput =
    scheduledAt.getTime() > Date.now()
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledAt,
          channelId: CHANNEL_ID,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          channelId: CHANNEL_ID,
        };

  await scheduleSlot(
    SLOT_KEYS.special,
    { title: event.title, body: event.notificationMessage },
    trigger
  );
  await Storage.setItem(flagKey, '1');
}
