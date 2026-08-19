import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getWidgetData } from './widgetData';
import JarWidget from '../widgets/JarWidget';
import CalendarWidget from '../widgets/CalendarWidget';

/**
 * Empuja los datos actuales del tarro y del calendario a los widgets
 * de la pantalla de inicio (solo Android).
 */
export async function refreshWidgets(db: SQLiteDatabase): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    const data = await getWidgetData(db);
    await requestWidgetUpdate({
      widgetName: 'JarWidget',
      renderWidget: () => <JarWidget data={data.jar} />,
    });
    await requestWidgetUpdate({
      widgetName: 'CalendarWidget',
      renderWidget: () => <CalendarWidget data={data.calendar} />,
    });
  } catch (error) {
    // Sin widgets en la pantalla de inicio: no hay nada que actualizar.
  }
}