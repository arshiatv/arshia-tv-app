import React, { useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { GROUPS } from '../data/channels';
import { groupLabel } from '../data/labels';
import { DEFAULT_ADMIN_PIN, useAdmin } from '../context/AdminContext';
import {
  listPendingChannels,
  listPendingUploads,
  setChannelStatus,
  setUploadStatus,
  UserChannel,
  UserUpload,
} from '../services/userChannels';
import { ingestFromAdmin } from '../services/contentIngest';
import {
  listPendingReports,
  setReportStatus,
  applyWarningOrBan,
  Report,
} from '../services/reports';
import { ensureSampleSchedule } from '../services/schedule';
import { useTranslation } from '../locales';

const COPY = {
  en: {
    goBack: 'Go back',
    lockTitle: 'Manager sign-in',
    lockText:
      'Enter the manager PIN. Everyone else keeps using Arshia TV as a normal viewer.',
    pin: 'PIN',
    wrongPin: 'That PIN does not match. Try again.',
    unlock: 'Unlock',
    unlockA11y: 'Unlock manager mode',
    factoryPin: (_value: string) => '',
    title: 'Manager panel',
    subtitle: 'Signed in as the owner of Arshia TV.',
    lock: 'Lock manager mode',
    foldersLabel: 'Folders everyone sees',
    folder: (label: string) => `${label} folder`,
    hidden: 'Hidden',
    visible: 'Visible',
    removedLabel: 'Removed channels',
    removedNone:
      'You have not removed any channel. Long-press a channel button on the Live TV page to remove it.',
    removedSome: (count: number) =>
      count === 1
        ? '1 channel is removed from the list.'
        : `${count} channels are removed from the list.`,
    restore: 'Restore all',
    restoreA11y: 'Restore removed channels',
    cardLabel: 'Card to card details',
    bank: 'Bank',
    bankPlaceholder: 'e.g. Bank Melli',
    number: 'Card number',
    holder: 'Name on the card',
    holderPlaceholder: 'Full name',
    save: 'Save details',
    saveA11y: 'Save card details',
    savedTitle: 'Saved',
    savedText: 'The card details now show on the support screen.',
    pinLabel: 'Manager PIN',
    newPin: 'New PIN',
    changePin: 'Change PIN',
    changePinA11y: 'Change PIN',
    tooShortTitle: 'Too short',
    tooShortText: 'Use at least four digits.',
    pinChangedTitle: 'PIN changed',
    pinChangedText: 'Use the new PIN the next time you unlock.',
    note: 'Settings are saved online and apply to all devices.',
  },
  fa: {
    goBack: 'بازگشت',
    lockTitle: 'ورود مدیر',
    lockText:
      'رمز مدیر را وارد کنید. بقیه‌ی بیننده‌ها آرشیا تی‌وی را مثل یک کاربر عادی استفاده می‌کنند.',
    pin: 'رمز',
    wrongPin: 'این رمز مطابقت ندارد. دوباره تلاش کنید.',
    unlock: 'باز کردن',
    unlockA11y: 'باز کردن حالت مدیر',
    factoryPin: (_value: string) => '',
    title: 'پنل مدیر',
    subtitle: 'به‌عنوان صاحب آرشیا تی‌وی وارد شده‌اید.',
    lock: 'قفل کردن حالت مدیر',
    foldersLabel: 'پوشه‌هایی که همه می‌بینند',
    folder: (label: string) => `پوشه‌ی ${label}`,
    hidden: 'پنهان',
    visible: 'نمایان',
    removedLabel: 'شبکه‌های حذف‌شده',
    removedNone:
      'هنوز هیچ شبکه‌ای را حذف نکرده‌اید. برای حذف، در صفحه‌ی تلویزیون زنده انگشت خود را روی دکمه‌ی یک شبکه نگه دارید.',
    removedSome: (count: number) =>
      `${count} شبکه از فهرست حذف شده است.`,
    restore: 'بازگردانی همه',
    restoreA11y: 'بازگردانی شبکه‌های حذف‌شده',
    cardLabel: 'اطلاعات کارت به کارت',
    bank: 'بانک',
    bankPlaceholder: 'مثلاً بانک ملی',
    number: 'شماره‌ی کارت',
    holder: 'نام روی کارت',
    holderPlaceholder: 'نام و نام خانوادگی',
    save: 'ذخیره‌ی اطلاعات',
    saveA11y: 'ذخیره‌ی اطلاعات کارت',
    savedTitle: 'ذخیره شد',
    savedText: 'اطلاعات کارت حالا در صفحه‌ی حمایت مالی نمایش داده می‌شود.',
    pinLabel: 'رمز مدیر',
    newPin: 'رمز جدید',
    changePin: 'تغییر رمز',
    changePinA11y: 'تغییر رمز',
    tooShortTitle: 'کوتاه است',
    tooShortText: 'حداقل چهار رقم وارد کنید.',
    pinChangedTitle: 'رمز تغییر کرد',
    pinChangedText: 'دفعه‌ی بعد که وارد می‌شوید از رمز جدید استفاده کنید.',
    note:
      'این تنظیمات تا وقتی برنامه باز بماند باقی می‌مانند، پس بعد از بستن و باز کردن دوباره آن‌ها را وارد کنید.',
  },
};

// --- بخش اتصال آنلاین به فایربیس ---
const FIREBASE_URL = "https://arshiyatv-59a63-default-rtdb.firebaseio.com";

const getOnlineAdminData = async () => {
  try {
    const pinRes = await fetch(`${FIREBASE_URL}/admin/pin.json`);
    const cardRes = await fetch(`${FIREBASE_URL}/admin/payCard.json`);
    const pin = await pinRes.json();
    const card = await cardRes.json();
    return {
      pin: pin || '1234',
      bank: (card && card.bank) || '',
      number: (card && card.number) || '',
      holder: (card && card.holder) || '',
    };
  } catch (error) {
    return { pin: '1234', bank: '', number: '', holder: '' };
  }
};

const saveOnlineAdminData = async (newData: any) => {
  try {
    if (newData.pin != null) {
      await fetch(`${FIREBASE_URL}/admin/pin.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData.pin),
      });
    }
    await fetch(`${FIREBASE_URL}/admin/payCard.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank: newData.bank || '',
        number: newData.number || '',
        holder: newData.holder || '',
      }),
    });
  } catch (error) {
    console.log("Error saving to Firebase:", error);
  }
};
// ---------------------------------
/**
 * The manager area.
 *
 * Unlock with the PIN and the tools that change the app appear: folders can be hidden
 * from everyone, removed channels can be restored, and the card-to-card details used by
 * the subscription screen are set here. Lock again and the app is a normal viewer for
 * whoever is holding the phone.
 */
