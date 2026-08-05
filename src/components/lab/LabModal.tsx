import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';
import SoundTab from './SoundTab';
import NotificationsTab from './NotificationsTab';
import MetricsTab from './MetricsTab';
import EventsTab from './EventsTab';
import NotesTab from './NotesTab';

interface LabModalProps {
  visible: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'sounds', icon: '🔊', label: 'Sonidos' },
  { id: 'notifications', icon: '🔔', label: 'Notificaciones' },
  { id: 'metrics', icon: '📊', label: 'Métricas' },
  { id: 'events', icon: '📅', label: 'Eventos' },
  { id: 'notes', icon: '📝', label: 'Gestor' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function LabModal({ visible, onClose }: LabModalProps) {
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const shellStyles = createShellStyles(colors);
  const [tab, setTab] = useState<TabId>('sounds');

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={shellStyles.root}>
        <Animated.View style={[shellStyles.backdrop, { opacity: backdropOpacity }]} />
        <View style={shellStyles.overlay}>
          <Animated.View
            style={[
              shellStyles.card,
              { opacity: cardOpacity, transform: [{ scale: cardScale }, { translateY: cardTranslateY }] },
            ]}
          >
            <Pressable
              style={shellStyles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar laboratorio"
            >
              <Text style={shellStyles.closeText}>✕</Text>
            </Pressable>

            <Text style={shellStyles.title}>Laboratorio 🧪</Text>
            <Text style={shellStyles.subtitle}>Modo Admin · acceso: 10 toques en "Ajustes"</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={shellStyles.tabBar}
              contentContainerStyle={shellStyles.tabBarContent}
            >
              {TABS.map((item) => {
                const isSelected = tab === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[shellStyles.tabChip, isSelected && shellStyles.tabChipSelected]}
                    onPress={() => setTab(item.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={shellStyles.tabChipIcon}>{item.icon}</Text>
                    <Text
                      style={[shellStyles.tabChipText, isSelected && shellStyles.tabChipTextSelected]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={shellStyles.tabScroll}
              contentContainerStyle={shellStyles.tabScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {tab === 'sounds' && <SoundTab />}
              {tab === 'notifications' && <NotificationsTab />}
              {tab === 'metrics' && <MetricsTab />}
              {tab === 'events' && <EventsTab />}
              {tab === 'notes' && <NotesTab />}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const createShellStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
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
      paddingHorizontal: 18,
      paddingVertical: 30,
    },
    card: {
      maxHeight: '94%',
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 14,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 10,
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
      marginRight: 40,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },
    tabBar: {
      marginTop: 12,
      flexGrow: 0,
    },
    tabBarContent: {
      columnGap: 8,
    },
    tabChip: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 6,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tabChipSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    tabChipIcon: {
      fontSize: 14,
    },
    tabChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    tabChipTextSelected: {
      color: colors.accent,
    },
    tabScroll: {
      marginTop: 12,
      flexShrink: 1,
    },
    tabScrollContent: {
      paddingBottom: 10,
    },
  });
