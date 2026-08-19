import { openDatabaseAsync } from 'expo-sqlite';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import type { WidgetData } from '../types';
import { migrateDbIfNeeded } from '../db/database';
import { getWidgetData } from '../services/widgetData';
import JarWidget from './JarWidget';
import CalendarWidget from './CalendarWidget';

const FALLBACK_DATA: WidgetData = {
  jar: { pendingLetters: 0, nextDepositAt: null },
  calendar: {
    todayDay: 1,
    todayMonth: '',
    todayWeekday: '',
    upcoming: [],
  },
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data: WidgetData = FALLBACK_DATA;
      try {
        const db = await openDatabaseAsync('tarro.db');
        await migrateDbIfNeeded(db);
        data = await getWidgetData(db);
      } catch (error) {
        // Si la base de datos aún no existe, se dibuja el estado vacío.
      }
      if (widgetInfo.widgetName === 'JarWidget') {
        renderWidget(<JarWidget data={data.jar} />);
      } else if (widgetInfo.widgetName === 'CalendarWidget') {
        renderWidget(<CalendarWidget data={data.calendar} />);
      }
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      break;
  }
}