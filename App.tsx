import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from './src/db/database';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SQLiteProvider databaseName="tarro.db" onInit={migrateDbIfNeeded}>
      <StatusBar style="dark" />
      <AppNavigator />
    </SQLiteProvider>
  );
}
