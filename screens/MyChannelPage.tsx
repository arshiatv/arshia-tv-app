import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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

const CATEGORIES = ['عمومی', 'فیلم', 'سریال', 'کلیپ', 'ورزشی', 'موسیقی', 'آموزشی', 'کمدی'];

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
      Alert.alert('ثبت شد');
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
      reload();
    } else {
      Alert.alert('خطا', res.message || '');
    }
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

  const statusLabel = (s: string) =>
    s === 'approved' ? 'منتشر شده' : s === 'rejected' ? 'رد شده' : 'در انتظار تأیید';

  if (!isLoggedIn) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.top}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
        </PressableScale>
        <Text style={styles.title}>کانال من</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={AppTheme.colors.primary} style={{ marginTop: 24 }} />
        ) : !channel ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ساخت کانال</Text>
            <TextInput
              style={styles.input}
              placeholder="نام کانال"
              placeholderTextColor={AppTheme.colors.placeholder}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, styles.area]}
              placeholder="توضیحات"
              placeholderTextColor={AppTheme.colors.placeholder}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="آدرس لوگو (اختیاری)"
              placeholderTextColor={AppTheme.colors.placeholder}
              value={logo}
              onChangeText={setLogo}
              autoCapitalize="none"
            />
            <PressableScale style={styles.btn} onPress={onCreate} disabled={busy || !name.trim()}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ساخت کانال</Text>}
            </PressableScale>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              {editChannel ? (
                <>
                  <Text style={styles.sectionTitle}>ویرایش کانال</Text>
                  <TextInput
                    style={styles.input}
                    value={name || channel.name}
                    onChangeText={setName}
                    placeholder="نام"
                    placeholderTextColor={AppTheme.colors.placeholder}
                  />
                  <TextInput
                    style={[styles.input, styles.area]}
                    value={description || channel.description}
                    onChangeText={setDescription}
                    placeholder="توضیحات"
                    placeholderTextColor={AppTheme.colors.placeholder}
                    multiline
                  />
                  <TextInput
                    style={styles.input}
                    value={logo || channel.logo}
                    onChangeText={setLogo}
                    placeholder="لوگو"
                    placeholderTextColor={AppTheme.colors.placeholder}
                    autoCapitalize="none"
                  />
                  <View style={styles.row}>
                    <PressableScale style={[styles.btn, { flex: 1 }]} onPress={onSaveChannel}>
                      <Text style={styles.btnText}>ذخیره</Text>
                    </PressableScale>
                    <PressableScale
                      style={[styles.btnGhost, { flex: 1 }]}
                      onPress={() => setEditChannel(false)}
                    >
                      <Text style={styles.btnGhostText}>انصراف</Text>
                    </PressableScale>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.channelName}>{channel.name}</Text>
                  {channel.description ? (
                    <Text style={styles.channelDesc}>{channel.description}</Text>
                  ) : null}
                  <PressableScale style={styles.btnGhost} onPress={() => {
                    setName(channel.name);
                    setDescription(channel.description);
                    setLogo(channel.logo || '');
                    setEditChannel(true);
                  }}>
                    <Text style={styles.btnGhostText}>ویرایش کانال</Text>
                  </PressableScale>
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>افزودن محتوا</Text>
              <TextInput
                style={styles.input}
                placeholder="عنوان"
                placeholderTextColor={AppTheme.colors.placeholder}
                value={uploadTitle}
                onChangeText={setUploadTitle}
              />
              <TextInput
                style={[styles.input, styles.area]}
                placeholder="توضیحات"
                placeholderTextColor={AppTheme.colors.placeholder}
                value={uploadDesc}
                onChangeText={setUploadDesc}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="لینک پخش (m3u8 / mp4)"
                placeholderTextColor={AppTheme.colors.placeholder}
                value={uploadUrl}
                onChangeText={setUploadUrl}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="آدرس پوستر (اختیاری)"
                placeholderTextColor={AppTheme.colors.placeholder}
                value={uploadPoster}
                onChangeText={setUploadPoster}
                autoCapitalize="none"
              />
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
              <PressableScale style={styles.btnGhost} onPress={pickFromPhone}>
                <Ionicons name="phone-portrait-outline" size={16} color={AppTheme.colors.primary} />
                <Text style={styles.btnGhostText}> انتخاب از گوشی</Text>
              </PressableScale>
              <PressableScale style={styles.btn} onPress={onUpload} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ارسال برای تأیید</Text>}
              </PressableScale>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>گالری محتوا ({uploads.length})</Text>
              {uploads.length === 0 ? (
                <Text style={styles.empty}>هنوز محتوایی نیست.</Text>
              ) : (
                uploads.map((u) => (
                  <View key={u.id} style={styles.card}>
                    {editUploadId === u.id ? (
                      <>
                        <TextInput
                          style={styles.input}
                          defaultValue={u.title}
                          onChangeText={setUploadTitle}
                          placeholder="عنوان"
                          placeholderTextColor={AppTheme.colors.placeholder}
                        />
                        <TextInput
                          style={styles.input}
                          defaultValue={u.url}
                          onChangeText={setUploadUrl}
                          placeholder="لینک"
                          placeholderTextColor={AppTheme.colors.placeholder}
                          autoCapitalize="none"
                        />
                        <TextInput
                          style={[styles.input, styles.area]}
                          defaultValue={u.description}
                          onChangeText={setUploadDesc}
                          placeholder="توضیحات"
                          placeholderTextColor={AppTheme.colors.placeholder}
                          multiline
                        />
                        <View style={styles.row}>
                          <PressableScale
                            style={[styles.btn, { flex: 1 }]}
                            onPress={async () => {
                              await updateUserUpload(u.id, {
                                title: uploadTitle.trim() || u.title,
                                url: uploadUrl.trim() || u.url,
                                description: uploadDesc.trim() || u.description,
                              });
                              setEditUploadId(null);
                              reload();
                            }}
                          >
                            <Text style={styles.btnText}>ذخیره</Text>
                          </PressableScale>
                          <PressableScale
                            style={[styles.btnGhost, { flex: 1 }]}
                            onPress={() => setEditUploadId(null)}
                          >
                            <Text style={styles.btnGhostText}>انصراف</Text>
                          </PressableScale>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={styles.cardTitle}>{u.title}</Text>
                        <Text style={styles.cardMeta}>
                          {statusLabel(u.status)} · {u.category || 'عمومی'} · {u.type}
                        </Text>
                        {u.description ? <Text style={styles.cardDesc}>{u.description}</Text> : null}
                        <View style={styles.row}>
                          <PressableScale
                            style={[styles.btnGhost, { flex: 1 }]}
                            onPress={() => {
                              setEditUploadId(u.id);
                              setUploadTitle(u.title);
                              setUploadUrl(u.url);
                              setUploadDesc(u.description || '');
                            }}
                          >
                            <Text style={styles.btnGhostText}>ویرایش</Text>
                          </PressableScale>
                          <PressableScale
                            style={[styles.btnDanger, { flex: 1 }]}
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
                            <Text style={styles.btnText}>حذف</Text>
                          </PressableScale>
                        </View>
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'right',
  },
  channelName: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
  },
  channelDesc: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'right',
  },
  input: {
    backgroundColor: AppTheme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: AppTheme.colors.text,
    marginBottom: 8,
    textAlign: 'right',
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  btn: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnGhost: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnGhostText: { color: AppTheme.colors.primary, fontWeight: '700', fontSize: 13 },
  btnDanger: {
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.background,
    marginRight: 6,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  chipOn: {
    backgroundColor: AppTheme.colors.primary + '22',
    borderColor: AppTheme.colors.primary,
  },
  chipText: { color: AppTheme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: AppTheme.colors.primary, fontWeight: '800' },
  card: {
    backgroundColor: AppTheme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
  empty: { color: AppTheme.colors.textMuted, textAlign: 'center', marginVertical: 12 },
});

export default MyChannelPage;
