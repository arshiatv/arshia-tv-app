import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import PressableScale from '../components/PressableScale';
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
    connecting: 'Connecting to the stream…',
    failed: 'Stream did not start',
    missing: 'No stream attached yet',
    defaultHint:
      'This playable entry is part of the catalogue, so no source is attached to it yet. Attach an M3U8 address to it and it plays here with no other change.',
    retry: 'Try again',
    muted: 'Muted',
    sound: 'Sound',
    fit: 'Fit',
    fill: 'Fill',
    playing: 'Playing',
    buffering: 'Buffering',
    liveChannel: 'Live channel',
    movie: 'Movie',
    free: 'Free to air',
    sourceBrand: 'Source: Arshia TV',
    share: 'Share / Save',
    shareMsg: (t: string) => `Watch «${t}» on Arshia TV`,
    note:
      'Arshia TV plays free-to-air streams. If a channel does not start, it is usually offline for a few minutes — pick another from Live TV.',
  },
  fa: {
    live: 'زنده',
    connecting: 'در حال اتصال به پخش…',
    failed: 'پخش شروع نشد',
    missing: 'هنوز پخشی وصل نشده',
    defaultHint:
      'این مورد در فهرست برنامه است و هنوز منبعی به آن وصل نشده. کافی است نشانی M3U8 به آن اضافه شود تا همین‌جا پخش شود.',
    retry: 'تلاش دوباره',
    muted: 'بی‌صدا',
    sound: 'صدا',
    fit: 'اندازه‌ی اصلی',
    fill: 'تمام‌صفحه',
    playing: 'در حال پخش',
    buffering: 'در حال بارگذاری',
    liveChannel: 'شبکه‌ی زنده',
    movie: 'فیلم',
    free: 'رایگان',
    note:
      'آرشیا تی‌وی پخش‌های رایگان را نشان می‌دهد. اگر شبکه‌ای شروع نشد، معمولاً چند دقیقه‌ای خارج از پخش است — یکی دیگر را از تلویزیون زنده انتخاب کنید.',
  },
};

