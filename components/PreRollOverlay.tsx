import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from './PressableScale';
import type { PreRollSettings } from '../context/AdminContext';

interface Props {
  settings: PreRollSettings;
  onDone: () => void;
  onCta?: () => void;
}

/**
 * Short, elegant pre-roll shown before live/channel playback.
 * Purely UI-based (no external video file required) so it always works offline.
 */
export default function PreRollOverlay({ settings, onDone, onCta }: Props) {
  const total = Math.max(3, settings.durationSeconds || settings.durationSec || 5);
  const [left, setLeft] = useState(total);
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const hasVideo = !!(settings.sourceUrl && /^https?:\/\//i.test(settings.sourceUrl));

  const adPlayer = useVideoPlayer(hasVideo ? settings.sourceUrl! : null, (p) => {
    p.loop = false;
    p.muted = false;
    if (hasVideo) p.play();
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    setLeft(total);

    Animated.timing(progress, {
      toValue: 1,
      duration: total * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const tick = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    const end = setTimeout(() => {
      onDone();
    }, total * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [total, onDone, fade, scale, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      <View style={styles.bgGlow} />
      {hasVideo ? (
        <View style={styles.videoWrap}>
          <VideoView
            player={adPlayer}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
          <View style={styles.videoFooter}>
            <Text style={styles.timer}>{left > 0 ? `${left} ثانیه` : 'شروع پخش'}</Text>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, { width }]} />
            </View>
          </View>
        </View>
      ) : (
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
          <Text style={styles.brand}>{settings.title || 'آرشیا تی‌وی'}</Text>
          <View style={styles.divider} />
          <Text style={styles.line1}>{settings.line1}</Text>
          <Text style={styles.line2}>{settings.line2}</Text>

          {onCta ? (
            <PressableScale style={styles.cta} onPress={onCta}>
              <Text style={styles.ctaText}>{settings.cta || 'درخواست تبلیغات'}</Text>
            </PressableScale>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.timer}>{left > 0 ? `${left} ثانیه` : 'شروع پخش'}</Text>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, { width }]} />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const { width: W } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05080F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  videoWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '80%',
  },
  videoFooter: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
  },
  bgGlow: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W,
    backgroundColor: AppTheme.colors.primary,
    opacity: 0.08,
  },
  card: {
    width: Math.min(W - 40, 420),
    backgroundColor: 'rgba(21, 29, 46, 0.96)',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.35)',
  },
  brand: {
    color: AppTheme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14,
  },
  line1: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  line2: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  cta: {
    marginTop: 18,
    alignSelf: 'center',
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    marginTop: 22,
  },
  timer: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: AppTheme.colors.primary,
  },
});