const AdminPage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

  const {
    isAdmin,
    pin,
    unlock,
    lock,
    changePin,
    hiddenGroups,
    toggleGroup,
    removedChannelIds,
    restoreChannels,
    payCard,
    updatePayCard,
    preRoll,
    updatePreRoll,
  } = useAdmin();

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [newPin, setNewPin] = useState('');
  const [card, setCard] = useState(payCard);
  const [pendingChannels, setPendingChannels] = useState<UserChannel[]>([]);
  const [pendingUploads, setPendingUploads] = useState<UserUpload[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestBusy, setIngestBusy] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adDuration, setAdDuration] = useState('8');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setPendingChannels(await listPendingChannels());
      setPendingUploads(await listPendingUploads());
      setPendingReports(await listPendingReports());
    })();
  }, [isAdmin]);

  useEffect(() => {
    setCard(payCard);
  }, [payCard]);


  const submitPin = async () => {
    const onlineData = await getOnlineAdminData();
    if (String(pinInput).trim() === String(onlineData.pin).trim()) {
      await Promise.resolve(unlock(pinInput));
      setPinInput('');
      setPinError('');
      setCard({
        bank: onlineData.bank || '',
        number: onlineData.number || '',
        holder: onlineData.holder || '',
      });
      return;
    }
    setPinError(copy.wrongPin);
  };

  const saveCard = async () => {
  const onlineData = await getOnlineAdminData();
  const updatedData = { ...onlineData, ...card };
    await saveOnlineAdminData(updatedData);
    updatePayCard(card);
    Alert.alert(copy.savedTitle, copy.savedText);
  };

  const savePin = async () => {
    if (newPin.trim().length < 4) {
      Alert.alert(copy.tooShortTitle, copy.tooShortText);
      return;
    }
  const onlineData = await getOnlineAdminData();
  const updatedData = { ...onlineData, pin: newPin };
    await saveOnlineAdminData(updatedData);
    changePin(newPin);
    setNewPin('');
    Alert.alert(copy.pinChangedTitle, copy.pinChangedText);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel={copy.goBack}
          >
            <Ionicons name="arrow-back" size={19} color={AppTheme.colors.text} />
          </PressableScale>

          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={26} color={AppTheme.colors.primary} />
          </View>
          <Text style={styles.lockTitle}>{copy.lockTitle}</Text>
          <Text style={styles.lockText}>{copy.lockText}</Text>

          <TextInput
            value={pinInput}
            onChangeText={(value) => {
              setPinInput(value);
              setPinError('');
            }}
            placeholder={copy.pin}
            placeholderTextColor={AppTheme.colors.placeholder}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            style={styles.input}
          />

          {pinError ? <Text style={styles.error}>{pinError}</Text> : null}

          <PressableScale
            onPress={submitPin}
            style={styles.primaryButton}
            accessibilityLabel={copy.unlockA11y}
          >
            <Ionicons name="key-outline" size={17} color={AppTheme.colors.white} />
            <Text style={styles.primaryButtonText}>{copy.unlock}</Text>
          </PressableScale>

        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel={copy.goBack}
          >
            <Ionicons name="arrow-back" size={19} color={AppTheme.colors.text} />
          </PressableScale>
          <View style={styles.headerText}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
          <PressableScale onPress={lock} style={styles.lockButton} accessibilityLabel={copy.lock}>
            <Ionicons name="lock-closed-outline" size={16} color={AppTheme.colors.text} />
          </PressableScale>
        </View>

        <Text style={styles.sectionLabel}>{copy.foldersLabel}</Text>
        {GROUPS.map((group) => {
          const hidden = hiddenGroups.includes(group.key);
          const label = groupLabel(group.key, lang, group.label);
          return (
            <InsetPressable
              key={group.key}
              onPress={() => toggleGroup(group.key)}
              accent={hidden ? undefined : group.color}
              style={styles.row}
              accessibilityLabel={copy.folder(label)}
            >
              <View style={[styles.rowIcon, { backgroundColor: group.color + '2E' }]}>
                <Ionicons name={group.icon as any} size={16} color={group.color} />
              </View>
              <Text style={styles.rowLabel}>{label}</Text>
              <View style={[styles.switchPill, hidden ? styles.switchOff : styles.switchOn]}>
                <Text style={[styles.switchText, hidden ? styles.switchTextOff : styles.switchTextOn]}>
                  {hidden ? copy.hidden : copy.visible}
                </Text>
              </View>
            </InsetPressable>
          );
        })}

        <Text style={styles.sectionLabel}>{copy.removedLabel}</Text>
        <View style={styles.cardBox}>
          <Text style={styles.cardBoxText}>
            {removedChannelIds.length === 0
              ? copy.removedNone
              : copy.removedSome(removedChannelIds.length)}
          </Text>
          {removedChannelIds.length > 0 ? (
            <PressableScale
              onPress={restoreChannels}
              style={styles.secondaryButton}
              accessibilityLabel={copy.restoreA11y}
            >
              <Ionicons name="refresh" size={15} color={AppTheme.colors.white} />
              <Text style={styles.secondaryButtonText}>{copy.restore}</Text>
            </PressableScale>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{copy.cardLabel}</Text>
        <View style={styles.cardBox}>
          <Text style={styles.fieldLabel}>{copy.bank}</Text>
          <TextInput
            value={card.bank}
            onChangeText={(value) => setCard((prev) => ({ ...prev, bank: value }))}
            placeholder={copy.bankPlaceholder}
            placeholderTextColor={AppTheme.colors.placeholder}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>{copy.number}</Text>
          <TextInput
            value={card.number}
            onChangeText={(value) => setCard((prev) => ({ ...prev, number: value }))}
            placeholder="6037 1234 5678 9012"
            placeholderTextColor={AppTheme.colors.placeholder}
            keyboardType="number-pad"
            maxLength={19}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>{copy.holder}</Text>
          <TextInput
            value={card.holder}
            onChangeText={(value) => setCard((prev) => ({ ...prev, holder: value }))}
            placeholder={copy.holderPlaceholder}
            placeholderTextColor={AppTheme.colors.placeholder}
            style={styles.input}
          />
          <PressableScale
            onPress={saveCard}
            style={styles.secondaryButton}
            accessibilityLabel={copy.saveA11y}
          >
            <Ionicons name="save-outline" size={15} color={AppTheme.colors.white} />
            <Text style={styles.secondaryButtonText}>{copy.save}</Text>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>افزودن لینک فیلم / سریال / پخش</Text>
          <Text style={styles.sectionHint}>
            لینک را فقط داخل سیستم آرشیا تی‌وی ثبت کنید. فایل فیلم جای دیگری آپلود نمی‌شود.
            کاربر با برند آرشیا تی‌وی تماشا و اشتراک/دانلود می‌کند.
          </Text>
          <TextInput
            value={ingestTitle}
            onChangeText={setIngestTitle}
            placeholder="عنوان (اختیاری)"
            placeholderTextColor={AppTheme.colors.placeholder}
            style={styles.input}
          />
          <TextInput
            value={ingestUrl}
            onChangeText={setIngestUrl}
            placeholder="https://..."
            placeholderTextColor={AppTheme.colors.placeholder}
            autoCapitalize="none"
            style={styles.input}
          />
          <PressableScale
            style={styles.primaryButton}
            onPress={async () => {
              if (!ingestUrl.trim()) return;
              setIngestBusy(true);
              const res = await ingestFromAdmin({ url: ingestUrl.trim(), title: ingestTitle.trim() || undefined });
              setIngestBusy(false);
              if (res.ok) {
                setIngestUrl('');
                setIngestTitle('');
                Alert.alert('ثبت شد', 'در کاتالوگ دائمی ذخیره شد.');
              } else {
                Alert.alert('خطا', res.message || 'ثبت نشد');
              }
            }}
          >
            <Text style={styles.primaryButtonText}>{ingestBusy ? '...' : 'ثبت در کاتالوگ'}</Text>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تبلیغات</Text>
          <Text style={styles.sectionHint}>
            مدیریت تبلیغ قبل از پخش و لینک ویدیوی تبلیغاتی
          </Text>
          <PressableScale
            onPress={() => updatePreRoll({ enabled: !preRoll?.enabled })}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {preRoll?.enabled ? 'خاموش کردن تبلیغ قبل از پخش' : 'روشن کردن تبلیغ قبل از پخش'}
            </Text>
          </PressableScale>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="عنوان تبلیغ"
            placeholderTextColor={AppTheme.colors.placeholder}
            value={adTitle}
            onChangeText={setAdTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="لینک ویدیو تبلیغاتی (mp4)"
            placeholderTextColor={AppTheme.colors.placeholder}
            value={adUrl}
            onChangeText={setAdUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="مدت نمایش (ثانیه)"
            placeholderTextColor={AppTheme.colors.placeholder}
            value={adDuration}
            onChangeText={setAdDuration}
            keyboardType="number-pad"
          />
          <PressableScale
            style={[styles.primaryButton, { marginTop: 8 }]}
            onPress={async () => {
              if (!adUrl.trim()) {
                Alert.alert('خطا', 'لینک تبلیغ لازم است');
                return;
              }
              const sec = parseInt(adDuration || '8', 10) || 8;
              await updatePreRoll({
                enabled: true,
                title: adTitle.trim() || 'تبلیغ',
                sourceUrl: adUrl.trim(),
                durationSec: sec,
                durationSeconds: sec,
              });
              setAdTitle('');
              setAdUrl('');
              setAdDuration('8');
              Alert.alert('ثبت شد', 'تبلیغ قبل از پخش تنظیم شد.');
            }}
          >
            <Text style={styles.primaryButtonText}>ذخیره تبلیغ</Text>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تایید کانال و محتوا</Text>
          {pendingChannels.length === 0 && pendingUploads.length === 0 ? (
            <Text style={styles.sectionHint}>موردی در انتظار تایید نیست.</Text>
          ) : null}
          {pendingChannels.map((c) => (
            <View key={c.id} style={styles.cardBox}>
              <Text style={styles.sectionTitle}>{c.name}</Text>
              <Text style={styles.sectionHint}>{c.description}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <PressableScale
                  style={styles.primaryButton}
                  onPress={async () => {
                    await setChannelStatus(c.id, 'approved');
                    setPendingChannels(await listPendingChannels());
                  }}
                >
                  <Text style={styles.primaryButtonText}>تایید کانال</Text>
                </PressableScale>
                <PressableScale
                  style={styles.secondaryButton}
                  onPress={async () => {
                    await setChannelStatus(c.id, 'rejected', 'محتوا مناسب نیست');
                    setPendingChannels(await listPendingChannels());
                  }}
                >
                  <Text style={styles.secondaryButtonText}>رد</Text>
                </PressableScale>
              </View>
            </View>
          ))}
          {pendingUploads.map((u) => (
            <View key={u.id} style={styles.cardBox}>
              <Text style={styles.sectionTitle}>{u.title}</Text>
              <Text style={styles.sectionHint}>{u.url}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <PressableScale
                  style={styles.primaryButton}
                  onPress={async () => {
                    await setUploadStatus(u.id, 'approved');
                    setPendingUploads(await listPendingUploads());
                  }}
                >
                  <Text style={styles.primaryButtonText}>تایید محتوا</Text>
                </PressableScale>
                <PressableScale
                  style={styles.secondaryButton}
                  onPress={async () => {
                    await setUploadStatus(u.id, 'rejected', 'محتوا مناسب نیست');
                    setPendingUploads(await listPendingUploads());
                  }}
                >
                  <Text style={styles.secondaryButtonText}>رد</Text>
                </PressableScale>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>گزارش‌ها</Text>
          {pendingReports.length === 0 ? (
            <Text style={styles.sectionHint}>گزارش معلقی نیست.</Text>
          ) : null}
          {pendingReports.map((r) => (
            <View key={r.id} style={styles.cardBox}>
              <Text style={styles.sectionTitle}>
                {r.targetType === 'user' ? 'کاربر' : r.targetType === 'movie' ? 'فیلم' : r.targetType} · {r.targetTitle || r.targetId}
              </Text>
              <Text style={styles.sectionHint}>{r.reason}</Text>
              <Text style={styles.sectionHint}>
                {r.reporterName || r.reporterId} · {new Date(r.createdAt).toLocaleDateString('fa-IR')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <PressableScale
                  style={styles.primaryButton}
                  onPress={async () => {
                    await setReportStatus(r.id, 'dismissed');
                    setPendingReports(await listPendingReports());
                  }}
                >
                  <Text style={styles.primaryButtonText}>رد گزارش</Text>
                </PressableScale>
                {r.targetType === 'user' ? (
                  <PressableScale
                    style={styles.secondaryButton}
                    onPress={async () => {
                      const res = await applyWarningOrBan(r.targetId, r.reason);
                      await setReportStatus(r.id, 'actioned', res.message);
                      setPendingReports(await listPendingReports());
                      Alert.alert(res.ok ? 'انجام شد' : 'خطا', res.message || '');
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>اخطار / مسدود</Text>
                  </PressableScale>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>جدول پخش و آرشیو</Text>
          <Text style={styles.sectionHint}>
            ساخت خودکار نمونه‌ی جدول پخش با برند آرشیا تی‌وی برای شبکه‌ها
          </Text>
          <PressableScale
            style={styles.primaryButton}
            onPress={async () => {
              try {
                await ensureSampleSchedule('demo', 'شبکه نمونه');
                Alert.alert('انجام شد', 'جدول پخش نمونه ثبت شد.');
              } catch {
                Alert.alert('خطا', 'ثبت انجام نشد');
              }
            }}
          >
            <Text style={styles.primaryButtonText}>ثبت جدول پخش نمونه</Text>
          </PressableScale>
        </View>

        <Text style={styles.sectionLabel}>{copy.pinLabel}</Text>
        <View style={styles.cardBox}>
          <TextInput
            value={newPin}
            onChangeText={setNewPin}
            placeholder={copy.newPin}
            placeholderTextColor={AppTheme.colors.placeholder}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
            style={styles.input}
          />
          <PressableScale
            onPress={savePin}
            style={styles.secondaryButton}
            accessibilityLabel={copy.changePinA11y}
          >
            <Ionicons name="key-outline" size={15} color={AppTheme.colors.white} />
            <Text style={styles.secondaryButtonText}>{copy.changePin}</Text>
          </PressableScale>
        </View>

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
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  lockIcon: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: AppTheme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.primary + '1F',
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '59',
    marginTop: AppTheme.spacing.xl,
  },
  lockTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.heading,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    textAlign: 'center',
    marginTop: AppTheme.spacing.md,
  },
  lockText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: AppTheme.spacing.lg,
  },
  input: {
    height: 46,
    paddingHorizontal: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: '#0B111C',
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.7)',
    borderLeftColor: 'rgba(0,0,0,0.7)',
    borderBottomColor: 'rgba(255,255,255,0.10)',
    borderRightColor: 'rgba(255,255,255,0.10)',
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    marginBottom: AppTheme.spacing.sm,
  },
  error: {
    color: AppTheme.colors.error,
    fontSize: AppTheme.typography.fontSize.sm,
    marginBottom: AppTheme.spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.primary,
    ...AppTheme.elevation.md,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: AppTheme.spacing.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.secondary,
    marginTop: AppTheme.spacing.sm,
  },
  secondaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginLeft: 6,
  },
  sectionLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginTop: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.sm,
  },
  section: {
    marginTop: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.sm,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    textAlign: 'right',
    marginBottom: 6,
  },
  sectionHint: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 10,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.sm,
    paddingLeft: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.sm,
  },
  rowLabel: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  switchPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppTheme.borderRadius.full,
    borderWidth: 1,
  },
  switchOn: {
    backgroundColor: AppTheme.colors.success + '1F',
    borderColor: AppTheme.colors.success + '59',
  },
  switchOff: {
    backgroundColor: AppTheme.colors.disabled + '33',
    borderColor: AppTheme.colors.border,
  },
  switchText: {
    fontSize: 10,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  switchTextOn: {
    color: AppTheme.colors.success,
  },
  switchTextOff: {
    color: AppTheme.colors.textMuted,
  },
  cardBox: {
    padding: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cardBoxText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
  },
  fieldLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: AppTheme.typography.fontWeight.semibold,
    marginBottom: 5,
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

export default AdminPage;
    
