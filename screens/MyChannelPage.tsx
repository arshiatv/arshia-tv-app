import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
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
  submitUpload,
  UserChannel,
} from '../services/userChannels';

const MyChannelPage: React.FC<any> = ({ navigation }) => {
  const { user, isLoggedIn } = useAuth();
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);

  // upload form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const list = await listMyChannels(user.id);
    setChannels(list);
    if (list[0]) setSelectedChannelId(list[0].id);
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
      Alert.alert('ثبت شد', 'کانال شما برای بررسی ارسال شد و پس از تایید نمایش داده می‌شود.');
      reload();
    } else {
      Alert.alert('خطا', res.message || 'ثبت نشد');
    }
  };

  const onUpload = async () => {
    if (!user || !selectedChannelId) return;
    setBusy(true);
    const res = await submitUpload({
      channelId: selectedChannelId,
      ownerId: user.id,
      title: uploadTitle,
      description: uploadDesc,
      type: 'movie',
      url: uploadUrl,
    });
    setBusy(false);
    if (res.ok) {
      setUploadTitle('');
      setUploadDesc('');
      setUploadUrl('');
      Alert.alert('ارسال شد', 'محتوا برای تایید نهایی ارسال شد.');
    } else {
      Alert.alert('خطا', res.message || 'ارسال نشد');
    }
  };

  const statusLabel = (s: string) =>
    s === 'approved' ? 'تایید شده' : s === 'rejected' ? 'رد شده' : 'در انتظار تایید';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
        </PressableScale>
        <Text style={styles.title}>کانال من</Text>
        <Text style={styles.sub}>نام، تصویر و توضیحات کانال را تنظیم کنید. انتشار پس از تایید انجام می‌شود.</Text>

        {loading ? (
          <ActivityIndicator color={AppTheme.colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <>
            <Text style={styles.section}>کانال‌های شما</Text>
            {channels.length === 0 ? (
              <Text style={styles.empty}>هنوز کانالی نساخته‌اید.</Text>
            ) : (
              channels.map((c) => (
                <PressableScale
                  key={c.id}
                  style={[styles.card, selectedChannelId === c.id && styles.cardActive]}
                  onPress={() => setSelectedChannelId(c.id)}
                >
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.cardMeta}>{statusLabel(c.status)}</Text>
                  {c.description ? <Text style={styles.cardDesc}>{c.description}</Text> : null}
                </PressableScale>
              ))
            )}

            <Text style={styles.section}>ساخت کانال جدید</Text>
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
              placeholder="آدرس تصویر لوگو (اختیاری)"
              placeholderTextColor={AppTheme.colors.placeholder}
              value={logo}
              onChangeText={setLogo}
              autoCapitalize="none"
            />
            <PressableScale style={styles.btn} onPress={onCreate} disabled={busy || !name.trim()}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ارسال برای تایید</Text>}
            </PressableScale>

            {selectedChannelId ? (
              <>
                <Text style={styles.section}>آپلود محتوا برای کانال انتخاب‌شده</Text>
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
                  placeholder="لینک پخش (https://...)"
                  placeholderTextColor={AppTheme.colors.placeholder}
                  value={uploadUrl}
                  onChangeText={setUploadUrl}
                  autoCapitalize="none"
                />
                <PressableScale
                  style={styles.secondaryBtn}
                  onPress={async () => {
                    try {
                      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!perm.granted) {
                        Alert.alert('دسترسی', 'دسترسی به گالری لازم است');
                        return;
                      }
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                        quality: 1,
                      });
                      if (!result.canceled && result.assets?.[0]?.uri) {
                        setUploadUrl(result.assets[0].uri);
                        if (!uploadTitle.trim()) {
                          setUploadTitle(result.assets[0].fileName || 'ویدیو از گوشی');
                        }
                      }
                    } catch {
                      Alert.alert('خطا', 'انتخاب فایل انجام نشد');
                    }
                  }}
                >
                  <Ionicons name="phone-portrait-outline" size={16} color={AppTheme.colors.primary} />
                  <Text style={styles.secondaryBtnText}>انتخاب از گوشی</Text>
                </PressableScale>
                <PressableScale
                  style={styles.btn}
                  onPress={onUpload}
                  disabled={busy || !uploadTitle.trim() || !uploadUrl.trim()}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>ارسال محتوا برای تایید</Text>
                  )}
                </PressableScale>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  content: { padding: 20, paddingBottom: 48 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: AppTheme.colors.text, textAlign: 'right' },
  sub: { fontSize: 13, color: AppTheme.colors.textSecondary, textAlign: 'right', marginVertical: 10 },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: AppTheme.colors.text,
    textAlign: 'right',
    marginTop: 18,
    marginBottom: 10,
  },
  empty: { color: AppTheme.colors.textMuted, textAlign: 'right' },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cardActive: { borderColor: AppTheme.colors.primary },
  cardTitle: { color: AppTheme.colors.text, fontWeight: '700', textAlign: 'right' },
  cardMeta: { color: AppTheme.colors.accent, fontSize: 12, textAlign: 'right', marginTop: 4 },
  cardDesc: { color: AppTheme.colors.textSecondary, fontSize: 13, textAlign: 'right', marginTop: 6 },
  input: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    color: AppTheme.colors.text,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 10,
    textAlign: 'right',
  },
  area: { minHeight: 80, textAlignVertical: 'top' },
  btn: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '66',
    backgroundColor: AppTheme.colors.primary + '12',
  },
  secondaryBtnText: {
    color: AppTheme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MyChannelPage;
