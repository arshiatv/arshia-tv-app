import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import ChannelLogo from '../components/ChannelLogo';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { Channel, GROUPS, GroupMeta, groupMeta } from '../data/channels';
import { MOVIES, Movie } from '../data/movies';
import { genreLabel, groupLabel, movieTitle } from '../data/labels';
import { loadChannels } from '../utils/playlist';
import { useAdmin } from '../context/AdminContext';
import { useFavorites } from '../context/FavoritesContext';
import { useTranslation } from '../locales';

/**
 * Live TV.
 *
 * The monitor at the top is fixed: it keeps playing the channel you picked while the
 * folder buttons below it scroll. Below the monitor sits the programme panel, which
 * Arshia TV fills from the playlist the channel arrived on, and the folder grid, where
 * every folder opens into its own recessed channel buttons.
 */

const COPY = {
  en: {
    title: 'Live TV',
    loading: 'Loading channels…',
    counts: (channels: number, folders: number) =>
      `${channels} free channels · ${folders} folders`,
    manager: 'Manager',
    reload: 'Reload the channel folders',
    emptyMonitorTitle: 'Pick a channel to start the monitor',
    emptyMonitorText: 'The monitor stays here at the top while you browse the folders below.',
    noUrlMonitorText:
      'This list entry carries no stream address. Pull down to fetch the playlist again.',
    pause: 'Pause',
    play: 'Play',
    unmute: 'Unmute',
    mute: 'Mute',
    fullscreen: 'Fullscreen',
    arshiaLive: 'Arshia TV live',
    onAir: 'on air now',
    noStream: 'no stream attached',
    chooseFolder: 'Choose a folder below',
    togglePanel: 'Toggle programme details',
    offline:
      'The playlists could not be reached. This is the built-in list — pull down to try again.',
    tuningTitle: 'Tuning in…',
    tuningText: 'Fetching the latest channel folders.',
    noChannelsTitle: 'No channels found',
    noChannelsText: 'Pull down to refresh, or try again in a moment.',
    panelTitle: 'Programme details',
    autoQuality: 'Auto quality',
    freeToAir: 'Free to air',
    panelText: (name: string) =>
      `Arshia TV fills this panel automatically from the playlist ${name} arrived on, and keeps the channel name on screen the whole time it plays. Channels that publish extra guide text show it here — when a source stays quiet, the name above is what you get.`,
    panelArchive: 'Archive · titles that go with this folder',
    save: 'Add to My Favorites',
    saved: 'In My Favorites',
    adminHint: 'Manager mode: long-press any channel button below to remove it.',
    folders: 'Folders',
    folder: (label: string) => `${label} folder`,
    channelOne: 'channel',
    channelMany: 'channels',
    onMonitor: 'On the monitor now',
    liveNow: 'Live now',
    footNote: 'Channels are free-to-air streams. Availability changes through the day.',
    live: 'Live',
    min: 'min',
    fullscreenHint:
      'The stream did not respond. Free-to-air channels go offline during the day, so try another one.',
    archiveHint: 'This title sits in the Arshia archive and has no source attached to it yet.',
    removeTitle: 'Remove this channel?',
    removeText: (name: string) =>
      `${name} will be taken out of the list until you restore it from the Admin panel.`,
    cancel: 'Cancel',
    remove: 'Remove',
  },
  fa: {
    title: 'تلویزیون زنده',
    loading: 'در حال بارگذاری شبکه‌ها…',
    counts: (channels: number, folders: number) =>
      `${channels} شبکه‌ی رایگان · ${folders} پوشه`,
    manager: 'مدیر',
    reload: 'بارگذاری دوباره‌ی پوشه‌های شبکه',
    emptyMonitorTitle: 'برای شروع نمایشگر یک شبکه انتخاب کنید',
    emptyMonitorText: 'نمایشگر همین بالا می‌ماند تا شما پوشه‌های پایین را مرور کنید.',
    noUrlMonitorText:
      'این مورد فهرست نشانی پخشی ندارد. برای گرفتن دوباره‌ی فهرست، صفحه را پایین بکشید.',
    pause: 'توقف',
    play: 'پخش',
    unmute: 'باصدا',
    mute: 'بی‌صدا',
    fullscreen: 'تمام‌صفحه',
    arshiaLive: 'آرشیا تی‌وی زنده',
    onAir: 'همین حالا روی آنتن',
    noStream: 'پخشی وصل نیست',
    chooseFolder: 'یک پوشه را از پایین انتخاب کنید',
    togglePanel: 'باز و بسته کردن جزئیات برنامه',
    offline:
      'فهرست‌های پخش در دسترس نبودند. این فهرست داخلی برنامه است — برای تلاش دوباره صفحه را پایین بکشید.',
    tuningTitle: 'در حال تنظیم…',
    tuningText: 'در حال گرفتن تازه‌ترین پوشه‌های شبکه.',
    noChannelsTitle: 'شبکه‌ای پیدا نشد',
    noChannelsText: 'برای تازه‌سازی صفحه را پایین بکشید، یا کمی بعد دوباره تلاش کنید.',
    panelTitle: 'جزئیات برنامه',
    autoQuality: 'کیفیت خودکار',
    freeToAir: 'رایگان',
    panelText: (name: string) =>
      `آرشیا تی‌وی این بخش را به‌طور خودکار از همان فهرست پخشی که ${name} از آن آمده پر می‌کند و در تمام مدت پخش، نام شبکه روی صفحه می‌ماند. شبکه‌هایی که راهنمای برنامه منتشر می‌کنند آن را همین‌جا نشان می‌دهند — وقتی منبعی ساکت بماند، همین نام بالا در دسترس شماست.`,
    panelArchive: 'آرشیو · عنوان‌های مرتبط با این پوشه',
    save: 'افزودن به علاقه‌مندی‌ها',
    saved: 'در علاقه‌مندی‌ها',
    adminHint: 'حالت مدیر: برای حذف، انگشت خود را روی دکمه‌ی هر شبکه در پایین نگه دارید.',
    folders: 'پوشه‌ها',
    folder: (label: string) => `پوشه‌ی ${label}`,
    channelOne: 'شبکه',
    channelMany: 'شبکه',
    onMonitor: 'همین حالا روی نمایشگر',
    liveNow: 'همین حالا زنده',
    footNote: 'شبکه‌ها پخش‌های رایگان هستند. دسترسی در طول روز تغییر می‌کند.',
    live: 'زنده',
    min: 'دقیقه',
    fullscreenHint:
      'پخش پاسخ نداد. شبکه‌های رایگان در طول روز خارج از پخش می‌شوند، پس یکی دیگر را امتحان کنید.',
    archiveHint: 'این عنوان در آرشیو آرشیا است و هنوز منبعی به آن وصل نشده.',
    removeTitle: 'این شبکه حذف شود؟',
    removeText: (name: string) =>
      `${name} تا وقتی از پنل مدیر بازگردانی نکنید از فهرست بیرون می‌ماند.`,
    cancel: 'انصراف',
    remove: 'حذف',
  },
};

