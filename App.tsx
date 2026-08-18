import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as NativeSplash from 'expo-splash-screen';
import { migrateDbIfNeeded } from './src/db/database';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import {
  configureNotificationHandler,
  ensureNotificationChannel,
  requestNotificationPermissions,
  rescheduleAllEventReminders,
  scheduleDailyNotifications,
} from './src/services/notifications';
import { ensureDailyDeposits } from './src/services/mailbox';
import { loadSoundEffects } from './src/services/sound';
import AppNavigator from './src/navigation/AppNavigator';
import AppSplash from './src/components/AppSplash';

NativeSplash.preventAutoHideAsync().catch(() => {});
NativeSplash.setOptions({ duration: 400, fade: true });

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
      await ensureDailyDeposits(db);
      if (granted) {
        await scheduleDailyNotifications(db);
        await rescheduleAllEventReminders(db);
      }
    })();
  }, [db]);

  return null;
}

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    NativeSplash.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <NotificationManager />
      <ThemedStatusBar />
      <AppNavigator />
      {showSplash && <AppSplash onFinish={() => setShowSplash(false)} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SQLiteProvider databaseName="tarro.db" onInit={migrateDbIfNeeded}>
          <Root />
        </SQLiteProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
