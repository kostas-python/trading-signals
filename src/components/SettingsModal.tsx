'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, CheckCircle, AlertCircle, ExternalLink, Settings } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [finnhubConfigured, setFinnhubConfigured] = useState(false);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkApiStatus();
    }
  }, [isOpen]);

  const checkApiStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stocks/status');
      if (response.ok) {
        const data = await response.json();
        setFinnhubConfigured(data.configured);
        setOpenaiConfigured(data.openaiConfigured);
      }
    } catch (error) {
      console.error('Failed to check API status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <div className="w-full max-w-lg rounded-2xl border border-terminal-border bg-terminal-bg shadow-2xl
                  max-h-[90vh] overflow-y-auto">

            <div className="flex items-start sm:items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/20">
                  <Settings className="h-5 w-5 text-accent-cyan" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-terminal-muted transition-colors hover:bg-terminal-surface hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Finnhub API Status */}
              <ApiStatusCard
                name="Finnhub API"
                description="Real-time stock market data"
                configured={finnhubConfigured}
                isLoading={isLoading}
                docsUrl="https://finnhub.io/"
                envVar="FINNHUB_API_KEY"
              />

              {/* OpenAI API Status */}
              <ApiStatusCard
                name="OpenAI API"
                description="AI-powered analysis"
                configured={openaiConfigured}
                isLoading={isLoading}
                docsUrl="https://platform.openai.com/"
                envVar="OPENAI_API_KEY"
              />

              {/* CoinGecko Status */}
              <ApiStatusCard
                name="CoinGecko API"
                description="Cryptocurrency data"
                configured={true}
                isLoading={isLoading}
                docsUrl="https://www.coingecko.com/en/api"
                note="Free tier - no API key required"
              />

              {/* Supabase Status */}
              <ApiStatusCard
                name="Supabase"
                description="Cloud sync for watchlist & alerts"
                configured={!!process.env.NEXT_PUBLIC_SUPABASE_URL}
                isLoading={isLoading}
                docsUrl="https://supabase.com/"
                envVar="NEXT_PUBLIC_SUPABASE_URL"
                note="Optional - falls back to localStorage"
              />
            </div>

            <div className="mt-6 rounded-xl border border-terminal-border bg-terminal-surface/50 p-4">
              <h3 className="text-sm font-semibold text-white mb-2">How to Configure</h3>
              <p className="text-sm text-terminal-muted">
                Add your API keys to the <code className="text-accent-cyan">.env.local</code> file in the project root:
              </p>
              <pre className="mt-2 rounded-lg bg-terminal-bg p-3 text-xs text-terminal-muted overflow-x-auto">
{`FINNHUB_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here`}
              </pre>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ApiStatusCardProps {
  name: string;
  description: string;
  configured: boolean;
  isLoading: boolean;
  docsUrl: string;
  envVar?: string;
  note?: string;
}

function ApiStatusCard({ name, description, configured, isLoading, docsUrl, envVar, note }: ApiStatusCardProps) {
  return (
    <div className="rounded-xl border border-terminal-border bg-terminal-surface/50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            configured ? 'bg-signal-buy/20' : 'bg-signal-sell/20'
          }`}>
            <Key className={`h-4 w-4 ${configured ? 'text-signal-buy' : 'text-signal-sell'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{name}</h3>
            <p className="text-xs text-terminal-muted">{description}</p>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-5 w-5 animate-pulse rounded-full bg-terminal-border" />
        ) : configured ? (
          <div className="flex items-center gap-1 text-signal-buy">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-signal-sell">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">Not configured</span>
          </div>
        )}
      </div>

      {note && (
        <p className="mt-2 text-xs text-terminal-muted italic">{note}</p>
      )}

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent-cyan hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Get API Key
        </a>
        {envVar && (
          <span className="text-xs text-terminal-muted">
            ENV: <code className="text-accent-purple">{envVar}</code>
          </span>
        )}
      </div>
    </div>
  );
}
