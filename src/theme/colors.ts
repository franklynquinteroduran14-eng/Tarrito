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

export type ThemeMode = 'organico' | 'noche' | 'romantico' | 'otono';

export interface ThemeInfo {
  label: string;
  icon: string;
  isDark: boolean;
  colors: ThemeColors;
}

export const THEMES: Record<ThemeMode, ThemeInfo> = {
  organico: {
    label: 'Cálido Orgánico',
    icon: '🪴',
    isDark: false,
    colors: {
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
    },
  },
  noche: {
    label: 'Noche Profunda',
    icon: '🌙',
    isDark: true,
    colors: {
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
    },
  },
  romantico: {
    label: 'Pastel Rosa',
    icon: '🌸',
    isDark: false,
    colors: {
      background: '#FFF6F8',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#F7DDE6',
      textPrimary: '#5E3A4A',
      textSecondary: '#C48AA5',
      textBody: '#4A2F3C',
      accent: '#B34A6E',
      accentSoft: '#FBE9F1',
      inputBg: '#FDF1F5',
      pillBg: '#FBE9F1',
      tabBar: '#FFFFFF',
      backdrop: 'rgba(60, 20, 40, 0.5)',
      starEmpty: '#E8CDD9',
      starFilled: '#F2B33D',
      error: '#C0392B',
      shadow: '#B34A6E',
      jarGlass: 'rgba(220, 120, 160, 0.16)',
      jarGlassBorder: 'rgba(255, 255, 255, 0.6)',
      jarShine: 'rgba(255, 255, 255, 0.5)',
      jarGlow: 'rgba(250, 190, 210, 0.5)',
    },
  },
  otono: {
    label: 'Otoño Cálido',
    icon: '🍂',
    isDark: false,
    colors: {
      background: '#FFF9EC',
      surface: '#FFFEF9',
      card: '#FFFEF9',
      border: '#F2E3C4',
      textPrimary: '#5C4228',
      textSecondary: '#B08D5E',
      textBody: '#4A3620',
      accent: '#C7791F',
      accentSoft: '#FDF0D9',
      inputBg: '#FAF3E4',
      pillBg: '#FDF0D9',
      tabBar: '#FFFEF9',
      backdrop: 'rgba(60, 40, 15, 0.55)',
      starEmpty: '#E3D3B4',
      starFilled: '#E8A33D',
      error: '#C0392B',
      shadow: '#C7791F',
      jarGlass: 'rgba(230, 170, 90, 0.16)',
      jarGlassBorder: 'rgba(255, 255, 255, 0.6)',
      jarShine: 'rgba(255, 255, 255, 0.5)',
      jarGlow: 'rgba(255, 200, 120, 0.5)',
    },
  },
};

export const THEME_IDS: ThemeMode[] = ['organico', 'noche', 'romantico', 'otono'];
