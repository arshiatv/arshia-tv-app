import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from './PressableScale';
import ArshiaWatermark from './ArshiaWatermark';

/** Optional system brightness (added in package.json). Falls back to overlay. */
let BrightnessAPI: null | {
  getBrightnessAsync?: () => Promise<number>;
  setBrightnessAsync?: (v: number) => Promise<void>;
  getSystemBrightnessAsync?: () => Promise<number>;
  setSystemBrightnessAsync?: (v: number) => Promise<void>;
} = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BrightnessAPI = require('expo-brightness');
} catch {
  BrightnessAPI = null;
}

export type AspectMode = 'fit' | 'fill' | 'stretch' | 'original';

type GestureMode = '' | 'brightness' | 'volume';

const COPY = {
  en: {
    brightness: 'Brightness',
    volume: 'Volume',
    settings: 'Settings',
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
    lockedHint: 'Screen locked — tap unlock',
    fullscreen: 'Fullscreen',
    exit: 'Exit fullscreen',
    pip: 'PiP',
    live: 'LIVE',
    mute: 'Mute',
    unmute: 'Unmute',
  },
  fa: {
    brightness: 'روشنایی',
    volume: 'صدا',
    settings: 'تنظیمات',
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
    live: 'زنده',
    mute: 'بی‌صدا',
    unmute: 'صدا',
  },
};

const PICTURE_PROFILES = [
  { key: 'standard', tint: 'transparent', opacity: 0, tint2: 'transparent', opacity2: 0 },
  { key: 'vivid', tint: 'rgba(255, 70, 20, 0.18)', opacity: 1, tint2: 'rgba(255, 220, 0, 0.06)', opacity2: 1 },
  { key: 'soft', tint: 'rgba(120, 170, 255, 0.16)', opacity: 1, tint2: 'rgba(255, 255, 255, 0.05)', opacity2: 1 },
  { key: 'cinema', tint: 'rgba(30, 10, 0, 0.34)', opacity: 1, tint2: 'rgba(80, 40, 0, 0.10)', opacity2: 1 },
  { key: 'night', tint: 'rgba(0, 0, 50, 0.40)', opacity: 1, tint2: 'rgba(0, 20, 60, 0.12)', opacity2: 1 },
] as const;

/**
 * Audio presets — real player.volume + playbackRate (expo-video supports both).
 * True multi-band EQ needs a native DSP module; this is the strongest control available in Expo.
 */
const AUDIO_PRESETS = [
  { key: 'standard', volume: 1.0, rate: 1.0 },
  { key: 'voice', volume: 0.92, rate: 1.0 },
  { key: 'bass', volume: 1.0, rate: 0.97 },
  { key: 'dynamic', volume: 1.0, rate: 1.03 },
  { key: 'cinema', volume: 0.85, rate: 1.0 },
] as const;

const ASPECTS: AspectMode[] = ['fit', 'fill', 'stretch', 'original'];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function applyVolume(player: any, value: number) {
  if (!player) return;
  const v = clamp(value, 0, 1);
  try {
    player.volume = v;
  } catch {}
  try {
    if (typeof player.setVolume === 'function') player.setVolume(v);
  } catch {}
}

function applyMute(player: any, muted: boolean) {
  if (!player) return;
  try {
    player.muted = muted;
  } catch {}
  try {
    if (typeof player.setMuted === 'function') player.setMuted(muted);
  } catch {}
}

function applyPlaybackRate(player: any, rate: number) {
  if (!player) return;
  const r = clamp(rate, 0.5, 2.0);
  try {
    player.playbackRate = r;
  } catch {}
  try {
    if (typeof player.setPlaybackRate === 'function') player.setPlaybackRate(r);
  } catch {}
}

async function applySystemBrightness(value: number) {
  const v = clamp(value, 0.05, 1);
  if (!BrightnessAPI) return false;
  try {
    if (typeof BrightnessAPI.setBrightnessAsync === 'function') {
      await BrightnessAPI.setBrightnessAsync(v);
      return true;
    }
  } catch {}
  try {
    if (typeof BrightnessAPI.setSystemBrightnessAsync === 'function') {
      await BrightnessAPI.setSystemBrightnessAsync(v);
      return true;
    }
  } catch {}
  return false;
}

interface SliderProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  onChange: (v: number) => void;
  color: string;
}

