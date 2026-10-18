import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import { useAdmin } from '../context/AdminContext';
import { useNavigation } from '@react-navigation/native';

interface ArshiaWatermarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Arshia TV mark: a small badge that drifts gently in place. Used on top of every
 * broadcast and film, and in the app header.
 *
 * Hidden admin unlock: tapping the badge label 7 times within a short interval opens
 * a secure PIN modal. If the PIN validates, the Admin mode is unlocked.
 */
const ArshiaWatermark: React.FC<ArshiaWatermarkProps> = ({ size = 13, style }) => {
  const drift = useRef(new Animated.Value(0)).current;
  const [tapCount, setTapCount] = useState(0);
  const resetTimerRef = useRef<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const { unlock } = useAdmin();
  const navigation: any = useNavigation();

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

  useEffect(() => {
    if (tapCount <= 0) return;

    if (tapCount >= 7) {
      setTapCount(0);
      // open secure prompt
      setModalVisible(true);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current as any);
        resetTimerRef.current = null;
      }
      return;
    }

    // reset tap count after 2s of inactivity
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current as any);
    resetTimerRef.current = (setTimeout(() => {
      setTapCount(0);
      resetTimerRef.current = null;
    }, 2000) as unknown) as number;

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current as any);
        resetTimerRef.current = null;
      }
    };
  }, [tapCount]);

  const animatedStyle = {
    opacity: (drift as any).interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0.55, 0.78, 0.62],
    }),
    transform: [
      {
        translateX: (drift as any).interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0, -4, -1],
        }),
      },
      {
        translateY: (drift as any).interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0, 2, -1],
        }),
      },
    ],
  };

  const onPressLabel = () => setTapCount((c) => c + 1);

  const submitPin = async () => {
    setPinError('');
    try {
      const ok = await Promise.resolve(unlock(pinInput));
      if (ok) {
        setModalVisible(false);
        setPinInput('');
        try {
          navigation.navigate('Admin');
        } catch (e) {}
        return;
      }
      setPinError('Wrong PIN');
    } catch (e) {
      setPinError('Error validating PIN');
    }
  };

  return (
    <>
      <Animated.View style={[styles.badge, animatedStyle, style]}>
        <Pressable onPress={onPressLabel} style={styles.pressable} accessibilityRole="button">
          <View style={styles.mark}>
            <Ionicons name="play" size={size * 0.62} color={AppTheme.colors.white} />
          </View>
          <Text style={[styles.label, { fontSize: size }]}>ARSHIA TV</Text>
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manager access</Text>
            <Text style={styles.modalText}>Enter manager PIN to unlock admin</Text>
            <TextInput
              value={pinInput}
              onChangeText={(v) => {
                setPinInput(v);
                setPinError('');
              }}
              placeholder="PIN"
              placeholderTextColor={AppTheme.colors.textMuted}
              secureTextEntry
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'default'}
              style={styles.modalInput}
              maxLength={32}
            />
            {pinError ? <Text style={styles.modalError}>{pinError}</Text> : null}

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={submitPin}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Unlock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.colors.text,
    marginBottom: 4,
  },
  modalText: {
    color: AppTheme.colors.textMuted,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: AppTheme.colors.text,
    backgroundColor: AppTheme.colors.surface,
  },
  modalError: {
    color: '#E53E3E',
    marginTop: 8,
    marginBottom: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalButtonPrimary: {
    backgroundColor: AppTheme.colors.primary,
  },
  modalButtonText: {
    color: AppTheme.colors.text,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: AppTheme.colors.white,
  },
});

export default ArshiaWatermark;
