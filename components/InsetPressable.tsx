import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from './PressableScale';

interface InsetPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Colour of the thin left edge that marks the group this button belongs to. */
  accent?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * The recessed ("sunken") surface used for the folder and channel buttons.
 *
 * React Native has no inner shadow, so the dip is drawn the other way round: a fill
 * darker than the screen behind it, dark top and left edges, and light bottom and right
 * edges. Together they read as a tray pressed into the panel.
 */
const InsetPressable: React.FC<InsetPressableProps> = ({
  onPress,
  onLongPress,
  children,
  style,
  accent,
  disabled = false,
  accessibilityLabel,
}) => (
  <PressableScale
    onPress={onPress}
    onLongPress={onLongPress}
    disabled={disabled}
    activeScale={0.94}
    accessibilityLabel={accessibilityLabel}
  >
    <View style={[styles.inset, style]}>
      {accent ? <View style={[styles.edge, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  inset: {
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: '#0B111C',
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.7)',
    borderLeftColor: 'rgba(0,0,0,0.7)',
    borderBottomColor: 'rgba(255,255,255,0.10)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});

export default InsetPressable;
