import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import PressableScale from '../components/PressableScale';
import { CONTACT_EMAIL, CONTACT_PHONE } from './MorePage';
import { useTranslation } from '../locales';

const COPY = {
  en: {
    title: 'Privacy policy',
    subtitle: 'What Arshia TV does — and does not do — with your data.',
    updated: 'Last updated: October 2026.',
    sections: [
      {
        icon: 'shield-checkmark-outline',
        color: '#22C55E',
        title: 'What we collect',
        body:
          'Nothing about you. Arshia TV has no sign-up, no account and no login, so we never ask for your name, email address, phone number or location. There is no analytics tool and no advertising tracker inside the app.',
      },
      {
        icon: 'phone-portrait-outline',
        color: '#3B82F6',
        title: 'What stays on your phone',
        body:
          'The things the app remembers for you — your favourites, your language choice and the settings the manager changes, like hidden folders and the card-to-card details — live inside the app on this device. They are not uploaded to us or to anyone else.',
      },
      {
        icon: 'tv-outline',
        color: '#E63946',
        title: 'The channels you watch',
        body:
          'Live channels and programme information come from public source playlists. When you start a channel, your device connects straight to that source server, and that server can see your IP address — the same way any website you visit can. Those servers have their own privacy rules, which we do not control.',
      },
      {
        icon: 'card-outline',
        color: '#F59E0B',
        title: 'Support payments',
        body:
          'Support for Arshia TV is card to card. The app only shows the card number the manager entered. No card details are ever typed into the app, and nothing about a transfer is recorded here — the whole thing happens inside your own banking app.',
      },
      {
        icon: 'people-outline',
        color: '#8B5CF6',
        title: 'Children',
        body:
          'The app is not directed at children, and because it collects nothing at all, it collects nothing from children either.',
      },
      {
        icon: 'mail-outline',
        color: '#14B8A6',
        title: 'Questions',
        body:
          "If you have a question about this policy, or you are the owner of a channel or a piece of content that appears here and you want it removed, contact the manager of Arshia TV directly.",
      },
    ],
  },
  fa: {
    title: 'حریم خصوصی',
    subtitle: 'آرشیا تی‌وی با اطلاعات شما چه می‌کند و چه نمی‌کند.',
    updated: 'آخرین به‌روزرسانی: مهر ۱۴۰۵.',
    sections: [
      {
        icon: 'shield-checkmark-outline',
        color: '#22C55E',
        title: 'چه اطلاعاتی جمع می‌کنیم',
        body:
          'هیچ اطلاعاتی درباره‌ی شما. آرشیا تی‌وی ثبت‌نام، حساب کاربری و ورود ندارد، پس هرگز نام، ایمیل، شماره تلفن یا موقعیت مکانی شما را نمی‌پرسد. هیچ ابزار تحلیلی و هیچ ردیاب تبلیغاتی هم داخل برنامه نیست.',
      },
      {
        icon: 'phone-portrait-outline',
        color: '#3B82F6',
        title: 'چه چیزی روی گوشی شما می‌ماند',
        body:
          'چیزهایی که برنامه برای شما به یاد می‌سپارد — علاقه‌مندی‌ها، زبان انتخاب‌شده و تنظیماتی که مدیر تغییر می‌دهد، مثل پوشه‌های پنهان و اطلاعات کارت به کارت — همه داخل خود برنامه و روی همین دستگاه می‌مانند و برای ما یا هیچ‌کس دیگری ارسال نمی‌شوند.',
      },
      {
        icon: 'tv-outline',
        color: '#E63946',
        title: 'شبکه‌هایی که تماشا می‌کنید',
        body:
          'شبکه‌های زنده و اطلاعات برنامه‌ها از فهرست‌های پخش عمومی می‌آیند. وقتی یک شبکه را پخش می‌کنید، دستگاه شما مستقیم به سرور همان منبع وصل می‌شود و آن سرور می‌تواند نشانی IP شما را ببیند — درست مثل هر سایتی که باز می‌کنید. قواعد حریم خصوصی آن سرورها مربوط به خودشان است و در اختیار ما نیست.',
      },
      {
        icon: 'card-outline',
        color: '#F59E0B',
        title: 'حمایت مالی',
        body:
          'حمایت از آرشیا تی‌وی کارت به کارت است. برنامه فقط شماره‌ی کارتی را نشان می‌دهد که مدیر وارد کرده است. هیچ اطلاعات کارتی داخل برنامه وارد نمی‌شود و هیچ سابقه‌ای از واریز اینجا ثبت نمی‌گردد — همه‌ی کار داخل اپلیکیشن بانک خودتان انجام می‌شود.',
      },
      {
        icon: 'people-outline',
        color: '#8B5CF6',
        title: 'کودکان',
        body:
          'این برنامه برای کودکان ساخته نشده است و چون هیچ اطلاعاتی جمع نمی‌کند، از کودکان هم چیزی جمع نمی‌کند.',
      },
      {
        icon: 'mail-outline',
        color: '#14B8A6',
        title: 'پرسش‌ها',
        body:
          'اگر پرسشی درباره‌ی این سیاست دارید، یا مالک شبکه یا محتوایی هستید که اینجا نمایش داده می‌شود و می‌خواهید حذف شود، مستقیم با مدیر آرشیا تی‌وی تماس بگیرید.',
      },
    ],
  },
};

function openLink(url: string) {
  try {
    Promise.resolve(Linking.openURL(url)).catch(() => {});
  } catch (error) {
    // Nothing to open on this device.
  }
}

const PrivacyPage: React.FC<any> = ({ navigation }) => {
  const { lang } = useTranslation();
  const copy = COPY[lang];

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

        {copy.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionTop}>
              <View style={[styles.sectionIcon, { backgroundColor: section.color + '26' }]}>
                <Ionicons name={section.icon as any} size={20} color={section.color} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>

            {section.icon === 'mail-outline' ? (
              <View style={styles.contactRows}>
                <PressableScale
                  onPress={() => openLink(`tel:${CONTACT_PHONE}`)}
                  style={styles.contactRow}
                  accessibilityLabel={CONTACT_PHONE}
                >
                  <Ionicons name="call" size={15} color={AppTheme.colors.success} />
                  <Text style={styles.contactValue} selectable>
                    {CONTACT_PHONE}
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={() => openLink(`mailto:${CONTACT_EMAIL}`)}
                  style={styles.contactRow}
                  accessibilityLabel={CONTACT_EMAIL}
                >
                  <Ionicons name="mail" size={15} color={AppTheme.colors.info} />
                  <Text style={styles.contactValue} selectable>
                    {CONTACT_EMAIL}
                  </Text>
                </PressableScale>
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.note}>
          <Ionicons name="time-outline" size={18} color={AppTheme.colors.textMuted} />
          <Text style={styles.noteText}>{copy.updated}</Text>
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
  section: {
    padding: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  sectionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppTheme.spacing.sm,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.md,
  },
  sectionTitle: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  sectionBody: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 19,
  },
  contactRows: {
    marginTop: AppTheme.spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
    borderRadius: AppTheme.borderRadius.md,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  contactValue: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.medium,
    marginLeft: AppTheme.spacing.sm,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: AppTheme.spacing.sm,
  },
});

export default PrivacyPage;
          
