'use client';

import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Asset, CombinedSignal } from '@/types';
import { formatPrice, formatPercent, getChangeColor } from '@/lib/utils';
import { Sparkline } from './Sparkline';
import { SignalBadge } from './SignalBadge';

interface AssetCardProps {
  asset: Asset;
  signal?: CombinedSignal;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClick: () => void;
  index: number;
}

export function AssetCard({
  asset,
  signal,
  isWatched,
  onToggleWatch,
  onClick,
  index,
}: AssetCardProps) {
  const isUp = asset.changePercent24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="card-hover group cursor-pointer rounded-xl border border-terminal-border bg-terminal-surface/50 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between">
        {/* Asset info */}
        <div className="flex items-center gap-3">
          {asset.image ? (
            <img
              src={asset.image}
              alt={asset.name}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terminal-border font-mono text-sm font-bold text-white">
              {asset.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono font-semibold text-white">{asset.symbol}</h3>
              {signal && <SignalBadge signal={signal.overall} size="sm" showGlow={false} />}
            </div>
            <p className="text-sm text-terminal-muted">{asset.name}</p>
          </div>
        </div>

        {/* Watch button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatch();
          }}
          className={`rounded-lg p-2 transition-colors ${
            isWatched
              ? 'bg-signal-neutral/20 text-signal-neutral'
              : 'text-terminal-muted hover:bg-terminal-border hover:text-white'
          }`}
        >
          <Star className={`h-4 w-4 ${isWatched ? 'fill-current' : ''}`} />
        </motion.button>
      </div>

      {/* Price and chart */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums">
            {formatPrice(asset.price)}
          </div>
          <div className={`flex items-center gap-1 text-sm ${getChangeColor(asset.changePercent24h)}`}>
            {isUp ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="tabular-nums">{formatPercent(asset.changePercent24h)}</span>
          </div>
        </div>

        {asset.sparkline && (
          <Sparkline
            data={asset.sparkline.slice(-24)}
            width={100}
            height={40}
          />
        )}
      </div>

      {/* Signal score bar */}
      {signal && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-terminal-muted">
            <span>Bearish</span>
            <span>Score: {signal.score}</span>
            <span>Bullish</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-terminal-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(signal.score + 100) / 2}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
              className={`h-full rounded-full ${
                signal.score > 20
                  ? 'bg-signal-buy'
                  : signal.score < -20
                  ? 'bg-signal-sell'
                  : 'bg-signal-neutral'
              }`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
