import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from './PressableScale';
import ArshiaWatermark from './ArshiaWatermark';

export type AspectMode = 'fit' | 'fill' | 'stretch' | 'original';

type GestureMode = '' | 'seek' | 'brightness' | 'volume';

const COPY = {
  en: {
    brightness: 'Brightness',
    volume: 'Volume',
    settings: 'Settings',
    picture: 'Picture',
    equalizer: 'Picture',
    audio: 'Audio',
    aspect: 'Aspect',
    fit: 'Fit',
    fill: 'Fill',
    stretch: 'Stretch',
    original: 'Original',
    standard: 'Standard',
    vivid: 'Vivid',
    soft: 'Soft',
    cinema: 'Cinema',
    night: 'Night',
    voice: 'Voice',
    bass: 'Bass boost',
    dynamic: 'Dynamic',
    lock: 'Lock',
    unlock: 'Unlock',
    lockedHint: 'Screen locked — tap to unlock',
    fullscreen: 'Fullscreen',
    exit: 'Exit fullscreen',
    pip: 'PiP',
    more: 'More',
    close: 'Close',
    live: 'LIVE',
    mute: 'Mute',
    unmute: 'Unmute',
  },
  fa: {
    brightness: 'روشنایی',
    volume: 'صدا',
    settings: 'تنظیمات',
    picture: 'تصویر',
    equalizer: 'تصویر',
    audio: 'صدا',
    aspect: 'نسبت تصویر',
    fit: 'اندازه اصلی',
    fill: 'پر کردن',
    stretch: 'کشیده',
    original: 'اصلی',
    standard: 'استاندارد',
    vivid: 'روشن',
    soft: 'نرم',
    cinema: 'سینمایی',
    night: 'شب',
    voice: 'گفتار',
    bass: 'بیس قوی',
    dynamic: 'پویا',
    lock: 'قفل',
    unlock: 'باز کردن',
    lockedHint: 'صفحه قفل است — برای باز کردن بزنید',
    fullscreen: 'تمام‌صفحه',
    exit: 'خروج از تمام‌صفحه',
    pip: 'تصویر در تصویر',
    more: 'بیشتر',
    close: 'بستن',
    live: 'زنده',
    mute: 'بی‌صدا',
    unmute: 'صدا',
  },
};

const PICTURE_PROFILES = [
  { key: 'standard', tint: 'transparent', opacity: 0 },
  { key: 'vivid', tint: 'rgba(255, 80, 40, 0.12)', opacity: 1 },
  { key: 'soft', tint: 'rgba(120, 160, 255, 0.10)', opacity: 1 },
  { key: 'cinema', tint: 'rgba(20, 10, 0, 0.22)', opacity: 1 },
  { key: 'night', tint: 'rgba(0, 0, 40, 0.28)', opacity: 1 },
] as const;

const AUDIO_PRESETS = ['standard', 'voice', 'bass', 'dynamic', 'cinema'] as const;

const ASPECTS: AspectMode[] = ['fit', 'fill', 'stretch', 'original'];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

interface SliderProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (v: number) => void;
  color: string;
}

