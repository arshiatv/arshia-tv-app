import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [removedChannelIds, setRemovedChannelIds] = useState<string[]>([]);
  const [payCard, setPayCard] = useState({ bank: '', number: '', holder: '' });

  // Read admin data from remote on app start.
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
  }, []);

  const unlock = (enteredPin: string) => {
    if (enteredPin === pin && pin) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const lock = () => setIsAdmin(false);

  const changePin = async (newPin: string) => {
    try {
      setPin(newPin);
      const response = await fetch(FIREBASE_URL);
      const currentData = (await response.json()) || {};

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

  const updatePayCard = async (card: { bank: string; number: string; holder: string }) => {
    try {
      setPayCard(card);
      const response = await fetch(FIREBASE_URL);
      const currentData = (await response.json()) || {};
      await fetch(FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentData, ...card }),
      });
    } catch (error) {
      console.log("Error updating pay card to Firebase:", error);
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
