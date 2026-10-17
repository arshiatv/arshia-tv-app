import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fbGet, fbSet } from '../services/firebase';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatar?: string;
  createdAt: number;
  lastDevice?: string;
  devices?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLoggedIn: boolean;
  signInWithEmail: (email: string, code: string) => Promise<{ ok: boolean; message?: string }>;
  signInWithPhone: (phone: string, code: string) => Promise<{ ok: boolean; message?: string }>;
  requestCode: (target: string, method: 'email' | 'phone') => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = '@arshia_user';

// One-time codes live in Firebase under auth/codes/{hash}
// For production you should send real SMS/Email via a backend.
// Here we store a short-lived code so the flow is complete and testable.

function simpleHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(Math.abs(h));
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function looksLikePhone(v: string) {
  const d = v.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as UserProfile;
          setUser(parsed);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (profile: UserProfile | null) => {
    setUser(profile);
    if (profile) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      try {
        await fbSet(`users/${profile.id}`, profile);
      } catch {}
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const requestCode = useCallback(async (target: string, method: 'email' | 'phone') => {
    const clean = target.trim();
    if (method === 'email' && !looksLikeEmail(clean)) {
      return { ok: false, message: 'ایمیل معتبر نیست' };
    }
    if (method === 'phone' && !looksLikePhone(clean)) {
      return { ok: false, message: 'شماره معتبر نیست' };
    }
    // Generate 6-digit one-time code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = simpleHash(clean.toLowerCase());
    try {
      await fbSet(`auth/codes/${key}`, {
        code,
        target: clean,
        method,
        createdAt: Date.now(),
        used: false,
      });
      // Admin notification inbox (check Firebase path auth/inbox)
      try {
        await fbSet(`auth/inbox/${Date.now()}`, {
          target: clean,
          method,
          code,
          createdAt: Date.now(),
          notifyEmail: 'arshiyatv.HD@gmail.com',
        });
      } catch {}
    } catch {
      return { ok: false, message: 'خطا در ارسال کد. اتصال را بررسی کنید.' };
    }
    // In production a backend would SMS/Email the code.
    // For now the code is stored remotely; admin can read it from Firebase if needed for testing.
    // We intentionally do NOT show the code in the UI for security.
    return { ok: true, message: 'کد تأیید ارسال شد' };
  }, []);

  const completeLogin = useCallback(
    async (target: string, method: 'email' | 'phone', code: string) => {
      const key = simpleHash(target.trim().toLowerCase());
      try {
        const record = await fbGet(`auth/codes/${key}`);
        if (!record || record.used) return { ok: false, message: 'کد نامعتبر است' };
        if (String(record.code) !== String(code).trim()) return { ok: false, message: 'کد اشتباه است' };
        if (Date.now() - (record.createdAt || 0) > 10 * 60 * 1000) {
          return { ok: false, message: 'کد منقضی شده است' };
        }
        // mark used
        await fbSet(`auth/codes/${key}`, { ...record, used: true });

        const id = simpleHash(target.trim().toLowerCase());
        let profile: UserProfile | null = null;
        try {
          profile = await fbGet(`users/${id}`);
        } catch {}
        if (!profile) {
          profile = {
            id,
            email: method === 'email' ? target.trim() : undefined,
            phone: method === 'phone' ? target.trim() : undefined,
            displayName: method === 'email' ? target.split('@')[0] : target,
            createdAt: Date.now(),
            devices: [],
          };
        }

        // Device notice: if already has devices and this is a new session, flag it
        const deviceId = `device_${Date.now()}`;
        const devices = Array.isArray(profile.devices) ? profile.devices : [];
        if (devices.length > 0) {
          try {
            await fbSet(`users/${id}/loginNotices/${Date.now()}`, {
              at: Date.now(),
              deviceId,
              message: 'ورود از دستگاه جدید',
            });
          } catch {}
        }
        profile = {
          ...profile,
          lastDevice: deviceId,
          devices: [...devices, deviceId].slice(-5),
        };

        await persist(profile);
        return { ok: true };
      } catch {
        return { ok: false, message: 'خطای شبکه' };
      }
    },
    [persist]
  );

  const signInWithEmail = useCallback(
    (email: string, code: string) => completeLogin(email, 'email', code),
    [completeLogin]
  );
  const signInWithPhone = useCallback(
    (phone: string, code: string) => completeLogin(phone, 'phone', code),
    [completeLogin]
  );

  const signOut = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const deleteAccount = useCallback(async () => {
    if (user?.id) {
      try {
        await fbSet(`users/${user.id}`, null);
      } catch {}
    }
    await persist(null);
  }, [user, persist]);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      const next = { ...user, ...patch };
      await persist(next);
    },
    [user, persist]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoggedIn: !!user,
      signInWithEmail,
      signInWithPhone,
      requestCode,
      signOut,
      deleteAccount,
      updateProfile,
    }),
    [user, loading, signInWithEmail, signInWithPhone, requestCode, signOut, deleteAccount, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
