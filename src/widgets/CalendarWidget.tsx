import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetCalendarData, WidgetUpcomingEvent } from '../types';
import { EVENT_TYPE_META } from '../constants/eventTypes';

const COLORS = {
  background: '#FFF8F0',
  textPrimary: '#5C4033',
  textBody: '#4A342A',
  textSecondary: '#B08D7C',
  accent: '#D96A87',
  divider: '#F0E4DA',
} as const;

function daysLabel(daysUntil: number): string {
  if (daysUntil === 0) {
    return 'Hoy';
  }
  if (daysUntil === 1) {
    return 'Mañana';
  }
  return `en ${daysUntil}d`;
}

function EventRow({ event }: { event: WidgetUpcomingEvent }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: 'match_parent',
        marginTop: 6,
      }}
    >
      <TextWidget
        text={EVENT_TYPE_META[event.type].icon}
        style={{ fontSize: 14, width: 22 }}
      />
      <FlexWidget style={{ flex: 1, flexDirection: 'row' }}>
        <TextWidget
          text={event.title}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 12, fontWeight: '600', color: COLORS.textBody }}
        />
      </FlexWidget>
      <TextWidget
        text={daysLabel(event.daysUntil)}
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: COLORS.accent,
          marginLeft: 8,
        }}
      />
    </FlexWidget>
  );
}

export default function CalendarWidget({ data }: { data: WidgetCalendarData }) {
  const { todayDay, todayMonth, todayWeekday, upcoming } = data;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'eltarro://calendario' }}
      accessibilityLabel="Abrir el calendario de eventos"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget
          text={`${todayDay}`}
          style={{ fontSize: 40, fontWeight: '800', color: COLORS.textPrimary }}
        />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10 }}>
          <TextWidget
            text={todayMonth}
            style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}
          />
          <TextWidget
            text={todayWeekday}
            style={{ fontSize: 12, color: COLORS.textSecondary }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          height: 1,
          backgroundColor: COLORS.divider,
          marginTop: 8,
        }}
      />

      {upcoming.length > 0 ? (
        upcoming.map((event) => <EventRow key={event.id} event={event} />)
      ) : (
        <TextWidget
          text="Sin eventos próximos ✨"
          style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 10 }}
        />
      )}
    </FlexWidget>
  );
}