import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { APP_NAME, APP_VERSION } from '../constants/version';
import { getSoundSettings, setSoundEffectsEnabled } from '../services/sound';
import { useTheme } from '../theme/ThemeContext';
import { THEMES, type ThemeMode } from '../theme/colors';
import PressableScale from './PressableScale';
import LabModal from './lab/LabModal';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SECRET_TAPS_NEEDED = 10;

const QUICK_THEMES: ThemeMode[] = ['organico', 'noche', 'romantico', 'otono'];

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { colors, mode, setMode, isDark } = useTheme();
  const styles = createStyles(colors);
  const [soundEffects, setSoundEffects] = useState(true);
  const [soundEffectsReady, setSoundEffectsReady] = useState(false);
  const [labVisible, setLabVisible] = useState(false);
  const secretTaps = useRef(0);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    getSoundSettings().then((settings) => {
      setSoundEffects(settings.enabled);
      setSoundEffectsReady(true);
    });
    backdropOpacity.setValue(0);
    cardScale.setValue(0.9);
    cardTranslateY.setValue(30);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, damping: 16, stiffness: 170, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, backdropOpacity, cardScale, cardTranslateY, cardOpacity]);

  const renderModeOption = (option: ThemeMode, label: string, icon: string) => {
    const selected = mode === option;
    return (
      <PressableScale
        key={option}
        style={[styles.modeOption, selected && styles.modeOptionSelected]}
        onPress={() => setMode(option)}
        accessibilityState={{ selected }}
      >
        <Text style={styles.modeOptionIcon}>{icon}</Text>
        <Text style={[styles.modeOptionText, selected && styles.modeOptionTextSelected]}>
          {label}
        </Text>
      </PressableScale>
    );
  };

  const handleToggleSoundEffects = (enabled: boolean) => {
    setSoundEffects(enabled);
    setSoundEffectsEnabled(enabled);
  };

  const handleSecretTap = () => {
    secretTaps.current += 1;
    if (secretTaps.current >= SECRET_TAPS_NEEDED) {
      secretTaps.current = 0;
      setLabVisible(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.card,
              { opacity: cardOpacity, transform: [{ scale: cardScale }, { translateY: cardTranslateY }] },
            ]}
          >
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar ajustes"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>

            <Pressable
              onPress={handleSecretTap}
              accessibilityRole="button"
              accessibilityLabel="Ajustes"
            >
              <Text style={styles.title}>Ajustes</Text>
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Apariencia</Text>
                <View style={styles.modeRow}>
                  {QUICK_THEMES.map((id) =>
                    renderModeOption(id, THEMES[id].label, THEMES[id].icon)
                  )}
                </View>
                <Text style={styles.sectionHint}>
                  {isDark
                    ? 'Tema Noche Profunda activado, ideal para noches tranquilas.'
                    : `Tema ${THEMES[mode].label} activado. Los 14 temas viven en el Laboratorio 🧪`}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Sonidos</Text>
                <View style={styles.soundRow}>
                  <View style={styles.soundRowText}>
                    <Text style={styles.soundLabel}>Efectos de sonido</Text>
                    <Text style={styles.sectionHint}>
                      {soundEffects && soundEffectsReady
                        ? 'Sonidos suaves al sacar y leer notas.'
                        : 'Los sonidos del tarro están apagados.'}
                    </Text>
                  </View>
                  <Switch
                    value={soundEffects}
                    onValueChange={handleToggleSoundEffects}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={soundEffects ? '#FFFFFF' : colors.textSecondary}
                    accessibilityLabel="Activar o desactivar efectos de sonido"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Información</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{APP_NAME}</Text>
                <Text style={styles.infoValue}>v{APP_VERSION}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </View>
      <LabModal visible={labVisible} onClose={() => setLabVisible(false)} />
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.backdrop,
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 26,
    },
    card: {
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 10,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    closeText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 18,
    },
    section: {
      marginBottom: 6,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    modeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 10,
      rowGap: 10,
    },
    modeOption: {
      width: '48%',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 6,
    },
    modeOptionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    modeOptionIcon: {
      fontSize: 22,
    },
    modeOptionText: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modeOptionTextSelected: {
      color: colors.accent,
    },
    sectionHint: {
      marginTop: 10,
      fontSize: 12,
      color: colors.textSecondary,
    },
    soundRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 14,
    },
    soundRowText: {
      flex: 1,
    },
    soundLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    infoValue: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
