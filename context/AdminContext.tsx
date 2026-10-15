// Who is running Arshia TV.
//
// This build has no database, so the manager is recognised for the current session:
// unlock with the PIN and the management tools appear (hide a folder, remove a channel,
// set the card-to-card details). Everything the manager changes lives in memory and is
// shared with every screen through this context.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface PayCard {
  bank: string;
  number: string;
  holder: string;
}

export const DEFAULT_ADMIN_PIN = '1234';

interface AdminContextValue {
  isAdmin: boolean;
  pin: string;
  unlock: (candidate: string) => boolean;
  lock: () => void;
  changePin: (next: string) => void;
  hiddenGroups: string[];
  toggleGroup: (key: string) => void;
  removedChannelIds: string[];
  removeChannel: (id: string) => void;
  restoreChannels: () => void;
  payCard: PayCard;
  updatePayCard: (next: Partial<PayCard>) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState(DEFAULT_ADMIN_PIN);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [removedChannelIds, setRemovedChannelIds] = useState<string[]>([]);
  const [payCard, setPayCard] = useState<PayCard>({ bank: '', number: '', holder: '' });

  const unlock = useCallback(
    (candidate: string) => {
      const ok = candidate.trim() === pin;
      if (ok) setIsAdmin(true);
      return ok;
    },
    [pin]
  );

  const lock = useCallback(() => setIsAdmin(false), []);

  const changePin = useCallback((next: string) => {
    const clean = next.trim();
    if (clean.length >= 4) setPin(clean);
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setHiddenGroups((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : prev.concat(key)
    );
  }, []);

  const removeChannel = useCallback((id: string) => {
    setRemovedChannelIds((prev) => (prev.includes(id) ? prev : prev.concat(id)));
  }, []);

  const restoreChannels = useCallback(() => setRemovedChannelIds([]), []);

  const updatePayCard = useCallback((next: Partial<PayCard>) => {
    setPayCard((prev) => ({ ...prev, ...next }));
  }, []);

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside AdminProvider');
  return value;
  }
                                    
