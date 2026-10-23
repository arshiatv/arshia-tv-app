import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AppTheme } from '../theme/AppTheme';
import PressableScale from '../components/PressableScale';
import { useAuth } from '../context/AuthContext';
import {
  createUserChannel,
  listMyChannels,
  listMyUploads,
  submitUpload,
  updateUserUpload,
  deleteUserUpload,
  updateUserChannel,
  UserChannel,
  UserUpload,
} from '../services/userChannels';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PAD = 14;
const TILE_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP) / 2;

const CATEGORIES = ['عمومی', 'فیلم', 'سریال', 'کلیپ', 'ورزشی', 'موسیقی', 'آموزشی', 'کمدی'];

type TabKey = 'home' | 'videos' | 'upload' | 'settings';

const MyChannelPage: React.FC<any> = ({ navigation }) => {
  const { user, isLoggedIn } = useAuth();
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadPoster, setUploadPoster] = useState('');
  const [uploadCategory, setUploadCategory] = useState('عمومی');
  const [uploadType, setUploadType] = useState<'movie' | 'series' | 'clip'>('movie');

  const [editUploadId, setEditUploadId] = useState<string | null>(null);
  const [editChannel, setEditChannel] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');

  const channel = channels[0] || null;

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const list = await listMyChannels(user.id);
    setChannels(list);
    const ups = await listMyUploads(user.id);
    setUploads(ups);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigation.replace('Auth');
      return;
    }
    reload();
  }, [isLoggedIn, reload, navigation]);

  const onCreate = async () => {
    if (!user) return;
    setBusy(true);
    const res = await createUserChannel({
      ownerId: user.id,
      ownerName: user.displayName || user.email || user.phone || 'کاربر',
      name,
      description,
      logo: logo || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setName('');
      setDescription('');
      setLogo('');
      Alert.alert('ثبت شد', 'کانال شما ساخته شد');
      reload();
    } else {
      Alert.alert('خطا', res.message || '');
    }
  };

  const onSaveChannel = async () => {
    if (!channel) return;
    setBusy(true);
    await updateUserChannel(channel.id, {
      name: name.trim() || channel.name,
      description: description.trim() || channel.description,
      logo: logo || channel.logo,
    });
    setBusy(false);
    setEditChannel(false);
    reload();
  };

  const onUpload = async () => {
    if (!user || !channel) return;
    if (!uploadTitle.trim() || !uploadUrl.trim()) {
      Alert.alert('خطا', 'عنوان و لینک لازم است');
      return;
    }
    setBusy(true);
    const res = await submitUpload({
      channelId: channel.id,
      ownerId: user.id,
      title: uploadTitle,
      description: uploadDesc,
      type: uploadType,
      category: uploadCategory,
      url: uploadUrl,
      poster: uploadPoster || undefined,
    });
    setBusy(false);
    if (res.ok) {
      setUploadTitle('');
      setUploadDesc('');
      setUploadUrl('');
      setUploadPoster('');
      Alert.alert('ارسال شد', 'پس از تأیید مدیر منتشر می‌شود.');
      setTab('videos');
      reload();
    } else {
      Alert.alert('خطا', res.message || '');
    }
  };

  const onSaveUpload = async () => {
    if (!editUploadId) return;
    setBusy(true);
    await updateUserUpload(editUploadId, {
      title: uploadTitle,
      url: uploadUrl,
      description: uploadDesc,
      poster: uploadPoster || undefined,
    });
    setBusy(false);
    setEditUploadId(null);
    setUploadTitle('');
    setUploadUrl('');
    setUploadDesc('');
    setUploadPoster('');
    reload();
  };

  const pickFromPhone = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('دسترسی', 'دسترسی گالری لازم است');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setUploadUrl(res.assets[0].uri);
      if (!uploadTitle.trim() && res.assets[0].fileName) {
        setUploadTitle(res.assets[0].fileName.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('دسترسی', 'دسترسی گالری لازم است');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setLogo(res.assets[0].uri);
    }
  };

  const pickPoster = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('دسترسی', 'دسترسی گالری لازم است');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setUploadPoster(res.assets[0].uri);
    }
  };

  const statusLabel = (s: string) =>
    s === 'approved' ? 'منتشر شده' : s === 'rejected' ? 'رد شده' : 'در انتظار تأیید';

  const statusColor = (s: string) =>
    s === 'approved'
      ? AppTheme.colors.success
      : s === 'rejected'
        ? AppTheme.colors.error
        : AppTheme.colors.accent;

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // —— Create channel (no channel yet) ——
  if (!channel) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.top}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.title}>ساخت کانال</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.createHero}>
            <View style={styles.createIcon}>
              <Ionicons name="tv-outline" size={40} color={AppTheme.colors.primary} />
            </View>
            <Text style={styles.createTitle}>کانال خودت را بساز</Text>
            <Text style={styles.createSub}>
              مثل آپارات؛ ویدیو آپلود کن، پوستر بگذار و مخاطب جذب کن.
            </Text>
          </View>
          <View style={styles.formCard}>
            <Text style={styles.label}>نام کانال</Text>
            <TextInput
              style={styles.input}
              placeholder="مثلاً فیلم بدون سانسور"
              placeholderTextColor={AppTheme.colors.placeholder}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>توضیحات</Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder="درباره کانال..."
              placeholderTextColor={AppTheme.colors.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Text style={styles.label}>لوگو کانال</Text>
            <View style={styles.row}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoPreview} />
              ) : (
                <View style={[styles.logoPreview, styles.avatarPh]}>
                  <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <PressableScale style={styles.ghostBtn} onPress={pickLogo}>
                  <Ionicons name="image-outline" size={16} color={AppTheme.colors.primary} />
                  <Text style={styles.ghostBtnText}> انتخاب لوگو از گالری</Text>
                </PressableScale>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="یا آدرس اینترنتی لوگو..."
              placeholderTextColor={AppTheme.colors.placeholder}
              value={logo}
              onChangeText={setLogo}
              autoCapitalize="none"
            />
            <PressableScale
              style={styles.primaryBtn}
              onPress={onCreate}
              disabled={busy || !name.trim()}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>ساخت کانال</Text>
              )}
            </PressableScale>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // —— Owner dashboard ——
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
        </PressableScale>
        <Text style={styles.title} numberOfLines={1}>
          کانال من
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profile}>
          {channel.logo ? (
            <Image source={{ uri: channel.logo }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, styles.avatarPh]}>
              <Ionicons name="tv-outline" size={36} color="rgba(255,255,255,0.45)" />
            </View>
          )}
          <Text style={styles.profileName}>{channel.name}</Text>
          {channel.description ? (
            <Text style={styles.profileDesc} numberOfLines={2}>
              {channel.description}
            </Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{uploads.length}</Text>
              <Text style={styles.statLabel}>ویدیو</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {uploads.filter((u) => u.status === 'approved').length}
              </Text>
              <Text style={styles.statLabel}>منتشر شده</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {uploads.filter((u) => u.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>در انتظار</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(
            [
              { key: 'home' as TabKey, label: 'خانه', icon: 'home-outline' },
              { key: 'videos' as TabKey, label: 'ویدیوها', icon: 'film-outline' },
              { key: 'upload' as TabKey, label: 'آپلود', icon: 'cloud-upload-outline' },
              { key: 'settings' as TabKey, label: 'تنظیمات', icon: 'settings-outline' },
            ] as const
          ).map((t) => (
            <PressableScale
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabOn]}
              onPress={() => {
                setTab(t.key);
                setEditUploadId(null);
              }}
            >
              <Ionicons
                name={t.icon as any}
                size={16}
                color={tab === t.key ? AppTheme.colors.primary : AppTheme.colors.textMuted}
              />
              <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
            </PressableScale>
          ))}
        </View>

        {/* HOME */}
        {tab === 'home' ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>آخرین محتوا</Text>
            </View>
            {uploads.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="film-outline" size={36} color={AppTheme.colors.textMuted} />
                <Text style={styles.empty}>هنوز محتوایی نیست. از تب آپلود شروع کن.</Text>
                <PressableScale style={styles.primaryBtn} onPress={() => setTab('upload')}>
                  <Text style={styles.primaryBtnText}>آپلود اولین ویدیو</Text>
                </PressableScale>
              </View>
            ) : (
              <View style={styles.grid}>
                {uploads.slice(0, 6).map((u) => (
                  <View key={u.id} style={styles.tile}>
                    <PressableScale
                      onPress={() => {
                        if (u.url) {
                          navigation.navigate('Player', {
                            title: u.title,
                            url: u.url,
                            isLive: false,
                            accent: AppTheme.colors.primary,
                          });
                        }
                      }}
                    >
                      <View style={styles.tilePoster}>
                        {u.poster ? (
                          <Image source={{ uri: u.poster }} style={styles.tileImg} resizeMode="cover" />
                        ) : (
                          <View style={[styles.tileImg, styles.tilePh]}>
                            <Ionicons name="film-outline" size={28} color="rgba(255,255,255,0.35)" />
                          </View>
                        )}
                        <View style={styles.tilePlay}>
                          <Ionicons name="play" size={14} color="#fff" />
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor(u.status) }]}>
                          <Text style={styles.statusBadgeText}>{statusLabel(u.status)}</Text>
                        </View>
                      </View>
                      <Text style={styles.tileTitle} numberOfLines={2}>
                        {u.title}
                      </Text>
                    </PressableScale>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        {/* VIDEOS gallery */}
        {tab === 'videos' ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>گالری محتوا</Text>
              <Text style={styles.sectionCount}>{uploads.length}</Text>
            </View>
            {uploads.length === 0 ? (
              <Text style={styles.empty}>هنوز محتوایی نیست.</Text>
            ) : (
              uploads.map((u) => (
                <View key={u.id} style={styles.listCard}>
                  {editUploadId === u.id ? (
                    <>
                      <TextInput
                        style={styles.input}
                        value={uploadTitle}
                        onChangeText={setUploadTitle}
                        placeholder="عنوان"
                        placeholderTextColor={AppTheme.colors.placeholder}
                      />
                      <TextInput
                        style={styles.input}
                        value={uploadUrl}
                        onChangeText={setUploadUrl}
                        placeholder="لینک"
                        placeholderTextColor={AppTheme.colors.placeholder}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.input}
                        value={uploadPoster}
                        onChangeText={setUploadPoster}
                        placeholder="پوستر"
                        placeholderTextColor={AppTheme.colors.placeholder}
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={[styles.input, styles.area]}
                        value={uploadDesc}
                        onChangeText={setUploadDesc}
                        placeholder="توضیح"
                        placeholderTextColor={AppTheme.colors.placeholder}
                        multiline
                      />
                      <View style={styles.row}>
                        <PressableScale style={[styles.primaryBtn, { flex: 1 }]} onPress={onSaveUpload}>
                          <Text style={styles.primaryBtnText}>ذخیره</Text>
                        </PressableScale>
                        <PressableScale
                          style={[styles.ghostBtn, { flex: 1, marginLeft: 8 }]}
                          onPress={() => setEditUploadId(null)}
                        >
                          <Text style={styles.ghostBtnText}>انصراف</Text>
                        </PressableScale>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.mediaRow}>
                        <PressableScale
                          style={styles.posterWrap}
                          onPress={() => {
                            if (u.url) {
                              navigation.navigate('Player', {
                                title: u.title,
                                url: u.url,
                                isLive: false,
                                accent: AppTheme.colors.primary,
                              });
                            }
                          }}
                        >
                          {u.poster ? (
                            <Image source={{ uri: u.poster }} style={styles.poster} resizeMode="cover" />
                          ) : (
                            <View style={[styles.poster, styles.posterPh]}>
                              <Ionicons name="film-outline" size={28} color="rgba(255,255,255,0.4)" />
                            </View>
                          )}
                          <View style={styles.playBadge}>
                            <Ionicons name="play" size={12} color="#fff" />
                          </View>
                        </PressableScale>
                        <View style={styles.mediaMeta}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {u.title}
                          </Text>
                          <Text style={[styles.cardMeta, { color: statusColor(u.status) }]}>
                            {statusLabel(u.status)} · {u.category || 'عمومی'} ·{' '}
                            {u.type === 'movie' ? 'فیلم' : u.type === 'series' ? 'سریال' : 'کلیپ'}
                          </Text>
                          {u.description ? (
                            <Text style={styles.cardDesc} numberOfLines={2}>
                              {u.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.row}>
                        <PressableScale
                          style={[styles.ghostBtn, { flex: 1 }]}
                          onPress={() => {
                            if (u.url) {
                              navigation.navigate('Player', {
                                title: u.title,
                                url: u.url,
                                isLive: false,
                                accent: AppTheme.colors.primary,
                              });
                            }
                          }}
                        >
                          <Ionicons name="play-circle-outline" size={16} color={AppTheme.colors.primary} />
                          <Text style={styles.ghostBtnText}> پخش</Text>
                        </PressableScale>
                        <PressableScale
                          style={[styles.ghostBtn, { flex: 1 }]}
                          onPress={() => {
                            setEditUploadId(u.id);
                            setUploadTitle(u.title);
                            setUploadUrl(u.url);
                            setUploadDesc(u.description || '');
                            setUploadPoster(u.poster || '');
                          }}
                        >
                          <Text style={styles.ghostBtnText}>ویرایش</Text>
                        </PressableScale>
                        <PressableScale
                          style={[styles.dangerBtn, { flex: 1 }]}
                          onPress={() => {
                            Alert.alert('حذف', u.title, [
                              { text: 'خیر', style: 'cancel' },
                              {
                                text: 'حذف',
                                style: 'destructive',
                                onPress: async () => {
                                  await deleteUserUpload(u.id);
                                  reload();
                                },
                              },
                            ]);
                          }}
                        >
                          <Text style={styles.primaryBtnText}>حذف</Text>
                        </PressableScale>
                      </View>
                    </>
                  )}
                </View>
              ))
            )}
          </>
        ) : null}

        {/* UPLOAD */}
        {tab === 'upload' ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>آپلود محتوای جدید</Text>
            <Text style={styles.label}>عنوان</Text>
            <TextInput
              style={styles.input}
              placeholder="عنوان ویدیو"
              placeholderTextColor={AppTheme.colors.placeholder}
              value={uploadTitle}
              onChangeText={setUploadTitle}
            />
            <Text style={styles.label}>لینک پخش</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={AppTheme.colors.placeholder}
              value={uploadUrl}
              onChangeText={setUploadUrl}
              autoCapitalize="none"
            />
            <Text style={styles.label}>پوستر</Text>
            <View style={styles.row}>
              {uploadPoster ? (
                <Image source={{ uri: uploadPoster }} style={styles.posterPreview} />
              ) : (
                <View style={[styles.posterPreview, styles.avatarPh]}>
                  <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <PressableScale style={styles.ghostBtn} onPress={pickPoster}>
                  <Text style={styles.ghostBtnText}>انتخاب پوستر از گالری</Text>
                </PressableScale>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="یا آدرس اینترنتی پوستر..."
              placeholderTextColor={AppTheme.colors.placeholder}
              value={uploadPoster}
              onChangeText={setUploadPoster}
              autoCapitalize="none"
            />
            <Text style={styles.label}>توضیحات</Text>
            <TextInput
              style={[styles.input, styles.area]}
              placeholder="درباره این محتوا..."
              placeholderTextColor={AppTheme.colors.placeholder}
              value={uploadDesc}
              onChangeText={setUploadDesc}
              multiline
            />
            <Text style={styles.label}>دسته‌بندی</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {CATEGORIES.map((c) => (
                <PressableScale
                  key={c}
                  style={[styles.chip, uploadCategory === c && styles.chipOn]}
                  onPress={() => setUploadCategory(c)}
                >
                  <Text style={[styles.chipText, uploadCategory === c && styles.chipTextOn]}>{c}</Text>
                </PressableScale>
              ))}
            </ScrollView>
            <Text style={styles.label}>نوع</Text>
            <View style={styles.row}>
              {(['movie', 'series', 'clip'] as const).map((t) => (
                <PressableScale
                  key={t}
                  style={[styles.chip, uploadType === t && styles.chipOn, { flex: 1 }]}
                  onPress={() => setUploadType(t)}
                >
                  <Text style={[styles.chipText, uploadType === t && styles.chipTextOn]}>
                    {t === 'movie' ? 'فیلم' : t === 'series' ? 'سریال' : 'کلیپ'}
                  </Text>
                </PressableScale>
              ))}
            </View>
            <PressableScale style={styles.ghostBtn} onPress={pickFromPhone}>
              <Ionicons name="phone-portrait-outline" size={16} color={AppTheme.colors.primary} />
              <Text style={styles.ghostBtnText}> انتخاب از گوشی</Text>
            </PressableScale>
            <PressableScale style={styles.primaryBtn} onPress={onUpload} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>ارسال برای تأیید</Text>
              )}
            </PressableScale>
          </View>
        ) : null}

        {/* SETTINGS */}
        {tab === 'settings' ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>تنظیمات کانال</Text>
            {editChannel ? (
              <>
                <Text style={styles.label}>نام</Text>
                <TextInput
                  style={styles.input}
                  value={name || channel.name}
                  onChangeText={setName}
                  placeholderTextColor={AppTheme.colors.placeholder}
                />
                <Text style={styles.label}>توضیحات</Text>
                <TextInput
                  style={[styles.input, styles.area]}
                  value={description || channel.description}
                  onChangeText={setDescription}
                  multiline
                  placeholderTextColor={AppTheme.colors.placeholder}
                />
                <Text style={styles.label}>لوگو</Text>
                <TextInput
                  style={styles.input}
                  value={logo || channel.logo}
                  onChangeText={setLogo}
                  autoCapitalize="none"
                  placeholderTextColor={AppTheme.colors.placeholder}
                />
                <View style={styles.row}>
                  <PressableScale style={[styles.primaryBtn, { flex: 1 }]} onPress={onSaveChannel}>
                    <Text style={styles.primaryBtnText}>ذخیره</Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.ghostBtn, { flex: 1, marginLeft: 8 }]}
                    onPress={() => setEditChannel(false)}
                  >
                    <Text style={styles.ghostBtnText}>انصراف</Text>
                  </PressableScale>
                </View>
              </>
            ) : (
              <>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>نام</Text>
                  <Text style={styles.aboutValue}>{channel.name}</Text>
                </View>
                <View style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>توضیحات</Text>
                  <Text style={styles.aboutValue}>
                    {channel.description || '—'}
                  </Text>
                </View>
                <PressableScale
                  style={styles.menuRow}
                  onPress={() => {
                    setName(channel.name);
                    setDescription(channel.description);
                    setLogo(channel.logo || '');
                    setEditChannel(true);
                  }}
                >
                  <Ionicons name="settings-outline" size={20} color={AppTheme.colors.text} />
                  <Text style={styles.menuText}>تنظیمات کانال</Text>
                  <Ionicons name="chevron-back" size={18} color={AppTheme.colors.textMuted} />
                </PressableScale>
                <PressableScale style={styles.menuRow} onPress={() => setTab('videos')}>
                  <Ionicons name="film-outline" size={20} color={AppTheme.colors.text} />
                  <Text style={styles.menuText}>ویدیوهای من</Text>
                  <Text style={styles.menuBadge}>{uploads.length}</Text>
                  <Ionicons name="chevron-back" size={18} color={AppTheme.colors.textMuted} />
                </PressableScale>
                <PressableScale style={styles.menuRow} onPress={() => setTab('upload')}>
                  <Ionicons name="cloud-upload-outline" size={20} color={AppTheme.colors.text} />
                  <Text style={styles.menuText}>آپلود محتوا</Text>
                  <Ionicons name="chevron-back" size={18} color={AppTheme.colors.textMuted} />
                </PressableScale>
                <View style={styles.menuRow}>
                  <Ionicons name="stats-chart-outline" size={20} color={AppTheme.colors.text} />
                  <Text style={styles.menuText}>آمار کانال</Text>
                  <Text style={styles.menuBadge}>
                    {uploads.filter((u) => u.status === 'approved').length} منتشر
                  </Text>
                </View>
                <PressableScale
                  style={styles.menuRow}
                  onPress={() => navigation.navigate('PublicChannels')}
                >
                  <Ionicons name="eye-outline" size={20} color={AppTheme.colors.text} />
                  <Text style={styles.menuText}>مشاهده صفحه عمومی</Text>
                  <Ionicons name="chevron-back" size={18} color={AppTheme.colors.textMuted} />
                </PressableScale>
                <PressableScale
                  style={styles.menuRow}
                  onPress={() => navigation.navigate('Live')}
                >
                  <Ionicons name="radio-outline" size={20} color={AppTheme.colors.text} />
                  <Text style={styles.menuText}>تلویزیون زنده</Text>
                  <Ionicons name="chevron-back" size={18} color={AppTheme.colors.textMuted} />
                </PressableScale>
              </>
            )}
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
  content: { paddingBottom: 48 },

  createHero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  createIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(230,57,70,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  createSub: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  profile: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  profileAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: AppTheme.colors.primary,
  },
  avatarPh: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  profileDesc: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statBox: {
    alignItems: 'center',
    marginHorizontal: 18,
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

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
    marginHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: AppTheme.colors.primary,
  },
  tabText: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabTextOn: {
    color: AppTheme.colors.primary,
  },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 32,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PAD,
    justifyContent: 'space-between',
  },
  tile: {
    width: TILE_W,
    marginBottom: 14,
  },
  tilePoster: {
    width: TILE_W,
    height: TILE_W * 0.62,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: AppTheme.colors.surface,
  },
  tileImg: { width: '100%', height: '100%' },
  tilePh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  tileTitle: {
    color: AppTheme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },

  listCard: {
    marginHorizontal: GRID_PAD,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  mediaRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  posterWrap: {
    width: 88,
    height: 124,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  poster: { width: 88, height: 124 },
  posterPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaMeta: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    minWidth: 0,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  cardDesc: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  formCard: {
    margin: GRID_PAD,
    padding: 16,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  label: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: AppTheme.colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 4,
  },
  area: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  ghostBtn: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  ghostBtnText: {
    color: AppTheme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  dangerBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginLeft: 8,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  chipOn: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  chipText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextOn: { color: '#fff' },

  aboutRow: {
    marginBottom: 12,
  },
  aboutLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  aboutValue: {
    color: AppTheme.colors.text,
    fontSize: 14,
  },
  logoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  posterPreview: {
    width: 72,
    height: 48,
    borderRadius: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppTheme.colors.divider,
  },
  menuText: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    textAlign: 'right',
  },
  menuBadge: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
});

export default MyChannelPage;
