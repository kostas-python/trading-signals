'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, ExternalLink, Star, Sparkles, Loader2 } from 'lucide-react';
import { Asset, CombinedSignal, IndicatorResult } from '@/types';
import { formatPrice, formatPercent, formatNumber, getChangeColor } from '@/lib/utils';
import { SignalGauge } from './SignalGauge';
import { SignalBadge } from './SignalBadge';
import { Sparkline } from './Sparkline';
import { ModelSelector } from './ModelSelector';
import { AI_MODELS, PROVIDER_STYLES } from '@/lib/ai-config';

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
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [usedProvider, setUsedProvider] = useState<string | null>(null);
  const [sparklineWidth, setSparklineWidth] = useState(550);
  const sparklineRef = useRef<HTMLDivElement>(null);

  if (!asset) return null;

  const isUp = asset.changePercent24h >= 0;
  const currentModel = AI_MODELS[selectedModel];
  const currentStyle = currentModel ? PROVIDER_STYLES[currentModel.provider] : PROVIDER_STYLES.openai;

  const fetchAIAnalysis = async () => {
    if (!signal) return;
    
    setIsLoadingAI(true);
    setAiAnalysis(null);
    
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
          model: selectedModel, // Pass selected model
        }),
      });

      if (!response.ok) throw new Error('Failed to get analysis');

      const data = await response.json();
      setAiAnalysis(data.analysis);
      setUsedProvider(data.provider);
    } catch (error) {
      console.error('AI analysis error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setAiAnalysis(`Unable to generate analysis.\n\nError: ${errorMsg}\n\nPlease ensure your API key is configured in .env.local`);
      setUsedProvider(null);
    } finally {
      setIsLoadingAI(false);
    }
  };

  useEffect(() => {
    if (!sparklineRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSparklineWidth(entry.contentRect.width);
    });
    observer.observe(sparklineRef.current);
    return () => observer.disconnect();
  }, []);

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
            <div ref={sparklineRef} className="mt-6 rounded-xl border border-terminal-border bg-terminal-surface/30 p-4">
              <p className="mb-2 text-sm text-terminal-muted">7 Day Price</p>
              <Sparkline
                data={asset.sparkline}
                width={sparklineWidth}
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
    <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
        <span className="text-xl">{currentStyle.icon}</span>
        AI Analysis
      </h3>
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0 flex-1 sm:flex-none">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            compact
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchAIAnalysis}
          disabled={isLoadingAI}
          className={`
            flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all
            bg-gradient-to-r ${currentStyle.gradient} ${currentStyle.border}
            disabled:opacity-50
          `}
        >
          {isLoadingAI ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-white">Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-white">{aiAnalysis ? 'Regenerate' : 'Generate'}</span>
            </>
          )}
        </motion.button>
      </div>
    </div>

              {aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 bg-gradient-to-br ${currentStyle.gradient} border-opacity-30`}
                  style={{ borderColor: currentStyle.border.includes('emerald') ? 'rgb(16 185 129 / 0.3)' : currentStyle.border.includes('orange') ? 'rgb(249 115 22 / 0.3)' : 'rgb(139 92 246 / 0.3)' }}
                >
                  <p className="whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">
                    {aiAnalysis}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-terminal-muted italic">
                      ⚠️ This is technical analysis only, not financial advice.
                    </p>
                    {usedProvider && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${currentStyle.badge}`}>
                        via {usedProvider}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {!aiAnalysis && !isLoadingAI && (
                <p className="text-sm text-terminal-muted">
                  Select a model and click &quot;Generate&quot; to get AI-powered insights including market sentiment analysis.
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