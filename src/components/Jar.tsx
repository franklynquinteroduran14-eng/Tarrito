import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

interface JarProps {
  onPress: () => void;
  disabled?: boolean;
}

const NOTE_COLORS = ['#E8A0B4', '#F2C879', '#9FC5A8'];

const NOTE_STYLE = [
  { rotate: -14, right: 118, bottom: 26 },
  { rotate: 8, right: 52, bottom: 14 },
  { rotate: -4, right: 88, bottom: 58 },
];

const NOTE_MOTION = [
  { ampX: 12, ampY: 7, rot: 7 },
  { ampX: 8, ampY: 5, rot: 5 },
  { ampX: 16, ampY: 9, rot: 9 },
];

const SENSOR_INTERVAL_MS = 32;
const TILT_SCALE = 2;
const MAX_TILT = 1;
const SMOOTHING = 0.16;
const BASELINE_SAMPLES = 8;

function clamp(value: number): number {
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, value));
}

export default function Jar({ onPress, disabled }: JarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isFocused = useIsFocused();
  const bob = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  useEffect(() => {
    if (!isFocused) {
      tiltX.setValue(0);
      tiltY.setValue(0);
      return;
    }

    let active = true;
    let subscription: { remove: () => void } | null = null;
    let baselineX = 0;
    let baselineY = 0;
    let baselineCount = 0;
    let smoothX = 0;
    let smoothY = 0;

    (async () => {
      let available = false;
      try {
        available = await Accelerometer.isAvailableAsync();
      } catch {
        available = false;
      }
      if (!available || !active) {
        setMotionEnabled(false);
        return;
      }
      try {
        Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
        subscription = Accelerometer.addListener(({ x, y }) => {
          if (baselineCount < BASELINE_SAMPLES) {
            baselineX += x;
            baselineY += y;
            baselineCount += 1;
            if (baselineCount === BASELINE_SAMPLES) {
              baselineX /= BASELINE_SAMPLES;
              baselineY /= BASELINE_SAMPLES;
            }
            return;
          }
          const rawX = clamp(-(x - baselineX) * TILT_SCALE);
          const rawY = clamp((y - baselineY) * TILT_SCALE);
          smoothX += (rawX - smoothX) * SMOOTHING;
          smoothY += (rawY - smoothY) * SMOOTHING;
          tiltX.setValue(smoothX);
          tiltY.setValue(smoothY);
        });
      } catch {
        setMotionEnabled(false);
      }
    })();

    return () => {
      active = false;
      subscription?.remove();
      Accelerometer.removeAllListeners();
      tiltX.setValue(0);
      tiltY.setValue(0);
    };
  }, [isFocused, tiltX, tiltY]);

  const noteTransforms = useMemo(
    () =>
      NOTE_MOTION.map((motion) => ({
        translateX: tiltX.interpolate({
          inputRange: [-1, 1],
          outputRange: [-motion.ampX, motion.ampX],
        }),
        translateY: tiltY.interpolate({
          inputRange: [-1, 1],
          outputRange: [-motion.ampY, motion.ampY],
        }),
        rotate: tiltX.interpolate({
          inputRange: [-1, 1],
          outputRange: [`-${motion.rot}deg`, `${motion.rot}deg`],
        }),
      })),
    [tiltX, tiltY]
  );

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  };

  const renderInnerNote = (index: number) => {
    const color = NOTE_COLORS[index];
    const style = NOTE_STYLE[index];
    const motion = noteTransforms[index];
    const isStatic = !motionEnabled;
    const transform = isStatic
      ? [{ rotate: `${style.rotate}deg` }]
      : [
          { rotate: `${style.rotate}deg` },
          { translateX: motion.translateX },
          { translateY: motion.translateY },
          { rotate: motion.rotate },
        ];
    return (
      <Animated.View
        key={index}
        style={[
          styles.innerNote,
          { backgroundColor: color, right: style.right, bottom: style.bottom },
          { transform },
        ]}
      />
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Sacar una nota aleatoria"
    >
      <Animated.View style={[styles.wrapper, { transform: [{ translateY }, { scale }] }]}>
        <View style={styles.glow} />
        <View style={styles.jarColumn}>
          <View style={styles.lid}>
            <View style={styles.lidHighlight} />
          </View>
          <View style={styles.neck} />
          <View style={styles.body}>
            <View style={styles.shine} />
            {NOTE_COLORS.map((_, index) => renderInnerNote(index))}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    glow: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: colors.jarGlow,
    },
    jarColumn: {
      alignItems: 'center',
    },
    lid: {
      width: 180,
      height: 30,
      borderRadius: 10,
      backgroundColor: '#B5876B',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
      overflow: 'hidden',
    },
    lidHighlight: {
      position: 'absolute',
      left: 18,
      top: 6,
      width: 40,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    neck: {
      width: 132,
      height: 24,
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderColor: colors.jarGlassBorder,
      backgroundColor: colors.jarGlass,
    },
    body: {
      width: 200,
      height: 210,
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      borderBottomLeftRadius: 42,
      borderBottomRightRadius: 42,
      borderWidth: 2,
      borderColor: colors.jarGlassBorder,
      backgroundColor: colors.jarGlass,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
      overflow: 'hidden',
    },
    shine: {
      position: 'absolute',
      left: 20,
      top: 16,
      width: 7,
      height: 130,
      borderRadius: 4,
      backgroundColor: colors.jarShine,
    },
    innerNote: {
      position: 'absolute',
      width: 42,
      height: 58,
      borderRadius: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
  });
