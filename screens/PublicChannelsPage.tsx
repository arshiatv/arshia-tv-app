import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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

  const channelUploads = uploads.filter((u) => u.channelId === selectedId);
  const selected = channels.find((c) => c.id === selectedId) || null;

  const onFollow = async () => {
    if (!isLoggedIn || !user || !selectedId) {
      Alert.alert('', 'ورود لازم است');
      return;
    }
    const res = await toggleFollow({ channelId: selectedId, userId: user.id });
    setFollowState(res);
  };

  const onLike = async (uploadId: string) => {
    if (!isLoggedIn || !user) {
      Alert.alert('', 'ورود لازم است');
      return;
    }
    const res = await toggleLike({ targetId: uploadId, userId: user.id });
    setLikes((prev) => ({ ...prev, [uploadId]: res }));
  };

  const onComment = async () => {
    if (!isLoggedIn || !user || !activeUploadId) {
      Alert.alert('', 'ورود لازم است');
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
            <Text style={styles.empty}>هنوز کانالی نیست.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
              {channels.map((c) => (
                <PressableScale
                  key={c.id}
                  style={[styles.chChip, selectedId === c.id && styles.chChipOn]}
                  onPress={() => {
                    setSelectedId(c.id);
                    setActiveUploadId(null);
                  }}
                >
                  <Text style={[styles.chChipText, selectedId === c.id && styles.chChipTextOn]}>
                    {c.name}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          )}

          {selected ? (
            <View style={styles.headerCard}>
              <Text style={styles.chName}>{selected.name}</Text>
              {selected.description ? (
                <Text style={styles.chDesc}>{selected.description}</Text>
              ) : null}
              <Text style={styles.meta}>
                {followState.count} دنبال‌کننده · {channelUploads.length} محتوا
              </Text>
              <PressableScale
                style={[styles.followBtn, followState.following && styles.followBtnOn]}
                onPress={onFollow}
              >
                <Text style={styles.followText}>
                  {followState.following ? 'دنبال می‌کنید' : 'دنبال کردن'}
                </Text>
              </PressableScale>
            </View>
          ) : null}

          {channelUploads.map((u) => (
            <View key={u.id} style={styles.card}>
              <Text style={styles.cardTitle}>{u.title}</Text>
              <Text style={styles.cardMeta}>
                {u.category || 'عمومی'} · {u.type}
              </Text>
              {u.description ? <Text style={styles.cardDesc}>{u.description}</Text> : null}
              <View style={styles.actions}>
                <PressableScale
                  style={styles.actionBtn}
                  onPress={() =>
                    navigation.navigate('Player', {
                      title: u.title,
                      url: u.url,
                      subtitle: selected?.name || '',
                    })
                  }
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.actionText}>پخش</Text>
                </PressableScale>
                <PressableScale style={styles.actionGhost} onPress={() => onLike(u.id)}>
                  <Ionicons
                    name={likes[u.id]?.liked ? 'heart' : 'heart-outline'}
                    size={16}
                    color={AppTheme.colors.primary}
                  />
                  <Text style={styles.actionGhostText}>{likes[u.id]?.count || 0}</Text>
                </PressableScale>
                <PressableScale
                  style={styles.actionGhost}
                  onPress={() => setActiveUploadId(activeUploadId === u.id ? null : u.id)}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={AppTheme.colors.textSecondary} />
                  <Text style={styles.actionGhostText}>کامنت</Text>
                </PressableScale>
              </View>

              {activeUploadId === u.id ? (
                <View style={styles.commentBox}>
                  {comments.map((c) => (
                    <View key={c.id} style={styles.commentItem}>
                      <Text style={styles.commentUser}>{c.userName}</Text>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  ))}
                  <TextInput
                    style={styles.input}
                    placeholder="نظر شما..."
                    placeholderTextColor={AppTheme.colors.placeholder}
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <PressableScale style={styles.followBtn} onPress={onComment} disabled={commentBusy}>
                    <Text style={styles.followText}>{commentBusy ? '...' : 'ارسال نظر'}</Text>
                  </PressableScale>
                </View>
              ) : null}
            </View>
          ))}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
  },
  title: { color: AppTheme.colors.text, fontSize: 18, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  empty: { color: AppTheme.colors.textMuted, textAlign: 'center', marginTop: 40 },
  row: { marginBottom: 12 },
  chChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  chChipOn: {
    backgroundColor: AppTheme.colors.primary + '22',
    borderColor: AppTheme.colors.primary,
  },
  chChipText: { color: AppTheme.colors.textSecondary, fontWeight: '700' },
  chChipTextOn: { color: AppTheme.colors.primary },
  headerCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  chName: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  chDesc: {
    color: AppTheme.colors.textSecondary,
    marginTop: 6,
    textAlign: 'right',
    fontSize: 13,
  },
  meta: {
    color: AppTheme.colors.textMuted,
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
  },
  followBtn: {
    marginTop: 12,
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  followBtnOn: { backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.primary },
  followText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  cardMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  cardDesc: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'right',
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  actionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  actionGhostText: { color: AppTheme.colors.textSecondary, fontWeight: '700', fontSize: 12 },
  commentBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: AppTheme.colors.border, paddingTop: 10 },
  commentItem: { marginBottom: 8 },
  commentUser: { color: AppTheme.colors.primary, fontWeight: '800', fontSize: 12, textAlign: 'right' },
  commentText: { color: AppTheme.colors.text, fontSize: 13, textAlign: 'right', marginTop: 2 },
  input: {
    backgroundColor: AppTheme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: AppTheme.colors.text,
    textAlign: 'right',
    marginTop: 8,
  },
});

export default PublicChannelsPage;
