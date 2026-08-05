import { StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export type LabColors = ReturnType<typeof useTheme>['colors'];

export const createLabStyles = (colors: LabColors) =>
  StyleSheet.create({
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 16,
      marginBottom: 8,
    },
    hint: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    card: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    cardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
    },
    label: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    smallButton: {
      borderRadius: 12,
      backgroundColor: colors.pillBg,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    buttonPrimary: {
      borderRadius: 14,
      backgroundColor: colors.accent,
      paddingVertical: 13,
      alignItems: 'center',
    },
    buttonPrimaryText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    buttonDanger: {
      borderRadius: 14,
      backgroundColor: colors.error,
      paddingVertical: 13,
      alignItems: 'center',
    },
    buttonDangerText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metricLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    message: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      textAlign: 'center',
    },
    timeText: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      minWidth: 58,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    stepperButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.pillBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperText: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    badge: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    noteCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      marginBottom: 12,
    },
    noteCardPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
    noteCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    noteCardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    noteCardMeta: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textSecondary,
    },
    noteCardComment: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textBody,
      fontStyle: 'italic',
    },
    forceButton: {
      borderRadius: 10,
      backgroundColor: colors.pillBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    forceButtonActive: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    forceButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    forceButtonTextActive: {
      color: colors.accent,
    },
    counterPill: {
      alignSelf: 'flex-start',
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    counterText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    gap: {
      height: 10,
    },
  });
