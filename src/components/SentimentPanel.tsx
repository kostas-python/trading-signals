'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Users, BarChart3, Gauge } from 'lucide-react';

interface MarketSentiment {
  fearGreed: {
    value: number;
    classification: string;
    signal: string;
  } | null;
  fundingRate: {
    ratePercent: number;
    signal: string;
    description: string;
  } | null;
  longShortRatio: {
    ratio: number;
    longPercent: number;
    shortPercent: number;
    signal: string;
    description: string;
  } | null;
  overallSignal: string;
  overallScore: number;
}

export function SentimentPanel() {
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const response = await fetch('/api/sentiment?symbol=BTCUSDT');
        if (response.ok) {
          const data = await response.json();
          setSentiment(data);
        }
      } catch (error) {
        console.error('Error fetching sentiment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentiment();
    const interval = setInterval(fetchSentiment, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'strong_buy': return 'text-green-400';
      case 'buy': return 'text-green-300';
      case 'strong_sell': return 'text-red-400';
      case 'sell': return 'text-red-300';
      default: return 'text-gray-400';
    }
  };

  const getSignalBg = (signal: string) => {
    switch (signal) {
      case 'strong_buy': return 'bg-green-500/20 border-green-500/50';
      case 'buy': return 'bg-green-500/10 border-green-500/30';
      case 'strong_sell': return 'bg-red-500/20 border-red-500/50';
      case 'sell': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-terminal-border bg-terminal-surface/50 p-4 animate-pulse">
        <div className="h-6 bg-terminal-border rounded w-32 mb-3"></div>
        <div className="h-4 bg-terminal-border rounded w-full"></div>
      </div>
    );
  }

  if (!sentiment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-terminal-border bg-terminal-surface/50 overflow-hidden"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-terminal-border/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getSignalBg(sentiment.overallSignal)}`}>
            <Gauge className={`h-5 w-5 ${getSignalColor(sentiment.overallSignal)}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">Market Sentiment</h3>
            <p className={`text-xs ${getSignalColor(sentiment.overallSignal)}`}>
              {sentiment.overallSignal.replace('_', ' ').toUpperCase()} ({sentiment.overallScore})
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {sentiment.fearGreed && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-terminal-muted">Fear & Greed</p>
              <p className={`text-sm font-mono ${getSignalColor(sentiment.fearGreed.signal)}`}>
                {sentiment.fearGreed.value}
              </p>
            </div>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-terminal-muted"
          >
            ▼
          </motion.div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-terminal-border p-4 space-y-4"
        >
          {/* Fear & Greed */}
          {sentiment.fearGreed && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-terminal-muted" />
                <span className="text-sm text-terminal-muted">Fear & Greed Index</span>
              </div>
              <div className="text-right">
                <span className={`font-mono font-bold ${getSignalColor(sentiment.fearGreed.signal)}`}>
                  {sentiment.fearGreed.value}
                </span>
                <span className="text-xs text-terminal-muted ml-2">
                  {sentiment.fearGreed.classification}
                </span>
              </div>
            </div>
          )}

          {/* Funding Rate */}
          {sentiment.fundingRate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-terminal-muted" />
                <span className="text-sm text-terminal-muted">Funding Rate</span>
              </div>
              <div className="text-right">
                <span className={`font-mono font-bold ${getSignalColor(sentiment.fundingRate.signal)}`}>
                  {sentiment.fundingRate.ratePercent >= 0 ? '+' : ''}
                  {sentiment.fundingRate.ratePercent.toFixed(4)}%
                </span>
              </div>
            </div>
          )}

          {/* Long/Short Ratio */}
          {sentiment.longShortRatio && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-terminal-muted" />
                <span className="text-sm text-terminal-muted">Long/Short Ratio</span>
              </div>
              <div className="text-right">
                <span className={`font-mono font-bold ${getSignalColor(sentiment.longShortRatio.signal)}`}>
                  {sentiment.longShortRatio.ratio.toFixed(2)}
                </span>
                <div className="text-xs text-terminal-muted">
                  L: {sentiment.longShortRatio.longPercent.toFixed(1)}% / S: {sentiment.longShortRatio.shortPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Signal interpretation */}
          <div className="pt-2 border-t border-terminal-border">
            <p className="text-xs text-terminal-muted">
              💡 Sentiment is <strong>contrarian</strong>: Extreme fear often signals buying opportunities, 
              while extreme greed may indicate potential tops.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}