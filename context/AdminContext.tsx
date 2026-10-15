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
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(DEFAULT_ADMIN_PIN);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [removedChannelIds, setRemovedChannelIds] = useState<string[]>([]);
  const [payCard, setPayCard] = useState({ bank: '', number: '', holder: '' });

  // لود کردن اطلاعات از فایربیس به محض باز شدن برنامه
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
    if (enteredPin === pin) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const lock = () => setIsAdmin(false);

  const changePin = (newPin: string) => {
    setPin(newPin);
  };

  const toggleGroup = (groupKey: string) => {
    setHiddenGroups(prev =>
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const restoreChannels = () => setRemovedChannelIds([]);

  const updatePayCard = (card: { bank: string; number: string; holder: string }) => {
    setPayCard(card);
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
        