interface LiveMonitorProps {
  channel: Channel | null;
  player: any;
  isPlaying: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
}

const LiveMonitor: React.FC<LiveMonitorProps> = ({
  channel,
  player,
  isPlaying,
  muted,
  onTogglePlay,
  onToggleMute,
  onFullscreen,
}) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

  return (
    <View style={styles.monitor}>
      {channel && channel.url ? (
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="contain"
          nativeControls={false}
        />
      ) : null}

      {!channel ? (
        <View style={styles.monitorEmpty}>
          <Ionicons name="tv-outline" size={30} color={AppTheme.colors.textMuted} />
          <Text style={styles.monitorEmptyTitle}>{copy.emptyMonitorTitle}</Text>
          <Text style={styles.monitorEmptyText}>{copy.emptyMonitorText}</Text>
        </View>
      ) : null}

      {channel && !channel.url ? (
        <View style={styles.monitorEmpty}>
          <Ionicons name="cloud-offline-outline" size={30} color={AppTheme.colors.warning} />
          <Text style={styles.monitorEmptyTitle}>{channel.name}</Text>
          <Text style={styles.monitorEmptyText}>{copy.noUrlMonitorText}</Text>
        </View>
      ) : null}

      {channel && channel.url ? (
        <View style={styles.monitorControls} pointerEvents="box-none">
          <PressableScale
            onPress={onTogglePlay}
            style={styles.monitorButton}
            accessibilityLabel={isPlaying ? copy.pause : copy.play}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={19} color={AppTheme.colors.white} />
          </PressableScale>
          <PressableScale
            onPress={onToggleMute}
            style={styles.monitorButton}
            accessibilityLabel={muted ? copy.unmute : copy.mute}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={17}
              color={AppTheme.colors.white}
            />
          </PressableScale>
          <View style={styles.monitorSpacer} />
          <PressableScale
            onPress={onFullscreen}
            style={styles.monitorButton}
            accessibilityLabel={copy.fullscreen}
          >
            <Ionicons name="expand-outline" size={17} color={AppTheme.colors.white} />
          </PressableScale>
        </View>
      ) : null}

      <ArshiaWatermark style={styles.monitorMark} />
    </View>
  );
};

