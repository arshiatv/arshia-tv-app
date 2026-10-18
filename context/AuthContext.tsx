import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fbGet, fbSet, fbRemove } from '../services/firebase';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatar?: string;
  createdAt: number;
  lastDevice?: string;
  devices?: string[];
  warnings?: number;
  banUntil?: number | null;
  banCount?: number;
  status?: 'active' | 'banned' | 'restricted';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLoggedIn: boolean;
  signInWithEmail: (email: string, code: string) => Promise<{ ok: boolean; message?: string }>;
  signInWithPhone: (phone: string, code: string) => Promise<{ ok: boolean; message?: string }>;
  requestCode: (target: string, method: 'email' | 'phone') => Promise<{ ok: boolean; message?: string; code?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = '@arshia_user';

function simpleHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(Math.abs(h));
}

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function normalizePhone(v: string) {
  let d = v.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) d = '+' + d.replace(/\D/g, '');
  return d;
}

function looksLikePhone(v: string) {
  const n = normalizePhone(v);
  const digits = n.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
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
          try {
            const remote = await fbGet(`users/${parsed.id}`);
            if (remote) {
              const merged = { ...parsed, ...remote };
              setUser(merged);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            }
          } catch {}
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

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const remote = await fbGet(`users/${user.id}`);
      if (remote) {
        await persist({ ...user, ...remote });
      }
    } catch {}
  }, [user, persist]);

  const requestCode = useCallback(async (target: string, method: 'email' | 'phone') => {
    const clean = method === 'phone' ? normalizePhone(target) : target.trim().toLowerCase();
    if (method === 'email' && !looksLikeEmail(clean)) {
      return { ok: false, message: 'ایمیل معتبر نیست' };
    }
    if (method === 'phone' && !looksLikePhone(clean)) {
      return { ok: false, message: 'شماره معتبر نیست' };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = simpleHash(clean);
    try {
      await fbSet(`auth/codes/${key}`, {
        code,
        target: clean,
        method,
        createdAt: Date.now(),
        used: false,
      });
      await fbSet(`auth/inbox/${Date.now()}`, {
        target: clean,
        method,
        code,
        createdAt: Date.now(),
        notifyEmail: 'arshiyatv.HD@gmail.com',
      });
    } catch {
      return { ok: false, message: 'خطا در ارسال کد. اتصال را بررسی کنید.' };
    }
    await new Promise((r) => setTimeout(r, 7000));
    return { ok: true, message: 'کد تأیید ارسال شد', code };
  }, []);

  const completeLogin = useCallback(
    async (target: string, method: 'email' | 'phone', code: string) => {
      const clean = method === 'phone' ? normalizePhone(target) : target.trim().toLowerCase();
      const key = simpleHash(clean);
      try {
        const record = await fbGet(`auth/codes/${key}`);
        if (!record || record.used) return { ok: false, message: 'کد نامعتبر است' };
        if (String(record.code) !== String(code).trim()) return { ok: false, message: 'کد اشتباه است' };
        if (Date.now() - (record.createdAt || 0) > 10 * 60 * 1000) {
          return { ok: false, message: 'کد منقضی شده است' };
        }
        await fbSet(`auth/codes/${key}`, { ...record, used: true });

        const id = simpleHash(clean);
        let profile: UserProfile | null = null;
        try {
          profile = await fbGet(`users/${id}`);
        } catch {}

        if (profile && profile.status === 'banned') {
          const until = profile.banUntil || 0;
          if (until === -1 || until > Date.now()) {
            return { ok: false, message: 'این حساب مسدود شده است' };
          }
        }

        if (!profile) {
          profile = {
            id,
            email: method === 'email' ? clean : undefined,
            phone: method === 'phone' ? clean : undefined,
            displayName: method === 'email' ? clean.split('@')[0] : clean,
            createdAt: Date.now(),
            devices: [],
            warnings: 0,
            banCount: 0,
            banUntil: null,
            status: 'active',
          };
        }

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
          email: method === 'email' ? clean : profile.email,
          phone: method === 'phone' ? clean : profile.phone,
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
        await fbRemove(`users/${user.id}`);
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
      refreshUser,
    }),
    [user, loading, signInWithEmail, signInWithPhone, requestCode, signOut, deleteAccount, updateProfile, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
