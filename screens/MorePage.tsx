import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import PressableScale from '../components/PressableScale';
import { useAdmin } from '../context/AdminContext';
import { Lang, useTranslation } from '../locales';

// The manager's contact details, printed on the support screen, in the privacy policy and
// here, so a viewer never has to hunt for them.
export const CONTACT_PHONE = '0000000000';
export const CONTACT_EMAIL = 'arshiyatv.hd@gmail.com';

const COPY = {
  en: {
    heading: 'More from Arshia TV',
    signedIn: 'Signed in as the manager.',
    subtitle: 'Every shelf in one place.',
    manager: 'Manager',
    language: 'Language',
    languageHint: 'The whole app switches straight away.',
    english: 'English',
    persian: 'فارسی',
    satellite: 'Iranian Satellite',
    satelliteText: 'GEM TV family, Manoto, BBC Persian and more, grouped by network.',
    search: 'Search',
    searchText: 'Find a film, a series or a channel by name across the whole catalogue.',
    series: 'Series',
    seriesText: 'Seasons and episodes, with a poster grid to browse.',
    favorites: 'My Favorites',
    favoritesText: 'Everything you bookmarked, ready to play again.',
    support: 'Support Arshia TV',
    supportText: 'Card to card, straight to the manager card number.',
    install: 'Install on your phone',
    installText: 'Android and iPhone: the app on your home screen, with its own icon.',
    privacy: 'Privacy policy',
    privacyText: 'What the app collects, what stays on your phone, and how channels connect.',
    admin: 'Manager panel',
    adminText: 'Owner sign-in: hide folders, remove channels, set the card number.',
    contact: 'Contact',
    contactHint: 'Questions, support receipts or a request to remove content.',
    call: 'Call',
    email: 'Email',
  },
  fa: {
    heading: 'بخش‌های دیگر آرشیا تی‌وی',
    signedIn: 'به‌عنوان مدیر وارد شده‌اید.',
    subtitle: 'همه‌ی بخش‌ها، یک‌جا.',
    manager: 'مدیر',
    language: 'زبان',
    languageHint: 'کل برنامه بی‌درنگ تغییر می‌کند.',
    english: 'English',
    persian: 'فارسی',
    satellite: 'شبکه‌های ماهواره‌ای ایرانی',
    satelliteText: 'جِم تی‌وی، منوتو، بی‌بی‌سی فارسی و بیشتر، دسته‌بندی‌شده بر اساس شبکه.',
    search: 'جست‌وجو',
    searchText: 'نام فیلم، سریال یا شبکه را در کل مجموعه پیدا کنید.',
    series: 'سریال‌ها',
    seriesText: 'فصل‌ها و قسمت‌ها، با نمای شبکه‌ای پوسترها.',
    favorites: 'علاقه‌مندی‌های من',
    favoritesText: 'هر چیزی که نشان کرده‌اید، آماده‌ی پخش دوباره.',
    support: 'حمایت مالی از آرشیا تی‌وی',
    supportText: 'کارت به کارت، مستقیم به شماره کارت مدیر.',
    install: 'نصب روی گوشی',
    installText: 'اندروید و آیفون: برنامه روی صفحه‌ی خانه، با آیکون خودش.',
    privacy: 'حریم خصوصی',
    privacyText: 'برنامه چه چیزی جمع می‌کند، چه چیزی روی گوشی می‌ماند و شبکه‌ها چطور وصل می‌شوند.',
    admin: 'پنل مدیر',
    adminText: 'ورود مدیر: پنهان‌کردن پوشه‌ها، حذف شبکه‌ها، ثبت شماره کارت.',
    contact: 'تماس با ما',
    contactHint: 'برای پرسش، ارسال رسید حمایت یا درخواست حذف محتوا.',
    call: 'تماس',
    email: 'ایمیل',
  },
};

interface MenuEntry {
  screen: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface MenuCardProps {
  entry: MenuEntry;
  index: number;
  onPress: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ entry, index, onPress }) => {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index * 70, 350),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
      }}
    >
      <PressableScale onPress={onPress} style={styles.card} accessibilityLabel={entry.title}>
        <View style={[styles.cardIcon, { backgroundColor: entry.color + '26' }]}>
          <Ionicons name={entry.icon as any} size={20} color={entry.color} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{entry.title}</Text>
          <Text style={styles.cardText}>{entry.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.textMuted} />
      </PressableScale>
    </Animated.View>
  );
};

function openLink(url: string) {
  try {
    Promise.resolve(Linking.openURL(url)).catch(() => {});
  } catch (error) {
    // Nothing to open on this device.
  }
}

