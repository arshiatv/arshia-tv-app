import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { Episode, SERIES, Season, Series, seriesTitle } from '../data/series';
import { genreLabel } from '../data/labels';
import { useFavorites } from '../context/FavoritesContext';
import { useTranslation } from '../locales';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - AppTheme.spacing.lg * 2 - GRID_GAP) / 2;

const COPY = {
  en: {
    title: 'Series',
    subtitle: 'Iranian and international shows, season by season.',
    seasons: 'seasons',
    season: 'Season',
    episode: 'Episode',
    episodes: 'episodes',
    play: 'Play the first episode',
    close: 'Close',
    save: 'Add to My Favorites',
    saved: 'In My Favorites',
    noSource: 'No source is attached to this episode yet.',
    min: 'min',
  },
  fa: {
    title: 'سریال‌ها',
    subtitle: 'سریال‌های ایرانی و خارجی، فصل به فصل.',
    seasons: 'فصل',
    season: 'فصل',
    episode: 'قسمت',
    episodes: 'قسمت',
    play: 'پخش اولین قسمت',
    close: 'بستن',
    save: 'افزودن به علاقه‌مندی‌ها',
    saved: 'در علاقه‌مندی‌ها',
    noSource: 'برای این قسمت هنوز منبع پخشی وصل نشده است.',
    min: 'دقیقه',
  },
};

interface SeriesCardProps {
  item: Series;
  index: number;
  onPress: () => void;
}

