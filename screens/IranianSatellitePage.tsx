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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import ChannelLogo from '../components/ChannelLogo';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { Channel } from '../data/channels';
import { Network, NETWORKS, networkFor, networkLabel } from '../data/satellite';
import { loadChannels } from '../data/playlist';
import { useTranslation } from '../locales';

const COPY = {
  en: {
    title: 'Iranian Satellite',
    subtitle: 'Persian-language networks, grouped by name.',
    loading: 'Loading the networks…',
    offline: 'The playlist could not be reached, so this list is incomplete. Pull down to try again.',
    empty: 'No Persian-language channel is in the playlist right now. Pull down to try again.',
    channels: 'channels',
    channel: 'channel',
    live: 'LIVE',
    onAir: 'On air now',
    noStream: 'No stream attached',
    note: 'Every network here is carried by the same public free-to-air playlists as Live TV.',
  },
  fa: {
    title: 'شبکه‌های ماهواره‌ای ایرانی',
    subtitle: 'شبکه‌های فارسی‌زبان، دسته‌بندی‌شده بر اساس نام.',
    loading: 'در حال بارگذاری شبکه‌ها…',
    offline: 'فهرست پخش در دسترس نبود، پس این فهرست کامل نیست. برای تلاش دوباره صفحه را پایین بکشید.',
    empty: 'در حال حاضر شبکه‌ی فارسی‌زبانی در فهرست نیست. برای تلاش دوباره صفحه را پایین بکشید.',
    channels: 'شبکه',
    channel: 'شبکه',
    live: 'زنده',
    onAir: 'همین حالا پخش می‌شود',
    noStream: 'پخش متصل نیست',
    note: 'همه‌ی شبکه‌های این صفحه از همان فهرست‌های عمومی و رایگانِ تلویزیون زنده می‌آیند.',
  },
};

interface NetworkRowProps {
  channel: Channel;
  index: number;
  onPress: () => void;
}

const NetworkChannelRow: React.FC<NetworkRowProps> = ({ channel, index, onPress }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 340,
      delay: Math.min(index * 30, 260),
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
      <InsetPressable onPress={onPress} style={styles.row} accessibilityLabel={channel.name}>
        <ChannelLogo channel={channel} size={42} />
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {channel.url ? copy.onAir : copy.noStream}
            {channel.quality ? ` · ${channel.quality}` : ''}
          </Text>
        </View>
        {channel.quality ? (
          <View style={styles.qualityPill}>
            <Text style={styles.qualityText}>{channel.quality}</Text>
          </View>
        ) : null}
        <View style={styles.playDot}>
          <Ionicons name="play" size={13} color={AppTheme.colors.text} />
        </View>
      </InsetPressable>
    </Animated.View>
  );
};

const IranianSatellitePage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openNetwork, setOpenNetwork] = useState('');
  const enter = useRef(new Animated.Value(0)).current;

  const load = useCallback(async (force: boolean) => {
    const result = await loadChannels(force);
    setChannels(result.channels);
    setIsOffline(result.isOffline);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(false);
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, load]);

  const sections = useMemo(() => {
    const buckets: Record<string, Channel[]> = {};
    channels.forEach((channel) => {
      const network = networkFor(channel);
      if (!network) return;
      if (!buckets[network.key]) buckets[network.key] = [];
      buckets[network.key].push(channel);
    });
    return NETWORKS.filter((network) => buckets[network.key] && buckets[network.key].length > 0).map(
      (network) => ({ network, items: buckets[network.key] })
    );
  }, [channels]);

  useEffect(() => {
    if (openNetwork || !sections.length) return;
    setOpenNetwork(sections[0].network.key);
  }, [sections, openNetwork]);

  const openChannel = (channel: Channel, network: Network) => {
    navigation.navigate('Player', {
      title: channel.name,
      subtitle: `${networkLabel(network, lang)} · ${copy.live}`,
      url: channel.url,
      accent: network.color,
      isLive: true,
      hint: copy.noStream,
    });
  };

  const total = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel={copy.title}
          >
            <Ionicons name="arrow-back" size={19} color={AppTheme.colors.text} />
          </PressableScale>
          <View style={styles.headerText}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>
              {loading ? copy.loading : `${total} ${copy.channels} · ${copy.subtitle}`}
            </Text>
          </View>
          <ArshiaWatermark size={11} />
        </View>

        {isOffline ? (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={18} color={AppTheme.colors.warning} />
            <Text style={styles.bannerText}>{copy.offline}</Text>
          </View>
        ) : null}

        {loading && channels.length === 0 ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
            <Text style={styles.stateText}>{copy.loading}</Text>
          </View>
        ) : null}

        {!loading && sections.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons name="globe-outline" size={46} color={AppTheme.colors.textMuted} />
            <Text style={styles.stateText}>{copy.empty}</Text>
          </View>
        ) : null}

        {sections.map((section) => {
          const isOpen = openNetwork === section.network.key;
          return (
            <Animated.View key={section.network.key} style={{ opacity: enter }}>
              <InsetPressable
                onPress={() => setOpenNetwork(isOpen ? '' : section.network.key)}
                accent={section.network.color}
                style={[styles.group, isOpen ? { backgroundColor: section.network.color + '1A' } : null]}
                accessibilityLabel={networkLabel(section.network, lang)}
              >
                <View style={styles.groupTop}>
                  <View
                    style={[styles.groupIcon, { backgroundColor: section.network.color + '2E' }]}
                  >
                    <Ionicons
                      name={section.network.icon as any}
                      size={18}
                      color={section.network.color}
                    />
                  </View>
                  <View style={styles.groupHead}>
                    <Text style={styles.groupLabel}>{networkLabel(section.network, lang)}</Text>
                    <Text style={styles.groupCount}>
                      {section.items.length} {section.items.length === 1 ? copy.channel : copy.channels}
                    </Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isOpen ? section.network.color : AppTheme.colors.textMuted}
                  />
                </View>
              </InsetPressable>

              {isOpen
                ? section.items.map((channel, index) => (
                    <NetworkChannelRow
                      key={channel.id}
                      channel={channel}
                      index={index}
                      onPress={() => openChannel(channel, section.network)}
                    />
                  ))
                : null}
            </Animated.View>
          );
        })}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={AppTheme.colors.textMuted} />
          <Text style={styles.noteText}>{copy.note}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  content: {
    paddingHorizontal: AppTheme.spacing.lg,
    paddingBottom: AppTheme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: AppTheme.spacing.sm,
    paddingBottom: AppTheme.spacing.lg,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.warning + '14',
    borderWidth: 1,
    borderColor: AppTheme.colors.warning + '40',
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
  stateText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: AppTheme.spacing.md,
    textAlign: 'center',
    lineHeight: 19,
  },
  group: {
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
  },
  groupTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.sm,
  },
  groupHead: {
    flex: 1,
  },
  groupLabel: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  groupCount: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
    marginLeft: AppTheme.spacing.md,
  },
  rowBody: {
    flex: 1,
    marginLeft: AppTheme.spacing.sm,
    marginRight: AppTheme.spacing.sm,
  },
  rowName: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  rowMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  qualityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: AppTheme.borderRadius.xs,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginRight: AppTheme.spacing.sm,
  },
  qualityText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 9,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  playDot: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  note: {
    flexDirection: 'row',
    marginTop: AppTheme.spacing.lg,
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

export default IranianSatellitePage;
      
