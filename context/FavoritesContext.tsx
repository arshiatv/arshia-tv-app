// What the viewer has bookmarked.
//
// This build has no database, so the list lives in memory for the current session and is
// shared with every screen through this context. Add a channel, a film or a series from
// the screen you are on and it appears on My Favorites straight away.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Channel } from '../data/channels';

export interface FavoriteItem {
  id: string;
  kind: 'movie' | 'channel' | 'series';
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  channel?: Channel;
  url?: string;
}

interface FavoritesValue {
  favorites: FavoriteItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const isFavorite = useCallback(
    (id: string) => favorites.some((item) => item.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) =>
      prev.some((entry) => entry.id === item.id)
        ? prev.filter((entry) => entry.id !== item.id)
        : prev.concat(item)
    );
  }, []);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavorites(): FavoritesValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used inside FavoritesProvider');
  return value;
    }