const Slider: React.FC<SliderProps> = ({ icon, value, onChange, color }) => {
  const trackRef = useRef({ width: 1 });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          onChange(clamp(e.nativeEvent.locationX / trackRef.current.width, 0, 1));
        },
        onPanResponderMove: (e) => {
          onChange(clamp(e.nativeEvent.locationX / trackRef.current.width, 0, 1));
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
        <View
          style={[
            styles.sliderFill,
            { width: `${Math.round(value * 100)}%`, backgroundColor: color },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            { left: `${Math.round(value * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.sliderPct}>{Math.round(value * 100)}</Text>
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
  const [picture, setPicture] =
    useState<(typeof PICTURE_PROFILES)[number]['key']>('standard');
  const [audioPreset, setAudioPreset] =
    useState<(typeof AUDIO_PRESETS)[number]['key']>('standard');
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

  // Real system brightness when expo-brightness is installed; overlay always as visual backup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await applySystemBrightness(brightness);
      if (cancelled) return;
      // ok=false → overlay-only path still active in render
      void ok;
    })();
    return () => {
      cancelled = true;
    };
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
    if (muted) {
      applyMute(player, true);
      return;
    }
    applyMute(player, false);
    applyVolume(player, volume);
  }, [player, volume, muted]);

  useEffect(() => {
    if (!player) return;
    applyVolume(player, volumeRef.current);
    applyMute(player, muted);
  }, [player]);

  const showHud = (icon: string, text: string) => {
    setHud({ icon, text });
    setTimeout(() => setHud(null), 900);
  };

  const setVolumeLive = useCallback(
    (v: number) => {
      const next = clamp(v, 0, 1);
      setVolume(next);
      if (player && !muted) applyVolume(player, next);
    },
    [player, muted]
  );

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
          return Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx);
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
            setVolumeLive(next);
            showHud(
              next < 0.05 ? 'volume-mute' : 'volume-high',
              `${Math.round(next * 100)}%`
            );
          }
        },
        onPanResponderRelease: () => {
          gesture.current.mode = '';
          if (!lockedRef.current) bump();
        },
      }),
    [bump, setVolumeLive]
  );

  const pictureMode =
    PICTURE_PROFILES.find((p) => p.key === picture) || PICTURE_PROFILES[0];
  const bottomPad = expanded ? Math.max(insets.bottom, 12) : 8;
  const showChrome = visible || locked || panelOpen;

  const aspectLabel =
    aspect === 'fill'
      ? copy.fill
      : aspect === 'stretch'
        ? copy.stretch
        : aspect === 'original'
          ? copy.original
          : copy.fit;

  const onTapSurface = () => {
    if (locked) return;
    if (panelOpen) {
      setPanelOpen(false);
      bump();
      return;
    }
    setVisible((v) => !v);
    setTick((t) => t + 1);
  };

  const applyAudioPreset = (key: (typeof AUDIO_PRESETS)[number]['key']) => {
    const preset = AUDIO_PRESETS.find((p) => p.key === key) || AUDIO_PRESETS[0];
    setAudioPreset(key);
    setVolumeLive(preset.volume);
    applyPlaybackRate(player, preset.rate);
    const labels: Record<string, string> = {
      standard: copy.standard,
      voice: copy.voice,
      bass: copy.bass,
      dynamic: copy.dynamic,
      cinema: copy.cinema,
    };
    showHud('musical-notes-outline', labels[key] || key);
    bump();
  };

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {/* Dual color-grade overlays for picture profiles */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: pictureMode.tint, opacity: pictureMode.opacity },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: (pictureMode as any).tint2 || 'transparent',
            opacity: (pictureMode as any).opacity2 || 0,
          },
        ]}
      />
      {/* Overlay dim always available; system brightness applied in effect when module exists */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: '#000', opacity: (1 - brightness) * 0.82 },
        ]}
      />

      <View
        style={StyleSheet.absoluteFillObject}
        pointerEvents={hasSource && !locked ? 'auto' : 'none'}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          sizeRef.current = { width, height };
          setStageSize({ width, height });
        }}
        {...(hasSource && !locked ? pan.panHandlers : {})}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onTapSurface} />
      </View>

      {locked ? (
        <View style={styles.lockedLayer} pointerEvents="box-none">
          <PressableScale
            onPress={unlockScreen}
            style={[
              styles.lockFab,
              {
                bottom: bottomPad + 18,
                left: 14 + (expanded ? insets.left : 0),
              },
            ]}
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

      {expanded && showChrome && !locked ? (
        <ArshiaWatermark
          size={16}
          style={[
            styles.logo,
            {
              top: Math.max(10, insets.top + 8),
              right: Math.max(12, insets.right + 8),
            },
          ]}
        />
      ) : null}

      {hud ? (
        <View style={styles.hud} pointerEvents="none">
          <Ionicons name={hud.icon as any} size={18} color="#FFF" />
          <Text style={styles.hudText}>{hud.text}</Text>
        </View>
      ) : null}

      {showChrome && !locked && !isPlaying && hasSource ? (
        <View style={styles.centerPlay} pointerEvents="box-none">
          <PressableScale
            onPress={onTogglePlay}
            style={styles.centerPlayBtn}
            accessibilityLabel="play"
          >
            <Ionicons name="play" size={28} color="#FFF" />
          </PressableScale>
        </View>
      ) : null}

      {showChrome && panelOpen && !locked ? (
        <View
          style={[
            styles.tray,
            {
              bottom: 58 + bottomPad,
              maxHeight: Math.min(Math.max(stageSize.height * 0.52, 220), 320),
              left: expanded ? Math.max(12, insets.left) : 10,
              right: expanded ? Math.max(12, insets.right) : 10,
            },
          ]}
        >
          <Text style={styles.trayTitle}>{copy.settings}</Text>

          <Text style={styles.groupLabel}>{copy.brightness}</Text>
          <Slider
            icon="sunny-outline"
            value={brightness}
            onChange={(v) => {
              setBrightness(v);
              bump();
            }}
            color={accent}
          />

          <Text style={styles.groupLabel}>{copy.volume}</Text>
          <Slider
            icon="volume-high"
            value={volume}
            onChange={(v) => {
              setVolumeLive(v);
              bump();
            }}
            color={accent}
          />

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
                  style={[
                    styles.chip,
                    active && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>
                    {label}
                  </Text>
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
                  style={[
                    styles.chip,
                    active && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <Text style={styles.groupLabel}>{copy.audio}</Text>
          <View style={styles.chipRow}>
            {AUDIO_PRESETS.map((p) => {
              const label =
                p.key === 'standard'
                  ? copy.standard
                  : p.key === 'voice'
                    ? copy.voice
                    : p.key === 'bass'
                      ? copy.bass
                      : p.key === 'dynamic'
                        ? copy.dynamic
                        : copy.cinema;
              const active = audioPreset === p.key;
              return (
                <PressableScale
                  key={p.key}
                  onPress={() => applyAudioPreset(p.key)}
                  style={[
                    styles.chip,
                    active && { backgroundColor: accent, borderColor: accent },
                  ]}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ) : null}

      {showChrome && !locked ? (
        <View
          style={[
            styles.bar,
            {
              paddingBottom: bottomPad,
              paddingLeft: expanded ? Math.max(6, insets.left) : 4,
              paddingRight: expanded ? Math.max(6, insets.right) : 4,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.barInner}>
            <PressableScale
              onPress={lockScreen}
              style={styles.iconBtn}
              accessibilityLabel={copy.lock}
            >
              <Ionicons name="lock-open-outline" size={20} color="#FFF" />
            </PressableScale>

            <PressableScale
              onPress={onTogglePlay}
              style={styles.iconBtn}
              accessibilityLabel="play-pause"
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color="#FFF"
              />
            </PressableScale>

            <View style={styles.meta} pointerEvents="none">
              {isLive ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{copy.live}</Text>
                </View>
              ) : null}
              <Text style={styles.metaTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <PressableScale
              onPress={cycleAspect}
              style={styles.iconBtn}
              accessibilityLabel={copy.aspect}
            >
              <Ionicons name="scan-outline" size={20} color="#FFF" />
            </PressableScale>

            <PressableScale
              onPress={onToggleMute}
              style={styles.iconBtn}
              accessibilityLabel={muted ? copy.unmute : copy.mute}
            >
              <Ionicons
                name={muted ? 'volume-mute' : 'volume-high'}
                size={20}
                color="#FFF"
              />
            </PressableScale>

            <PressableScale
              onPress={() => {
                setPanelOpen((v) => !v);
                bump();
              }}
              style={styles.iconBtn}
              accessibilityLabel={copy.settings}
            >
              <Ionicons name="options-outline" size={20} color="#FFF" />
            </PressableScale>

            {onRequestPip ? (
              <PressableScale
                onPress={onRequestPip}
                style={styles.iconBtn}
                accessibilityLabel={copy.pip}
              >
                <Ionicons
                  name="tablet-landscape-outline"
                  size={20}
                  color="#FFF"
                />
              </PressableScale>
            ) : null}

            <PressableScale
              onPress={() => {
                onToggleFullscreen();
                bump();
              }}
              style={styles.iconBtn}
              accessibilityLabel={expanded ? copy.exit : copy.fullscreen}
            >
              <Ionicons
                name={expanded ? 'contract-outline' : 'expand-outline'}
                size={20}
                color="#FFF"
              />
            </PressableScale>
          </View>

          <PressableScale onPress={cycleAspect} style={styles.aspectQuick}>
            <Ionicons
              name="resize-outline"
              size={12}
              color="rgba(255,255,255,0.85)"
            />
            <Text style={styles.aspectQuickText}>{aspectLabel}</Text>
          </PressableScale>
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
  lockedLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  lockFab: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  lockFabText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  lockedHint: {
    position: 'absolute',
    top: '42%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  lockedHintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  logo: {
    position: 'absolute',
  },
  hud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  hudText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tray: {
    position: 'absolute',
    borderRadius: 14,
    backgroundColor: 'rgba(12,14,22,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    zIndex: 25,
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
    marginTop: 6,
    marginBottom: 4,
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
    marginBottom: 6,
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
  sliderPct: {
    width: 32,
    textAlign: 'right',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.64)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    zIndex: 25,
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
