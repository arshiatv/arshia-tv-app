import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';

interface ArshiaWatermarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Arshia TV mark: a small badge that drifts gently in place. Used on top of every
 * broadcast and film, and in the app header.
 *
 * One Animated.Value drives both the transform and the opacity, and both are
 * native-drivable, so a single driver setting is used for the whole badge.
 */
const ArshiaWatermark: React.FC<ArshiaWatermarkProps> = ({ size = 13, style }) => {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 2,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const animatedStyle = {
    opacity: drift.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0.72, 1, 0.78],
    }),
    transform: [
      {
        translateX: drift.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0, -6, -2],
        }),
      },
      {
        translateY: drift.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0, 3, -2],
        }),
      },
      {
        scale: drift.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [1, 1.05, 1.02],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.badge, animatedStyle, style]}>
      <View style={styles.mark}>
        <Ionicons name="play" size={size * 0.62} color={AppTheme.colors.white} />
      </View>
      <Text style={[styles.label, { fontSize: size }]}>ARSHIA TV</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 9,
    paddingVertical: 4,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: 'rgba(6,9,16,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  mark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  label: {
    color: AppTheme.colors.white,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    letterSpacing: 1.4,
  },
});

export default ArshiaWatermark;
          
