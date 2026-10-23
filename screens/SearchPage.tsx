import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import ChannelLogo from '../components/ChannelLogo';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { Channel, groupMeta } from '../data/channels';
import { MOVIES } from '../data/movies';
import { SERIES, seriesTitle } from '../data/series';
import { genreLabel, groupLabel, movieTitle } from '../data/labels';
import { loadChannels } from '../data/playlist';
import { useTranslation } from '../locales';
import { useAdmin } from '../context/AdminContext';
import { listCatalog, CatalogItem } from '../services/contentIngest';

const COPY = {
  en: {
    title: 'Search',
    subtitle: 'Films, live channels and series in one place.',
    placeholder: 'Type a name…',
    all: 'All',
    movies: 'Movies',
    live: 'Live TV',
    series: 'Series',
    hint: 'Start typing and results appear as you go.',
    nothing: 'Nothing matched that name.',
    tryAnother: 'Try a shorter word, or switch the filter to All.',
    loading: 'Loading the channels…',
    film: 'Film',
    channel: 'Channel',
    seriesTag: 'Series',
    noStream: 'No stream attached',
  },
  fa: {
    title: 'جست‌وجو',
    subtitle: 'فیلم، شبکه‌ی زنده و سریال، همه در یک جا.',
    placeholder: 'نام را بنویسید…',
    all: 'همه',
    movies: 'فیلم‌ها',
    live: 'تلویزیون زنده',
    series: 'سریال‌ها',
    hint: 'شروع به نوشتن کنید؛ نتیجه‌ها همان‌جا نمایش داده می‌شوند.',
    nothing: 'چیزی با این نام پیدا نشد.',
    tryAnother: 'واژه‌ی کوتاه‌تری امتحان کنید یا فیلتر را روی «همه» بگذارید.',
    loading: 'در حال بارگذاری شبکه‌ها…',
    film: 'فیلم',
    channel: 'شبکه',
    seriesTag: 'سریال',
    noStream: 'پخش متصل نیست',
  },
};

type Filter = 'all' | 'movie' | 'channel' | 'series';

interface Result {
  id: string;
  kind: Exclude<Filter, 'all'>;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  channel?: Channel;
  movieId?: string;
  seriesId?: string;
  url?: string;
}

/** The matched part of a title is drawn in the accent colour. */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const needle = query.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return <Text style={styles.resultTitle}>{text}</Text>;
  return (
    <Text style={styles.resultTitle} numberOfLines={1}>
      {text.slice(0, at)}
      <Text style={styles.resultMatch}>{text.slice(at, at + needle.length)}</Text>
      {text.slice(at + needle.length)}
    </Text>
  );
};

