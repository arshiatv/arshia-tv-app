import React, { useRef } from 'react';
import { Animated, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';

interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Press feedback used across Arshia TV: the content dips slightly and dims on touch.
 * Scale and opacity are both native-drivable, so the same driver is used throughout.
 */
const PressableScale: React.FC<PressableScaleProps> = ({
  onPress,
  onLongPress,
  children,
  style,
  activeScale = 0.96,
  disabled = false,
  accessibilityLabel,
}) => {
  const press = useRef(new Animated.Value(0)).current;

  const animate = (toValue: number) => {
    Animated.spring(press, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          style,
          disabled ? { opacity: 0.5 } : null,
          {
            transform: [
              {
                scale: press.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, activeScale],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default PressableScale;
          