interface ProgramPanelProps {
  channel: Channel;
  onOpenArchive: (movie: Movie) => void;
}

const ProgramPanel: React.FC<ProgramPanelProps> = ({ channel, onOpenArchive }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const { isFavorite, toggleFavorite } = useFavorites();
  const meta = groupMeta(channel.group);
  const archive = MOVIES.slice(0, 8);
  const saved = isFavorite(channel.id);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Ionicons name="information-circle-outline" size={16} color={meta.color} />
        <Text style={styles.panelTitle}>{copy.panelTitle}</Text>
      </View>

      <Text style={styles.panelName}>{channel.name}</Text>

      <View style={styles.panelChips}>
        <View
          style={[styles.panelChip, { borderColor: meta.color + '66', backgroundColor: meta.color + '1F' }]}
        >
          <Ionicons name={meta.icon as any} size={12} color={meta.color} />
          <Text style={[styles.panelChipText, { color: meta.color }]}>
            {groupLabel(channel.group, lang, meta.label)}
          </Text>
        </View>
        <View style={styles.panelChip}>
          <Ionicons name="sparkles-outline" size={12} color={AppTheme.colors.textSecondary} />
          <Text style={styles.panelChipText}>{channel.quality || copy.autoQuality}</Text>
        </View>
        <View style={styles.panelChip}>
          <Ionicons name="shield-checkmark-outline" size={12} color={AppTheme.colors.textSecondary} />
          <Text style={styles.panelChipText}>{copy.freeToAir}</Text>
        </View>
      </View>

      <Text style={styles.panelText}>{copy.panelText(channel.name)}</Text>

      <PressableScale
        onPress={() =>
          toggleFavorite({
            id: channel.id,
            kind: 'channel',
            title: channel.name,
            subtitle: groupLabel(channel.group, lang, meta.label),
            color: meta.color,
            icon: meta.icon,
            channel,
          })
        }
        style={[styles.saveButton, saved ? { backgroundColor: meta.color } : null]}
        accessibilityLabel={saved ? copy.saved : copy.save}
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={15}
          color={AppTheme.colors.white}
        />
        <Text style={styles.saveButtonText}>{saved ? copy.saved : copy.save}</Text>
      </PressableScale>

      <Text style={styles.panelSub}>{copy.panelArchive}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.archiveRow}>
        {archive.map((movie) => (
          <InsetPressable
            key={movie.id}
            onPress={() => onOpenArchive(movie)}
            style={styles.archiveCard}
            accessibilityLabel={movieTitle(movie.id, movie.title, lang)}
          >
            <View style={[styles.archiveArt, { backgroundColor: movie.color }]}>
              <Ionicons name={movie.icon as any} size={22} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.archiveTitle} numberOfLines={2}>
              {movieTitle(movie.id, movie.title, lang)}
            </Text>
            <Text style={styles.archiveMeta} numberOfLines={1}>
              {movie.year} · {genreLabel(movie.genre, lang)}
            </Text>
          </InsetPressable>
        ))}
      </ScrollView>
    </View>
  );
};

interface FolderTileProps {
  meta: GroupMeta;
  count: number;
  isOpen: boolean;
  index: number;
  onToggle: () => void;
}

const FolderTile: React.FC<FolderTileProps> = ({ meta, count, isOpen, index, onToggle }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const enter = useRef(new Animated.Value(0)).current;
  const label = groupLabel(meta.key, lang, meta.label);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index * 45, 320),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={[
        styles.folderWrap,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      <InsetPressable
        onPress={onToggle}
        accent={meta.color}
        style={[styles.folder, isOpen ? { backgroundColor: meta.color + '1F' } : null]}
        accessibilityLabel={copy.folder(label)}
      >
        <View style={styles.folderTop}>
          <View style={[styles.folderIcon, { backgroundColor: meta.color + '2E' }]}>
            <Ionicons name={meta.icon as any} size={18} color={meta.color} />
          </View>
          <Ionicons
            name={isOpen ? 'chevron-up-circle' : 'chevron-down-circle'}
            size={18}
            color={isOpen ? meta.color : AppTheme.colors.textMuted}
          />
        </View>
        <Text style={styles.folderLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.folderCount}>
          {count} {count === 1 ? copy.channelOne : copy.channelMany}
        </Text>
      </InsetPressable>
    </Animated.View>
  );
};

