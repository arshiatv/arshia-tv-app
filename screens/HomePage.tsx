import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import ChannelLogo from '../components/ChannelLogo';
import PressableScale from '../components/PressableScale';
import { Channel, GroupMeta, groupMeta } from '../data/channels';
import { MOVIES, Movie } from '../data/movies';
import { genreLabel, groupLabel, movieTitle } from '../data/labels';
import { loadChannels } from '../data/playlist';
import { useTranslation } from '../locales';

const HERO_LIVE_COUNT = 14;
const HERO_MOVIE_COUNT = 10;

const COPY = {
  en: {
    brandTag: 'FREE LIVE TV · MOVIES',
    search: 'Search',
    onAirNow: 'ON AIR NOW',
    featuredFilm: 'FEATURED FILM',
    liveRightNow: 'live right now',
    rating: 'rating',
    watchNow: 'Watch now',
    offline: 'The live playlist could not be reached...',
    liveNow: 'Live now',
    freeChannels: 'free channels',
    movies: 'Movies',
    popular: 'Popular on Arshia TV',
    browse: 'Browse by category',
    shelves: 'Collapsible channel shelves',
    loading: 'Loading live channels…',
    footer: 'Arshia TV indexes free-to-air channels.',
    channelHintNoUrl: 'Open Live TV and pull down to load.',
    channelHintFailed: 'The stream did not respond.',
    movieHint: 'This title is in the Arshia catalogue.',
    live: 'Live',
    min: 'min',
  },
  fa: {
    brandTag: 'تلویزیون زنده و فیلم، رایگان',
    search: 'جست‌وجو',
    onAirNow: 'همین حالا روی آنتن',
    featuredFilm: 'فیلم برگزیده',
    liveRightNow: 'در حال پخش زنده',
    rating: 'امتیاز',
    watchNow: 'تماشا کنید',
    offline: 'فهرست پخش زنده در دسترس نبود...',
    liveNow: 'همین حالا زنده',
    freeChannels: 'شبکه‌ی رایگان',
    movies: 'فیلم‌ها',
    popular: 'محبوب در آرشیا تی‌وی',
    browse: 'مرور بر اساس دسته',
    shelves: 'قفسه‌های شبکه، باز و بسته‌شدنی',
    loading: 'در حال بارگذاری شبکه‌های زنده…',
    footer: 'آرشیا تی‌وی شبکه‌های رایگان را فهرست می‌کند.',
    channelHintNoUrl: 'تلویزیون زنده را باز کنید و صفحه را پایین بکشید.',
    channelHintFailed: 'پخش پاسخ نداد. شبکه دیگری را امتحان کنید.',
    movieHint: 'نشانی M3U8 به فیلم اضافه شود تا پخش شود.',
    live: 'زنده',
    min: 'دقیقه',
  },
};

interface LiveCardProps {
  channel: Channel;
  index: number;
  onPress: () => void;
}

