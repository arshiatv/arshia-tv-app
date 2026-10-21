// NEW: the shared Arshia TV player layer — one auto-hiding dock, a burger-button
// settings tray, brightness / volume / seek gestures, lock mode, picture and audio
// profiles, aspect cycling, picture-in-picture and the permanent channel watermark.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from './ArshiaWatermark';
import PressableScale from './PressableScale';
import { useTranslation } from '../locales';

export type AspectMode = 'fit' | 'fill' | 'stretch' | 'original';
type PictureProfile = 'standard' | 'bright' | 'movie' | 'dynamic';
type AudioProfile = 'standard' | 'voice' | 'cinema' | 'bass';
type GestureMode = '' | 'seek' | 'brightness' | 'volume';

const COPY = {
  en: {
    live: 'LIVE',
    settings: 'Settings',
    settingsHint: '',
    brightness: 'Brightness',
    volume: 'Volume',
    aspect: 'Aspect',
    change: 'Change',
    equalizer: 'Picture',
    audioPresets: 'Audio',
    fit: 'Fit',
    fill: 'Fill',
    stretch: 'Stretch',
    original: 'Original',
    standard: 'Standard',
    bright: 'Bright',
    movie: 'Movie',
    dynamic: 'Dynamic',
    voice: 'Voice',
    cinema: 'Cinema',
    bass: 'Bass Boost',
    pip: 'Picture in picture',
    lock: 'Lock screen',
    unlock: 'Unlock',
    fullscreen: 'Fullscreen',
    exit: 'Exit fullscreen',
    audio: 'Audio track',
    audioTrack: (index: number) => `Track ${index + 1}`,
    more: 'More controls',
    close: 'Close',
    tenSeconds: '10 seconds',
    liveNoSeek: 'Live stream',
    pipUnavailable: 'Not available',
    audioChanged: 'Audio changed',
    audioUnavailable: 'Single audio track',
    lockedHint: 'Locked',
  },
  fa: {
    live: 'زنده',
    settings: 'تنظیمات',
    settingsHint: '',
    brightness: 'روشنایی',
    volume: 'صدا',
    aspect: 'نسبت تصویر',
    change: 'تغییر',
    equalizer: 'تصویر',
    audioPresets: 'صدا',
    fit: 'اندازه‌ی اصلی',
    fill: 'پر کردن',
    stretch: 'کشیده',
    original: 'ابعاد اصلی',
    standard: 'استاندارد',
    bright: 'روشن',
    movie: 'فیلم',
    dynamic: 'پویا',
    voice: 'گفتار',
    cinema: 'سینمایی',
    bass: 'بیس قوی',
    pip: 'تصویر در تصویر',
    lock: 'قفل صفحه',
    unlock: 'باز کردن',
    fullscreen: 'تمام‌صفحه',
    exit: 'خروج از تمام‌صفحه',
    audio: 'صدای پخش',
    audioTrack: (index: number) => `مسیر ${index + 1}`,
    more: 'دکمه‌های بیشتر',
    close: 'بستن',
    tenSeconds: '۱۰ ثانیه',
    liveNoSeek: 'پخش زنده',
    pipUnavailable: 'در دسترس نیست',
    audioChanged: 'صدا تغییر کرد',
    audioUnavailable: 'یک مسیر صدا',
    lockedHint: 'قفل',
  },
};

const ASPECTS: { key: AspectMode; en: string; fa: string }[] = [
  { key: 'fit', en: COPY.en.fit, fa: COPY.fa.fit },
  { key: 'fill', en: COPY.en.fill, fa: COPY.fa.fill },
  { key: 'stretch', en: COPY.en.stretch, fa: COPY.fa.stretch },
  { key: 'original', en: COPY.en.original, fa: COPY.fa.original },
];