interface ChannelButtonProps {
  channel: Channel;
  index: number;
  isActive: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const ChannelButton: React.FC<ChannelButtonProps> = ({
  channel,
  index,
  isActive,
  onPress,
  onLongPress,
}) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const enter = useRef(new Animated.Value(0)).current;
  const meta = groupMeta(channel.group);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 340,
      delay: Math.min(index * 24, 240),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <InsetPressable
        onPress={onPress}
        onLongPress={onLongPress}
        accent={isActive ? meta.color : undefined}
        style={[styles.channel, isActive ? { backgroundColor: meta.color + '1C' } : null]}
        accessibilityLabel={channel.name}
      >
        <ChannelLogo channel={channel} size={42} />
        <View style={styles.channelBody}>
          <Text style={styles.channelName} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={styles.channelMeta} numberOfLines={1}>
            {isActive
              ? copy.onMonitor
              : channel.url
              ? copy.liveNow
              : copy.noStream}
            {channel.quality ? ` · ${channel.quality}` : ''}
          </Text>
        </View>
        <View style={[styles.channelPlay, { borderColor: meta.color + '59' }]}>
          <Ionicons name={isActive ? 'volume-high' : 'play'} size={13} color={meta.color} />
        </View>
      </InsetPressable>
    </Animated.View>
  );
};