const LiveCard: React.FC<LiveCardProps> = ({ channel, index, onPress }) => {
  const { lang } = useTranslation();
  const enter = useRef(new Animated.Value(0)).current;
  const meta = groupMeta(channel.group);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 45, 320),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [22, 0],
            }),
          },
        ],
      }}
    >
      <PressableScale onPress={onPress} style={styles.liveCard} accessibilityLabel={channel.name}>
        <View style={[styles.liveCardArt, { backgroundColor: meta.color + '1F' }]}>
          <ChannelLogo channel={channel} size={46} />
          <View style={[styles.liveTag, { backgroundColor: meta.color }]}>
            <Text style={styles.liveTagText}>{COPY[lang].live}</Text>
          </View>
        </View>
        <View style={styles.liveCardBody}>
          <Text style={styles.liveCardName} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={styles.liveCardMeta} numberOfLines={1}>
            {groupLabel(channel.group, lang, meta.label)}
            {channel.quality ? ` · ${channel.quality}` : ''}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
};
interface MovieCardProps {
  movie: Movie;
  index: number;
  onPress: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, index, onPress }) => {
  const { lang } = useTranslation();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 45, 320),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [22, 0],
            }),
          },
        ],
      }}
    >
      <PressableScale
        onPress={onPress}
        style={styles.movieCard}
        accessibilityLabel={movieTitle(movie.id, movie.title, lang)}
      >
        <View style={[styles.poster, { backgroundColor: movie.color }]}>
          <View style={styles.posterSheen} />
          <Ionicons name={movie.icon as any} size={30} color="rgba(255,255,255,0.85)" />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color={AppTheme.colors.accent} />
            <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text style={styles.movieTitle} numberOfLines={1}>
          {movieTitle(movie.id, movie.title, lang)}
        </Text>
        <Text style={styles.movieMeta} numberOfLines={1}>
          {genreLabel(movie.genre, lang)} · {movie.year}
        </Text>
      </PressableScale>
    </Animated.View>
  );
};

interface SectionHeaderProps {
  icon: string;
  title: string;
  hint: string;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  hint,
  color,
  isOpen,
  onToggle,
}) => (
  <PressableScale onPress={onToggle} style={styles.sectionHeader} accessibilityLabel={title}>
    <View style={styles.sectionLeft}>
      <View style={[styles.sectionIcon, { backgroundColor: color + '26' }]}>
        <Ionicons name={icon as any} size={15} color={color} />
      </View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionHint}>{hint}</Text>
      </View>
    </View>
    <Ionicons
      name={isOpen ? 'chevron-up' : 'chevron-down'}
      size={18}
      color={AppTheme.colors.textMuted}
    />
  </PressableScale>
);