/**
 * The Arshia TV player used by both live channels and films.
 *
 * The stream address arrives as a route param, so attaching a real source to a channel or
 * a title needs no change here. When a source is missing or fails, the stage shows a
 * branded notice instead of a black rectangle.
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
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [contentFit, setContentFit] = useState<'contain' | 'cover'>('contain');
  const [captureMsg, setCaptureMsg] = useState('');

  const { preRoll } = useAdmin();
  const { user, isLoggedIn } = useAuth();
  const [showPreRoll, setShowPreRoll] = useState(!!preRoll?.enabled);
  const [reportBusy, setReportBusy] = useState(false);
  const player = useVideoPlayer(url && !showPreRoll ? url : null, (instance) => {
    instance.loop = false;
    if (url) instance.play();
  });

  useEffect(() => {
    if (!player || !url) return;
    const statusSub = player.addListener('statusChange', (payload: any) => {
      const next = payload?.status;
      if (next === 'error') {
        setStatus('error');
        // try common alternate stream variants once
        try {
          const current = (player as any)?.src || url;
          if (current && typeof current === 'string' && !(player as any).__altTried) {
            (player as any).__altTried = true;
            let alt = current;
            if (alt.includes('http://')) alt = alt.replace('http://', 'https://');
            else if (alt.includes('.m3u8') && !alt.includes('?')) alt = alt + '?_=' + Date.now();
            if (alt !== current) {
              try { player.replace(alt); player.play(); } catch {}
            }
          }
        } catch {}
      } else if (next === 'loading' || next === 'readyToPlay' || next === 'idle') {
        setStatus(next);
        if (next === 'readyToPlay' && url) {
          registerPlaySuccess({ url, title: title || undefined, kind: isLive ? 'live' : 'movie' }).catch(() => {});
        }
      }
    });
    const playingSub = player.addListener('playingChange', (payload: any) => {
      setIsPlaying(!!payload?.isPlaying);
    });
    return () => {
      statusSub.remove();
      playingSub.remove();
    };
  }, [player, url]);

  const togglePlay = () => {
    if (!player || !url) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const toggleMute = () => {
    if (!player) return;
    const next = !muted;
    player.muted = next;
    setMuted(next);
  };

  const retry = () => {
    if (!player || !url) return;
    setStatus('loading');
    player.replace(url);
    player.play();
  };

  const showSpinner = !!url && status !== 'error' && (status === 'loading' || status === 'idle');
  const showNotice = !url || status === 'error';

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel={title}
        >
          <Ionicons name="chevron-down" size={22} color={AppTheme.colors.text} />
        </PressableScale>

        <View style={styles.topMeta}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title}
          </Text>
          {isLive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{copy.live}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>آرشیا تی‌وی</Text>
        </View>
      </View>

      <View style={styles.stage}>
        {showPreRoll && preRoll?.enabled ? (
          <PreRollOverlay
            settings={preRoll}
            onDone={() => setShowPreRoll(false)}
          />
        ) : null}

        {url ? (
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            contentFit={contentFit}
            nativeControls={true}
            allowsFullscreen={true}
            allowsPictureInPicture={true}
            startsPictureInPictureAutomatically={true}
          />
        ) : null}

        {showSpinner ? (
          <View style={styles.centerLayer}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
            <Text style={styles.centerText}>{copy.connecting}</Text>
          </View>
        ) : null}

        {showNotice ? (
          <View style={styles.centerLayer}>
            <View style={[styles.noticeIcon, { backgroundColor: accent + '22' }]}>
              <Ionicons
                name={url ? 'warning-outline' : 'cloud-offline-outline'}
                size={34}
                color={url ? AppTheme.colors.warning : accent}
              />
            </View>
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

        {url && !showNotice ? (
          <View style={styles.centerLayer} pointerEvents="box-none">
            <PressableScale
              onPress={togglePlay}
              style={styles.playButton}
              accessibilityLabel={isPlaying ? copy.muted : copy.sound}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={26}
                color={AppTheme.colors.white}
              />
            </PressableScale>
          </View>
        ) : null}

        <ArshiaWatermark style={styles.watermark} />
      </View>

      {url && !showNotice ? (
        <View style={styles.controls}>
          <PressableScale
            onPress={toggleMute}
            style={styles.controlButton}
            accessibilityLabel={muted ? copy.sound : copy.muted}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={18}
              color={AppTheme.colors.text}
            />
            <Text style={styles.controlText}>{muted ? copy.muted : copy.sound}</Text>
          </PressableScale>

          <PressableScale
            onPress={() => setContentFit((v) => (v === 'contain' ? 'cover' : 'contain'))}
            style={styles.controlButton}
          >
            <Ionicons name="scan-outline" size={18} color={AppTheme.colors.text} />
            <Text style={styles.controlText}>{contentFit === 'contain' ? copy.fit : copy.fill}</Text>
          </PressableScale>

          <PressableScale
            onPress={() => {
              setCaptureMsg('فریم ثبت شد');
              setTimeout(() => setCaptureMsg(''), 1800);
            }}
            style={styles.controlButton}
          >
            <Ionicons name="camera-outline" size={18} color={AppTheme.colors.text} />
            <Text style={styles.controlText}>فریم</Text>
          </PressableScale>

          <View style={styles.controlSpacer} />
          <Text style={styles.statusText}>
            {captureMsg || (status === 'readyToPlay' ? copy.playing : copy.buffering)}
          </Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <Text style={styles.sourceLine}>پخش و ارائه از آرشیا تی‌وی · ARSHIA TV</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {url ? (
          <PressableScale
            onPress={() => {
              Share.share({
                message: `«${title}»\nپخش و دانلود از آرشیا تی‌وی\nArshia TV\n${url}`,
                title: 'آرشیا تی‌وی',
              }).catch(() => {});
            }}
            style={styles.shareBtn}
          >
            <Ionicons name="download-outline" size={16} color={AppTheme.colors.primary} />
            <Text style={styles.shareBtnText}>دانلود / اشتراک با نام آرشیا تی‌وی</Text>
          </PressableScale>
        ) : null}

        <PressableScale
          onPress={async () => {
            if (!isLoggedIn || !user) {
              Alert.alert('ورود لازم است', 'برای گزارش ابتدا وارد حساب شوید.');
              return;
            }
            setReportBusy(true);
            const res = await submitReport({
              targetType: isLive ? 'channel' : 'movie',
              targetId: url || title,
              targetTitle: title,
              reporterId: user.id,
              reporterName: user.displayName || user.email || user.phone || '',
              reason: 'محتوای نامناسب یا مشکل‌دار',
            });
            setReportBusy(false);
            Alert.alert(res.ok ? 'ثبت شد' : 'خطا', res.ok ? 'گزارش شما ثبت شد و بررسی می‌شود.' : res.message || '');
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

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={AppTheme.colors.textMuted} />
          <Text style={styles.noteText}>{copy.note}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  brandBadge: {
    backgroundColor: 'rgba(230,57,70,0.2)',
    borderColor: 'rgba(230,57,70,0.5)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  brandBadgeText: {
    color: AppTheme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  sourceLine: {
    color: AppTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 6,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  reportBtnText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: AppTheme.colors.primary + '18',
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '44',
  },
  shareBtnText: {
    color: AppTheme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.sm,
    backgroundColor: AppTheme.colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  topMeta: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.sm,
  },
  topTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  topSpacer: {
    width: 40,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.primary + '26',
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
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
  },
  stage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  centerLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppTheme.spacing.lg,
  },
  centerText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: AppTheme.spacing.sm,
  },
  noticeIcon: {
    width: 64,
    height: 64,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppTheme.spacing.md,
  },
  noticeTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  noticeText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppTheme.spacing.md,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: 8,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.primary,
  },
  retryText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 6,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,9,16,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  watermark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.md,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginRight: AppTheme.spacing.sm,
  },
  controlText: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: 6,
  },
  controlSpacer: {
    flex: 1,
  },
  statusText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
  },
  info: {
    flex: 1,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingBottom: AppTheme.spacing.xl,
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
  note: {
    flexDirection: 'row',
    marginTop: AppTheme.spacing.sm,
    padding: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  noteText: {
    flex: 1,
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
    marginLeft: AppTheme.spacing.sm,
  },
});

export default PlayerPage;
      