const MorePage: React.FC<any> = ({ navigation }) => {
  const { isAdmin } = useAdmin();
  const { lang, setLang } = useTranslation();
  const copy = COPY[lang];

  const entries = useMemo<MenuEntry[]>(
    () => [
      {
        screen: 'IranianSatellite',
        title: copy.satellite,
        description: copy.satelliteText,
        icon: 'globe-outline',
        color: '#E63946',
      },
      {
        screen: 'Search',
        title: copy.search,
        description: copy.searchText,
        icon: 'search-outline',
        color: '#3B82F6',
      },
      {
        screen: 'Series',
        title: copy.series,
        description: copy.seriesText,
        icon: 'albums-outline',
        color: '#14B8A6',
      },
      {
        screen: 'Favorites',
        title: copy.favorites,
        description: copy.favoritesText,
        icon: 'heart-outline',
        color: '#EC4899',
      },
      {
        screen: 'Subscription',
        title: copy.support,
        description: copy.supportText,
        icon: 'heart-circle-outline',
        color: '#22C55E',
      },
      {
        screen: 'InstallApp',
        title: copy.install,
        description: copy.installText,
        icon: 'phone-portrait-outline',
        color: '#8B5CF6',
      },
      {
        screen: 'Privacy',
        title: copy.privacy,
        description: copy.privacyText,
        icon: 'lock-closed-outline',
        color: '#0EA5E9',
      },
      {
        screen: 'Admin',
        title: copy.admin,
        description: copy.adminText,
        icon: 'shield-checkmark-outline',
        color: '#F59E0B',
      },
    ],
    [copy]
  );

  const languages: { key: Lang; label: string }[] = [
    { key: 'fa', label: copy.persian },
    { key: 'en', label: copy.english },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{copy.heading}</Text>
            <Text style={styles.subtitle}>
              {isAdmin ? copy.signedIn : copy.subtitle}
            </Text>
          </View>
          {isAdmin ? (
            <View style={styles.adminPill}>
              <Ionicons name="shield-checkmark" size={12} color={AppTheme.colors.primary} />
              <Text style={styles.adminPillText}>{copy.manager}</Text>
            </View>
          ) : (
            <ArshiaWatermark size={11} />
          )}
        </View>

        <View style={styles.languageBox}>
          <View style={styles.languageHead}>
            <Ionicons name="language-outline" size={17} color={AppTheme.colors.textSecondary} />
            <Text style={styles.languageTitle}>{copy.language}</Text>
          </View>
          <Text style={styles.languageHint}>{copy.languageHint}</Text>
          <View style={styles.languageRow}>
            {languages.map((entry) => {
              const active = lang === entry.key;
              return (
                <PressableScale
                  key={entry.key}
                  onPress={() => setLang(entry.key)}
                  style={[styles.languageButton, active ? styles.languageButtonActive : null]}
                  accessibilityLabel={entry.label}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      active ? styles.languageButtonTextActive : null,
                    ]}
                  >
                    {entry.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        {entries.map((entry, index) => (
          <MenuCard
            key={entry.screen}
            entry={entry}
            index={index}
            onPress={() => navigation.navigate(entry.screen)}
          />
        ))}

        <View style={styles.contactBox}>
          <View style={styles.contactHead}>
            <Ionicons name="call-outline" size={17} color={AppTheme.colors.success} />
            <Text style={styles.contactTitle}>{copy.contact}</Text>
          </View>
          <Text style={styles.contactHint}>{copy.contactHint}</Text>

          <PressableScale
            onPress={() => openLink(`tel:${CONTACT_PHONE}`)}
            style={styles.contactRow}
            accessibilityLabel={copy.call}
          >
            <Ionicons name="call" size={15} color={AppTheme.colors.success} />
            <Text style={styles.contactValue} selectable>
              {CONTACT_PHONE}
            </Text>
            <Text style={styles.contactAction}>{copy.call}</Text>
          </PressableScale>

          <PressableScale
            onPress={() => openLink(`mailto:${CONTACT_EMAIL}`)}
            style={styles.contactRow}
            accessibilityLabel={copy.email}
          >
            <Ionicons name="mail" size={15} color={AppTheme.colors.info} />
            <Text style={styles.contactValue} selectable>
              {CONTACT_EMAIL}
            </Text>
            <Text style={styles.contactAction}>{copy.email}</Text>
          </PressableScale>
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
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 9,
    borderRadius: AppTheme.borderRadius.full,
    backgroundColor: AppTheme.colors.primary + '1F',
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '59',
  },
  adminPillText: {
    color: AppTheme.colors.primary,
    fontSize: 10,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: 4,
  },
  languageBox: {
    padding: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  languageHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: 6,
  },
  languageHint: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 3,
  },
  languageRow: {
    flexDirection: 'row',
    marginTop: AppTheme.spacing.md,
  },
  languageButton: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.sm,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  languageButtonActive: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  languageButtonText: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  languageButtonTextActive: {
    color: AppTheme.colors.white,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.elevation.sm,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.md,
  },
  cardBody: {
    flex: 1,
    marginRight: AppTheme.spacing.sm,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  cardText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 18,
    marginTop: 3,
  },
  contactBox: {
    padding: AppTheme.spacing.md,
    marginTop: AppTheme.spacing.xs,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  contactHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginLeft: 6,
  },
  contactHint: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 3,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginTop: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  contactValue: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: AppTheme.spacing.sm,
  },
  contactAction: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
  },
});

export default MorePage;
    
