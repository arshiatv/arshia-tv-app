import React, { useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../theme/AppTheme';
import ArshiaWatermark from '../components/ArshiaWatermark';
import InsetPressable from '../components/InsetPressable';
import PressableScale from '../components/PressableScale';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { createSupportThread } from '../services/supportChat';
import { CONTACT_EMAIL, CONTACT_PHONE } from './MorePage';
import { Lang, useTranslation } from '../locales';

interface Plan {
  id: string;
  price: string;
  color: string;
  highlight: boolean;
}

const PLANS: Plan[] = [
  { id: 'monthly', price: '99,000', color: '#3B82F6', highlight: false },
  { id: 'quarter', price: '249,000', color: '#E63946', highlight: true },
  { id: 'yearly', price: '799,000', color: '#22C55E', highlight: false },
];

const COPY = {
  en: {
    title: 'Support Arshia TV',
    subtitle: 'Watching is free. Your support is what keeps the channels on air.',
    hero:
      'Arshia TV runs on real costs — servers, bandwidth and continuous maintenance. If you enjoy the channels, any voluntary contribution helps keep everything free and online for everyone.',
    pick: 'Pick a support amount',
    cardToCard: 'Card to card',
    bank: 'Bank',
    copyHint: 'Long-press the number to copy it, then transfer {price} Toman for the {plan} amount.',
    noCardTitle: 'No card number set yet',
    noCardText:
      'The manager adds the card number from the Manager panel, and it appears here for everyone.',
    note:
      'Card to card support is confirmed by hand, so send the receipt to the manager once the transfer is done. Thank you for keeping Arshia TV on air.',
    receipt: 'Send the receipt',
    call: 'Call',
    email: 'Email',
    plans: {
      monthly: { label: 'Monthly', unit: 'Toman / month', note: 'A small hand every month' },
      quarter: { label: '3 Months', unit: 'Toman / 3 months', note: 'Most popular' },
      yearly: { label: 'Yearly', unit: 'Toman / year', note: 'Best value' },
    } as Record<string, { label: string; unit: string; note: string }>,
  },
  fa: {
    title: 'حمایت مالی از آرشیا تی‌وی',
    subtitle: 'تماشا رایگان است. حمایت شماست که شبکه‌ها را روی آنتن نگه می‌دارد.',
    hero:
      'آرشیا تی‌وی با هزینه‌های واقعی سرور، پهنای باند و نگهداری مداوم جلو می‌رود. اگر از شبکه‌ها لذت می‌برید، هر حمایتی داوطلبانه کمک می‌کند همه چیز رایگان و آنلاین بماند.',
    pick: 'یک مبلغ حمایت انتخاب کنید',
    cardToCard: 'کارت به کارت',
    bank: 'بانک',
    copyHint: 'برای کپی، انگشت خود را روی شماره نگه دارید؛ سپس {price} تومان برای مبلغ {plan} واریز کنید.',
    noCardTitle: 'هنوز شماره‌ی کارتی ثبت نشده',
    noCardText:
      'مدیر شماره‌ی کارت را از پنل مدیر وارد می‌کند و همان‌جا برای همه‌ی بیننده‌ها اینجا نمایش داده می‌شود.',
    note:
      'حمایت کارت به کارت دستی تأیید می‌شود، پس بعد از واریز رسید را برای مدیر بفرستید. ممنون که آرشیا تی‌وی را روی آنتن نگه می‌دارید.',
    receipt: 'ارسال رسید',
    call: 'تماس',
    email: 'ایمیل',
    plans: {
      monthly: { label: 'ماهانه', unit: 'تومان / ماه', note: 'کمک کوچک هر ماه' },
      quarter: { label: 'سه ماهه', unit: 'تومان / سه ماه', note: 'محبوب‌ترین' },
      yearly: { label: 'سالانه', unit: 'تومان / سال', note: 'به‌صرفه‌ترین' },
    } as Record<string, { label: string; unit: string; note: string }>,
  },
};

/** 6037 1234 5678 9012 — grouped so it is easy to read off the screen. */
function formatCard(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function openLink(url: string) {
  try {
    Promise.resolve(Linking.openURL(url)).catch(() => {});
  } catch (error) {
    // Nothing to open on this device.
  }
}

/**
 * Support Arshia TV.
 *
 * There is no online payment here: the manager puts the card number in from the
 * Manager panel and every viewer transfers whatever they want to give, card to card.
 */
function openBankPay(cardNumber: string, amount: string) {
  const digits = (cardNumber || '').replace(/\s/g, '');
  const msg = `پرداخت حمایت آرشیا تی‌وی\nمبلغ: ${amount} تومان\nکارت مقصد: ${digits}`;
  // Share sheet lets user open any bank app — works without paid gateway
  Share.share({ message: msg, title: 'پرداخت کارت به کارت' }).catch(() => {
    Alert.alert('شماره کارت', digits || 'هنوز کارتی ثبت نشده');
  });
}

const SubscriptionPage: React.FC<any> = ({ navigation }) => {

  const { lang } = useTranslation();
  const copy = COPY[lang as Lang];
  const { payCard, support } = useAdmin();
  const { user, isLoggedIn } = useAuth();
  const [receiptNote, setReceiptNote] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const [plan, setPlan] = useState('quarter');

  const chosen = PLANS.find((item) => item.id === plan) || PLANS[0];
  const chosenCopy = copy.plans[chosen.id];
  const cardNumber = formatCard(payCard.number);
  const cardReady = !!(payCard.number || '').trim();
  const showSupport = support?.enabled !== false;
  const showCard = showSupport && support?.cardEnabled !== false;
  const showGateway = showSupport && support?.gatewayEnabled !== false;


  const hint = copy.copyHint
    .replace('{price}', chosen.price)
    .replace('{plan}', chosenCopy.label);

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

        <View style={styles.hero}>
          <Ionicons name="heart-circle" size={26} color={AppTheme.colors.primary} />
          <Text style={styles.heroText}>{copy.hero}</Text>
        </View>

        <Text style={styles.sectionLabel}>{copy.pick}</Text>
        {PLANS.map((item) => {
          const isActive = plan === item.id;
          const itemCopy = copy.plans[item.id];
          return (
            <InsetPressable
              key={item.id}
              onPress={() => setPlan(item.id)}
              accent={isActive ? item.color : undefined}
              style={[styles.plan, isActive ? { backgroundColor: item.color + '1F' } : null]}
              accessibilityLabel={itemCopy.label}
            >
              <View style={styles.planTop}>
                <View style={[styles.planIcon, { backgroundColor: item.color + '2E' }]}>
                  <Ionicons
                    name={item.highlight ? 'star' : 'ticket-outline'}
                    size={16}
                    color={item.color}
                  />
                </View>
                <Text style={styles.planLabel}>{itemCopy.label}</Text>
                <Ionicons
                  name={isActive ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isActive ? item.color : AppTheme.colors.textMuted}
                />
              </View>
              <Text style={styles.planPrice}>
                {item.price}
                <Text style={styles.planUnit}>  {itemCopy.unit}</Text>
              </Text>
              <Text style={styles.planNote}>{itemCopy.note}</Text>
            </InsetPressable>
          );
        })}

        <Text style={styles.sectionLabel}>{copy.cardToCard}</Text>
        <View style={styles.cardBox}>
          {cardReady ? (
            <>
              <Text style={styles.cardBank}>{payCard.bank || copy.bank}</Text>
              <Text style={styles.cardNumber} selectable>
                {cardNumber}
              </Text>
              {payCard.holder ? <Text style={styles.cardHolder}>{payCard.holder}</Text> : null}
              <View style={styles.cardHint}>
                <Ionicons name="copy-outline" size={14} color={AppTheme.colors.textMuted} />
                <Text style={styles.cardHintText}>{hint}</Text>
              </View>
            </>
          ) : (
            <View style={styles.cardEmpty}>
              <Ionicons name="alert-circle-outline" size={20} color={AppTheme.colors.warning} />
              <Text style={styles.cardEmptyTitle}>{copy.noCardTitle}</Text>
              <Text style={styles.cardEmptyText}>{copy.noCardText}</Text>
            </View>
          )}
        </View>

        {cardReady ? (
          <PressableScale
            onPress={() => openBankPay(payCard.number, chosen.price)}
            style={{
              backgroundColor: AppTheme.colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 16,
              marginTop: 4,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
              پرداخت آنلاین · کارت به کارت
            </Text>
          </PressableScale>
        ) : null}

        <Text style={styles.sectionLabel}>{copy.receipt}</Text>
        <TextInput
          value={receiptNote}
          onChangeText={setReceiptNote}
          placeholder="توضیح کوتاه یا مبلغ واریزی..."
          placeholderTextColor={AppTheme.colors.placeholder}
          style={{
            backgroundColor: AppTheme.colors.surface,
            borderRadius: 12,
            padding: 14,
            color: AppTheme.colors.text,
            borderWidth: 1,
            borderColor: AppTheme.colors.border,
            marginBottom: 10,
            textAlign: 'right',
          }}
        />
        <PressableScale
          onPress={async () => {
            if (!isLoggedIn || !user) {
              navigation.navigate('Auth');
              return;
            }
            setSending(true);
            try {
              await createSupportThread(
                user.id,
                user.displayName || user.email || user.phone || 'کاربر',
                receiptNote.trim() || 'ارسال رسید حمایت مالی'
              );
              setReceiptNote('');
              Alert.alert('ثبت شد', 'پیام شما برای پشتیبانی ارسال شد.');
            } catch {
              Alert.alert('خطا', 'ارسال انجام نشد.');
            }
            setSending(false);
          }}
          style={styles.contactRow}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color={AppTheme.colors.success} />
          <Text style={styles.contactValue}>{sending ? '...' : 'ارسال برای پشتیبانی'}</Text>
        </PressableScale>
        <PressableScale
          onPress={() => openLink(`mailto:${CONTACT_EMAIL}`)}
          style={styles.contactRow}
          accessibilityLabel={copy.email}
        >
          <Ionicons name="mail" size={16} color={AppTheme.colors.info} />
          <Text style={styles.contactValue} selectable>
            {CONTACT_EMAIL}
          </Text>
          <Text style={styles.contactAction}>{copy.email}</Text>
        </PressableScale>

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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.primary + '14',
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '3D',
  },
  heroText: {
    flex: 1,
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.sm,
    lineHeight: 19,
    marginLeft: AppTheme.spacing.sm,
  },
  plan: {
    padding: AppTheme.spacing.md,
    paddingLeft: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.sm,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIcon: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppTheme.spacing.sm,
  },
  planLabel: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.lg,
    fontWeight: AppTheme.typography.fontWeight.bold,
  },
  planPrice: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.heading,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    marginTop: AppTheme.spacing.sm,
  },
  planUnit: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.medium,
  },
  planNote: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    marginTop: 3,
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
  cardBox: {
    padding: AppTheme.spacing.md,
    borderRadius: AppTheme.borderRadius.lg,
    backgroundColor: AppTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cardBank: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    fontWeight: AppTheme.typography.fontWeight.semibold,
  },
  cardNumber: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.xxl,
    fontWeight: AppTheme.typography.fontWeight.extrabold,
    letterSpacing: 1.6,
    marginTop: 6,
  },
  cardHolder: {
    color: AppTheme.colors.textSecondary,
    fontSize: AppTheme.typography.fontSize.md,
    marginTop: 6,
  },
  cardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppTheme.spacing.md,
  },
  cardHintText: {
    flex: 1,
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 6,
  },
  cardEmpty: {
    alignItems: 'center',
  },
  cardEmptyTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.fontSize.md,
    fontWeight: AppTheme.typography.fontWeight.bold,
    marginTop: AppTheme.spacing.sm,
  },
  cardEmptyText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: AppTheme.spacing.md,
    marginBottom: AppTheme.spacing.sm,
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

export default SubscriptionPage;
    
