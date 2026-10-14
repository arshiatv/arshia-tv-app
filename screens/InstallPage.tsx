import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import PressableScale from '../components/PressableScale';
import { useTranslation } from '../locales';

interface Guide {
  key: 'android' | 'ios';
  label: string;
  icon: string;
  color: string;
  summary: string;
  steps: string[];
}

const GUIDES = {
  en: [
    {
      key: 'android' as const,
      label: 'Android',
      icon: 'logo-android',
      color: '#22C55E',
      summary: 'Installs straight onto the phone from an APK file.',
      steps: [
        'Open Arshia TV inside Snapp and tap the Publish button. Snapp builds the Android app for you.',
        'Download the APK file the build gives you onto this phone.',
        'Tap the downloaded file. If Android warns about unknown sources, allow "Install unknown apps" for the app you opened it from.',
        'Arshia TV appears in your app list with its own icon and opens full screen, with no browser bar.',
      ],
    },
    {
      key: 'ios' as const,
      label: 'iPhone',
      icon: 'logo-apple',
      color: '#8B5CF6',
      summary: 'Installs through TestFlight, or from the App Store once published.',
      steps: [
        'Open Arshia TV inside Snapp and tap the Publish button. Snapp starts the iOS build.',
        'An iOS build needs your own Apple Developer account, and it goes to App Store Connect.',
        'Install it from the TestFlight app, or from the App Store page once you publish the build there.',
        'iPhone has no APK step: an app can only arrive through TestFlight or the App Store, never as a downloaded file.',
      ],
    },
  ],
  fa: [
    {
      key: 'android' as const,
      label: 'اندروید',
      icon: 'logo-android',
      color: '#22C55E',
      summary: 'مستقیم از فایل APK روی گوشی نصب می‌شود.',
      steps: [
        'آرشیا تی‌وی را داخل اسنپ باز کنید و دکمه‌ی Publish را بزنید. اسنپ نسخه‌ی اندروید را برای شما می‌سازد.',
        'فایل APK‌ای که پس از ساخت به شما داده می‌شود را روی همین گوشی دانلود کنید.',
        'روی فایل دانلودشده بزنید. اگر اندروید درباره‌ی منابع ناشناس هشدار داد، برای همان برنامه‌ای که فایل را از آن باز کرده‌اید گزینه‌ی «نصب برنامه‌های ناشناس» را اجازه دهید.',
        'آرشیا تی‌وی با آیکون خودش در فهرست برنامه‌های شما ظاهر می‌شود و تمام‌صفحه و بدون نوار مرورگر باز می‌شود.',
      ],
    },
    {
      key: 'ios' as const,
      label: 'آیفون',
      icon: 'logo-apple',
      color: '#8B5CF6',
      summary: 'از طریق TestFlight یا پس از انتشار، از اپ‌استور نصب می‌شود.',
      steps: [
        'آرشیا تی‌وی را داخل اسنپ باز کنید و دکمه‌ی Publish را بزنید. اسنپ ساخت نسخه‌ی iOS را شروع می‌کند.',
        'ساخت نسخه‌ی iOS به حساب Apple Developer خودتان نیاز دارد و خروجی به App Store Connect می‌رود.',
        'آن را از برنامه‌ی TestFlight نصب کنید، یا پس از انتشار، از صفحه‌ی اپ‌استور.',
        'آیفون مرحله‌ی APK ندارد: یک برنامه فقط از راه TestFlight یا اپ‌استور نصب می‌شود، هرگز به‌صورت فایل دانلودی.',
      ],
    },
  ],
};

const CURRENT: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';

const COPY = {
  en: {
    title: 'Install on your phone',
    subtitle: 'Arshia TV on Android and iPhone, with its own icon.',
    thisPhone: 'This phone',
    note:
      'Everything works the same once installed: live channels, folders, favourites, the support card and the manager panel.',
  },
  fa: {
    title: 'نصب روی گوشی',
    subtitle: 'آرشیا تی‌وی روی اندروید و آیفون، با آیکون مخصوص خودش.',
    thisPhone: 'همین گوشی',
    note:
      'پس از نصب همه‌چیز یکسان کار می‌کند: شبکه‌های زنده، پوشه‌ها، علاقه‌مندی‌ها، کارت حمایت مالی و پنل مدیر.',
  },
};

const InstallPage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];
  const guides: Guide[] = GUIDES[lang];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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

        {guides.map((guide) => {
          const here = guide.key === CURRENT;
          return (
            <View
              key={guide.key}
              style={[styles.guide, here ? { borderColor: guide.color + '80' } : null]}
            >
              <View style={styles.guideTop}>
                <View style={[styles.guideIcon, { backgroundColor: guide.color + '26' }]}>
                  <Ionicons name={guide.icon as any} size={20} color={guide.color} />
                </View>
                <View style={styles.guideHead}>
                  <Text style={styles.guideLabel}>{guide.label}</Text>
                  <Text style={styles.guideSummary}>{guide.summary}</Text>
                </View>
                {here ? (
                  <View
                    style={[
                      styles.herePill,
                      { backgroundColor: guide.color + '26', borderColor: guide.color + '80' },
                    ]}
                  >
                    <Text style={[styles.herePillText, { color: guide.color }]}>
                      {copy.thisPhone}
                    </Text>
                  </View>
                ) : null}
              </View>

              {guide.steps.map((step, index) => (
                <View key={step} style={styles.step}>
                  <View style={[styles.stepBadge, { backgroundColor: guide.color }]}>
                    <Text style={styles.stepBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
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
  guide: {
    padding: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
  },
  guideTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppTheme.spacing.md,
  },
  guideIcon: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.md,
  },
  guideHead: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  guideLabel: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  guideSummary: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
    marginTop: 3,
  },
  herePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: AppTheme.borderRadius.full,
    borderWidth: 1,
  },
  herePillText: {
    fontSize: 10,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  step: {
    flexDirection: 'row',
    marginBottom: AppTheme.spacing.sm,
  },
  stepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.sm,
    marginTop: 1,
  },
  stepBadgeText: {
    color: AppTheme.colors.white,
    fontSize: 10,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  stepText: {
    flex: 1,
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
  },
  note: {
    flexDirection: 'row',
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

export default InstallPage;
        
