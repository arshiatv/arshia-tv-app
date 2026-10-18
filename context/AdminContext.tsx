import type { Ad } from '../services/ads';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fbGet, fbSet, fbUpdate, fbRemove } from '../services/firebase';

export const DEFAULT_ADMIN_PIN = '1234';

export interface PayCard {
  bank: string;
  number: string;
  holder: string;
}

export interface SupportSettings {
  enabled: boolean;
  cardEnabled: boolean;
  gatewayEnabled: boolean;
  amount: string;
  cards: PayCard[];
  gateways: { id: string; name: string; url: string; active: boolean }[];
}

export interface PreRollSettings {
  enabled: boolean;
  durationSec: number;
  title: string;
  line1: string;
  line2: string;
  cta: string;
  sourceUrl?: string;
  durationSeconds?: number;
  hourStart?: number;
  hourEnd?: number;
  everyMinutes?: number;
}

interface AdminContextType {
  isAdmin: boolean;
  pin: string;
  unlock: (enteredPin: string) => boolean | Promise<boolean>;
  lock: () => void;
  changePin: (newPin: string) => Promise<void>;
  hiddenGroups: string[];
  toggleGroup: (groupKey: string) => void;
  removedChannelIds: string[];
  removeChannel: (id: string) => void;
  restoreChannels: () => void;
  payCard: PayCard;
  updatePayCard: (card: PayCard) => Promise<void>;
  support: SupportSettings;
  updateSupport: (next: Partial<SupportSettings>) => Promise<void>;
  preRoll: PreRollSettings;
  updatePreRoll: (next: Partial<PreRollSettings>) => Promise<void>;
  // Ads
  ads: Ad[];
  loadAds: () => Promise<void>;
  createAd: (ad: Omit<Ad, 'id' | 'createdAt'>) => Promise<string | null>;
  updateAd: (id: string, ad: Partial<Ad>) => Promise<boolean>;
  deleteAd: (id: string) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const DEFAULT_SUPPORT: SupportSettings = {
  enabled: true,
  cardEnabled: true,
  gatewayEnabled: true,
  amount: '50000',
  cards: [],
  gateways: [
    { id: 'zarinpal', name: 'زرین‌پال', url: 'https://zarinpal.com', active: true },
    { id: 'idpay', name: 'آیدی‌پی', url: 'https://idpay.ir', active: true },
    { id: 'nextpay', name: 'نکست‌پی', url: 'https://nextpay.org', active: true },
  ],
};

const DEFAULT_PREROLL: PreRollSettings = {
  enabled: true,
  durationSec: 5,
  title: 'آرشیا تی‌وی',
  line1: 'تبلیغات و همکاری تجاری می‌پذیریم',
  line2: 'برای معرفی برند، محصول یا کسب‌وکار خود با بخش مدیریت در ارتباط باشید',
  cta: 'درخواست تبلیغات',
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(DEFAULT_ADMIN_PIN);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [removedChannelIds, setRemovedChannelIds] = useState<string[]>([]);
  const [payCard, setPayCard] = useState<PayCard>({ bank: '', number: '', holder: '' });
  const [support, setSupport] = useState<SupportSettings>(DEFAULT_SUPPORT);
  const [preRoll, setPreRoll] = useState<PreRollSettings>(DEFAULT_PREROLL);
  const [ads, setAds] = useState<Ad[]>([]);

  const applyRemote = useCallback(async () => {
    try {
      const remotePin = await fbGet('admin/pin');
      if (remotePin !== null && remotePin !== undefined && String(remotePin).length > 0) {
        setPin(String(remotePin));
      }

      const remoteCard = await fbGet('admin/payCard');
      if (remoteCard && typeof remoteCard === 'object') {
        setPayCard({
          bank: remoteCard.bank || '',
          number: remoteCard.number || '',
          holder: remoteCard.holder || '',
        });
      }

      const remoteSupport = await fbGet('admin/support');
      if (remoteSupport && typeof remoteSupport === 'object') {
        setSupport((prev) => ({ ...prev, ...remoteSupport }));
      }

      const remotePreRoll = await fbGet('admin/preRoll');
      if (remotePreRoll && typeof remotePreRoll === 'object') {
        setPreRoll((prev) => ({ ...prev, ...remotePreRoll }));
      }

      const remoteHidden = await fbGet('admin/hiddenGroups');
      if (Array.isArray(remoteHidden)) setHiddenGroups(remoteHidden);

      const remoteRemoved = await fbGet('admin/removedChannelIds');
      if (Array.isArray(remoteRemoved)) setRemovedChannelIds(remoteRemoved);
    } catch (e) {
      console.log('Admin remote load error:', e);
    }
  }, []);

  // Load once, then keep shared public settings in sync for all installs
  useEffect(() => {
    applyRemote().then(() => loadAds().catch(() => {}));
    const timer = setInterval(() => {
      applyRemote().catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [applyRemote]);

  const unlock = useCallback(async (enteredPin: string) => {
    let current = pin;
    try {
      const remotePin = await fbGet('admin/pin');
      if (remotePin !== null && remotePin !== undefined && String(remotePin).length > 0) {
        current = String(remotePin);
        setPin(current);
      }
    } catch {}
    if (String(enteredPin).trim() === String(current).trim()) {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, [pin]);

  const lock = useCallback(() => setIsAdmin(false), []);

  const changePin = useCallback(async (newPin: string) => {
    const clean = String(newPin).trim();
    if (clean.length < 4) return;
    setPin(clean);
    try {
      await fbSet('admin/pin', clean);
    } catch (e) {
      console.log('Error saving PIN:', e);
    }
  }, []);

  const toggleGroup = useCallback(async (groupKey: string) => {
    setHiddenGroups((prev) => {
      const next = prev.includes(groupKey)
        ? prev.filter((k) => k !== groupKey)
        : [...prev, groupKey];
      fbSet('admin/hiddenGroups', next).catch(() => {});
      return next;
    });
  }, []);

  const removeChannel = useCallback(async (id: string) => {
    setRemovedChannelIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      fbSet('admin/removedChannelIds', next).catch(() => {});
      return next;
    });
  }, []);

  const restoreChannels = useCallback(async () => {
    setRemovedChannelIds([]);
    try {
      await fbSet('admin/removedChannelIds', []);
    } catch {}
  }, []);

  const updatePayCard = useCallback(async (card: PayCard) => {
    setPayCard(card);
    try {
      await fbSet('admin/payCard', card);
    } catch (e) {
      console.log('Error saving card:', e);
    }
  }, []);

  const updateSupport = useCallback(async (next: Partial<SupportSettings>) => {
    setSupport((prev) => {
      const merged = { ...prev, ...next };
      fbSet('admin/support', merged).catch(() => {});
      return merged;
    });
  }, []);

  const updatePreRoll = useCallback(async (next: Partial<PreRollSettings>) => {
    setPreRoll((prev) => {
      const merged = { ...prev, ...next };
      fbSet('admin/preRoll', merged).catch(() => {});
      return merged;
    });
  }, []);

  // Ads
  const loadAds = useCallback(async () => {
    try {
      const data = await fbGet('ads');
      if (!data) {
        setAds([]);
        return;
      }
      const list: Ad[] = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAds(list);
    } catch (e) {
      console.log('Error loading ads:', e);
    }
  }, []);

  const createAd = useCallback(
    async (ad: Omit<Ad, 'id' | 'createdAt'>) => {
      try {
        const body = { ...ad, active: !!ad.active, createdAt: Date.now() };
        // Firebase push-style: we use a generated key
        const key = `ad_${Date.now()}`;
        await fbSet(`ads/${key}`, body);
        await loadAds();
        return key;
      } catch (e) {
        console.log('Error creating ad:', e);
        return null;
      }
    },
    [loadAds]
  );

  const updateAd = useCallback(
    async (id: string, ad: Partial<Ad>) => {
      try {
        await fbUpdate(`ads/${id}`, ad);
        await loadAds();
        return true;
      } catch (e) {
        console.log('Error updating ad:', e);
        return false;
      }
    },
    [loadAds]
  );

  const deleteAd = useCallback(
    async (id: string) => {
      try {
        await fbRemove(`ads/${id}`);
        await loadAds();
        return true;
      } catch (e) {
        console.log('Error deleting ad:', e);
        return false;
      }
    },
    [loadAds]
  );

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        pin,
        unlock,
        lock,
        changePin,
        hiddenGroups,
        toggleGroup,
        removedChannelIds,
        removeChannel,
        restoreChannels,
        payCard,
        updatePayCard,
        support,
        updateSupport,
        preRoll,
        updatePreRoll,
        ads,
        loadAds,
        createAd,
        updateAd,
        deleteAd,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
