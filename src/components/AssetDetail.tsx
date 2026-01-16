'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, ExternalLink, Star, Sparkles, Loader2 } from 'lucide-react';
import { Asset, CombinedSignal, IndicatorResult } from '@/types';
import { formatPrice, formatPercent, formatNumber, getChangeColor, getSignalColor } from '@/lib/utils';
import { SignalGauge } from './SignalGauge';
import { SignalBadge } from './SignalBadge';
import { Sparkline } from './Sparkline';

interface AssetDetailProps {
  asset: Asset | null;
  signal: CombinedSignal | null;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClose: () => void;
}

export function AssetDetail({
  asset,
  signal,
  isWatched,
  onToggleWatch,
  onClose,
}: AssetDetailProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  if (!asset) return null;

  const isUp = asset.changePercent24h >= 0;

  const fetchAIAnalysis = async () => {
    if (!signal) return;
    
    setIsLoadingAI(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: {
            symbol: asset.symbol,
            name: asset.name,
            price: asset.price,
            changePercent24h: asset.changePercent24h,
            type: asset.type,
          },
          indicators: signal.indicators,
          signal: {
            overall: signal.overall,
            score: signal.score,
            bullishCount: signal.bullishCount,
            bearishCount: signal.bearishCount,
          },
          prices: asset.sparkline,
        }),
      });

      if (!response.ok) throw new Error('Failed to get analysis');

      const data = await response.json();
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiAnalysis('Unable to generate analysis. Please ensure your OpenAI API key is configured.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-terminal-border bg-terminal-bg p-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-terminal-muted transition-colors hover:bg-terminal-surface hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4">
            {asset.image ? (
              <img
                src={asset.image}
                alt={asset.name}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-terminal-surface font-mono text-xl font-bold text-white">
                {asset.symbol.slice(0, 2)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl font-bold text-white">
                  {asset.symbol}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onToggleWatch}
                  className={`rounded-lg p-2 transition-colors ${
                    isWatched
                      ? 'bg-signal-neutral/20 text-signal-neutral'
                      : 'bg-terminal-surface text-terminal-muted hover:text-white'
                  }`}
                >
                  <Star className={`h-5 w-5 ${isWatched ? 'fill-current' : ''}`} />
                </motion.button>
              </div>
              <p className="text-terminal-muted">{asset.name}</p>
            </div>
          </div>

          {/* Price section */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-terminal-muted">Current Price</p>
              <p className="font-mono text-3xl font-bold text-white tabular-nums">
                {formatPrice(asset.price)}
              </p>
              <div className={`flex items-center gap-1 text-lg ${getChangeColor(asset.changePercent24h)}`}>
                {isUp ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                <span className="tabular-nums">{formatPercent(asset.changePercent24h)}</span>
                <span className="text-sm text-terminal-muted">24h</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-terminal-muted">24h Volume</p>
              <p className="font-mono text-xl font-semibold text-white">
                {formatNumber(asset.volume24h)}
              </p>
              {asset.marketCap && (
                <>
                  <p className="mt-2 text-sm text-terminal-muted">Market Cap</p>
                  <p className="font-mono text-xl font-semibold text-white">
                    {formatNumber(asset.marketCap)}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Chart */}
          {asset.sparkline && (
            <div className="mt-6 rounded-xl border border-terminal-border bg-terminal-surface/30 p-4">
              <p className="mb-2 text-sm text-terminal-muted">7 Day Price</p>
              <Sparkline
                data={asset.sparkline}
                width={550}
                height={120}
              />
            </div>
          )}

          {/* Signal section */}
          {signal && (
            <div className="mt-6">
              <h3 className="mb-4 font-display text-lg font-semibold text-white">
                Signal Analysis
              </h3>
              
              <div className="rounded-xl border border-terminal-border bg-terminal-surface/30 p-6">
                <SignalGauge signal={signal} />
              </div>

              {/* Indicator breakdown */}
              <div className="mt-4 space-y-2">
                {signal.indicators.map((indicator, index) => (
                  <IndicatorRow key={index} indicator={indicator} />
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Section */}
          {signal && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent-purple" />
                  AI Analysis
                </h3>
                {!aiAnalysis && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchAIAnalysis}
                    disabled={isLoadingAI}
                    className="flex items-center gap-2 rounded-lg border border-accent-purple/50 bg-accent-purple/10 px-4 py-2 text-sm text-accent-purple transition-colors hover:bg-accent-purple/20 disabled:opacity-50"
                  >
                    {isLoadingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Analysis
                      </>
                    )}
                  </motion.button>
                )}
              </div>

              {aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-4"
                >
                  <p className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">
                    {aiAnalysis}
                  </p>
                  <p className="mt-3 text-xs text-terminal-muted italic">
                    ⚠️ This is technical analysis only, not financial advice.
                  </p>
                </motion.div>
              )}

              {!aiAnalysis && !isLoadingAI && (
                <p className="text-sm text-terminal-muted">
                  Click &quot;Generate Analysis&quot; to get AI-powered insights based on the technical indicators.
                </p>
              )}
            </div>
          )}

          {/* External links */}
          <div className="mt-6 flex gap-3">
            {asset.type === 'crypto' && (
              <>
                <a
                  href={`https://www.coingecko.com/en/coins/${asset.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-surface px-4 py-2 text-sm text-terminal-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan"
                >
                  <ExternalLink className="h-4 w-4" />
                  CoinGecko
                </a>
                <a
                  href={`https://www.tradingview.com/chart/?symbol=${asset.symbol}USD`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-surface px-4 py-2 text-sm text-terminal-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan"
                >
                  <ExternalLink className="h-4 w-4" />
                  TradingView
                </a>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function IndicatorRow({ indicator }: { indicator: IndicatorResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between rounded-lg border border-terminal-border bg-terminal-surface/50 px-4 py-3"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-white">{indicator.name}</span>
          <span className="font-mono text-sm text-terminal-muted tabular-nums">
            {indicator.value}
          </span>
        </div>
        <p className="text-xs text-terminal-muted">{indicator.description}</p>
      </div>
      <SignalBadge signal={indicator.signal} size="sm" showGlow={false} />
    </motion.div>
  );
}
