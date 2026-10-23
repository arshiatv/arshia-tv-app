import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import PressableScale from '../components/PressableScale';
import PlayerControls, { AspectMode } from '../components/PlayerControls';
import { useTranslation } from '../locales';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import PreRollOverlay from '../components/PreRollOverlay';
import { registerPlaySuccess } from '../services/contentIngest';
import { submitReport } from '../services/reports';

type PlaybackStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

interface PlayerParams {
  title?: string;
  subtitle?: string;
  url?: string;
  accent?: string;
  isLive?: boolean;
  hint?: string;
}

const COPY = {
  en: {
    live: 'LIVE',
    connecting: 'Connecting…',
    failed: 'Playback failed',
    missing: 'No stream',
    defaultHint: 'Direct stream link required (.m3u8 or .mp4)',
    retry: 'Retry',
    muted: 'Mute',
    sound: 'Sound',
    fit: 'Fit',
    fill: 'Fill',
    playing: 'Playing',
    buffering: 'Buffering',
    liveChannel: 'Live',
    movie: 'Movie',
    free: 'Free',
    share: 'Share',
    shareMsg: (t: string) => `${t} — Arshia TV`,
    pip: 'Picture in picture',
  },
  fa: {
    live: 'زنده',
    connecting: 'در حال اتصال…',
    failed: 'پخش نشد',
    missing: 'بدون منبع پخش',
    defaultHint: 'لینک مستقیم پخش لازم است (m3u8 یا mp4)',
    retry: 'تلاش دوباره',
    muted: 'بی‌صدا',
    sound: 'صدا',
    fit: 'اندازه اصلی',
    fill: 'تمام‌صفحه',
    playing: 'در حال پخش',
    buffering: 'بارگذاری',
    liveChannel: 'زنده',
    movie: 'فیلم',
    free: 'رایگان',
    share: 'اشتراک',
    shareMsg: (t: string) => `${t} — آرشیا تی‌وی`,
    pip: 'تصویر در تصویر',
  },
};

/**
 * Player for live channels and films.
 * Fullscreen fills the entire window (no leftover aspectRatio).
 * Controls overlay always sits above the video and respond to every tap.
 */
