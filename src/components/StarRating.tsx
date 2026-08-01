import { Pressable, StyleSheet, Text, View } from 'react-native';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

export default function StarRating({ value, onChange, size = 34 }: StarRatingProps) {
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 8,
  },
  star: {
    color: '#D9CDBF',
  },
  starFilled: {
    color: '#F2B33D',
    textShadowColor: 'rgba(242, 179, 61, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  starEmpty: {
    color: '#D9CDBF',
  },
});