const PROFILES: { key: PictureProfile; tint: string; opacity: number; en: string; fa: string }[] = [
  { key: 'standard', tint: '#000000', opacity: 0, en: COPY.en.standard, fa: COPY.fa.standard },
  { key: 'bright', tint: '#FFFFFF', opacity: 0.07, en: COPY.en.bright, fa: COPY.fa.bright },
  { key: 'movie', tint: '#FF9433', opacity: 0.1, en: COPY.en.movie, fa: COPY.fa.movie },
  { key: 'dynamic', tint: '#2F7BFF', opacity: 0.07, en: COPY.en.dynamic, fa: COPY.fa.dynamic },
];

const AUDIO_PRESETS: { key: AudioProfile; en: string; fa: string }[] = [
  { key: 'standard', en: COPY.en.standard, fa: COPY.fa.standard },
  { key: 'voice', en: COPY.en.voice, fa: COPY.fa.voice },
  { key: 'cinema', en: COPY.en.cinema, fa: COPY.fa.cinema },
  { key: 'bass', en: COPY.en.bass, fa: COPY.fa.bass },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '00:00';
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function readAudioTracks(player: any): any[] {
  try {
    const tracks = player?.availableAudioTracks;
    return Array.isArray(tracks) ? tracks : [];
  } catch (error) {
    return [];
  }
}

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  icon?: string;
  color?: string;
  big?: boolean;
}

