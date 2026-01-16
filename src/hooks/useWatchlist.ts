'use client';

import { useState, useCallback, useEffect } from 'react';
import { Asset, AssetType } from '@/types';
import { getFromStorage, setToStorage } from '@/lib/utils';

const STORAGE_KEY = 'watchlist';

interface WatchlistEntry {
  id: string;
  type: AssetType;
  addedAt: string;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = getFromStorage<WatchlistEntry[]>(STORAGE_KEY, []);
    setWatchlist(saved);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setToStorage(STORAGE_KEY, watchlist);
    }
  }, [watchlist, isLoaded]);

  const addToWatchlist = useCallback((asset: Asset) => {
    setWatchlist(prev => {
      if (prev.some(w => w.id === asset.id && w.type === asset.type)) {
        return prev;
      }
      return [...prev, { id: asset.id, type: asset.type, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string, type: AssetType) => {
    setWatchlist(prev => prev.filter(w => !(w.id === id && w.type === type)));
  }, []);

  const isInWatchlist = useCallback(
    (id: string, type: AssetType) => {
      return watchlist.some(w => w.id === id && w.type === type);
    },
    [watchlist]
  );

  const getWatchlistIds = useCallback(
    (type: AssetType) => {
      return watchlist.filter(w => w.type === type).map(w => w.id);
    },
    [watchlist]
  );

  return {
    watchlist,
    isLoaded,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    getWatchlistIds,
  };
}
