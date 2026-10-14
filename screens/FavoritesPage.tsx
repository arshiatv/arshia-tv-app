import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import ChannelLogo from '../components/ChannelLogo';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { FavoriteItem, useFavorites } from '../context/FavoritesContext';
import { useTranslation } from '../locales';

const COPY = {
  en: {
    title: 'My Favorites',
    subtitle: 'Everything you saved, ready to play.',
    all: 'All',
    movies: 'Movies',
    live: 'Live Channels',
    series: 'Series',
    empty: 'Nothing saved yet',
    emptyText:
      'Tap the heart on a film, a series or the programme panel on Live TV and it shows up here.',
    remove: 'Remove',
    play: 'Play',
    session: 'Favorites last for as long as the app stays open, so they start empty again after a restart.',
  },
  fa: {
    title: 'علاقه‌مندی‌های من',
    subtitle: 'هر چیزی که ذخیره کرده‌اید، آماده‌ی پخش.',
    all: 'همه',
    movies: 'فیلم‌ها',
    live: 'شبکه‌های زنده',
    series: 'سریال‌ها',
    empty: 'هنوز چیزی ذخیره نشده',
    emptyText:
      'روی قلبِ یک فیلم، یک سریال یا پنل برنامه در تلویزیون زنده بزنید تا اینجا نمایش داده شود.',
    remove: 'حذف',
    play: 'پخش',
    session: 'علاقه‌مندی‌ها تا وقتی برنامه باز است باقی می‌مانند و پس از بسته‌شدن، دوباره خالی شروع می‌شوند.',
  },
};

type Tab = 'all' | 'movie' | 'channel' | 'series';

const FavoritesPage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const { favorites, toggleFavorite } = useFavorites();
  const [tab, setTab] = useState<Tab>('all');

  const visible = useMemo(
    () => (tab === 'all' ? favorites : favorites.filter((item) => item.kind === tab)),
    [favorites, tab]
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: copy.all },
    { key: 'movie', label: copy.movies },
    { key: 'channel', label: copy.live },
    { key: 'series', label: copy.series },
  ];

  const open = (item: FavoriteItem) => {
    navigation.navigate('Player', {
      title: item.title,
      subtitle: item.subtitle,
      url: item.url || '',
      accent: item.color,
      isLive: item.kind === 'channel',
      hint: lang === 'fa' ? 'برای این مورد منبع پخشی وصل نشده است.' : 'No source is attached to this one yet.',
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

      <View style={styles.tabRow}>
        {tabs.map((entry) => {
          const active = tab === entry.key;
          return (
            <PressableScale
              key={entry.key}
              onPress={() => setTab(entry.key)}
              style={[styles.tab, active ? styles.tabActive : null]}
              accessibilityLabel={entry.label}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                {entry.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {visible.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="heart-outline" size={46} color={AppTheme.colors.textMuted} />
            <Text style={styles.stateTitle}>{copy.empty}</Text>
            <Text style={styles.stateText}>{copy.emptyText}</Text>
          </View>
        ) : null}

        {visible.map((item) => (
          <InsetPressable
            key={`${item.kind}-${item.id}`}
            onPress={() => open(item)}
            accent={item.color}
            style={styles.row}
            accessibilityLabel={item.title}
          >
            {item.channel ? (
              <ChannelLogo channel={item.channel} size={42} />
            ) : (
              <View style={[styles.rowArt, { backgroundColor: item.color + '2E' }]}>
                <Ionicons name={item.icon as any} size={19} color={item.color} />
              </View>
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            <PressableScale
              onPress={() => open(item)}
              style={styles.rowPlay}
              accessibilityLabel={copy.play}
            >
              <Ionicons name="play" size={14} color={item.color} />
            </PressableScale>
            <PressableScale
              onPress={() => toggleFavorite(item)}
              style={styles.rowRemove}
              accessibilityLabel={copy.remove}
            >
              <Ionicons name="heart" size={16} color={AppTheme.colors.primary} />
            </PressableScale>
          </InsetPressable>
        ))}

        {favorites.length > 0 ? (
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={AppTheme.colors.textMuted} />
            <Text style={styles.noteText}>{copy.session}</Text>
          </View>
        ) : null}
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: AppTheme.spacing.lg,
  },
  tab: {
    height: 34,
    paddingHorizontal: 13,
    justifyContent: 'center',
    marginRight: AppTheme.spacing.sm,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  tabActive: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  tabText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
  },
  tabTextActive: {
    color: AppTheme.colors.white,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  content: {
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.xxl,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: AppTheme.spacing.xxl,
    paddingHorizontal: AppTheme.spacing.lg,
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
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
  },
  rowArt: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    marginLeft: AppTheme.spacing.sm,
    marginRight: AppTheme.spacing.sm,
  },
  rowTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  rowMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  rowPlay: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginRight: AppTheme.spacing.sm,
  },
  rowRemove: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.primary + '1F',
  },
  note: {
    flexDirection: 'row',
    marginTop: AppTheme.spacing.md,
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

export default FavoritesPage;
  
