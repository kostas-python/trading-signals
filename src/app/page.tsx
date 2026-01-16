'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Star, LayoutGrid, TrendingUp, Key, AlertTriangle } from 'lucide-react';
import { Asset, AssetType, CombinedSignal } from '@/types';
import { fetchCryptoMarkets, fetchStockData, fetchCryptoDetails, fetchStockDetails, hasFinnhubApiKey } from '@/lib/api';
import { useIndicators } from '@/hooks/useIndicators';
import { useWatchlist } from '@/hooks/useWatchlist';
import {
  Header,
  AssetCard,
  AssetDetail,
  IndicatorPanel,
  SearchBar,
  LoadingGrid,
  SettingsModal,
  AIChatPanel,
} from '@/components';

type ViewMode = 'all' | 'watchlist';

export default function Dashboard() {
  const [marketType, setMarketType] = useState<AssetType>('crypto');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [signals, setSignals] = useState<Record<string, CombinedSignal>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isIndicatorPanelOpen, setIsIndicatorPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showApiWarning, setShowApiWarning] = useState(false);

  const { indicators, toggleIndicator, enableAll, disableAll, calculateSignal, isLoaded: indicatorsLoaded } = useIndicators();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  // Check for API key on stock tab
  useEffect(() => {
    const checkApiKey = async () => {
      if (marketType === 'stock') {
        const hasKey = await hasFinnhubApiKey();
        setShowApiWarning(!hasKey);
      } else {
        setShowApiWarning(false);
      }
    };
    checkApiKey();
  }, [marketType]);

  // Fetch market data
  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let data: Asset[];
      if (marketType === 'crypto') {
        data = await fetchCryptoMarkets();
      } else {
        data = await fetchStockData();
      }
      setAssets(data);
      setLastUpdate(new Date());

      // Calculate signals for each asset with sparkline data
      const newSignals: Record<string, CombinedSignal> = {};
      for (const asset of data) {
        if (asset.sparkline && asset.sparkline.length > 0) {
          newSignals[asset.id] = calculateSignal(asset.sparkline);
        }
      }
      setSignals(newSignals);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [marketType, calculateSignal]);

  // Initial fetch and refresh interval
  useEffect(() => {
    if (indicatorsLoaded) {
      fetchData();
      const interval = setInterval(() => fetchData(true), 60000);
      return () => clearInterval(interval);
    }
  }, [marketType, indicatorsLoaded, fetchData]);

  // Recalculate signals when indicators change
  useEffect(() => {
    if (assets.length > 0 && indicatorsLoaded) {
      const newSignals: Record<string, CombinedSignal> = {};
      for (const asset of assets) {
        if (asset.sparkline && asset.sparkline.length > 0) {
          newSignals[asset.id] = calculateSignal(asset.sparkline);
        }
      }
      setSignals(newSignals);
    }
  }, [indicators, assets, calculateSignal, indicatorsLoaded]);

  // Filter assets based on view mode
  const displayedAssets = viewMode === 'watchlist'
    ? assets.filter(a => isInWatchlist(a.id, a.type))
    : assets;

  // Sort by signal score (strongest first)
  const sortedAssets = [...displayedAssets].sort((a, b) => {
    const scoreA = signals[a.id]?.score ?? 0;
    const scoreB = signals[b.id]?.score ?? 0;
    return scoreB - scoreA;
  });

  // Handle asset selection
  const handleAssetClick = async (asset: Asset) => {
    setSelectedAsset(asset);
    
    let details;
    if (asset.type === 'crypto') {
      details = await fetchCryptoDetails(asset.id);
    } else {
      details = await fetchStockDetails(asset.symbol);
    }
    
    if (details) {
      const signal = calculateSignal(details.prices, details.volumes);
      setSignals(prev => ({ ...prev, [asset.id]: signal }));
    }
  };

  // Handle search result
  const handleSearchSelect = (asset: Asset) => {
    if (!assets.find(a => a.id === asset.id)) {
      setAssets(prev => [asset, ...prev]);
    }
    handleAssetClick(asset);
  };

  // Toggle watchlist
  const handleToggleWatch = (asset: Asset) => {
    if (isInWatchlist(asset.id, asset.type)) {
      removeFromWatchlist(asset.id, asset.type);
    } else {
      addToWatchlist(asset);
    }
  };

  const enabledIndicatorCount = indicators.filter(i => i.enabled).length;

  return (
    <div className="min-h-screen bg-terminal-bg noise-overlay">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-30" />
      <div className="fixed inset-0 bg-glow-radial" />

      <Header
        marketType={marketType}
        onMarketTypeChange={setMarketType}
        onSettingsClick={() => setIsIndicatorPanelOpen(true)}
      />

      <main className="relative mx-auto max-w-7xl px-4 py-6">
        {/* API Key Warning Banner */}
        <AnimatePresence>
          {showApiWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center justify-between rounded-xl border border-signal-neutral/50 bg-signal-neutral/10 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-signal-neutral" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Finnhub API key not configured - Add it for real stock data
                  </p>
                  <p className="text-xs text-terminal-muted">
                    Get a free API key at finnhub.io (60 calls/min)
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-signal-neutral/20 px-4 py-2 text-sm font-medium text-signal-neutral hover:bg-signal-neutral/30"
              >
                <Key className="h-4 w-4" />
                Settings
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <SearchBar marketType={marketType} onSelectAsset={handleSearchSelect} />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-terminal-border bg-terminal-surface p-1">
              <ViewButton
                active={viewMode === 'all'}
                onClick={() => setViewMode('all')}
                icon={<LayoutGrid className="h-4 w-4" />}
                label="All"
              />
              <ViewButton
                active={viewMode === 'watchlist'}
                onClick={() => setViewMode('watchlist')}
                icon={<Star className="h-4 w-4" />}
                label="Watchlist"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center rounded-lg border border-terminal-border bg-terminal-surface p-2 text-terminal-muted hover:border-accent-cyan hover:text-accent-cyan"
              title="API Settings"
            >
              <Key className="h-4 w-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-surface px-3 py-2 text-sm text-terminal-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
          </div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-terminal-border bg-terminal-surface/50 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-cyan" />
            <span className="text-terminal-muted">
              {sortedAssets.length} {marketType === 'crypto' ? 'Cryptocurrencies' : 'Stocks'}
            </span>
          </div>
          <div className="h-4 w-px bg-terminal-border" />
          <div className="text-terminal-muted">
            <span className="text-signal-buy">{Object.values(signals).filter(s => s.score > 20).length}</span> Bullish
          </div>
          <div className="text-terminal-muted">
            <span className="text-signal-sell">{Object.values(signals).filter(s => s.score < -20).length}</span> Bearish
          </div>
          <div className="h-4 w-px bg-terminal-border" />
          <div className="text-terminal-muted">
            {enabledIndicatorCount} Indicators
          </div>
          {lastUpdate && (
            <>
              <div className="h-4 w-px bg-terminal-border" />
              <div className="text-terminal-muted">
                Updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </>
          )}
        </motion.div>

        {/* Asset grid */}
        {isLoading ? (
          <LoadingGrid />
        ) : sortedAssets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-terminal-border bg-terminal-surface/50 py-20"
          >
            <Star className="h-12 w-12 text-terminal-muted" />
            <h3 className="mt-4 font-display text-lg font-semibold text-white">
              {viewMode === 'watchlist' ? 'No assets in watchlist' : 'No assets found'}
            </h3>
            <p className="mt-2 text-sm text-terminal-muted">
              {viewMode === 'watchlist'
                ? 'Add assets to your watchlist by clicking the star icon'
                : 'Try searching for a specific asset'}
            </p>
          </motion.div>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sortedAssets.map((asset, index) => (
                <AssetCard
                  key={`${asset.type}-${asset.id}`}
                  asset={asset}
                  signal={signals[asset.id]}
                  isWatched={isInWatchlist(asset.id, asset.type)}
                  onToggleWatch={() => handleToggleWatch(asset)}
                  onClick={() => handleAssetClick(asset)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            signal={signals[selectedAsset.id] ?? null}
            isWatched={isInWatchlist(selectedAsset.id, selectedAsset.type)}
            onToggleWatch={() => handleToggleWatch(selectedAsset)}
            onClose={() => setSelectedAsset(null)}
          />
        )}
      </AnimatePresence>

      <IndicatorPanel
        isOpen={isIndicatorPanelOpen}
        onClose={() => setIsIndicatorPanelOpen(false)}
        indicators={indicators}
        onToggle={toggleIndicator}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          fetchData(true);
        }}
      />

      <AIChatPanel assets={assets} signals={signals} />
    </div>
  );
}

interface ViewButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ViewButton({ active, onClick, icon, label }: ViewButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'text-terminal-bg' : 'text-terminal-muted hover:text-white'
      }`}
    >
      {active && (
        <motion.div
          layoutId="viewToggle"
          className="absolute inset-0 rounded-md bg-accent-cyan"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    </motion.button>
  );
}
