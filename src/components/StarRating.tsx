import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

export default function StarRating({ value, onChange, size = 34 }: StarRatingProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const starText = (
          <Text
            style={[
              styles.star,
              { fontSize: size },
              filled ? styles.starFilled : styles.starEmpty,
            ]}
          >
            ★
          </Text>
        );
        if (!onChange) {
          return <View key={star}>{starText}</View>;
        }
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star} estrella${star === 1 ? '' : 's'}`}
            accessibilityState={{ selected: filled }}
          >
            {starText}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'center',
      columnGap: 8,
    },
    star: {
      color: colors.starEmpty,
    },
    starFilled: {
      color: colors.starFilled,
      textShadowColor: 'rgba(242, 179, 61, 0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    starEmpty: {
      color: colors.starEmpty,
    },
  });