const SearchPage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

  const [query, setQuery] = useState('');
  const SECRET_ADMIN_KEY = '13zahhra67';

  // Secret keyword opens Admin after PIN unlock flow via navigation
  React.useEffect(() => {
    if (query.trim().toLowerCase() === SECRET_ADMIN_KEY.toLowerCase()) {
      setQuery('');
      // navigate to Admin; AdminPage itself asks for PIN
      try {
        // @ts-ignore
        navigation.navigate('Admin');
      } catch {}
    }
  }, [query, navigation]);

  const [filter, setFilter] = useState<Filter>('all');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await loadChannels(false);
      setChannels(result.channels);
      try {
        const items = await listCatalog(300);
        setCatalog(items);
      } catch {
        setCatalog([]);
      }
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const pool = useMemo<Result[]>(() => {
    const films: Result[] = MOVIES.map((movie) => ({
      id: movie.id,
      kind: 'movie' as const,
      title: movieTitle(movie.id, movie.title, lang),
      subtitle: `${genreLabel(movie.genre, lang)} · ${movie.year}`,
      color: movie.color,
      icon: movie.icon,
      movieId: movie.id,
      url: movie.streamUrl || '',
    }));

    const catalogFilms: Result[] = catalog
      .filter((x) => x.kind === 'movie' || x.kind === 'other' || x.kind === 'series')
      .map((x) => ({
        id: x.id,
        kind: (x.kind === 'series' ? 'series' : 'movie') as Result['kind'],
        title: x.title,
        subtitle: x.category || 'آرشیا تی‌وی',
        color: '#E63946',
        icon: 'videocam-outline',
        url: x.url || '',
      }));

    const lives: Result[] = channels.map((channel) => {
      const meta = groupMeta(channel.group);
      return {
        id: channel.id,
        kind: 'channel' as const,
        title: channel.name,
        subtitle: `${groupLabel(channel.group, lang, meta.label)}${
          channel.url ? '' : ` · ${copy.noStream}`
        }`,
        color: meta.color,
        icon: meta.icon,
        channel,
        url: channel.url,
      };
    });

    const shows: Result[] = SERIES.map((item) => ({
      id: item.id,
      kind: 'series' as const,
      title: seriesTitle(item, lang),
      subtitle: `${genreLabel(item.genre, lang)} · ${item.year}`,
      color: item.color,
      icon: item.icon,
      seriesId: item.id,
    }));

    const seen = new Set<string>();
    const merged: Result[] = [];
    for (const item of films.concat(catalogFilms, lives, shows)) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged;
  }, [channels, catalog, lang, copy.noStream]);

  const needle = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      pool.filter((item) => {
        if (filter !== 'all' && item.kind !== filter) return false;
        if (!needle) return false;
        return (
          item.title.toLowerCase().includes(needle) || item.subtitle.toLowerCase().includes(needle)
        );
      }),
    [pool, filter, needle]
  );

  const open = (item: Result) => {
    if (item.kind === 'series' && item.seriesId && !item.url) {
      navigation.navigate('Series', { seriesId: item.seriesId });
      return;
    }
    navigation.navigate('Player', {
      title: item.title,
      subtitle: item.subtitle,
      url: item.url || '',
      accent: item.color,
      isLive: item.kind === 'channel',
      hint: item.url
        ? ''
        : item.kind === 'channel'
        ? copy.noStream
        : lang === 'fa'
        ? 'برای این عنوان هنوز منبع پخشی وصل نشده است.'
        : 'No source is attached to this title yet.',
    });
  };

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: copy.all },
    { key: 'movie', label: copy.movies },
    { key: 'channel', label: copy.live },
    { key: 'series', label: copy.series },
  ];

  const kindLabel = (kind: Result['kind']) =>
    kind === 'movie' ? copy.film : kind === 'channel' ? copy.channel : copy.seriesTag;

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

      <View style={styles.searchBox}>
        <Ionicons name="search" size={17} color={AppTheme.colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={copy.placeholder}
          placeholderTextColor={AppTheme.colors.placeholder}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <PressableScale onPress={() => setQuery('')} accessibilityLabel={copy.title}>
            <Ionicons name="close-circle" size={18} color={AppTheme.colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        {chips.map((chip) => {
          const active = filter === chip.key;
          return (
            <PressableScale
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={[styles.chip, active ? styles.chipActive : null]}
              accessibilityLabel={chip.label}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {chip.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {loading && channels.length === 0 ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={AppTheme.colors.primary} />
            <Text style={styles.stateText}>{copy.loading}</Text>
          </View>
        ) : null}

        {!needle ? (
          <View style={styles.stateBox}>
            <Ionicons name="search-outline" size={46} color={AppTheme.colors.textMuted} />
            <Text style={styles.stateText}>{copy.hint}</Text>
          </View>
        ) : null}

        {needle && results.length === 0 && !(loading && channels.length === 0) ? (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle-outline" size={46} color={AppTheme.colors.textMuted} />
            <Text style={styles.stateTitle}>{copy.nothing}</Text>
            <Text style={styles.stateText}>{copy.tryAnother}</Text>
          </View>
        ) : null}

        {results.map((item) => (
          <InsetPressable
            key={`${item.kind}-${item.id}`}
            onPress={() => open(item)}
            accent={item.color}
            style={styles.result}
            accessibilityLabel={item.title}
          >
            {item.channel ? (
              <ChannelLogo channel={item.channel} size={40} />
            ) : (
              <View style={[styles.resultArt, { backgroundColor: item.color + '2E' }]}>
                <Ionicons name={item.icon as any} size={19} color={item.color} />
              </View>
            )}
            <View style={styles.resultBody}>
              <Highlight text={item.title} query={query} />
              <Text style={styles.resultMeta} numberOfLines={1}>
                {kindLabel(item.kind)} · {item.subtitle}
              </Text>
            </View>
            <Ionicons name="play" size={15} color={AppTheme.colors.textMuted} />
          </InsetPressable>
        ))}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    marginHorizontal: AppTheme.spacing.lg,
    paddingHorizontal: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: '#0B111C',
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.7)',
    borderLeftColor: 'rgba(0,0,0,0.7)',
    borderBottomColor: 'rgba(255,255,255,0.10)',
    borderRightColor: 'rgba(255,255,255,0.10)',
  },
  input: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    marginLeft: AppTheme.spacing.sm,
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.md,
  },
  chip: {
    height: 34,
    paddingHorizontal: 13,
    justifyContent: 'center',
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
  chipText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
  },
  chipTextActive: {
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
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
  },
  resultArt: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: {
    flex: 1,
    marginLeft: AppTheme.spacing.sm,
    marginRight: AppTheme.spacing.sm,
  },
  resultTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  resultMatch: {
    color: AppTheme.colors.accent,
  },
  resultMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
});

export default SearchPage;
      