const Slider: React.FC<SliderProps> = ({ icon, value, onChange, color }) => {
  const trackRef = useRef({ width: 1, x: 0 });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX;
          onChange(clamp(x / trackRef.current.width, 0, 1));
        },
        onPanResponderMove: (e) => {
          const x = e.nativeEvent.locationX;
          onChange(clamp(x / trackRef.current.width, 0, 1));
        },
      }),
    [onChange]
  );

  return (
    <View style={styles.sliderRow}>
      <Ionicons name={icon} size={16} color="#FFFFFF" />
      <View
        style={styles.sliderTrack}
        onLayout={(e: LayoutChangeEvent) => {
          trackRef.current.width = e.nativeEvent.layout.width || 1;
        }}
        {...pan.panHandlers}
      >
        <View style={[styles.sliderFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
        <View style={[styles.sliderThumb, { left: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

interface PlayerControlsProps {
  player: any;
  hasSource: boolean;
  isPlaying: boolean;
  isLive?: boolean;
  muted: boolean;
  title?: string;
  accent?: string;
  lang?: 'en' | 'fa';
  aspect?: AspectMode;
  expanded?: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onAspectChange: (mode: AspectMode) => void;
  onRequestPip?: () => void;
  onRetry?: () => void;
}

/**
 * Professional hideable control panel for the video stage.
 *
 * - Tap video → show/hide controls (auto-hide after ~4s)
 * - Bottom bar: Lock (LEFT) · Play · title/live · Mute · Settings · PiP · Fullscreen
 * - Settings tray: brightness, volume, aspect, picture EQ, audio presets
 * - Lock mode: only unlock button responds; background stays the same
 * - Edge gestures: left = brightness, right = volume (when unlocked)
 */
const PlayerControls: React.FC<PlayerControlsProps> = ({
  player,
  hasSource,
  isPlaying,
  isLive = false,
  muted,
  title = '',
  accent = AppTheme.colors.primary,
  lang = 'fa',
  aspect = 'fit',
  expanded = false,
  onTogglePlay,
  onToggleMute,
  onToggleFullscreen,
  onAspectChange,
  onRequestPip,
}) => {
  const copy = COPY[lang] || COPY.fa;
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);
  const [picture, setPicture] = useState<(typeof PICTURE_PROFILES)[number]['key']>('standard');
  const [audioPreset, setAudioPreset] = useState<(typeof AUDIO_PRESETS)[number]>('standard');
  const [hud, setHud] = useState<{ icon: string; text: string } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [tick, setTick] = useState(0);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(locked);
  const brightnessRef = useRef(brightness);
  const volumeRef = useRef(volume);
  const sizeRef = useRef(stageSize);
  const gesture = useRef<{ mode: GestureMode; startY: number; startVal: number }>({
    mode: '',
    startY: 0,
    startVal: 0,
  });

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
    sizeRef.current = stageSize;
  }, [stageSize]);

  const bump = useCallback(() => {
    setTick((t) => t + 1);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!hasSource || locked || panelOpen) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 4200);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [hasSource, locked, panelOpen, tick, isPlaying]);

  useEffect(() => {
    if (!player) return;
    try {
      player.volume = volume;
    } catch {}
  }, [player, volume]);

  const showHud = (icon: string, text: string) => {
    setHud({ icon, text });
    setTimeout(() => setHud(null), 900);
  };

  const lockScreen = () => {
    setLocked(true);
    setPanelOpen(false);
    setVisible(true);
  };

  const unlockScreen = () => {
    setLocked(false);
    bump();
  };

  const cycleAspect = () => {
    const i = ASPECTS.indexOf(aspect);
    const next = ASPECTS[(i + 1) % ASPECTS.length];
    onAspectChange(next);
    const labels: Record<AspectMode, string> = {
      fit: copy.fit,
      fill: copy.fill,
      stretch: copy.stretch,
      original: copy.original,
    };
    showHud('scan-outline', labels[next]);
    bump();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (lockedRef.current) return false;
          return Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx);
        },
        onPanResponderGrant: (e) => {
          if (lockedRef.current) return;
          const x = e.nativeEvent.locationX;
          const w = sizeRef.current.width || 1;
          gesture.current.startY = e.nativeEvent.locationY;
          if (x < w * 0.35) {
            gesture.current.mode = 'brightness';
            gesture.current.startVal = brightnessRef.current;
          } else if (x > w * 0.65) {
            gesture.current.mode = 'volume';
            gesture.current.startVal = volumeRef.current;
          } else {
            gesture.current.mode = '';
          }
        },
        onPanResponderMove: (e) => {
          if (lockedRef.current || !gesture.current.mode) return;
          const h = sizeRef.current.height || 1;
          const delta = (gesture.current.startY - e.nativeEvent.locationY) / (h * 0.55);
          if (gesture.current.mode === 'brightness') {
            const next = clamp(gesture.current.startVal + delta, 0.15, 1);
            setBrightness(next);
            showHud('sunny-outline', `${Math.round(next * 100)}%`);
          } else if (gesture.current.mode === 'volume') {
            const next = clamp(gesture.current.startVal + delta, 0, 1);
            setVolume(next);
            showHud(next < 0.05 ? 'volume-mute' : 'volume-high', `${Math.round(next * 100)}%`);
          }
        },
        onPanResponderRelease: () => {
          gesture.current.mode = '';
          if (!lockedRef.current) bump();
        },
      }),
    [bump]
  );

  const pictureMode = PICTURE_PROFILES.find((p) => p.key === picture) || PICTURE_PROFILES[0];
  const bottomPad = expanded ? Math.max(insets.bottom, 10) : 8;
  const showChrome = visible || locked || panelOpen;

  const aspectLabel =
    aspect === 'fill'
      ? copy.fill
      : aspect === 'stretch'
        ? copy.stretch
        : aspect === 'original'
          ? copy.original
          : copy.fit;

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {/* Picture EQ tint + brightness veil — visual only */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: pictureMode.tint, opacity: pictureMode.opacity }]}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: (1 - brightness) * 0.8 }]}
      />

      {/* Gesture surface */}
      <View
        style={StyleSheet.absoluteFillObject}
        pointerEvents={hasSource && !locked ? 'auto' : 'none'}
        {...(hasSource && !locked ? pan.panHandlers : {})}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          sizeRef.current = { width, height };
          setStageSize({ width, height });
        }}
      />

      {/* Tap to toggle chrome (when unlocked) */}
      {!locked ? (
        <PressableScale
          onPress={() => {
            if (panelOpen) {
              setPanelOpen(false);
              bump();
              return;
            }
            setVisible((v) => !v);
            setTick((t) => t + 1);
          }}
          style={StyleSheet.absoluteFillObject}
          accessibilityLabel="toggle controls"
        >
          <View />
        </PressableScale>
      ) : null}

      {/* LOCKED: only unlock control — background unchanged */}
      {locked ? (
        <View style={styles.lockedLayer} pointerEvents="box-none">
          <PressableScale
            onPress={unlockScreen}
            style={[styles.lockFab, { bottom: bottomPad + 18, left: 14 + (expanded ? insets.left : 0) }]}
            accessibilityLabel={copy.unlock}
          >
            <Ionicons name="lock-closed" size={22} color="#FFFFFF" />
            <Text style={styles.lockFabText}>{copy.unlock}</Text>
          </PressableScale>
          <View style={styles.lockedHint} pointerEvents="none">
            <Text style={styles.lockedHintText}>{copy.lockedHint}</Text>
          </View>
        </View>
      ) : null}

      {/* Watermark in fullscreen */}
      {expanded && showChrome && !locked ? (
        <ArshiaWatermark
          size={16}
          style={[styles.logo, { top: Math.max(10, insets.top + 8), right: Math.max(12, insets.right + 8) }]}
        />
      ) : null}

      {/* HUD feedback */}
      {hud ? (
        <View style={styles.hud} pointerEvents="none">
          <Ionicons name={hud.icon as any} size={18} color="#FFF" />
          <Text style={styles.hudText}>{hud.text}</Text>
        </View>
      ) : null}

      {/* Center play when paused & chrome visible */}
      {showChrome && !locked && !isPlaying && hasSource ? (
        <View style={styles.centerPlay} pointerEvents="box-none">
          <PressableScale onPress={onTogglePlay} style={styles.centerPlayBtn} accessibilityLabel="play">
            <Ionicons name="play" size={28} color="#FFF" />
          </PressableScale>
        </View>
      ) : null}

      {/* Settings tray */}
      {showChrome && panelOpen && !locked ? (
        <View
          style={[
            styles.tray,
            {
              bottom: 56 + bottomPad,
              maxHeight: Math.min(stageSize.height * 0.55, 280),
            },
          ]}
        >
          <Text style={styles.trayTitle}>{copy.settings}</Text>
          <Slider icon="sunny-outline" value={brightness} onChange={setBrightness} color={accent} />
          <Slider icon="volume-high" value={volume} onChange={setVolume} color={accent} />

          <Text style={styles.groupLabel}>{copy.aspect}</Text>
          <View style={styles.chipRow}>
            {ASPECTS.map((key) => {
              const label =
                key === 'fit'
                  ? copy.fit
                  : key === 'fill'
                    ? copy.fill
                    : key === 'stretch'
                      ? copy.stretch
                      : copy.original;
              const active = aspect === key;
              return (
                <PressableScale
                  key={key}
                  onPress={() => {
                    onAspectChange(key);
                    bump();
                  }}
                  style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>{label}</Text>
                </PressableScale>
              );
            })}
          </View>

          <Text style={styles.groupLabel}>{copy.equalizer}</Text>
          <View style={styles.chipRow}>
            {PICTURE_PROFILES.map((p) => {
              const label =
                p.key === 'standard'
                  ? copy.standard
                  : p.key === 'vivid'
                    ? copy.vivid
                    : p.key === 'soft'
                      ? copy.soft
                      : p.key === 'cinema'
                        ? copy.cinema
                        : copy.night;
              const active = picture === p.key;
              return (
                <PressableScale
                  key={p.key}
                  onPress={() => {
                    setPicture(p.key);
                    bump();
                  }}
                  style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>{label}</Text>
                </PressableScale>
              );
            })}
          </View>

          <Text style={styles.groupLabel}>{copy.audio}</Text>
          <View style={styles.chipRow}>
            {AUDIO_PRESETS.map((key) => {
              const label =
                key === 'standard'
                  ? copy.standard
                  : key === 'voice'
                    ? copy.voice
                    : key === 'bass'
                      ? copy.bass
                      : key === 'dynamic'
                        ? copy.dynamic
                        : copy.cinema;
              const active = audioPreset === key;
              return (
                <PressableScale
                  key={key}
                  onPress={() => {
                    setAudioPreset(key);
                    // Soft volume curve hints for presets (real DSP needs native module)
                    if (key === 'bass') setVolume((v) => clamp(v, 0.7, 1));
                    if (key === 'voice') setVolume((v) => clamp(v, 0.55, 0.9));
                    showHud('musical-notes-outline', label);
                    bump();
                  }}
                  style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>{label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Bottom control bar — LOCK on the LEFT */}
      {showChrome && !locked ? (
        <View
          style={[
            styles.bar,
            {
              paddingBottom: bottomPad,
              paddingLeft: 8 + (expanded ? insets.left : 0),
              paddingRight: 8 + (expanded ? insets.right : 0),
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.barInner}>
            {/* LEFT: Lock */}
            <PressableScale onPress={lockScreen} style={styles.iconBtn} accessibilityLabel={copy.lock}>
              <Ionicons name="lock-open-outline" size={20} color="#FFF" />
            </PressableScale>

            <PressableScale onPress={onTogglePlay} style={styles.iconBtn} accessibilityLabel="play/pause">
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#FFF" />
            </PressableScale>

            <View style={styles.meta}>
              {isLive ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{copy.live}</Text>
                </View>
              ) : null}
              <Text style={styles.metaTitle} numberOfLines={1}>
                {title || 'Arshia TV'}
              </Text>
            </View>

            <PressableScale
              onPress={() => {
                onToggleMute();
                bump();
              }}
              style={styles.iconBtn}
              accessibilityLabel={muted ? copy.unmute : copy.mute}
            >
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#FFF" />
            </PressableScale>

            <PressableScale
              onPress={() => {
                setPanelOpen((v) => !v);
                bump();
              }}
              style={[styles.iconBtn, panelOpen && { backgroundColor: accent }]}
              accessibilityLabel={copy.settings}
            >
              <Ionicons name="menu" size={20} color="#FFF" />
            </PressableScale>

            <PressableScale
              onPress={() => {
                onRequestPip?.();
                bump();
              }}
              style={styles.iconBtn}
              accessibilityLabel={copy.pip}
            >
              <Ionicons name="tablet-landscape-outline" size={18} color="#FFF" />
            </PressableScale>

            <PressableScale
              onPress={() => {
                onToggleFullscreen();
                bump();
              }}
              style={styles.iconBtn}
              accessibilityLabel={expanded ? copy.exit : copy.fullscreen}
            >
              <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={20} color="#FFF" />
            </PressableScale>
          </View>

          {/* Quick aspect chip under bar when tray closed */}
          {!panelOpen ? (
            <PressableScale onPress={cycleAspect} style={styles.aspectQuick}>
              <Ionicons name="scan-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.aspectQuickText}>{aspectLabel}</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  logo: {
    position: 'absolute',
  },
  hud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  hudText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  centerPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  lockFab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  lockFabText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  lockedHint: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  lockedHintText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  tray: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: 'rgba(8,10,16,0.92)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
  },
  trayTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  groupLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    marginLeft: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    marginHorizontal: 4,
    minWidth: 0,
  },
  metaTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.primary,
    marginRight: 5,
  },
  liveText: {
    color: AppTheme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aspectQuick: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginBottom: 4,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  aspectQuickText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginLeft: 4,
  },
});

export default PlayerControls;
