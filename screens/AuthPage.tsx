import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

type Mode = 'email' | 'phone';

const COUNTRIES = [
  { code: '+98', name: 'ایران', flag: '🇮🇷' },
  { code: '+93', name: 'افغانستان', flag: '🇦🇫' },
  { code: '+964', name: 'عراق', flag: '🇮🇶' },
  { code: '+90', name: 'ترکیه', flag: '🇹🇷' },
  { code: '+971', name: 'امارات', flag: '🇦🇪' },
  { code: '+966', name: 'عربستان', flag: '🇸🇦' },
  { code: '+974', name: 'قطر', flag: '🇶🇦' },
  { code: '+965', name: 'کویت', flag: '🇰🇼' },
  { code: '+968', name: 'عمان', flag: '🇴🇲' },
  { code: '+973', name: 'بحرین', flag: '🇧🇭' },
  { code: '+994', name: 'آذربایجان', flag: '🇦🇿' },
  { code: '+995', name: 'گرجستان', flag: '🇬🇪' },
  { code: '+374', name: 'ارمنستان', flag: '🇦🇲' },
  { code: '+992', name: 'تاجیکستان', flag: '🇹🇯' },
  { code: '+998', name: 'ازبکستان', flag: '🇺🇿' },
  { code: '+996', name: 'قرقیزستان', flag: '🇰🇬' },
  { code: '+993', name: 'ترکمنستان', flag: '🇹🇲' },
  { code: '+7', name: 'روسیه', flag: '🇷🇺' },
  { code: '+380', name: 'اوکراین', flag: '🇺🇦' },
  { code: '+49', name: 'آلمان', flag: '🇩🇪' },
  { code: '+33', name: 'فرانسه', flag: '🇫🇷' },
  { code: '+44', name: 'انگلستان', flag: '🇬🇧' },
  { code: '+1', name: 'آمریکا / کانادا', flag: '🇺🇸' },
  { code: '+61', name: 'استرالیا', flag: '🇦🇺' },
  { code: '+91', name: 'هند', flag: '🇮🇳' },
  { code: '+92', name: 'پاکستان', flag: '🇵🇰' },
  { code: '+880', name: 'بنگلادش', flag: '🇧🇩' },
  { code: '+86', name: 'چین', flag: '🇨🇳' },
  { code: '+81', name: 'ژاپن', flag: '🇯🇵' },
  { code: '+82', name: 'کره جنوبی', flag: '🇰🇷' },
  { code: '+39', name: 'ایتالیا', flag: '🇮🇹' },
  { code: '+34', name: 'اسپانیا', flag: '🇪🇸' },
  { code: '+31', name: 'هلند', flag: '🇳🇱' },
  { code: '+46', name: 'سوئد', flag: '🇸🇪' },
  { code: '+47', name: 'نروژ', flag: '🇳🇴' },
  { code: '+45', name: 'دانمارک', flag: '🇩🇰' },
  { code: '+41', name: 'سوئیس', flag: '🇨🇭' },
  { code: '+43', name: 'اتریش', flag: '🇦🇹' },
  { code: '+32', name: 'بلژیک', flag: '🇧🇪' },
  { code: '+48', name: 'لهستان', flag: '🇵🇱' },
  { code: '+36', name: 'مجارستان', flag: '🇭🇺' },
  { code: '+30', name: 'یونان', flag: '🇬🇷' },
  { code: '+351', name: 'پرتغال', flag: '🇵🇹' },
  { code: '+353', name: 'ایرلند', flag: '🇮🇪' },
  { code: '+358', name: 'فنلاند', flag: '🇫🇮' },
  { code: '+60', name: 'مالزی', flag: '🇲🇾' },
  { code: '+65', name: 'سنگاپور', flag: '🇸🇬' },
  { code: '+66', name: 'تایلند', flag: '🇹🇭' },
  { code: '+62', name: 'اندونزی', flag: '🇮🇩' },
  { code: '+63', name: 'فیلیپین', flag: '🇵🇭' },
  { code: '+84', name: 'ویتنام', flag: '🇻🇳' },
  { code: '+55', name: 'برزیل', flag: '🇧🇷' },
  { code: '+54', name: 'آرژانتین', flag: '🇦🇷' },
  { code: '+52', name: 'مکزیک', flag: '🇲🇽' },
  { code: '+27', name: 'آفریقای جنوبی', flag: '🇿🇦' },
  { code: '+20', name: 'مصر', flag: '🇪🇬' },
  { code: '+212', name: 'مراکش', flag: '🇲🇦' },
  { code: '+216', name: 'تونس', flag: '🇹🇳' },
  { code: '+213', name: 'الجزایر', flag: '🇩🇿' },
  { code: '+961', name: 'لبنان', flag: '🇱🇧' },
  { code: '+962', name: 'اردن', flag: '🇯🇴' },
  { code: '+963', name: 'سوریه', flag: '🇸🇾' },
  { code: '+970', name: 'فلسطین', flag: '🇵🇸' },
];