/** A small touch-drag slider used by the dock and by the settings tray. */
const Slider: React.FC<SliderProps> = ({ value, onChange, icon, color = AppTheme.colors.primary, big }) => {
  const widthRef = useRef(1);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  function apply(locationX: number) {
    const width = widthRef.current || 1;
    changeRef.current(clamp(locationX / width, 0, 1));
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => apply(event.nativeEvent.locationX),
      onPanResponderMove: (event) => apply(event.nativeEvent.locationX),
    })
  ).current;

  return (
    <View style={styles.sliderRow}>
      {icon ? <Ionicons name={icon as any} size={14} color="#FFFFFF" style={styles.sliderIcon} /> : null}
      <View
        style={[styles.sliderHit, big ? styles.sliderHitBig : null]}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
        }}
        {...responder.panHandlers}
      >
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderFill,
              { width: `${Math.round(value * 100)}%`, backgroundColor: color },
            ]}
          />
        </View>
        <View
          style={[
            styles.sliderThumb,
            { left: `${Math.round(value * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onPress, active }) => (
  <PressableScale
    onPress={onPress}
    style={[styles.action, active ? styles.actionActive : null]}
    accessibilityLabel={label}
  >
    <Ionicons name={icon as any} size={16} color="#FFFFFF" />
    <Text style={styles.actionLabel} numberOfLines={1}>
      {label}
    </Text>
  </PressableScale>
);

interface PlayerControlsProps {
  player: any;
  videoRef?: any;
  title?: string;
  accent?: string;
  isLive?: boolean;
  hasSource?: boolean;
  expanded?: boolean;
  aspect: AspectMode;
  onAspect: (mode: AspectMode) => void;
  onToggleFullscreen: () => void;
}

/**
 * One professional control layer shared by every Arshia TV screen that plays video:
 * live TV, films, series and gallery clips.
 *
 * A single bottom dock holds play, the progress bar / live badge, sound, the burger
 * menu and fullscreen. The burger unfolds the settings tray with brightness, volume,
 * aspect cycling, picture equalizer, audio presets, PiP, lock and audio tracks.
 * Drag vertically on the left for brightness, on the right for volume, and
 * horizontally in the centre to seek — seeking only exists for VOD, never for live.
 * The Arshia TV emblem is drawn permanently inside the frame.
 */
const PlayerControls: React.FC<PlayerControlsProps> = ({
  player,
  videoRef,
  title,
  accent = AppTheme.colors.primary,
  isLive = false,
  hasSource = true,
  expanded = false,
  aspect,
  onAspect,
  onToggleFullscreen,
}) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [picture, setPicture] = useState<PictureProfile>('standard');
  const [audioPreset, setAudioPreset] = useState<AudioProfile>('standard');
  const [audioIndex, setAudioIndex] = useState(0);
  const [hud, setHud] = useState<{ icon: string; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });

  // NEW: whether the overlay may receive touches. The layer itself is always mounted.
  const interactive = hasSource && visible && !locked;

  const visibleRef = useRef(visible);
  const lockedRef = useRef(locked);
  const brightnessRef = useRef(brightness);
  const volumeRef = useRef(volume);
  const playerRef = useRef<any>(player);
  const durationRef = useRef(duration);
  const sizeRef = useRef({ width: 1, height: 1 });
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapAt = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  // NEW: the dock fades instead of unmounting, so its state survives every hide.
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const startRef = useRef({
    x: 0,
    brightness: 1,
    volume: 1,
    time: 0,
    seek: 0,
    mode: '' as GestureMode,
    moved: false,
  });
  const copyRef = useRef(copy);
  copyRef.current = copy;

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  useEffect(() => {
    brightnessRef.current = brightness;
  }, [brightness]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // NEW: the dock and tray fade after four seconds of absolute inactivity, in every
  // orientation. Every touch bumps `tick`, so the countdown always restarts.
  useEffect(() => {
    if (!hasSource || !visible || panelOpen || locked) return;
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [hasSource, visible, panelOpen, locked, tick]);

  // NEW: the overlay is never unmounted — it only fades — so a single tap always
  // brings every control back with its previous state intact.
  useEffect(() => {
    Animated.timing(controlsAnim, {
      toValue: interactive ? 1 : 0,
      duration: interactive ? 150 : 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [controlsAnim, interactive]);

  useEffect(() => {
    if (!player) return;
    const read = () => {
      try {
        if (typeof player.volume === 'number') setVolume(player.volume);
        if (typeof player.muted === 'boolean') setMuted(player.muted);
        setIsPlaying(!!player.playing);
        if (typeof player.currentTime === 'number') setCurrentTime(player.currentTime);
        if (typeof player.duration === 'number' && Number.isFinite(player.duration) && player.duration > 0) {
          setDuration(player.duration);
        }
      } catch (error) {
        // The player is being replaced; the next tick catches up.
      }
    };
    read();
    const timer = setInterval(read, 700);
    return () => clearInterval(timer);
  }, [player]);

  // The settings tray slides up from the dock every time it is opened.
  useEffect(() => {
    if (!panelOpen) return;
    panelAnim.setValue(0);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [panelOpen, panelAnim]);

  useEffect(
    () => () => {
      if (hudTimer.current) clearTimeout(hudTimer.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    []
  );

  const bump = () => {
    setVisible(true);
    setTick((value) => value + 1);
  };

  const showHud = (icon: string, text: string) => {
    setHud({ icon, text });
    if (hudTimer.current) clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(null), 1100);
  };

  const togglePlay = () => {
    try {
      if (player?.playing) player.pause();
      else player?.play();
    } catch (error) {
      // The source is not ready yet.
    }
    bump();
  };

  const applyVolume = (value: number) => {
    const next = clamp(value, 0, 1);
    setVolume(next);
    try {
      if (player) {
        player.volume = next;
        if (next > 0 && player.muted) {
          player.muted = false;
          setMuted(false);
        }
      }
    } catch (error) {
      // Volume is not writable on this runtime.
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      if (player) player.muted = next;
    } catch (error) {
      // Muting is not supported by this stream.
    }
    showHud(next ? 'volume-mute' : 'volume-high', next ? `${copy.volume} · 0%` : `${copy.volume} · ${Math.round(volume * 100)}%`);
    bump();
  };

  const seekTo = (target: number) => {
    const safe = clamp(target, 0, durationRef.current || target);
    try {
      if (player) player.currentTime = safe;
    } catch (error) {
      // Live streams cannot seek.
    }
    setCurrentTime(safe);
  };

  const enterPip = async () => {
    try {
      const result = videoRef?.current?.startPictureInPicture?.();
      if (result && typeof result.then === 'function') await result;
      showHud('browsers-outline', copy.pip);
    } catch (error) {
      showHud('alert-circle-outline', copy.pipUnavailable);
    }
    bump();
  };

  const audioTracks = readAudioTracks(player);

  const chooseAudio = (track: any, index: number) => {
    try {
      if (!player) return;
      player.audioTrack = track;
      setAudioIndex(index);
      showHud('musical-notes-outline', copy.audioChanged);
    } catch (error) {
      showHud('alert-circle-outline', copy.audioUnavailable);
    }
    bump();
  };

  const aspectLabel = (() => {
    const found = ASPECTS.find((item) => item.key === aspect) || ASPECTS[0];
    return lang === 'fa' ? found.fa : found.en;
  })();

  const cycleAspect = () => {
    const index = ASPECTS.findIndex((item) => item.key === aspect);
    const next = ASPECTS[(index + 1) % ASPECTS.length];
    onAspect(next.key);
    showHud('scan-outline', lang === 'fa' ? next.fa : next.en);
    bump();
  };

  const lockScreen = () => {
    setLocked(true);
    setPanelOpen(false);
    setVisible(false);
  };

  const unlockScreen = () => {
    setLocked(false);
    setVisible(true);
    setTick((value) => value + 1);
  };

  const doubleTapSeek = (x: number) => {
    if (isLive) {
      showHud('radio-outline', copy.liveNoSeek);
      return;
    }
    const current = (() => {
      try {
        return player?.currentTime || 0;
      } catch (error) {
        return 0;
      }
    })();
    const limit = durationRef.current || current;
    const direction = x > sizeRef.current.width / 2 ? 1 : -1;
    const target = clamp(current + direction * 10, 0, limit);
    seekTo(target);
    showHud(direction > 0 ? 'play-forward' : 'play-back', `${direction > 0 ? '+' : '−'}${copy.tenSeconds}`);
    bump();
  };

  const handleTap = (x: number) => {
    // NEW: while the screen is locked nothing but the unlock button responds.
    if (lockedRef.current) return;

    const now = Date.now();
    if (now - tapAt.current < 300) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapAt.current = 0;
      doubleTapSeek(x);
      return;
    }
    tapAt.current = now;

    // NEW: a single tap restores a hidden overlay immediately; only hiding waits
    // briefly so a second tap can still be read as a seek gesture.
    if (!visibleRef.current) {
      setVisible(true);
      setTick((value) => value + 1);
      tapTimer.current = setTimeout(() => {
        tapAt.current = 0;
      }, 300);
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapAt.current = 0;
      if (lockedRef.current) return;
      setVisible(false);
      setPanelOpen(false);
    }, 260);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          // NEW: touching the picture resets the four-second idle countdown.
          if (!lockedRef.current) setTick((value) => value + 1);
          startRef.current = {
            x: event.nativeEvent.locationX,
            brightness: brightnessRef.current,
            volume: volumeRef.current,
            time: (() => {
              try {
                return playerRef.current?.currentTime || 0;
              } catch (error) {
                return 0;
              }
            })(),
            seek: 0,
            mode: '',
            moved: false,
          };
        },
        onPanResponderMove: (_, gesture) => {
          if (lockedRef.current) return;
          const start = startRef.current;
          if (!start.moved && Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) return;
          start.moved = true;

          const width = sizeRef.current.width || 1;
          const height = sizeRef.current.height || 1;

          if (Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15) {
            // Horizontal seeking belongs to the centre of the picture, VOD only.
            if (start.x < width * 0.2 || start.x > width * 0.8) return;
            start.mode = 'seek';
            if (isLive || durationRef.current <= 0) {
              showHud('radio-outline', copyRef.current.liveNoSeek);
              return;
            }
            const delta = (gesture.dx / width) * Math.min(durationRef.current, 240);
            const target = clamp(start.time + delta, 0, durationRef.current);
            start.seek = target;
            setCurrentTime(target);
            showHud(gesture.dx >= 0 ? 'play-forward' : 'play-back', formatTime(target));
            return;
          }

          const delta = -gesture.dy / Math.max(1, height);
          if (start.x < width / 2) {
            start.mode = 'brightness';
            const next = clamp(start.brightness + delta, 0.15, 1);
            setBrightness(next);
            showHud('sunny-outline', `${Math.round(next * 100)}%`);
          } else {
            start.mode = 'volume';
            const next = clamp(start.volume + delta, 0, 1);
            applyVolume(next);
            showHud(next === 0 ? 'volume-mute' : 'volume-high', `${Math.round(next * 100)}%`);
          }
        },
        onPanResponderRelease: () => {
          const start = startRef.current;
          if (start.mode === 'seek' && start.seek > 0 && !isLive) {
            seekTo(start.seek);
            bump();
          } else if (!start.moved) {
            handleTap(start.x);
          }
          start.mode = '';
          start.moved = false;
        },
      }),
    // The responder reads live values through refs, so it is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const pictureMode = PROFILES.find((item) => item.key === picture) || PROFILES[0];
  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const bottomInset = expanded ? insets.bottom + 6 : 4;
  const panelMaxHeight = Math.max(140, Math.min(stageSize.height * 0.72, expanded ? 380 : 220));
  const landscape = stageSize.width > stageSize.height;
  const logoSize = landscape ? (expanded ? 17 : 15) : expanded ? 16 : 14;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: pictureMode.tint, opacity: pictureMode.opacity },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: '#000000', opacity: (1 - brightness) * 0.82 },
        ]}
        pointerEvents="none"
      />

      <View
        style={StyleSheet.absoluteFillObject}
        pointerEvents={hasSource ? 'auto' : 'none'}
        {...(hasSource ? pan.panHandlers : {})}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          sizeRef.current = { width, height };
          setStageSize({ width, height });
        }}
      />

      {expanded && visible && !locked ? (
        <View
          style={[styles.topRow, { paddingTop: insets.top + 6 }]}
          pointerEvents="box-none"
        >
          <PressableScale
            onPress={() => {
              onToggleFullscreen();
              bump();
            }}
            style={styles.roundButton}
            accessibilityLabel={copy.exit}
          >
            <Ionicons name="chevron-down" size={19} color="#FFFFFF" />
          </PressableScale>
          <View style={styles.topMeta}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {title || 'Arshia TV'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Permanent, touch-free broadcast mark pinned to the frame's top corner. */}
      <ArshiaWatermark
        size={logoSize}
        style={[
          styles.logo,
          {
            top: expanded ? Math.max(8, insets.top + 6) : 8,
            right: Math.max(10, insets.right + 10),
          },
        ]}
      />

      {hud ? (
        <View style={styles.hud} pointerEvents="none">
          <Ionicons name={hud.icon as any} size={18} color="#FFFFFF" />
          <Text style={styles.hudText}>{hud.text}</Text>
        </View>
      ) : null}

      {locked ? (
        <PressableScale
          onPress={unlockScreen}
          style={[
            styles.lockedButton,
            { bottom: (expanded ? insets.bottom : 0) + 10 },
          ]}
          accessibilityLabel={copy.unlock}
        >
          <Ionicons name="lock-closed" size={17} color="#FFFFFF" />
        </PressableScale>
      ) : null}

      <Animated.View
        style={[
          styles.bottomWrap,
          {
            paddingBottom: bottomInset,
            opacity: controlsAnim,
            transform: [
              {
                translateY: controlsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents={interactive ? 'box-none' : 'none'}
      >
          {panelOpen ? (
            <Animated.View
              style={[
                styles.panel,
                {
                  maxHeight: panelMaxHeight,
                  opacity: panelAnim,
                  transform: [
                    {
                      translateY: panelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.panelContent}
                nestedScrollEnabled
              >
                <View style={styles.panelHead}>
                  <View style={styles.panelHeadText}>
                    <Text style={styles.panelTitle}>{copy.settings}</Text>
                    {copy.settingsHint ? (
                      <Text style={styles.panelHint}>{copy.settingsHint}</Text>
                    ) : null}
                  </View>
                  <PressableScale
                    onPress={() => {
                      setPanelOpen(false);
                      bump();
                    }}
                    style={styles.panelClose}
                    accessibilityLabel={copy.close}
                  >
                    <Ionicons name="close" size={15} color="#FFFFFF" />
                  </PressableScale>
                </View>

                <Slider icon="sunny-outline" value={brightness} onChange={setBrightness} color={accent} />
                <Slider
                  icon={muted || volume === 0 ? 'volume-mute' : 'volume-high'}
                  value={volume}
                  onChange={applyVolume}
                  color={accent}
                />

                <Text style={styles.groupLabel}>{copy.aspect}</Text>
                <PressableScale onPress={cycleAspect} style={styles.aspectRow} accessibilityLabel={copy.aspect}>
                  <View style={styles.aspectLeft}>
                    <Ionicons name="scan-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.aspectName}>{aspectLabel}</Text>
                  </View>
                  <View style={styles.aspectCycle}>
                    <Text style={styles.aspectCycleText}>{copy.change}</Text>
                    <Ionicons name="sync-outline" size={12} color={accent} />
                  </View>
                </PressableScale>

                <Text style={styles.groupLabel}>{copy.equalizer}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {PROFILES.map((item) => {
                    const active = picture === item.key;
                    return (
                      <PressableScale
                        key={item.key}
                        onPress={() => {
                          setPicture(item.key);
                          showHud('color-palette-outline', lang === 'fa' ? item.fa : item.en);
                          bump();
                        }}
                        style={[styles.chip, active ? { backgroundColor: accent, borderColor: accent } : null]}
                        accessibilityLabel={lang === 'fa' ? item.fa : item.en}
                      >
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                          {lang === 'fa' ? item.fa : item.en}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>

                <Text style={styles.groupLabel}>{copy.audioPresets}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {AUDIO_PRESETS.map((item) => {
                    const active = audioPreset === item.key;
                    const label = lang === 'fa' ? item.fa : item.en;
                    return (
                      <PressableScale
                        key={item.key}
                        onPress={() => {
                          setAudioPreset(item.key);
                          showHud('musical-notes-outline', label);
                          bump();
                        }}
                        style={[styles.chip, active ? { backgroundColor: accent, borderColor: accent } : null]}
                        accessibilityLabel={label}
                      >
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                          {label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </ScrollView>

                <Text style={styles.groupLabel}>{copy.more}</Text>
                <View style={styles.actionRow}>
                  <ActionButton icon="browsers-outline" label={copy.pip} onPress={enterPip} />
                  <ActionButton icon="lock-closed-outline" label={copy.lock} onPress={lockScreen} />
                  <ActionButton
                    icon={expanded ? 'contract-outline' : 'expand-outline'}
                    label={expanded ? copy.exit : copy.fullscreen}
                    onPress={() => {
                      onToggleFullscreen();
                      bump();
                    }}
                  />
                </View>

                {audioTracks.length > 1 ? (
                  <>
                    <Text style={styles.groupLabel}>{copy.audio}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {audioTracks.map((track: any, index: number) => {
                        const active = audioIndex === index;
                        const label =
                          track?.language || track?.label || track?.name || copy.audioTrack(index);
                        return (
                          <PressableScale
                            key={`audio-${index}`}
                            onPress={() => chooseAudio(track, index)}
                            style={[styles.chip, active ? { backgroundColor: accent, borderColor: accent } : null]}
                            accessibilityLabel={String(label)}
                          >
                            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                              {String(label)}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}
              </ScrollView>
            </Animated.View>
          ) : null}

          <View style={styles.dock}>
            <PressableScale
              onPress={togglePlay}
              style={styles.dockButton}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#FFFFFF" />
            </PressableScale>

            <View style={styles.dockCenter}>
              {isLive ? (
                <View style={styles.liveRow}>
                  <View style={[styles.liveDot, { backgroundColor: accent }]} />
                  <Text style={styles.liveLabel}>{copy.live}</Text>
                  <Text style={styles.liveTitle} numberOfLines={1}>
                    {title || 'Arshia TV'}
                  </Text>
                </View>
              ) : (
                <>
                  <Slider
                    value={progress}
                    onChange={(value) => seekTo(value * duration)}
                    color={accent}
                    big
                  />
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>
                </>
              )}
            </View>

            <PressableScale
              onPress={toggleMute}
              style={styles.dockButton}
              accessibilityLabel={muted ? copy.volume : copy.volume}
            >
              <Ionicons
                name={muted || volume === 0 ? 'volume-mute' : 'volume-high'}
                size={18}
                color="#FFFFFF"
              />
            </PressableScale>

            <PressableScale
              onPress={() => {
                setPanelOpen((value) => !value);
                bump();
              }}
              style={[styles.dockButton, panelOpen ? { backgroundColor: accent } : null]}
              accessibilityLabel={copy.more}
            >
              <Ionicons name="menu" size={20} color="#FFFFFF" />
            </PressableScale>

            <PressableScale
              onPress={() => {
                onToggleFullscreen();
                bump();
              }}
              style={styles.dockButton}
              accessibilityLabel={expanded ? copy.exit : copy.fullscreen}
            >
              <Ionicons
                name={expanded ? 'contract-outline' : 'expand-outline'}
                size={18}
                color="#FFFFFF"
              />
            </PressableScale>
          </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  logo: {
    position: 'absolute',
    zIndex: 20,
  },
  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.sm,
    paddingBottom: AppTheme.spacing.sm,
    paddingRight: 76,
    backgroundColor: 'rgba(4,7,13,0.38)',
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,9,16,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  topMeta: {
    flex: 1,
    marginLeft: AppTheme.spacing.sm,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  hud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.md,
    height: 40,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: 'rgba(4,7,13,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  hudText: {
    color: '#FFFFFF',
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 8,
  },
  lockedButton: {
    position: 'absolute',
    left: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,9,16,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  bottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(8,11,18,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  dockButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  dockCenter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -3,
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: AppTheme.typography.fontWeight.medium,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  liveLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    marginRight: 8,
  },
  liveTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: AppTheme.typography.fontWeight.medium,
  },
  panel: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(10,14,23,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  panelContent: {
    padding: AppTheme.spacing.sm,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  panelHeadText: {
    flex: 1,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  panelHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    marginTop: 1,
  },
  panelClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  sliderIcon: {
    width: 22,
    textAlign: 'center',
  },
  sliderHit: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
  },
  sliderHitBig: {
    height: 22,
  },
  sliderTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sliderFill: {
    height: 3,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: 4,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginTop: AppTheme.spacing.sm,
    marginBottom: 5,
  },
  aspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 10,
    borderRadius: AppTheme.borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  aspectLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aspectName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 8,
  },
  aspectCycle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aspectCycleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginRight: 4,
  },
  chip: {
    height: 25,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  action: {
    flexGrow: 1,
    flexBasis: '30%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    marginBottom: 5,
    paddingHorizontal: 4,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actionActive: {
    backgroundColor: 'rgba(230,57,70,0.32)',
    borderColor: AppTheme.colors.primary,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    marginTop: 3,
  },
});

export default PlayerControls;
