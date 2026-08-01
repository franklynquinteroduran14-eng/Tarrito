export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textBody: string;
  accent: string;
  accentSoft: string;
  inputBg: string;
  pillBg: string;
  tabBar: string;
  backdrop: string;
  starEmpty: string;
  starFilled: string;
  error: string;
  shadow: string;
  jarGlass: string;
  jarGlassBorder: string;
  jarShine: string;
  jarGlow: string;
}

export const lightColors: ThemeColors = {
  background: '#FFF8F0',
  surface: '#FFFDFB',
  card: '#FFFDFB',
  border: '#F0E4DA',
  textPrimary: '#5C4033',
  textSecondary: '#B08D7C',
  textBody: '#4A342A',
  accent: '#D96A87',
  accentSoft: '#FBEBDC',
  inputBg: '#FAF3EC',
  pillBg: '#FBEBDC',
  tabBar: '#FFFDFB',
  backdrop: 'rgba(43, 26, 20, 0.55)',
  starEmpty: '#D9CDBF',
  starFilled: '#F2B33D',
  error: '#C0392B',
  shadow: '#B5876B',
  jarGlass: 'rgba(240, 150, 160, 0.16)',
  jarGlassBorder: 'rgba(255, 255, 255, 0.6)',
  jarShine: 'rgba(255, 255, 255, 0.5)',
  jarGlow: 'rgba(255, 214, 170, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#221812',
  surface: '#2E221C',
  card: '#2E221C',
  border: '#463428',
  textPrimary: '#F5E6DA',
  textSecondary: '#B98F7A',
  textBody: '#EAD9CB',
  accent: '#E88CA0',
  accentSoft: '#3A2A22',
  inputBg: '#35271F',
  pillBg: '#35271F',
  tabBar: '#2E221C',
  backdrop: 'rgba(0, 0, 0, 0.65)',
  starEmpty: '#6B584A',
  starFilled: '#F2B33D',
  error: '#E57373',
  shadow: '#000000',
  jarGlass: 'rgba(255, 255, 255, 0.06)',
  jarGlassBorder: 'rgba(255, 255, 255, 0.28)',
  jarShine: 'rgba(255, 255, 255, 0.35)',
  jarGlow: 'rgba(200, 120, 90, 0.28)',
};