const AuthPage: React.FC<any> = ({ navigation }) => {
  const { requestCode, signInWithEmail, signInWithPhone, isLoggedIn, user, signOut, deleteAccount } = useAuth();
  const [mode, setMode] = useState<Mode>('phone');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'target' | 'code'>('target');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  if (isLoggedIn && user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.title}>حساب کاربری</Text>
          <Text style={styles.sub}>{user.email || user.phone || user.displayName}</Text>
          <PressableScale style={styles.btn} onPress={() => navigation.navigate('MyChannel')}>
            <Text style={styles.btnText}>کانال من</Text>
          </PressableScale>
          <PressableScale style={[styles.btn, styles.btnGhost]} onPress={() => signOut()}>
            <Text style={styles.btnGhostText}>خروج از حساب</Text>
          </PressableScale>
          <PressableScale style={[styles.btn, styles.btnDanger]} onPress={() => deleteAccount()}>
            <Text style={styles.btnText}>حذف حساب</Text>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const fullPhone = `${country.code}${phoneLocal.replace(/\D/g, '')}`;

  const onRequest = async () => {
    setBusy(true);
    setMessage('');
    setGeneratedCode('');
    const target = mode === 'email' ? email.trim() : fullPhone;
    const res = await requestCode(target, mode);
    setBusy(false);
    if (res.ok && res.code) {
      setGeneratedCode(res.code);
      setCode(res.code);
      setStep('code');
    } else {
      setMessage(res.message || 'خطا');
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setMessage('');
    const target = mode === 'email' ? email.trim() : fullPhone;
    const res = mode === 'email' ? await signInWithEmail(target, code) : await signInWithPhone(target, code);
    setBusy(false);
    if (res.ok) {
      navigation.goBack();
    } else {
      setMessage(res.message || 'خطا');
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.includes(searchCountry) ||
      c.code.includes(searchCountry) ||
      c.name.toLowerCase().includes(searchCountry.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.title}>ورود / ثبت‌نام</Text>

          <View style={styles.tabs}>
            <PressableScale
              style={[styles.tab, mode === 'phone' && styles.tabActive]}
              onPress={() => {
                setMode('phone');
                setStep('target');
                setMessage('');
                setGeneratedCode('');
                setCode('');
              }}
            >
              <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>شماره موبایل</Text>
            </PressableScale>
            <PressableScale
              style={[styles.tab, mode === 'email' && styles.tabActive]}
              onPress={() => {
                setMode('email');
                setStep('target');
                setMessage('');
                setGeneratedCode('');
                setCode('');
              }}
            >
              <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>ایمیل</Text>
            </PressableScale>
          </View>

          {step === 'target' ? (
            <>
              {mode === 'phone' ? (
                <View style={styles.phoneRow}>
                  <PressableScale style={styles.countryBtn} onPress={() => setShowCountries(true)}>
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={styles.countryCode}>{country.code}</Text>
                    <Ionicons name="chevron-down" size={14} color={AppTheme.colors.textMuted} />
                  </PressableScale>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="شماره موبایل"
                    placeholderTextColor={AppTheme.colors.placeholder}
                    value={phoneLocal}
                    onChangeText={setPhoneLocal}
                    keyboardType="phone-pad"
                    maxLength={12}
                  />
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="ایمیل"
                  placeholderTextColor={AppTheme.colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
              <PressableScale
                style={styles.btn}
                onPress={onRequest}
                disabled={busy || (mode === 'phone' ? phoneLocal.replace(/\D/g, '').length < 8 : !email.trim())}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>دریافت کد</Text>}
              </PressableScale>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                {mode === 'phone' ? fullPhone : email}
              </Text>

              {generatedCode ? (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>کد تأیید</Text>
                  <Text style={styles.codeValue}>{generatedCode}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="کد ۶ رقمی"
                placeholderTextColor={AppTheme.colors.placeholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <PressableScale style={styles.btn} onPress={onVerify} disabled={busy || code.length < 4}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>تأیید و ورود</Text>}
              </PressableScale>
              <PressableScale onPress={() => { setStep('target'); setGeneratedCode(''); setCode(''); }}>
                <Text style={styles.link}>تغییر {mode === 'email' ? 'ایمیل' : 'شماره'}</Text>
              </PressableScale>
            </>
          )}

          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCountries} animationType="slide" transparent onRequestClose={() => setShowCountries(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>انتخاب کشور</Text>
              <Pressable onPress={() => setShowCountries(false)}>
                <Ionicons name="close" size={24} color={AppTheme.colors.text} />
              </Pressable>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="جستجو..."
              placeholderTextColor={AppTheme.colors.placeholder}
              value={searchCountry}
              onChangeText={setSearchCountry}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item, index) => item.code + item.name + index}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.countryItem}
                  onPress={() => {
                    setCountry(item);
                    setShowCountries(false);
                    setSearchCountry('');
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCodeList}>{item.code}</Text>
                </Pressable>
              )}
              style={{ maxHeight: 420 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  content: { padding: 20, paddingBottom: 40 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: AppTheme.colors.text, textAlign: 'right', marginBottom: 20 },
  sub: { fontSize: 14, color: AppTheme.colors.textSecondary, textAlign: 'right', marginBottom: 20 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: AppTheme.colors.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: AppTheme.colors.primary + '33', borderWidth: 1, borderColor: AppTheme.colors.primary },
  tabText: { color: AppTheme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: AppTheme.colors.primary },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 6,
  },
  countryFlag: { fontSize: 18 },
  countryCode: { color: AppTheme.colors.text, fontWeight: '600', fontSize: 15 },
  phoneInput: { flex: 1, marginBottom: 0 },
  input: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    padding: 14,
    color: AppTheme.colors.text,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 14,
    textAlign: 'right',
  },
  hint: { color: AppTheme.colors.textSecondary, textAlign: 'center', marginBottom: 12, fontSize: 14 },
  codeBox: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + '55',
    alignItems: 'center',
  },
  codeLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  codeValue: {
    color: AppTheme.colors.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
  },
  btn: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: AppTheme.colors.border },
  btnGhostText: { color: AppTheme.colors.textSecondary, fontWeight: '600' },
  btnDanger: { backgroundColor: AppTheme.colors.danger },
  link: { color: AppTheme.colors.info, textAlign: 'center', marginTop: 8 },
  msg: { color: AppTheme.colors.warning, textAlign: 'center', marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: AppTheme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: AppTheme.colors.text },
  searchInput: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 10,
    padding: 12,
    color: AppTheme.colors.text,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 10,
    textAlign: 'right',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border + '55',
    gap: 12,
  },
  countryName: { flex: 1, color: AppTheme.colors.text, fontSize: 15 },
  countryCodeList: { color: AppTheme.colors.textMuted, fontSize: 14 },
});

export default AuthPage;
