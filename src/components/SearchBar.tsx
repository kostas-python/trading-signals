'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { Asset, AssetType } from '@/types';
import { searchAssets } from '@/lib/api';
import { debounce, formatPrice, formatPercent, getChangeColor } from '@/lib/utils';

interface SearchBarProps {
  marketType: AssetType;
  onSelectAsset: (asset: Asset) => void;
}

export function SearchBar({ marketType, onSelectAsset }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const performSearch = useCallback(
    debounce(async (searchQuery: string, type: AssetType) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const assets = await searchAssets(searchQuery, type);
      setResults(assets);
      setIsLoading(false);
    }, 300),
    []
  );

  const handleChange = (value: string) => {
    setQuery(value);
    performSearch(value, marketType);
  };

  const handleSelect = (asset: Asset) => {
    onSelectAsset(asset);
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-terminal-surface px-4 py-3 transition-colors ${
          isFocused ? 'border-accent-cyan' : 'border-terminal-border'
        }`}
      >
        <Search className="h-5 w-5 text-terminal-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={`Search ${marketType === 'crypto' ? 'cryptocurrencies' : 'stocks'}...`}
          className="flex-1 bg-transparent font-mono text-white placeholder-terminal-muted outline-none"
        />
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent-cyan" />}
        {query && !isLoading && (
          <button onClick={handleClear} className="text-terminal-muted hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {isFocused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-terminal-border bg-terminal-surface shadow-2xl"
          >
            {results.map((asset, index) => (
              <motion.button
                key={asset.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(asset)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-terminal-border"
              >
                {asset.image ? (
                  <img src={asset.image} alt={asset.name} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-terminal-border font-mono text-xs font-bold text-white">
                    {asset.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-white">{asset.symbol}</span>
                    <span className="text-sm text-terminal-muted">{asset.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-white">{formatPrice(asset.price)}</div>
                  <div className={`text-xs ${getChangeColor(asset.changePercent24h)}`}>
                    {formatPercent(asset.changePercent24h)}
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