const LiveChannelsPage: React.FC<any> = ({ navigation, route }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const requestedGroup: string = route?.params?.group || '';
  const { isAdmin, hiddenGroups, removedChannelIds, removeChannel } = useAdmin();
  const isFocused = useIsFocused();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openFolder, setOpenFolder] = useState('');
  const [active, setActive] = useState<Channel | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  const load = useCallback(async (force: boolean) => {
    const result = await loadChannels(force);
    setChannels(result.channels);
    setIsOffline(result.isOffline);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const visibleChannels = useMemo(
    () =>
      channels.filter(
        (channel) =>
          !removedChannelIds.includes(channel.id) && !hiddenGroups.includes(channel.group)
      ),
    [channels, removedChannelIds, hiddenGroups]
  );

  const sections = useMemo(() => {
    const grouped: Record<string, Channel[]> = {};
    visibleChannels.forEach((channel) => {
      if (!grouped[channel.group]) grouped[channel.group] = [];
      grouped[channel.group].push(channel);
    });
    return GROUPS.filter((meta) => grouped[meta.key] && grouped[meta.key].length > 0).map(
      (meta) => ({ meta, items: grouped[meta.key] })
    );
  }, [visibleChannels]);

  // Open one folder by default: the one asked for, else the first that has channels.
  useEffect(() => {
    if (openFolder || !sections.length) return;
    const preferred = sections.some((section) => section.meta.key === requestedGroup)
      ? requestedGroup
      : sections[0].meta.key;
    setOpenFolder(preferred);
  }, [sections, requestedGroup, openFolder]);

  // The monitor always has something on it.
  useEffect(() => {
    if (active) return;
    if (!visibleChannels.length) return;
    setActive(visibleChannels[0]);
  }, [active, visibleChannels]);

  // A channel the manager removed must not keep playing.
  useEffect(() => {
    if (active && removedChannelIds.includes(active.id)) setActive(null);
  }, [active, removedChannelIds]);

  useEffect(() => {
    if (!player) return;
    const playingSub = player.addListener('playingChange', (payload: any) => {
      setIsPlaying(!!payload?.isPlaying);
    });
    return () => playingSub.remove();
  }, [player]);

  // Load the stream when the channel changes, and quieten down whenever the tab or the
  // full screen player takes over so two streams never play at once.
  useEffect(() => {
    if (!player) return;
    const url = active?.url;
    if (!url || !isFocused) {
      try {
        player.pause();
      } catch (error) {
        // Nothing to pause yet.
      }
      return;
    }
    try {
      Promise.resolve(player.replace(url)).catch(() => {});
      player.play();
    } catch (error) {
      // The monitor shows its own notice when a stream will not start.
    }
  }, [player, active, isFocused]);

  const togglePlay = () => {
    if (!player || !active?.url) return;
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

  const selectChannel = (channel: Channel) => {
    setActive(channel);
    setMuted(false);
    setPanelOpen(true);
  };

  const goFullscreen = () => {
    if (!active?.url) return;
    const meta = groupMeta(active.group);
    navigation.navigate('Player', {
      title: active.name,
      subtitle: `${groupLabel(active.group, lang, meta.label)} · ${copy.live}`,
      url: active.url,
      accent: meta.color,
      isLive: true,
      hint: copy.fullscreenHint,
    });
  };

  const openArchive = (movie: Movie) => {
    navigation.navigate('Player', {
      title: movieTitle(movie.id, movie.title, lang),
      subtitle: `${genreLabel(movie.genre, lang)} · ${movie.year} · ${movie.duration} ${copy.min}`,
      url: movie.streamUrl,
      accent: movie.color,
      isLive: false,
      hint: copy.archiveHint,
    });
  };

  const confirmRemove = (channel: Channel) => {
    Alert.alert(copy.removeTitle, copy.removeText(channel.name), [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.remove, style: 'destructive', onPress: () => removeChannel(channel.id) },
    ]);
  };

  const activeMeta = active ? groupMeta(active.group) : null;
  const openSection = sections.find((section) => section.meta.key === openFolder) || null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>
            {loading
              ? copy.loading
              : copy.counts(visibleChannels.length, sections.length)}
          </Text>
        </View>
        {isAdmin ? (
          <View style={styles.adminPill}>
            <Ionicons name="shield-checkmark" size={12} color={AppTheme.colors.primary} />
            <Text style={styles.adminPillText}>{copy.manager}</Text>
          </View>
        ) : null}
        <PressableScale
          onPress={() => {
            setRefreshing(true);
            load(true);
          }}
          disabled={loading}
          style={styles.headerButton}
          accessibilityLabel={copy.reload}
        >
          <Ionicons name="refresh" size={17} color={AppTheme.colors.text} />
        </PressableScale>
      </View>

      <LiveMonitor
        channel={active}
        player={player}
        isPlaying={isPlaying}
        muted={muted}
        onTogglePlay={togglePlay}
        onToggleMute={toggleMute}
        onFullscreen={goFullscreen}
      />

      <View style={styles.nowBar}>
        <View
          style={[
            styles.nowDot,
            { backgroundColor: active?.url && activeMeta ? activeMeta.color : AppTheme.colors.disabled },
          ]}
        />
        <View style={styles.nowBody}>
          <Text style={styles.nowTitle} numberOfLines={1}>
            {active ? active.name : copy.arshiaLive}
          </Text>
          <Text style={styles.nowMeta} numberOfLines={1}>
            {active && activeMeta
              ? `${groupLabel(active.group, lang, activeMeta.label)} · ${
                  active.url ? copy.onAir : copy.noStream
                }`
              : copy.chooseFolder}
          </Text>
        </View>
        <InsetPressable
          onPress={() => setPanelOpen((prev) => !prev)}
          disabled={!active}
          style={styles.nowToggle}
          accessibilityLabel={copy.togglePanel}
        >
          <Ionicons
            name={panelOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={AppTheme.colors.text}
          />
        </InsetPressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={AppTheme.colors.primary}
            colors={[AppTheme.colors.primary]}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
          />
        }
      >
        {isOffline ? (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={18} color={AppTheme.colors.warning} />
            <Text style={styles.bannerText}>{copy.offline}</Text>
          </View>
        ) : null}

        {loading && channels.length === 0 ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
            <Text style={styles.stateTitle}>{copy.tuningTitle}</Text>
            <Text style={styles.stateText}>{copy.tuningText}</Text>
          </View>
        ) : null}

        {!loading && sections.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="tv-outline" size={46} color={AppTheme.colors.textMuted} />
            <Text style={styles.stateTitle}>{copy.noChannelsTitle}</Text>
            <Text style={styles.stateText}>{copy.noChannelsText}</Text>
          </View>
        ) : null}

        {active && panelOpen ? (
          <ProgramPanel channel={active} onOpenArchive={openArchive} />
        ) : null}

        {active && panelOpen && isAdmin ? (
          <View style={styles.adminHint}>
            <Ionicons name="construct-outline" size={15} color={AppTheme.colors.primary} />
            <Text style={styles.adminHintText}>{copy.adminHint}</Text>
          </View>
        ) : null}

        {sections.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>{copy.folders}</Text>
            <View style={styles.folderGrid}>
              {sections.map((section, index) => (
                <FolderTile
                  key={section.meta.key}
                  meta={section.meta}
                  count={section.items.length}
                  index={index}
                  isOpen={openFolder === section.meta.key}
                  onToggle={() =>
                    setOpenFolder((prev) => (prev === section.meta.key ? '' : section.meta.key))
                  }
                />
              ))}
            </View>
          </>
        ) : null}

        {openSection ? (
          <View style={styles.openFolder}>
            <View style={styles.openFolderHead}>
              <View style={[styles.openFolderBar, { backgroundColor: openSection.meta.color }]} />
              <Text style={styles.openFolderLabel}>
                {groupLabel(openSection.meta.key, lang, openSection.meta.label)}
              </Text>
              <Text style={styles.openFolderCount}>{openSection.items.length}</Text>
            </View>
            <View style={styles.rows}>
              {openSection.items.map((channel, index) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  index={index}
                  isActive={active?.id === channel.id}
                  onPress={() => selectChannel(channel)}
                  onLongPress={isAdmin ? () => confirmRemove(channel) : undefined}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.footNote}>{copy.footNote}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.sm,
    paddingBottom: AppTheme.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.heading,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 2,
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 9,
    marginRight: AppTheme.spacing.sm,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.primary + '1F',
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '59',
  },
  adminPillText: {
    color: AppTheme.colors.primary,
    fontSize: 10,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: 4,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  monitor: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#05070D',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  monitorMark: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  monitorEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppTheme.spacing.xl,
  },
  monitorEmptyTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginTop: AppTheme.spacing.sm,
    textAlign: 'center',
  },
  monitorEmptyText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 4,
    textAlign: 'center',
  },
  monitorControls: {
    position: 'absolute',
    left: AppTheme.spacing.sm,
    right: AppTheme.spacing.sm,
    bottom: AppTheme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monitorButton: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,9,16,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: AppTheme.spacing.sm,
  },
  monitorSpacer: {
    flex: 1,
  },
  nowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.sm,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: AppTheme.spacing.sm,
  },
  nowBody: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  nowTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  nowMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  nowToggle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.xxl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.warning + '14',
    borderWidth: 1,
    borderColor: AppTheme.colors.warning + '40',
    marginBottom: AppTheme.spacing.md,
  },
  bannerText: {
    flex: 1,
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
    marginLeft: AppTheme.spacing.sm,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: AppTheme.spacing.xxl,
  },
  stateTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginTop: AppTheme.spacing.md,
  },
  stateText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 6,
    textAlign: 'center',
  },
  panel: {
    padding: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panelTitle: {
    color: AppTheme.colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 6,
  },
  panelName: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.xxl,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    marginTop: AppTheme.spacing.sm,
  },
  panelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: AppTheme.spacing.sm,
  },
  panelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: 9,
    marginRight: AppTheme.spacing.sm,
    marginBottom: 6,
    borderRadius: AppTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  panelChipText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: 5,
  },
  panelText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 19,
    marginTop: AppTheme.spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: AppTheme.spacing.md,
    marginTop: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.secondary,
  },
  saveButtonText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 6,
  },
  panelSub: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginTop: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
  },
  archiveRow: {
    paddingRight: AppTheme.spacing.md,
  },
  archiveCard: {
    width: 132,
    padding: AppTheme.spacing.sm,
    marginRight: AppTheme.spacing.sm,
  },
  archiveArt: {
    height: 68,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginTop: 6,
  },
  archiveMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  adminHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.primary + '14',
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '40',
  },
  adminHintText: {
    flex: 1,
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    marginLeft: AppTheme.spacing.sm,
  },
  sectionLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginBottom: AppTheme.spacing.sm,
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  folderWrap: {
    width: '48.5%',
    marginBottom: AppTheme.spacing.sm,
  },
  folder: {
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
  },
  folderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folderIcon: {
    width: 34,
    height: 34,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderLabel: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginTop: AppTheme.spacing.sm,
  },
  folderCount: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  openFolder: {
    marginTop: AppTheme.spacing.md,
  },
  openFolderHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppTheme.spacing.sm,
  },
  openFolderBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    marginRight: AppTheme.spacing.sm,
  },
  openFolderLabel: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
  },
  openFolderCount: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
  },
  rows: {
    marginTop: 2,
  },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
  },
  channelBody: {
    flex: 1,
    marginLeft: AppTheme.spacing.sm,
    marginRight: AppTheme.spacing.sm,
  },
  channelName: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  channelMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  channelPlay: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  footNote: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: AppTheme.spacing.lg,
  },
});

export default LiveChannelsPage;

