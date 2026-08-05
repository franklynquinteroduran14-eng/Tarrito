import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { THEMES, THEME_IDS, type ThemeColors } from '../../theme/colors';
import PressableScale from '../PressableScale';
import { createLabStyles } from './styles';

export default function ThemesTab() {
  const { mode, setMode, colors } = useTheme();
  const styles = createLabStyles(colors);
  const local = createThemesTabStyles(colors);

  return (
    <View>
      <Text style={styles.sectionLabel}>Tema de la aplicación</Text>
      <Text style={styles.hint}>
        Cambia la paleta de colores de todo el tarro al instante. Se guarda automáticamente.
      </Text>
      <View style={styles.gap} />
      {THEME_IDS.map((id) => {
        const theme = THEMES[id];
        const isSelected = mode === id;
        return (
          <PressableScale
            key={id}
            style={[local.card, isSelected && local.cardSelected]}
            onPress={() => setMode(id)}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[local.icon, { color: theme.colors.textSecondary }]}>{theme.icon}</Text>
            <View style={local.info}>
              <View style={local.titleRow}>
                <Text style={[local.title, { color: theme.colors.textPrimary }]}>{theme.label}</Text>
                {isSelected && <Text style={local.check}>✓</Text>}
              </View>
              <Text style={[local.tag, { color: theme.colors.textSecondary }]}>
                {theme.isDark ? 'Oscuro' : 'Claro'}
              </Text>
            </View>
            <View style={local.swatches}>
              {[theme.colors.background, theme.colors.accentSoft, theme.colors.accent].map(
                (swatch, index) => (
                  <View key={index} style={[local.swatch, { backgroundColor: swatch }]} />
                )
              )}
            </View>
          </PressableScale>
        );
      })}
      <Text style={styles.message}>
        {mode === 'noche' ? 'Tema actual: Noche Profunda 🌙' : `Tema actual: ${THEMES[mode].label}`}
      </Text>
    </View>
  );
}

const createThemesTabStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 10,
    },
    cardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    icon: {
      fontSize: 26,
    },
    info: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 6,
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
    },
    check: {
      fontSize: 14,
      fontWeight: '900',
      color: '#2E8B57',
    },
    tag: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
    },
    swatches: {
      flexDirection: 'row',
      columnGap: 6,
    },
    swatch: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.12)',
    },
  });
