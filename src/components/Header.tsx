'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUp, Settings, Zap } from 'lucide-react';
import { AssetType } from '@/types';

interface HeaderProps {
  marketType: AssetType;
  onMarketTypeChange: (type: AssetType) => void;
  onSettingsClick: () => void;
}

export function Header({ marketType, onMarketTypeChange, onSettingsClick }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-terminal-border bg-terminal-bg/80 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-lg bg-accent-cyan/30 blur-xl" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-accent-cyan/50 bg-terminal-surface">
                <Zap className="h-5 w-5 text-accent-cyan" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wider text-white">
                SIGNAL<span className="text-accent-cyan">PULSE</span>
              </h1>
              <p className="text-xs text-terminal-muted">Trading Intelligence</p>
            </div>
          </motion.div>

          {/* Market Type Toggle */}
          <div className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-surface p-1">
            <MarketButton
              type="crypto"
              active={marketType === 'crypto'}
              onClick={() => onMarketTypeChange('crypto')}
              icon={<Activity className="h-4 w-4" />}
              label="Crypto"
            />
            <MarketButton
              type="stock"
              active={marketType === 'stock'}
              onClick={() => onMarketTypeChange('stock')}
              icon={<TrendingUp className="h-4 w-4" />}
              label="Stocks"
            />
          </div>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-surface px-4 py-2 text-sm text-terminal-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Indicators</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

interface MarketButtonProps {
  type: AssetType;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function MarketButton({ active, onClick, icon, label }: MarketButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'text-terminal-bg'
          : 'text-terminal-muted hover:text-white'
      }`}
    >
      {active && (
        <motion.div
          layoutId="marketToggle"
          className="absolute inset-0 rounded-md bg-accent-cyan"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        {label}
      </span>
    </motion.button>
  );
}
