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
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-2 sm:gap-3 min-w-0"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 animate-pulse rounded-lg bg-accent-cyan/30 blur-xl" />
              <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-accent-cyan/50 bg-terminal-surface">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-accent-cyan" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-xl font-bold tracking-wider text-white truncate">
                SIGNAL<span className="text-accent-cyan">PULSE</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-terminal-muted hidden xs:block">Trading Intelligence</p>
            </div>
          </motion.div>

          {/* Market Type Toggle */}
          <div className="flex items-center gap-1 sm:gap-2 rounded-lg border border-terminal-border bg-terminal-surface p-0.5 sm:p-1">
            <MarketButton
              type="crypto"
              active={marketType === 'crypto'}
              onClick={() => onMarketTypeChange('crypto')}
              icon={<Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              label="Crypto"
            />
            <MarketButton
              type="stock"
              active={marketType === 'stock'}
              onClick={() => onMarketTypeChange('stock')}
              icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              label="Stocks"
            />
          </div>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className="flex items-center justify-center gap-2 rounded-lg border border-terminal-border bg-terminal-surface p-2 sm:px-4 sm:py-2 text-sm text-terminal-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan flex-shrink-0"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Indicators</span>
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
      className={`relative flex items-center gap-1 sm:gap-2 rounded-md px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
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
      <span className="relative flex items-center gap-1 sm:gap-2">
        {icon}
        <span className="hidden xs:inline">{label}</span>
      </span>
    </motion.button>
  );
}