const PlayerPage: React.FC<any> = ({ route, navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

  const params: PlayerParams = route?.params || {};
  const title = params.title || 'Arshia TV';
  const subtitle = params.subtitle || '';
  const url = params.url || '';
  const accent = params.accent || AppTheme.colors.primary;
  const isLive = !!params.isLive;
  const hint = params.hint || '';

  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<PlaybackStatus>(url ? 'loading' : 'idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [aspect, setAspect] = useState<AspectMode>('fit');
  const [fullscreen, setFullscreen] = useState(false);
  const [win, setWin] = useState(() => Dimensions.get('window'));
  const videoRef = useRef<any>(null);

  const contentFit = useMemo(() => {
    if (aspect === 'fill') return 'cover' as const;
    if (aspect === 'stretch') return 'fill' as const;
    return 'contain' as const;
  }, [aspect]);

  const { preRoll } = useAdmin();
  const { user, isLoggedIn } = useAuth();
  const shouldShowAd = (() => {
    if (!preRoll?.enabled) return false;
    const h = new Date().getHours();
    const h1 = preRoll.hourStart ?? 0;
    const h2 = preRoll.hourEnd ?? 23;
    if (h1 <= h2) {
      if (h < h1 || h > h2) return false;
    } else if (h < h1 && h > h2) {
      return false;
    }
    const every = Math.max(1, preRoll.everyMinutes || 60);
    try {
      const last = Number((globalThis as any).__arshiaLastPreroll || 0);
      if (Date.now() - last < every * 60 * 1000) return false;
      (globalThis as any).__arshiaLastPreroll = Date.now();
    } catch {}
    return true;
  })();
  const [showPreRoll, setShowPreRoll] = useState(shouldShowAd);
  const [reportBusy, setReportBusy] = useState(false);

  // Bind source immediately after pre-roll; start playback in the same tick.
  const player = useVideoPlayer(url && !showPreRoll ? url : null, (instance) => {
    try {
      instance.loop = false;
      instance.muted = false;
      instance.volume = 1;
      if (url) instance.play();
    } catch {}
  });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWin(window);
    });
    return () => {
      try {
        sub?.remove?.();
      } catch {}
    };
  }, []);

  // When pre-roll ends, force play as soon as the player has a source.
  useEffect(() => {
    if (showPreRoll || !player || !url) return;
    setStatus('loading');
    try {
      player.play();
    } catch {}
  }, [showPreRoll, player, url]);

  useEffect(() => {
    if (!player || !url) return;
    const statusSub = player.addListener('statusChange', (payload: any) => {
      const next = payload?.status;
      if (next === 'error') {
        setStatus('error');
        // One fast auto-retry on first error (common for flaky HLS)
        try {
          if (!(player as any).__altTried) {
            (player as any).__altTried = true;
            setTimeout(() => {
              try {
                player.replace(url);
                player.play();
                setStatus('loading');
              } catch {}
            }, 400);
          }
        } catch {}
        return;
      }
      if (next === 'loading' || next === 'idle') setStatus('loading');
      if (next === 'readyToPlay') {
        setStatus('readyToPlay');
        try {
          player.play();
        } catch {}
        try {
          registerPlaySuccess?.({ title, url, isLive });
        } catch {}
      }
    });
    const playingSub = player.addListener('playingChange', (payload: any) => {
      setIsPlaying(!!payload?.isPlaying);
    });
    return () => {
      try {
        statusSub?.remove?.();
        playingSub?.remove?.();
      } catch {}
    };
  }, [player, url, title, isLive]);

  useEffect(() => {
    if (fullscreen) {
      StatusBar.setHidden(true, 'fade');
    } else {
      StatusBar.setHidden(false, 'fade');
    }
    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [fullscreen]);

  const togglePlay = () => {
    if (!player || !url) return;
    try {
      if (isPlaying) player.pause();
      else player.play();
    } catch {}
  };

  const toggleMute = () => {
    if (!player) return;
    const next = !muted;
    try {
      player.muted = next;
    } catch {}
    setMuted(next);
  };

  const retry = () => {
    if (!player || !url) return;
    setStatus('loading');
    try {
      player.replace(url);
      player.play();
    } catch {}
  };

  const enterNativePip = () => {
    try {
      const ref = videoRef.current;
      if (ref && typeof ref.startPictureInPicture === 'function') {
        ref.startPictureInPicture();
        return;
      }
    } catch {}
    try {
      navigation?.goBack?.();
    } catch {}
  };

  const showNotice = !url || status === 'error';
  const showLoading = !!url && !showPreRoll && (status === 'loading' || status === 'idle') && !isPlaying;

  // Fullscreen stage uses exact window size so video never leaves the screen.
  const stageStyle = fullscreen
    ? {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: win.width,
        height: win.height,
        backgroundColor: '#000000',
        overflow: 'hidden' as const,
      }
    : styles.stage;

  return (
    <View
      style={[
        styles.root,
        fullscreen && styles.rootFullscreen,
        !fullscreen && { paddingTop: insets.top },
      ]}
    >
      {!fullscreen ? (
        <View style={styles.header}>
          <PressableScale
            onPress={() => navigation?.goBack?.()}
            style={styles.backBtn}
            accessibilityLabel="back"
          >
            <Ionicons name="chevron-back" size={22} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {isLive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>{copy.live}</Text>
            </View>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>
      ) : null}

      <View style={stageStyle}>
        {url && !showPreRoll ? (
          <VideoView
            ref={videoRef}
            style={styles.video}
            player={player}
            contentFit={contentFit}
            nativeControls={false}
            allowsFullscreen
            allowsPictureInPicture
            startsPictureInPictureAutomatically={false}
          />
        ) : null}

        {showPreRoll && preRoll ? (
          <PreRollOverlay
            settings={preRoll}
            onDone={() => setShowPreRoll(false)}
            onCta={() => setShowPreRoll(false)}
          />
        ) : null}

        {showLoading ? (
          <View style={styles.centerLayer} pointerEvents="none">
            <ActivityIndicator size="large" color={accent} />
            <Text style={styles.loadingText}>{copy.connecting}</Text>
          </View>
        ) : null}

        {showNotice && !showPreRoll ? (
          <View style={styles.noticeBox}>
            <Ionicons name="alert-circle-outline" size={28} color={AppTheme.colors.textMuted} />
            <Text style={styles.noticeTitle}>{url ? copy.failed : copy.missing}</Text>
            <Text style={styles.noticeText}>{hint || copy.defaultHint}</Text>
            {url ? (
              <PressableScale onPress={retry} style={styles.retryButton} accessibilityLabel={copy.retry}>
                <Ionicons name="refresh" size={16} color={AppTheme.colors.white} />
                <Text style={styles.retryText}>{copy.retry}</Text>
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        {url && !showPreRoll && !showNotice ? (
          <PlayerControls
            player={player}
            hasSource={!!url}
            isPlaying={isPlaying}
            isLive={isLive}
            muted={muted}
            title={title}
            accent={accent}
            lang={lang}
            aspect={aspect}
            expanded={fullscreen}
            onTogglePlay={togglePlay}
            onToggleMute={toggleMute}
            onToggleFullscreen={() => setFullscreen((v) => !v)}
            onAspectChange={setAspect}
            onRequestPip={enterNativePip}
            onRetry={retry}
          />
        ) : null}

        {!fullscreen ? <ArshiaWatermark style={styles.watermark} /> : null}
      </View>

      {!fullscreen ? (
        <View style={[styles.info, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.sourceLine}>ARSHIA TV</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {url ? (
            <PressableScale
              onPress={() => {
                Share.share({
                  message: copy.shareMsg(title),
                  title: 'Arshia TV',
                }).catch(() => {});
              }}
              style={styles.shareBtn}
            >
              <Ionicons name="share-outline" size={16} color={AppTheme.colors.primary} />
              <Text style={styles.shareBtnText}>{copy.share}</Text>
            </PressableScale>
          ) : null}

          <PressableScale
            onPress={async () => {
              if (!isLoggedIn || !user) {
                Alert.alert('', 'ورود لازم است');
                return;
              }
              setReportBusy(true);
              const res = await submitReport({
                targetType: isLive ? 'channel' : 'movie',
                targetId: url || title,
                targetTitle: title,
                reporterId: user.id,
                reporterName: user.displayName || user.email || user.phone || '',
                reason: 'report',
              });
              setReportBusy(false);
              Alert.alert(res.ok ? 'ثبت شد' : 'خطا', res.message || '');
            }}
            style={styles.reportBtn}
            disabled={reportBusy}
          >
            <Ionicons name="flag-outline" size={15} color={AppTheme.colors.textMuted} />
            <Text style={styles.reportBtnText}>{reportBusy ? '...' : 'گزارش'}</Text>
          </PressableScale>

          <View style={styles.chipRow}>
            <View style={[styles.chip, { borderColor: accent + '66', backgroundColor: accent + '1F' }]}>
              <Ionicons name={isLive ? 'radio-outline' : 'film-outline'} size={13} color={accent} />
              <Text style={[styles.chipText, { color: accent }]}>
                {isLive ? copy.liveChannel : copy.movie}
              </Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="shield-checkmark-outline" size={13} color={AppTheme.colors.textSecondary} />
              <Text style={styles.chipText}>{copy.free}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  rootFullscreen: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginHorizontal: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(230,57,70,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.45)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: AppTheme.colors.primary,
    marginRight: 6,
  },
  livePillText: {
    color: AppTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  stage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  centerLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  loadingText: {
    marginTop: 10,
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
  },
  noticeBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  noticeTitle: {
    marginTop: 8,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  noticeText: {
    marginTop: 6,
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.primary,
  },
  retryText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: 6,
  },
  watermark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  info: {
    flex: 1,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.md,
  },
  sourceLine: {
    color: AppTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.heading,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
  },
  subtitle: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.md,
    marginTop: 4,
  },
  shareBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '66',
    backgroundColor: AppTheme.colors.primary + '14',
  },
  shareBtnText: {
    color: AppTheme.colors.primary,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: 6,
  },
  reportBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    height: 30,
    paddingHorizontal: 10,
  },
  reportBtnText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginLeft: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: AppTheme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 10,
    borderRadius: AppTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    marginRight: AppTheme.spacing.sm,
    marginBottom: AppTheme.spacing.sm,
  },
  chipText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: 6,
  },
});

export default PlayerPage;
