import React, { createContext, useContext, useState, useEffect } from 'react';
import { fbGet, fbSet, fbUpdate } from '../services/firebase';

export const DEFAULT_ADMIN_PIN = '1234';
const ADMIN_PATH = 'admin';
const PAYCARD_PATH = 'payCard';

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
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(DEFAULT_ADMIN_PIN);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [removedChannelIds, setRemovedChannelIds] = useState<string[]>([]);
  const [payCard, setPayCard] = useState({ bank: '', number: '', holder: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fbGet(ADMIN_PATH);
        if (!mounted) return;
        if (data && data.pin) setPin(data.pin);
      } catch (err) {
        // keep defaults on error
        console.log('Admin load error', err);
      }
    })();

    (async () => {
      try {
        const card = await fbGet(PAYCARD_PATH);
        if (!mounted) return;
        if (card) setPayCard({ bank: card.bank || '', number: card.number || '', holder: card.holder || '' });
      } catch (err) {
        console.log('PayCard load error', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const unlock = (enteredPin: string) => {
    if (enteredPin === pin) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const lock = () => setIsAdmin(false);

  const changePin = async (newPin: string) => {
    try {
      setPin(newPin);
      await fbUpdate(ADMIN_PATH, { pin: newPin });
    } catch (error) {
      console.log('Error updating PIN', error);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setHiddenGroups(prev =>
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const restoreChannels = () => setRemovedChannelIds([]);

  const updatePayCard = async (card: { bank: string; number: string; holder: string }) => {
    try {
      setPayCard(card);
      await fbSet(PAYCARD_PATH, card);
    } catch (error) {
      console.log('Error updating pay card', error);
    }
  };

  const value = {
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
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export function useAdmin(): AdminContextType {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside AdminProvider');
  return value;
}