const HomePage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const enter = useRef(new Animated.Value(0)).current;

  // شمارنده کلیک مخفی لوگو
  const [logoClicks, setLogoClicks] = useState(0);

  const load = useCallback(async (force: boolean) => {
    try {
      const result = await loadChannels(force);
      setChannels(result.channels);
      setIsOffline(result.isOffline);
    } catch {
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    Animated.timing(enter, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, load]);

  const toggleSection = (key: string) => {
    setClosed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogoPress = () => {
    const nextClicks = logoClicks + 1;
    if (nextClicks >= 7) {
      setLogoClicks(0);
      navigation.navigate('Admin');
    } else {
      setLogoClicks(nextClicks);
    }
  };

  const rise = (start: number, distance: number = 26) => ({
    opacity: enter.interpolate({
      inputRange: [start, Math.min(start + 0.45, 1)],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [start, Math.min(start + 0.45, 1)],
          outputRange: [distance, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  const featured = channels.length > 0 ? channels[0] : null;
  const featuredMovie = MOVIES[0];
  const heroChannelColor = featured ? groupMeta(featured.group).color : featuredMovie.color;

  const openChannel = (channel: Channel) => {
    const meta = groupMeta(channel.group);
    navigation.navigate('Player', {
      title: channel.name,
      subtitle: `${groupLabel(channel.group, lang, meta.label)} · ${copy.live}`,
      url: channel.url,
      accent: meta.color,
      isLive: true,
      hint: channel.url ? copy.channelHintFailed : copy.channelHintNoUrl,
    });
  };

  const openMovie = (movie: Movie) => {
    navigation.navigate('Player', {
      title: movieTitle(movie.id, movie.title, lang),
      subtitle: `${genreLabel(movie.genre, lang)} · ${movie.year} · ${movie.duration} ${copy.min}`,
      url: movie.streamUrl,
      accent: movie.color,
      isLive: false,
      hint: copy.movieHint,
    });
  };

  const groups = useMemo(() => {
    const present: GroupMeta[] = [];
    const seen: Record<string, boolean> = {};
    channels.forEach((channel) => {
      if (!seen[channel.group]) {
        seen[channel.group] = true;
        present.push(groupMeta(channel.group));
      }
    });
    return present;
  }, [channels]);
    return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <View style={styles.header}>
          <View style={styles.brand}>
            <PressableScale onPress={handleLogoPress} style={styles.brandMark}>
              <Ionicons name="play" size={16} color={AppTheme.colors.white} />
            </PressableScale>
            <View>
              <Text style={styles.brandName}>Arshia TV</Text>
              <Text style={styles.brandTag}>{copy.brandTag}</Text>
            </View>
          </View>
          <PressableScale
            onPress={() => navigation.navigate('Search')}
            style={styles.iconButton}
            accessibilityLabel={copy.search}
          >
            <Ionicons name="search" size={19} color={AppTheme.colors.text} />
          </PressableScale>
        </View>

        <Animated.View style={rise(0, 18)}>
          <PressableScale
            onPress={() => featured ? openChannel(featured) : openMovie(featuredMovie)}
            style={[styles.hero, { backgroundColor: heroChannelColor }]}
            activeScale={0.985}
            accessibilityLabel={copy.watchNow}
          >
            <View style={styles.heroShade} />
            <View style={[styles.heroGlow, { backgroundColor: heroChannelColor }]} />
            <ArshiaWatermark style={styles.heroWatermark} />
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <View style={styles.heroDot} />
                <Text style={styles.heroBadgeText}>
                  {featured ? copy.onAirNow : copy.featuredFilm}
                </Text>
              </View>
              {featured && featured.quality ? (
                <View style={styles.heroQuality}>
                  <Text style={styles.heroQualityText}>{featured.quality}</Text>
                </View>
              ) : null}
            </View>
            <View>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {featured ? featured.name : movieTitle(featuredMovie.id, featuredMovie.title, lang)}
              </Text>
              <Text style={styles.heroMeta} numberOfLines={1}>
                {featured ? `${groupLabel(featured.group, lang, groupMeta(featured.group).label)} · ${copy.liveRightNow}` : `${genreLabel(featuredMovie.genre, lang)} · ${featuredMovie.year} · ${featuredMovie.rating.toFixed(1)} ${copy.rating}`}
              </Text>
              <View style={styles.heroAction}>
                <Ionicons name="play" size={14} color={AppTheme.colors.white} />
                <Text style={styles.heroActionText}>{copy.watchNow}</Text>
              </View>
            </View>
          </PressableScale>
        </Animated.View>

        {isOffline ? (
          <Animated.View style={[styles.banner, rise(0.05, 18)]}>
            <Ionicons name="warning-outline" size={18} color={AppTheme.colors.warning} />
            <Text style={styles.bannerText}>{copy.offline}</Text>
          </Animated.View>
        ) : null}

        <Animated.View style={rise(0.12)}>
          <SectionHeader
            icon="radio-outline"
            title={copy.liveNow}
            hint={`${channels.length} ${copy.freeChannels}`}
            color={AppTheme.colors.primary}
            isOpen={!closed.live}
            onToggle={() => toggleSection('live')}
          />
        </Animated.View>

        {!closed.live ? (
          loading && channels.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={AppTheme.colors.primary} />
              <Text style={styles.loadingText}>{copy.loading}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal} contentContainerStyle={styles.horizontalContent}>
              {channels.slice(0, HERO_LIVE_COUNT).map((channel, index) => (
                <LiveCard key={channel.id} channel={channel} index={index} onPress={() => openChannel(channel)} />
              ))}
            </ScrollView>
          )
        ) : null}

        <Animated.View style={rise(0.24)}>
          <SectionHeader
            icon="film-outline"
            title={copy.movies}
            hint={copy.popular}
            color={AppTheme.colors.accent}
            isOpen={!closed.movies}
            onToggle={() => toggleSection('movies')}
          />
        </Animated.View>

        {!closed.movies ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal} contentContainerStyle={styles.horizontalContent}>
            {MOVIES.slice(0, HERO_MOVIE_COUNT).map((movie, index) => (
              <MovieCard key={movie.id} movie={movie} index={index} onPress={() => openMovie(movie)} />
            ))}
          </ScrollView>
        ) : null}
                <Animated.View style={rise(0.36)}>
          <SectionHeader
            icon="grid-outline"
            title={copy.browse}
            hint={copy.shelves}
            color={AppTheme.colors.info}
            isOpen={!closed.groups}
            onToggle={() => toggleSection('groups')}
          />
        </Animated.View>

        {!closed.groups ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal} contentContainerStyle={styles.horizontalContent}>
            {(groups.length ? groups : [groupMeta('News')]).map((meta) => (
              <PressableScale key={meta.key} onPress={() => navigation.navigate('Live', { group: meta.key })} style={[styles.groupChip, { backgroundColor: meta.color + '1F', borderColor: meta.color + '59' }]} accessibilityLabel={groupLabel(meta.key, lang, meta.label)}>
                <Ionicons name={meta.icon as any} size={15} color={meta.color} />
                <Text style={styles.groupChipText}>{groupLabel(meta.key, lang, meta.label)}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        ) : null}

        <Animated.View style={[styles.footer, rise(0.48, 16)]}>
          <ArshiaWatermark size={12} />
          <Text style={styles.footerText}>{copy.footer}</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  scrollContent: { paddingBottom: AppTheme.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: AppTheme.spacing.lg, paddingTop: AppTheme.spacing.sm, paddingBottom: AppTheme.spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 38, height: 38, borderRadius: AppTheme.borderRadius.md, backgroundColor: AppTheme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: AppTheme.spacing.sm, ...AppTheme.elevation.md },
  brandName: { color: AppTheme.colors.text, fontSize: AppTheme.typography.fontSize.xxl, fontWeight: AppTheme.typography.fontWeight.extrabold, letterSpacing: 0.2 },
  brandTag: { color: AppTheme.colors.textMuted, fontSize: 9, letterSpacing: 1.4, fontWeight: AppTheme.typography.fontWeight.semibold, marginTop: 1 },
  iconButton: { width: 40, height: 40, borderRadius: AppTheme.borderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.border },
  hero: { marginHorizontal: AppTheme.spacing.lg, borderRadius: AppTheme.borderRadius.xl, padding: AppTheme.spacing.md, minHeight: 196, justifyContent: 'space-between', overflow: 'hidden', ...AppTheme.elevation.lg },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,9,16,0.42)' },
  heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -60, top: -70, opacity: 0.55 },
  heroWatermark: { position: 'absolute', top: 12, right: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 116 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: AppTheme.borderRadius.full, backgroundColor: 'rgba(6,9,16,0.55)' },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AppTheme.colors.primary, marginRight: 6 },
  heroBadgeText: { color: AppTheme.colors.white, fontSize: 9, letterSpacing: 1, fontWeight: AppTheme.typography.fontWeight.extrabold },
  heroQuality: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: AppTheme.borderRadius.sm, backgroundColor: 'rgba(6,9,16,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  heroQualityText: { color: AppTheme.colors.white, fontSize: 9, fontWeight: AppTheme.typography.fontWeight.bold },
  heroTitle: { color: AppTheme.colors.white, fontSize: 26, fontWeight: AppTheme.typography.fontWeight.extrabold, lineHeight: 30 },
  heroMeta: { color: 'rgba(255,255,255,0.86)', fontSize: AppTheme.typography.fontSize.sm, marginTop: 4 },
  heroAction: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: AppTheme.spacing.md, paddingHorizontal: 14, height: 36, borderRadius: AppTheme.borderRadius.full, backgroundColor: 'rgba(6,9,16,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  heroActionText: { color: AppTheme.colors.white, fontSize: AppTheme.typography.fontSize.sm, fontWeight: AppTheme.typography.fontWeight.semibold, marginLeft: 6 },
  banner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: AppTheme.spacing.lg, marginTop: AppTheme.spacing.md, padding: AppTheme.spacing.md, borderRadius: AppTheme.borderRadius.md, backgroundColor: AppTheme.colors.warning + '14', borderWidth: 1, borderColor: AppTheme.colors.warning + '40' },
  bannerText: { flex: 1, color: AppTheme.colors.textSecondary, fontSize: AppTheme.typography.fontSize.sm, lineHeight: 18, marginLeft: AppTheme.spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: AppTheme.spacing.lg, paddingVertical: AppTheme.spacing.md },
  sectionLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { width: 30, height: 30, borderRadius: AppTheme.borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginRight: AppTheme.spacing.sm },
  sectionTitle: { color: AppTheme.colors.text, fontSize: AppTheme.typography.fontSize.lg, fontWeight: AppTheme.typography.fontWeight.bold },
  sectionHint: { color: AppTheme.colors.textMuted, fontSize: 11, marginTop: 1 },
  horizontal: { flexGrow: 0 },
  horizontalContent: { paddingHorizontal: AppTheme.spacing.lg, alignItems: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: AppTheme.spacing.lg, paddingVertical: AppTheme.spacing.lg },
  loadingText: { color: AppTheme.colors.textSecondary, fontSize: AppTheme.typography.fontSize.sm, marginLeft: AppTheme.spacing.sm },
  liveCard: { width: 138, marginRight: AppTheme.spacing.md, borderRadius: AppTheme.borderRadius.lg, backgroundColor: AppTheme.colors.card, borderWidth: 1, borderColor: AppTheme.colors.border, overflow: 'hidden' },
  liveCardArt: { height: 80, alignItems: 'center', justifyContent: 'center' },
  liveTag: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: AppTheme.borderRadius.xs },
  liveTagText: { color: AppTheme.colors.white, fontSize: 8, letterSpacing: 0.8, fontWeight: AppTheme.typography.fontWeight.extrabold },
  liveCardBody: { padding: AppTheme.spacing.sm },
  liveCardName: { color: AppTheme.colors.text, fontSize: AppTheme.typography.fontSize.sm, fontWeight: AppTheme.typography.fontWeight.semibold },
  liveCardMeta: { color: AppTheme.colors.textMuted, fontSize: 10, marginTop: 3 },
  movieCard: { width: 128, marginRight: AppTheme.spacing.md },
  poster: { height: 170, borderRadius: AppTheme.borderRadius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...AppTheme.elevation.md },
  posterSheen: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.12)', top: -60, right: -50 },
  ratingBadge: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: AppTheme.borderRadius.sm, backgroundColor: 'rgba(6,9,16,0.6)' },
  ratingText: { color: AppTheme.colors.white, fontSize: 10, fontWeight: AppTheme.typography.fontWeight.bold, marginLeft: 3 },
  movieTitle: { color: AppTheme.colors.text, fontSize: AppTheme.typography.fontSize.sm, fontWeight: AppTheme.typography.fontWeight.semibold, marginTop: AppTheme.spacing.sm },
  movieMeta: { color: AppTheme.colors.textMuted, fontSize: 10, marginTop: 2 },
  groupChip: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 14, borderRadius: AppTheme.borderRadius.full, borderWidth: 1, marginRight: AppTheme.spacing.sm },
  groupChipText: { color: AppTheme.colors.text, fontSize: AppTheme.typography.fontSize.sm, fontWeight: AppTheme.typography.fontWeight.semibold, marginLeft: 6 },
  footer: { alignItems: 'center', marginTop: AppTheme.spacing.xl, paddingHorizontal: AppTheme.spacing.xl },
  footerText: { color: AppTheme.colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: AppTheme.spacing.sm },
});

export default HomePage;
        
