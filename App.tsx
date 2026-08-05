import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { migrateDbIfNeeded } from './src/db/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import {
  configureNotificationHandler,
  ensureNotificationChannel,
  requestNotificationPermissions,
  scheduleDailyNotifications,
  scheduleTodaySpecialEvent,
} from './src/services/notifications';
import { loadSoundEffects } from './src/services/sound';
import AppNavigator from './src/navigation/AppNavigator';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function NotificationManager() {
  const db = useSQLiteContext();
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) {
      return;
    }
    mounted.current = true;
    (async () => {
      configureNotificationHandler();
      await ensureNotificationChannel();
      await loadSoundEffects();
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyNotifications(db);
        await scheduleTodaySpecialEvent();
      }
    })();
  }, [db]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SQLiteProvider databaseName="tarro.db" onInit={migrateDbIfNeeded}>
          <NotificationManager />
          <ThemedStatusBar />
          <AppNavigator />
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
