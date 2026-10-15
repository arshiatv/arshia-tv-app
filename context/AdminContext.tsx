import type { Ad } from '../services/ads';
import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEFAULT_ADMIN_PIN = '1234';
const FIREBASE_URL = "https://firebaseio.com";

interface AdminContextType {
  isAdmin: boolean;
  pin: string;
  unlock: (enteredPin: string) => boolean;
  lock: () => void;
  changePin: (newPin: string) => void;
  hiddenGroups: string[];
  toggleGroup: (groupKey: string) => void;
  removedChannelIds: string[];
  restoreChannels: () => void;
  payCard: { bank: string; number: string; holder: string };
  updatePayCard: (card: { bank: string; number: string; holder: string }) => void;
  // Ads management
  ads: Ad[];
  loadAds: () => Promise<void>;
  createAd: (ad: Omit<Ad, 'id' | 'createdAt'>) => Promise<string | null>;
  updateAd: (id: string, ad: Partial<Ad>) => Promise<boolean>;
  deleteAd: (id: string) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(DEFAULT_ADMIN_PIN);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [removedChannelIds, setRemovedChannelIds] = useState<string[]>([]);
  const [payCard, setPayCard] = useState({ bank: '', number: '', holder: '' });
  const [ads, setAds] = useState<Ad[]>([]);

  // ۱. خواندن آنلاین اطلاعات از فایربیس به محض باز شدن برنامه
  useEffect(() => {
    fetch(FIREBASE_URL)
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.pin) setPin(data.pin);
          setPayCard({
            bank: data.bank || '',
            number: data.number || '',
            holder: data.holder || '',
          });
        }
      })
      .catch(err => console.log("Error loading Firebase data:", err));

    // load ads initially
    loadAds().catch((e) => console.log('Failed loading ads:', e));
  }, []);

  const unlock = (enteredPin: string) => {
    if (enteredPin === pin) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const lock = () => setIsAdmin(false);

  // ۲. ارسال آنلاین رمز جدید به فایربیس هنگام تغییر رمز
  const changePin = async (newPin: string) => {
    try {
      setPin(newPin);
      const response = await fetch(FIREBASE_URL);
      const currentData = await response.json() || {};
      
      await fetch(FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentData, pin: newPin }),
      });
    } catch (error) {
      console.log("Error updating PIN to Firebase:", error);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setHiddenGroups(prev =>
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const restoreChannels = () => setRemovedChannelIds([]);

  // ۳. ارسال آنلاین مشخصات کارت به فایربیس هنگام زدن دکمه ذخیره اطلاعات کارت
  const updatePayCard = async (card: { bank: string; number: string; holder: string }) => {
    try {
      setPayCard(card);
      const response = await fetch(FIREBASE_URL);
      const currentData = await response.json() || {};
      
      await fetch(FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentData, ...card }),
      });
    } catch (error) {
      console.log("Error updating Card to Firebase:", error);
    }
  };

  // --- Ads management through simple Realtime DB REST API ---
  const loadAds = async () => {
    try {
      const res = await fetch(`${FIREBASE_URL}/ads.json`);
      const data = await res.json();
      if (!data) {
        setAds([]);
        return;
      }
      const list: Ad[] = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
      // sort by createdAt desc
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAds(list);
    } catch (error) {
      console.log('Error loading ads from Firebase:', error);
    }
  };

  const createAd = async (ad: Omit<Ad, 'id' | 'createdAt'>) => {
    try {
      const body = { ...ad, active: !!ad.active, createdAt: Date.now() };
      const res = await fetch(`${FIREBASE_URL}/ads.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      const id = result.name;
      if (id) {
        await loadAds();
        return id;
      }
      return null;
    } catch (error) {
      console.log('Error creating ad:', error);
      return null;
    }
  };

  const updateAd = async (id: string, ad: Partial<Ad>) => {
    try {
      await fetch(`${FIREBASE_URL}/ads/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ad),
      });
      await loadAds();
      return true;
    } catch (error) {
      console.log('Error updating ad:', error);
      return false;
    }
  };

  const deleteAd = async (id: string) => {
    try {
      await fetch(`${FIREBASE_URL}/ads/${id}.json`, { method: 'DELETE' });
      await loadAds();
      return true;
    } catch (error) {
      console.log('Error deleting ad:', error);
      return false;
    }
  };

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
        restoreChannels,
        payCard,
        updatePayCard,
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
