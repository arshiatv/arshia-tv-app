import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { supabase } from '../supabase';
// Snapp injects the hosted reset page's address here when Supabase is connected.
import * as SnappKeys from '../keys';

// Email/password sign-in + sign-up modal backed by Supabase auth.
// Session persistence is handled cross-platform (iOS + Android) by ../supabase,
// so this component works the same on both runtimes.
// Usage: <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Where the reset email should send people back to. Snapp writes this address into the app's keys
 * when Supabase is connected; passing it explicitly is more reliable than relying on the project's
 * Site URL, which can take minutes to take effect after a change. Falls back to the project setting.
 */
function resetRedirect(): { redirectTo: string } | undefined {
  const url = (SnappKeys as Record<string, string | undefined>).SNAPP_PASSWORD_RESET_URL;
  return url ? { redirectTo: url } : undefined;
}

/**
 * Supabase's raw messages mean nothing to an end user ("email rate limit exceeded"), and the fix for
 * that one lives with whoever BUILT the app (a Supabase project setting) — the person using the app
 * can do nothing about it. Translate the known ones; pass anything else through untouched.
 */
function friendlyAuthError(err: any): string {
  const raw = String(err?.message || '').toLowerCase();
  if (raw.includes('rate limit')) return "We couldn't send the confirmation email right now. Please try again in a few minutes.";
  if (raw.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link we sent you.';
  if (raw.includes('invalid login credentials')) return 'Wrong email or password.';
  if (raw.includes('user already registered')) return 'That email already has an account — sign in instead.';
  return err?.message || 'Something went wrong';
}

const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  // "Forgot password": only the email is needed, so the password field is hidden.
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), resetRedirect());
        if (error) throw error;
        // Never reveal whether the account exists — that would let anyone probe for addresses.
        setSuccess(`If ${email.trim()} has an account, we just sent a reset link. Open it to choose a new password.`);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        // signUp has TWO outcomes: with "Confirm email" off the project returns a session (the user
        // is signed in); with it on there is no session and Supabase emails a link instead. Without
        // this branch a signed-in user is told to "confirm your email" and left staring at the form.
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) onClose();
        else setSuccess(`We sent a confirmation link to ${email}. Tap it, then sign in.`);
      }
    } catch (err: any) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            {forgot ? 'Reset password' : isLogin ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={styles.subtitle}>
            {forgot
              ? 'We will email you a link to set a new password'
              : isLogin
                ? 'Sign in to continue'
                : 'Sign up to get started'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {!forgot && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!success && <Text style={styles.success}>{success}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                {forgot ? 'Send reset link' : isLogin ? 'Sign in' : 'Sign up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (forgot) setForgot(false);
              else setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
          >
            <Text style={styles.toggle}>
              {forgot
                ? 'Back to sign in'
                : isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>

          {isLogin && !forgot && (
            <TouchableOpacity
              onPress={() => {
                setForgot(true);
                setError('');
                setSuccess('');
              }}
            >
              <Text style={styles.toggle}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  success: { color: '#16a34a', fontSize: 13, marginBottom: 8 },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  toggle: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 16 },
  close: { color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 12 },
});

export default AuthModal;
               
