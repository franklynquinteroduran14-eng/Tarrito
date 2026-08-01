import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface JarProps {
  onPress: () => void;
  disabled?: boolean;
}

const NOTE_COLORS = ['#E8A0B4', '#F2C879', '#9FC5A8'];

export default function Jar({ onPress, disabled }: JarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bob = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

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

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
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
            {NOTE_COLORS.map((color, index) => (
              <View
                key={index}
                style={[
                  styles.innerNote,
                  {
                    backgroundColor: color,
                    transform: [{ rotate: `${index === 0 ? -14 : index === 1 ? 8 : -4}deg` }],
                    right: index === 0 ? 118 : index === 1 ? 52 : 88,
                    bottom: index === 0 ? 26 : index === 1 ? 14 : 58,
                  },
                ]}
              />
            ))}
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