const SeriesCard: React.FC<SeriesCardProps> = ({ item, index, onPress }) => {
  const { lang } = useTranslation();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 60, 340),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const episodeCount = item.seasons.reduce((sum, season) => sum + season.episodes.length, 0);

  return (
    <Animated.View
      style={[
        styles.gridItem,
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <PressableScale onPress={onPress} style={styles.card} accessibilityLabel={item.titleFa}>
        <View style={[styles.cardArt, { backgroundColor: item.color }]}>
          <View style={styles.cardSheen} />
          <Ionicons name={item.icon as any} size={30} color="rgba(255,255,255,0.88)" />
          <View style={styles.cardRating}>
            <Ionicons name="star" size={10} color={AppTheme.colors.accent} />
            <Text style={styles.cardRatingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {seriesTitle(item, lang)}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {genreLabel(item.genre, lang)} · {item.year}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const SeriesPage: React.FC<any> = ({ navigation, route }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [selected, setSelected] = useState<Series | null>(null);
  const [openSeason, setOpenSeason] = useState('');
  const sheetY = useRef(new Animated.Value(560)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const openDetail = (item: Series) => {
    setSelected(item);
    setOpenSeason(item.seasons[0] ? item.seasons[0].id : '');
    sheetY.setValue(560);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 5 }),
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 560,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setSelected(null));
  };

  // Arriving from Search with a series already picked out.
  useEffect(() => {
    const wanted = route?.params?.seriesId;
    if (!wanted) return;
    const found = SERIES.find((item) => item.id === wanted);
    if (found) openDetail(found);
  }, [route?.params?.seriesId]);

  const playEpisode = (item: Series, season: Season, episode: Episode) => {
    navigation.navigate('Player', {
      title: seriesTitle(item, lang),
      subtitle: `${copy.season} ${season.number} · ${copy.episode} ${episode.number} · ${episode.duration} ${copy.min}`,
      url: '',
      accent: item.color,
      isLive: false,
      hint: copy.noSource,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel={copy.title}
        >
          <Ionicons name="arrow-back" size={19} color={AppTheme.colors.text} />
        </PressableScale>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
        <ArshiaWatermark size={11} />
      </View>

      <FlatList
        data={SERIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <SeriesCard item={item} index={index} onPress={() => openDetail(item)} />
        )}
      />

      {selected ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
            <TouchableWithoutFeedback onPress={closeDetail}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: insets.bottom + AppTheme.spacing.lg,
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetArt, { backgroundColor: selected.color }]}>
                <Ionicons name={selected.icon as any} size={26} color="rgba(255,255,255,0.9)" />
              </View>
              <View style={styles.sheetHeadText}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {seriesTitle(selected, lang)}
                </Text>
                <Text style={styles.sheetMeta}>
                  {selected.year} · {lang === 'fa' ? selected.countryFa : selected.country} ·{' '}
                  {genreLabel(selected.genre, lang)}
                </Text>
              </View>
              <ArshiaWatermark size={10} />
            </View>

            <View style={styles.sheetChips}>
              <View style={[styles.chip, styles.chipActive]}>
                <Text style={styles.chipTextActive}>
                  {selected.seasons.length} {copy.seasons}
                </Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="star" size={11} color={AppTheme.colors.accent} />
                <Text style={styles.chipRatingText}>{selected.rating.toFixed(1)}</Text>
              </View>
            </View>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetSynopsis}>
                {lang === 'fa' ? selected.synopsisFa : selected.synopsis}
              </Text>

              {selected.seasons.map((season) => {
                const isOpen = openSeason === season.id;
                return (
                  <View key={season.id} style={styles.seasonBox}>
                    <PressableScale
                      onPress={() => setOpenSeason(isOpen ? '' : season.id)}
                      style={styles.seasonHead}
                      accessibilityLabel={`${copy.season} ${season.number}`}
                    >
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={AppTheme.colors.textMuted}
                      />
                      <Text style={styles.seasonLabel}>
                        {copy.season} {season.number}
                      </Text>
                      <Text style={styles.seasonCount}>
                        {season.episodes.length} {copy.episodes}
                      </Text>
                    </PressableScale>

                    {isOpen
                      ? season.episodes.map((episode) => (
                          <InsetPressable
                            key={episode.id}
                            onPress={() => playEpisode(selected, season, episode)}
                            accent={selected.color}
                            style={styles.episode}
                            accessibilityLabel={`${copy.episode} ${episode.number}`}
                          >
                            <View style={styles.episodeBadge}>
                              <Text style={styles.episodeBadgeText}>{episode.number}</Text>
                            </View>
                            <Text style={styles.episodeTitle}>
                              {copy.episode} {episode.number}
                            </Text>
                            <Text style={styles.episodeLength}>
                              {episode.duration} {copy.min}
                            </Text>
                            <Ionicons name="play" size={14} color={AppTheme.colors.textMuted} />
                          </InsetPressable>
                        ))
                      : null}
                  </View>
                );
              })}
            </ScrollView>

            <PressableScale
              onPress={() =>
                toggleFavorite({
                  id: selected.id,
                  kind: 'series',
                  title: seriesTitle(selected, lang),
                  subtitle: `${genreLabel(selected.genre, lang)} · ${selected.year}`,
                  color: selected.color,
                  icon: selected.icon,
                })
              }
              style={styles.saveButton}
              accessibilityLabel={copy.save}
            >
              <Ionicons
                name={isFavorite(selected.id) ? 'heart' : 'heart-outline'}
                size={16}
                color={AppTheme.colors.white}
              />
              <Text style={styles.saveButtonText}>
                {isFavorite(selected.id) ? copy.saved : copy.save}
              </Text>
            </PressableScale>

            <PressableScale
              onPress={() => {
                const first = selected.seasons[0];
                if (first && first.episodes[0]) playEpisode(selected, first, first.episodes[0]);
              }}
              style={styles.playButton}
              accessibilityLabel={copy.play}
            >
              <Ionicons name="play" size={18} color={AppTheme.colors.white} />
              <Text style={styles.playButtonText}>{copy.play}</Text>
            </PressableScale>

            <PressableScale onPress={closeDetail} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{copy.close}</Text>
            </PressableScale>
          </Animated.View>
        </View>
      ) : null}
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
    justifyContent: 'space-between',
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.sm,
    paddingBottom: AppTheme.spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginRight: AppTheme.spacing.md,
  },
  headerText: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
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
  gridContent: {
    paddingHorizontal: AppTheme.spacing.lg,
    paddingBottom: AppTheme.spacing.xxl,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  cardArt: {
    height: CARD_WIDTH * 0.95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSheen: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.13)',
    top: -60,
    right: -50,
  },
  cardRating: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: AppTheme.borderRadius.sm,
    backgroundColor: 'rgba(6,9,16,0.6)',
  },
  cardRatingText: {
    color: AppTheme.colors.white,
    fontSize: 10,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: 3,
  },
  cardBody: {
    padding: AppTheme.spacing.sm,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  cardMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppTheme.colors.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '86%',
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.sm,
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: AppTheme.borderRadius.xxl,
    borderTopRightRadius: AppTheme.borderRadius.xxl,
    borderTopWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.elevation.xl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.disabled,
    marginBottom: AppTheme.spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetArt: {
    width: 54,
    height: 54,
    borderRadius: AppTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.md,
  },
  sheetHeadText: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  sheetTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.xl,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
  },
  sheetMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 3,
  },
  sheetChips: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppTheme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 11,
    marginRight: AppTheme.spacing.sm,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  chipActive: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  chipTextActive: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  chipRatingText: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 4,
  },
  sheetScroll: {
    marginTop: AppTheme.spacing.md,
  },
  sheetSynopsis: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.md,
    lineHeight: 21,
  },
  seasonBox: {
    marginTop: AppTheme.spacing.md,
  },
  seasonHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  seasonLabel: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: AppTheme.spacing.sm,
  },
  seasonCount: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
  },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginTop: AppTheme.spacing.sm,
  },
  episodeBadge: {
    width: 26,
    height: 26,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  episodeBadgeText: {
    color: AppTheme.colors.text,
    fontSize: 11,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  episodeTitle: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: AppTheme.spacing.sm,
  },
  episodeLength: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginRight: AppTheme.spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.secondary,
    marginTop: AppTheme.spacing.md,
  },
  saveButtonText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 6,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.primary,
    marginTop: AppTheme.spacing.sm,
    ...AppTheme.elevation.md,
  },
  playButtonText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: AppTheme.spacing.sm,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    marginTop: AppTheme.spacing.xs,
  },
  closeButtonText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.medium,
  },
});

export default SeriesPage;

