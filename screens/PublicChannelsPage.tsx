import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from '../components/PressableScale';
import { useAuth } from '../context/AuthContext';
import {
  listApprovedChannels,
  listApprovedUploads,
  UserChannel,
  UserUpload,
} from '../services/userChannels';
import {
  toggleLike,
  getLikeState,
  toggleFollow,
  getFollowState,
  addComment,
  listComments,
  Comment,
} from '../services/social';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PAD = 14;
const TILE_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP) / 2;

type TabKey = 'home' | 'videos' | 'about';

const PublicChannelsPage: React.FC<any> = ({ navigation }) => {
  const { user, isLoggedIn } = useAuth();
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followState, setFollowState] = useState({ following: false, count: 0 });
  const [likes, setLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');
  const [browseMode, setBrowseMode] = useState(true);

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
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    getFollowState(selectedId, user?.id).then(setFollowState);
  }, [selectedId, user?.id]);

  useEffect(() => {
    if (!activeUploadId) {
      setComments([]);
      return;
    }
    listComments(activeUploadId).then(setComments);
    getLikeState(activeUploadId, user?.id).then((s) =>
      setLikes((prev) => ({ ...prev, [activeUploadId]: s }))
    );
  }, [activeUploadId, user?.id]);

  const channelUploads = useMemo(
    () => uploads.filter((u) => u.channelId === selectedId),
    [uploads, selectedId]
  );
  const selected = channels.find((c) => c.id === selectedId) || null;

  const onFollow = async () => {
    if (!isLoggedIn || !user || !selectedId) {
      Alert.alert('', 'برای دنبال کردن وارد شوید');
      return;
    }
    const res = await toggleFollow({ channelId: selectedId, userId: user.id });
    setFollowState(res);
  };

  const onLike = async (uploadId: string) => {
    if (!isLoggedIn || !user) {
      Alert.alert('', 'برای پسندیدن وارد شوید');
      return;
    }
    const res = await toggleLike({ targetId: uploadId, userId: user.id });
    setLikes((prev) => ({ ...prev, [uploadId]: res }));
  };

  const onComment = async () => {
    if (!isLoggedIn || !user || !activeUploadId) {
      Alert.alert('', 'برای نظر دادن وارد شوید');
      return;
    }
    if (!commentText.trim()) return;
    setCommentBusy(true);
    const res = await addComment({
      targetId: activeUploadId,
      targetType: 'upload',
      userId: user.id,
      userName: user.displayName || user.email || user.phone || 'کاربر',
      text: commentText,
    });
    setCommentBusy(false);
    if (res.ok) {
      setCommentText('');
      setComments(await listComments(activeUploadId));
    } else {
      Alert.alert('خطا', res.message || '');
    }
  };

  const playUpload = (u: UserUpload) => {
    navigation.navigate('Player', {
      title: u.title,
      url: u.url,
      isLive: false,
      accent: AppTheme.colors.primary,
    });
  };

  const openChannel = (id: string) => {
    setSelectedId(id);
    setBrowseMode(false);
    setTab('home');
    setActiveUploadId(null);
  };

  const renderVideoTile = (u: UserUpload) => {
    const like = likes[u.id] || { liked: false, count: u.likeCount || 0 };
    return (
      <PressableScale key={u.id} style={styles.tile} onPress={() => playUpload(u)}>
        <View style={styles.tilePoster}>
          {u.poster ? (
            <Image source={{ uri: u.poster }} style={styles.tileImg} resizeMode="cover" />
          ) : (
            <View style={[styles.tileImg, styles.tilePh]}>
              <Ionicons name="film-outline" size={32} color="rgba(255,255,255,0.35)" />
            </View>
          )}
          <View style={styles.tilePlay}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
          <Text style={styles.tileType}>
            {u.type === 'movie' ? 'فیلم' : u.type === 'series' ? 'سریال' : 'کلیپ'}
          </Text>
        </View>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {u.title}
        </Text>
        <View style={styles.tileActions}>
          <PressableScale
            style={styles.miniBtn}
            onPress={() => {
              onLike(u.id);
            }}
          >
            <Ionicons
              name={like.liked ? 'heart' : 'heart-outline'}
              size={14}
              color={like.liked ? AppTheme.colors.primary : AppTheme.colors.textMuted}
            />
            <Text style={styles.miniBtnText}>{like.count || 0}</Text>
          </PressableScale>
          <PressableScale
            style={styles.miniBtn}
            onPress={() => setActiveUploadId(activeUploadId === u.id ? null : u.id)}
          >
            <Ionicons name="chatbubble-outline" size={14} color={AppTheme.colors.textMuted} />
          </PressableScale>
        </View>
      </PressableScale>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // —— Browse all channels ——
  if (browseMode || !selected) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.top}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.title}>کانال‌های کاربران</Text>
        </View>
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
            <Text style={styles.empty}>هنوز کانال عمومی نیست.</Text>
          ) : (
            <View style={styles.channelGrid}>
              {channels.map((c) => {
                const count = uploads.filter((u) => u.channelId === c.id).length;
                return (
                  <PressableScale
                    key={c.id}
                    style={styles.channelCard}
                    onPress={() => openChannel(c.id)}
                  >
                    {c.logo ? (
                      <Image source={{ uri: c.logo }} style={styles.channelAvatar} />
                    ) : (
                      <View style={[styles.channelAvatar, styles.avatarPh]}>
                        <Ionicons name="tv-outline" size={28} color="rgba(255,255,255,0.45)" />
                      </View>
                    )}
                    <Text style={styles.channelCardName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.channelCardMeta} numberOfLines={1}>
                      {c.ownerName || 'کاربر'} · {count} ویدیو
                    </Text>
                    {c.description ? (
                      <Text style={styles.channelCardDesc} numberOfLines={2}>
                        {c.description}
                      </Text>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // —— Channel profile (Aparat-like) ——
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.top}>
        <PressableScale
          onPress={() => {
            setBrowseMode(true);
            setActiveUploadId(null);
          }}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
        </PressableScale>
        <Text style={styles.title} numberOfLines={1}>
          {selected.name}
        </Text>
      </View>

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
        {/* Profile header */}
        <View style={styles.profile}>
          {selected.logo ? (
            <Image source={{ uri: selected.logo }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, styles.avatarPh]}>
              <Ionicons name="tv-outline" size={36} color="rgba(255,255,255,0.45)" />
            </View>
          )}
          <Text style={styles.profileName}>{selected.name}</Text>
          <Text style={styles.profileOwner}>{selected.ownerName || 'کاربر'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{channelUploads.length}</Text>
              <Text style={styles.statLabel}>ویدیو</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{followState.count}</Text>
              <Text style={styles.statLabel}>دنبال‌کننده</Text>
            </View>
          </View>

          <PressableScale
            style={[styles.followBtn, followState.following && styles.followBtnOn]}
            onPress={onFollow}
          >
            <Ionicons
              name={followState.following ? 'checkmark' : 'person-add-outline'}
              size={16}
              color="#fff"
            />
            <Text style={styles.followBtnText}>
              {followState.following ? 'دنبال می‌کنید' : 'دنبال کردن'}
            </Text>
          </PressableScale>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(
            [
              { key: 'home' as TabKey, label: 'خانه' },
              { key: 'videos' as TabKey, label: 'ویدیوها' },
              { key: 'about' as TabKey, label: 'درباره کانال' },
            ] as const
          ).map((t) => (
            <PressableScale
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabOn]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
            </PressableScale>
          ))}
        </View>

        {/* Tab content */}
        {tab === 'about' ? (
          <View style={styles.aboutBox}>
            <Text style={styles.aboutTitle}>درباره کانال</Text>
            <Text style={styles.aboutBody}>
              {selected.description || 'توضیحی برای این کانال ثبت نشده است.'}
            </Text>
            <View style={styles.aboutStats}>
              <View style={styles.aboutStat}>
                <Ionicons name="film-outline" size={18} color={AppTheme.colors.primary} />
                <Text style={styles.aboutStatText}>{channelUploads.length} ویدیو</Text>
              </View>
              <View style={styles.aboutStat}>
                <Ionicons name="people-outline" size={18} color={AppTheme.colors.primary} />
                <Text style={styles.aboutStatText}>{followState.count} دنبال‌کننده</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>
                {tab === 'home' ? 'آخرین ویدیوها' : 'همه ویدیوها'}
              </Text>
              <Text style={styles.sectionCount}>{channelUploads.length}</Text>
            </View>
            {channelUploads.length === 0 ? (
              <Text style={styles.empty}>این کانال هنوز ویدیویی منتشر نکرده است.</Text>
            ) : (
              <View style={styles.grid}>
                {(tab === 'home' ? channelUploads.slice(0, 6) : channelUploads).map(renderVideoTile)}
              </View>
            )}
          </>
        )}

        {/* Comments panel */}
        {activeUploadId ? (
          <View style={styles.commentsBox}>
            <View style={styles.commentsHead}>
              <Text style={styles.commentsTitle}>نظرات</Text>
              <PressableScale onPress={() => setActiveUploadId(null)}>
                <Ionicons name="close" size={20} color={AppTheme.colors.textMuted} />
              </PressableScale>
            </View>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Text style={styles.commentUser}>{c.userName}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="نظر شما..."
                placeholderTextColor={AppTheme.colors.placeholder}
                value={commentText}
                onChangeText={setCommentText}
              />
              <PressableScale style={styles.commentSend} onPress={onComment} disabled={commentBusy}>
                {commentBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </PressableScale>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppTheme.colors.divider,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 4,
  },
  content: { paddingBottom: 40 },
  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },

  // Browse grid
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GRID_PAD,
    justifyContent: 'space-between',
  },
  channelCard: {
    width: TILE_W,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  channelAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    alignSelf: 'center',
  },
  avatarPh: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelCardName: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  channelCardMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  channelCardDesc: {
    color: AppTheme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },

  // Profile
  profile: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: AppTheme.colors.primary,
  },
  profileName: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  profileOwner: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  statNum: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 22,
    height: 40,
    borderRadius: 20,
  },
  followBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  followBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
    marginHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: AppTheme.colors.primary,
  },
  tabText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextOn: {
    color: AppTheme.colors.primary,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PAD,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },

  // Video grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PAD,
    justifyContent: 'space-between',
  },
  tile: {
    width: TILE_W,
    marginBottom: 16,
  },
  tilePoster: {
    width: TILE_W,
    height: TILE_W * 0.62,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: AppTheme.colors.surface,
  },
  tileImg: {
    width: '100%',
    height: '100%',
  },
  tilePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileType: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tileTitle: {
    color: AppTheme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  tileActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 2,
  },
  miniBtnText: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginLeft: 3,
  },

  // About
  aboutBox: {
    margin: GRID_PAD,
    padding: 16,
    borderRadius: 14,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  aboutTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  aboutBody: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  aboutStats: {
    flexDirection: 'row',
    marginTop: 16,
  },
  aboutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  aboutStatText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
  },

  // Comments
  commentsBox: {
    margin: GRID_PAD,
    padding: 14,
    borderRadius: 14,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  commentsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentsTitle: {
    color: AppTheme.colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  commentRow: {
    marginBottom: 10,
  },
  commentUser: {
    color: AppTheme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  commentText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: AppTheme.colors.text,
    fontSize: 13,
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default PublicChannelsPage;
