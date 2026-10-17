import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

const AuthPage: React.FC<any> = ({ navigation }) => {
  const { requestCode, signInWithEmail, signInWithPhone, isLoggedIn, user, signOut, deleteAccount } = useAuth();
  const [mode, setMode] = useState<Mode>('email');
  const [target, setTarget] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'target' | 'code'>('target');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (isLoggedIn && user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.title}>حساب کاربری</Text>
          <Text style={styles.sub}>{user.email || user.phone || user.displayName}</Text>
          <PressableScale
            style={styles.btn}
            onPress={() => navigation.navigate('MyChannel')}
          >
            <Text style={styles.btnText}>کانال من</Text>
          </PressableScale>
          <PressableScale style={[styles.btn, styles.btnGhost]} onPress={() => signOut()}>
            <Text style={styles.btnGhostText}>خروج از حساب</Text>
          </PressableScale>
          <PressableScale
            style={[styles.btn, styles.btnDanger]}
            onPress={() => deleteAccount()}
          >
            <Text style={styles.btnText}>حذف حساب</Text>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const onRequest = async () => {
    setBusy(true);
    setMessage('');
    const res = await requestCode(target, mode);
    setBusy(false);
    if (res.ok) {
      setStep('code');
      setMessage(res.message || '');
    } else {
      setMessage(res.message || 'خطا');
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setMessage('');
    const res =
      mode === 'email' ? await signInWithEmail(target, code) : await signInWithPhone(target, code);
    setBusy(false);
    if (res.ok) {
      navigation.goBack();
    } else {
      setMessage(res.message || 'خطا');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PressableScale onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={AppTheme.colors.text} />
          </PressableScale>
          <Text style={styles.title}>ورود / ثبت‌نام</Text>
          <Text style={styles.sub}>کد تأیید یک‌بارمصرف برای امنیت حساب شما</Text>

          <View style={styles.tabs}>
            <PressableScale
              style={[styles.tab, mode === 'email' && styles.tabActive]}
              onPress={() => { setMode('email'); setStep('target'); setMessage(''); }}
            >
              <Text style={[styles.tabText, mode === 'email' && styles.tabTextActive]}>ایمیل</Text>
            </PressableScale>
            <PressableScale
              style={[styles.tab, mode === 'phone' && styles.tabActive]}
              onPress={() => { setMode('phone'); setStep('target'); setMessage(''); }}
            >
              <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>شماره</Text>
            </PressableScale>
          </View>

          {step === 'target' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={mode === 'email' ? 'ایمیل' : 'شماره موبایل'}
                placeholderTextColor={AppTheme.colors.placeholder}
                value={target}
                onChangeText={setTarget}
                keyboardType={mode === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />
              <PressableScale style={styles.btn} onPress={onRequest} disabled={busy || !target.trim()}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>دریافت کد</Text>}
              </PressableScale>
            </>
          ) : (
            <>
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
              <PressableScale onPress={() => setStep('target')}>
                <Text style={styles.link}>تغییر {mode === 'email' ? 'ایمیل' : 'شماره'}</Text>
              </PressableScale>
            </>
          )}

          {message ? <Text style={styles.msg}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  content: { padding: 20, paddingBottom: 40 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: AppTheme.colors.text, textAlign: 'right', marginBottom: 6 },
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
});

export default AuthPage;
