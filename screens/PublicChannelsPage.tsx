import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from '../components/PressableScale';
import {
  listApprovedChannels,
  listApprovedUploads,
  UserChannel,
  UserUpload,
} from '../services/userChannels';

const PublicChannelsPage: React.FC<any> = ({ navigation }) => {
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [chs, ups] = await Promise.all([listApprovedChannels(), listApprovedUploads()]);
      setChannels(chs);
      setUploads(ups);
      if (!selectedId && chs[0]) setSelectedId(chs[0].id);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const channelUploads = uploads.filter((u) => u.channelId === selectedId);
  const selected = channels.find((c) => c.id === selectedId) || null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
        </PressableScale>
        <Text style={styles.title}>کانال‌های کاربران</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={AppTheme.colors.primary}
            />
          }
        >
          {channels.length === 0 ? (
            <Text style={styles.empty}>هنوز کانال تاییدشده‌ای نیست.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
              {channels.map((c) => (
                <PressableScale
                  key={c.id}
                  style={[styles.chip, selectedId === c.id && styles.chipActive]}
                  onPress={() => setSelectedId(c.id)}
                >
                  <Text style={[styles.chipText, selectedId === c.id && styles.chipTextActive]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          )}

          {selected ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{selected.name}</Text>
              <Text style={styles.cardMeta}>{selected.ownerName}</Text>
              {selected.description ? (
                <Text style={styles.cardDesc}>{selected.description}</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.section}>محتوا</Text>
          {channelUploads.length === 0 ? (
            <Text style={styles.empty}>محتوایی برای این کانال نیست.</Text>
          ) : (
            channelUploads.map((u) => (
              <PressableScale
                key={u.id}
                style={styles.item}
                onPress={() =>
                  navigation.navigate('Player', {
                    title: u.title,
                    subtitle: selected?.name || '',
                    url: u.url,
                    isLive: false,
                  })
                }
              >
                <View style={styles.itemIcon}>
                  <Ionicons name="play" size={18} color={AppTheme.colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {u.title}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {u.type === 'series' ? 'سریال' : u.type === 'clip' ? 'کلیپ' : 'فیلم'}
                    {u.description ? ` · ${u.description}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.textMuted} />
              </PressableScale>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.colors.text,
    marginRight: 8,
  },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: AppTheme.colors.textMuted, textAlign: 'right', marginVertical: 12 },
  row: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginLeft: 8,
  },
  chipActive: {
    backgroundColor: AppTheme.colors.primary + '22',
    borderColor: AppTheme.colors.primary,
  },
  chipText: { color: AppTheme.colors.textSecondary, fontWeight: '600', maxWidth: 140 },
  chipTextActive: { color: AppTheme.colors.primary },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 16,
  },
  cardTitle: { color: AppTheme.colors.text, fontWeight: '700', fontSize: 16, textAlign: 'right' },
  cardMeta: { color: AppTheme.colors.accent, fontSize: 12, textAlign: 'right', marginTop: 4 },
  cardDesc: { color: AppTheme.colors.textSecondary, fontSize: 13, textAlign: 'right', marginTop: 8 },
  section: {
    color: AppTheme.colors.text,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 10,
    fontSize: 15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 10,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { color: AppTheme.colors.text, fontWeight: '600', textAlign: 'right' },
  itemMeta: { color: AppTheme.colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 2 },
});

export default PublicChannelsPage;
