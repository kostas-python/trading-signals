'use client';

import { useState, useCallback, useEffect } from 'react';
import { Indicator, CombinedSignal } from '@/types';
import { ALL_INDICATORS, calculateCombinedSignal } from '@/indicators';
import { getFromStorage, setToStorage } from '@/lib/utils';

const STORAGE_KEY = 'enabled-indicators';

export function useIndicators() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedIds = getFromStorage<string[]>(STORAGE_KEY, []);
    
    if (savedIds.length > 0) {
      setIndicators(
        ALL_INDICATORS.map(ind => ({
          ...ind,
          enabled: savedIds.includes(ind.id),
        }))
      );
    } else {
      // Use default enabled state
      setIndicators(ALL_INDICATORS);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when indicators change
  useEffect(() => {
    if (isLoaded) {
      const enabledIds = indicators.filter(i => i.enabled).map(i => i.id);
      setToStorage(STORAGE_KEY, enabledIds);
    }
  }, [indicators, isLoaded]);

  const toggleIndicator = useCallback((id: string) => {
    setIndicators(prev =>
      prev.map(ind =>
        ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
      )
    );
  }, []);

  const enableAll = useCallback(() => {
    setIndicators(prev => prev.map(ind => ({ ...ind, enabled: true })));
  }, []);

  const disableAll = useCallback(() => {
    setIndicators(prev => prev.map(ind => ({ ...ind, enabled: false })));
  }, []);

  const getEnabledIndicators = useCallback(() => {
    return indicators.filter(i => i.enabled);
  }, [indicators]);

  const calculateSignal = useCallback(
    (prices: number[], volumes?: number[]): CombinedSignal => {
      const enabled = indicators.filter(i => i.enabled);
      return calculateCombinedSignal(prices, volumes, enabled);
    },
    [indicators]
  );

  return {
    indicators,
    isLoaded,
    toggleIndicator,
    enableAll,
    disableAll,
    getEnabledIndicators,
    calculateSignal,
  };
}
