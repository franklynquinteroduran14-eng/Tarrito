import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetJarData } from '../types';

const COLORS = {
  background: '#FFF8F0',
  textPrimary: '#5C4033',
  textSecondary: '#B08D7C',
  accent: '#D96A87',
} as const;

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function nextDepositLabel(nextDepositAt: string): string {
  const target = new Date(nextDepositAt);
  const now = new Date();
  const label = dateKey(target) === dateKey(now) ? 'Hoy' : 'Mañana';
  return `Próxima carta: ${label} a la 1:00 PM`;
}

export default function JarWidget({ data }: { data: WidgetJarData }) {
  const { pendingLetters, nextDepositAt } = data;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'eltarro://inicio' }}
      accessibilityLabel="Abrir el tarrito de notas"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.background,
        borderRadius: 24,
        padding: 10,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text="🏺"
        style={{ fontSize: pendingLetters > 0 ? 26 : 32 }}
      />
      {pendingLetters > 0 ? (
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={`${pendingLetters}`}
            style={{
              fontSize: 30,
              fontWeight: '800',
              color: COLORS.textPrimary,
            }}
          />
          <TextWidget
            text={pendingLetters === 1 ? 'carta esperando' : 'cartas esperando'}
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: COLORS.textSecondary,
              textAlign: 'center',
            }}
          />
          <TextWidget
            text="Toca para leer 💕"
            style={{ fontSize: 10, color: COLORS.accent, textAlign: 'center' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Buzón vacío"
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: COLORS.textPrimary,
            }}
          />
          <TextWidget
            text={nextDepositAt ? nextDepositLabel(nextDepositAt) : 'El tarro espera notas'}
            style={{
              fontSize: 10,
              color: COLORS.textSecondary,
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}