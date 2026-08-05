import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import PressableScale from '../PressableScale';
import {
  getSoundSettings,
  previewSound,
  setDrawSound,
  setOpenSound,
  setSoundVolume,
  SOUND_OPTIONS,
  type SoundId,
} from '../../services/sound';
import { useTheme } from '../../theme/ThemeContext';
import { createLabStyles } from './styles';

const VOLUME_OPTIONS = [
  { label: 'Suave', value: 0.2 },
  { label: 'Medio', value: 0.45 },
  { label: 'Fuerte', value: 0.75 },
];

export default function SoundTab() {
  const { colors } = useTheme();
  const styles = createLabStyles(colors);
  const [drawSound, setDrawSoundId] = useState<SoundId>('pop');
  const [openSound, setOpenSoundId] = useState<SoundId>('chime');
  const [volume, setVolume] = useState(0.45);

  useEffect(() => {
    getSoundSettings().then((settings) => {
      setDrawSoundId(settings.drawSound);
      setOpenSoundId(settings.openSound);
      setVolume(settings.volume);
    });
  }, []);

  const renderSoundRow = (
    option: (typeof SOUND_OPTIONS)[number],
    selected: SoundId,
    onSelect: (id: SoundId) => void
  ) => {
    const isSelected = selected === option.id;
    return (
      <PressableScale
        key={option.id}
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => {
          onSelect(option.id);
          previewSound(option.id);
        }}
        scaleTo={0.98}
        accessibilityLabel={`${option.name}: tocar para probar y seleccionar`}
      >
        <View style={styles.row}>
          <Text style={{ fontSize: 17 }}>{option.icon}</Text>
          <Text style={styles.label}>{option.name}</Text>
          <PressableScale
            style={styles.smallButton}
            onPress={() => previewSound(option.id)}
            scaleTo={0.85}
            accessibilityLabel={`Probar ${option.name}`}
          >
            <Text style={styles.smallButtonText}>▶</Text>
          </PressableScale>
          <Text
            style={{
              width: 18,
              fontSize: 16,
              fontWeight: '700',
              color: isSelected ? colors.accent : colors.border,
              textAlign: 'center',
            }}
          >
            {isSelected ? '✓' : '○'}
          </Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>Sonido al sacar nota</Text>
      <View style={{ rowGap: 8 }}>
        {SOUND_OPTIONS.map((option) =>
          renderSoundRow(option, drawSound, (id) => {
            setDrawSoundId(id);
            setDrawSound(id);
          })
        )}
      </View>

      <Text style={styles.sectionLabel}>Sonido al abrir nota</Text>
      <View style={{ rowGap: 8 }}>
        {SOUND_OPTIONS.map((option) =>
          renderSoundRow(option, openSound, (id) => {
            setOpenSoundId(id);
            setOpenSound(id);
          })
        )}
      </View>

      <Text style={styles.sectionLabel}>Volumen</Text>
      <View style={styles.row}>
        {VOLUME_OPTIONS.map((option) => {
          const isSelected = Math.abs(volume - option.value) < 0.001;
          return (
            <PressableScale
              key={option.label}
              style={[styles.card, { flex: 1, alignItems: 'center' }, isSelected && styles.cardSelected]}
              onPress={() => {
                setVolume(option.value);
                setSoundVolume(option.value);
              }}
              scaleTo={0.94}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.smallButtonText,
                  { fontSize: 14 },
                  isSelected && { color: colors.accent },
                ]}
              >
                {option.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={[styles.hint, { marginTop: 10 }]}>
        Toca una fila para probar y elegir el sonido. El interruptor general vive en Ajustes.
      </Text>
    </View>
  );
}
