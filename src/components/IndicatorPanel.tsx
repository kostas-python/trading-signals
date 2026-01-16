'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { Indicator } from '@/types';

interface IndicatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  indicators: Indicator[];
  onToggle: (id: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

export function IndicatorPanel({
  isOpen,
  onClose,
  indicators,
  onToggle,
  onEnableAll,
  onDisableAll,
}: IndicatorPanelProps) {
  const enabledCount = indicators.filter(i => i.enabled).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-terminal-border bg-terminal-bg p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Indicators
                </h2>
                <p className="text-sm text-terminal-muted">
                  {enabledCount} of {indicators.length} enabled
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-terminal-muted transition-colors hover:bg-terminal-surface hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onEnableAll}
                className="flex-1 rounded-lg border border-terminal-border bg-terminal-surface px-4 py-2 text-sm text-terminal-muted transition-colors hover:border-signal-buy hover:text-signal-buy"
              >
                Enable All
              </button>
              <button
                onClick={onDisableAll}
                className="flex-1 rounded-lg border border-terminal-border bg-terminal-surface px-4 py-2 text-sm text-terminal-muted transition-colors hover:border-signal-sell hover:text-signal-sell"
              >
                Disable All
              </button>
            </div>

            {/* Indicator list */}
            <div className="mt-6 space-y-3">
              {indicators.map((indicator, index) => (
                <motion.div
                  key={indicator.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-xl border p-4 transition-colors ${
                    indicator.enabled
                      ? 'border-accent-cyan/50 bg-accent-cyan/5'
                      : 'border-terminal-border bg-terminal-surface/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-white">
                          {indicator.shortName}
                        </span>
                        <span className="text-sm text-terminal-muted">
                          {indicator.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-terminal-muted">
                        {indicator.description}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onToggle(indicator.id)}
                      className={`transition-colors ${
                        indicator.enabled ? 'text-accent-cyan' : 'text-terminal-muted'
                      }`}
                    >
                      {indicator.enabled ? (
                        <ToggleRight className="h-8 w-8" />
                      ) : (
                        <ToggleLeft className="h-8 w-8" />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info */}
            <div className="mt-6 rounded-xl border border-terminal-border bg-terminal-surface/30 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-accent-cyan" />
                <div className="text-sm text-terminal-muted">
                  <p>
                    Indicators are combined using a weighted scoring system. Each
                    indicator contributes to the overall signal based on its
                    individual reading.
                  </p>
                  <p className="mt-2">
                    <strong className="text-white">Strong signals</strong> (Buy/Sell)
                    have more weight than regular signals.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
