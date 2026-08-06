import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { playStartupJingle } from '../services/sound';
import { TulipFlowerIcon, TulipStemIcon } from './TulipIcon';

const DEFAULT_HOLD_MS = 1600;
const FADE_MS = 450;
const ICON_SIZE = 132;

interface AppSplashProps {
  onFinish: () => void;
}

export default function AppSplash({ onFinish }: AppSplashProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const stemOpacity = useRef(new Animated.Value(0)).current;
  const stemTranslateY = useRef(new Animated.Value(24)).current;
  const flowerOpacity = useRef(new Animated.Value(0)).current;
  const flowerScale = useRef(new Animated.Value(0.55)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(16)).current;
  const [holdMs, setHoldMs] = useState<number | null>(null);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 12,
      stiffness: 130,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(stemOpacity, {
        toValue: 1,
        duration: 420,
        delay: 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(stemTranslateY, {
        toValue: 0,
        duration: 420,
        delay: 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(flowerOpacity, {
        toValue: 1,
        duration: 320,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(flowerScale, {
        toValue: 1,
        damping: 11,
        stiffness: 150,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    let cancelled = false;
    playStartupJingle().then((duration) => {
      if (!cancelled) {
        setHoldMs(duration ?? DEFAULT_HOLD_MS);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    scale,
    stemOpacity,
    stemTranslateY,
    flowerOpacity,
    flowerScale,
    titleOpacity,
    titleTranslateY,
  ]);

  useEffect(() => {
    if (holdMs === null) {
      return;
    }
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onFinish();
        }
      });
    }, holdMs);
    return () => clearTimeout(timer);
  }, [holdMs, onFinish, opacity]);

  return (
    <Animated.View
      style={[styles.root, { backgroundColor: colors.background, opacity }]}
      pointerEvents="auto"
      accessibilityViewIsModal
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        <View style={styles.iconLayer}>
          <Animated.View
            style={{ opacity: stemOpacity, transform: [{ translateY: stemTranslateY }] }}
          >
            <TulipStemIcon width={ICON_SIZE} height={ICON_SIZE} color={colors.textSecondary} />
          </Animated.View>
        </View>
        <View style={[styles.iconLayer, styles.iconLayerFront]}>
          <Animated.View style={{ opacity: flowerOpacity, transform: [{ scale: flowerScale }] }}>
            <TulipFlowerIcon width={ICON_SIZE} height={ICON_SIZE} color={colors.accent} />
          </Animated.View>
        </View>
      </Animated.View>
      <Animated.Text
        style={[
          styles.title,
          {
            color: colors.textPrimary,
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        Tarrito de Notas
      </Animated.Text>
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>Creado por: Franklyn &lt;3</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 22,
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  iconLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconLayerFront: {
    zIndex: 1,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
