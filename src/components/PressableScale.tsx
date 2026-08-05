import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  accessibilityRole?: 'button' | 'imagebutton';
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
}

export default function PressableScale({
  children,
  style,
  onPress,
  disabled = false,
  scaleTo = 0.95,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => !disabled && animateTo(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
