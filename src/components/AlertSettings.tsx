'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  Send, 
  Settings, 
  Check, 
  X, 
  Loader2,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain
} from 'lucide-react';

interface AlertConfig {
  enabled: boolean;
  fearGreedExtreme: boolean;
  fundingRateExtreme: boolean;
  longShortExtreme: boolean;
  priceChange: boolean;
  aiAnalysis: boolean;
  minTimeBetweenAlerts: number;
}

export function AlertSettings() {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/alerts/config');
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error('Failed to fetch config:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AlertConfig>) => {
    if (!config) return;
    
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setIsSaving(true);
    
    try {
      await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.error('Failed to save config:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/alerts/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data.success ? 'success' : 'error');
    } catch (e) {
      setTestResult('error');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="rounded-xl border border-terminal-border bg-terminal-surface/50 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-terminal-muted mx-auto" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-terminal-border bg-terminal-surface/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.enabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {config.enabled ? (
              <Bell className="h-5 w-5 text-green-400" />
            ) : (
              <BellOff className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">Telegram Alerts</h3>
            <p className="text-xs text-terminal-muted">
              {config.enabled ? 'Receiving alerts' : 'Alerts disabled'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-terminal-muted" />}
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.enabled ? 'bg-green-500' : 'bg-terminal-border'
            }`}
          >
            <motion.div
              animate={{ x: config.enabled ? 24 : 2 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white"
            />
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 space-y-4">
        <h4 className="text-sm font-medium text-terminal-muted flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Alert Triggers
        </h4>

        {/* Fear & Greed */}
        <ToggleRow
          icon={<Activity className="h-4 w-4" />}
          label="Extreme Fear/Greed"
          description="Alert when F&G < 15 or > 85"
          enabled={config.fearGreedExtreme}
          onChange={(v) => updateConfig({ fearGreedExtreme: v })}
        />

        {/* Funding Rate */}
        <ToggleRow
          icon={<TrendingUp className="h-4 w-4" />}
          label="Funding Rate Extremes"
          description="Alert when funding > 0.1% or < -0.05%"
          enabled={config.fundingRateExtreme}
          onChange={(v) => updateConfig({ fundingRateExtreme: v })}
        />

        {/* Long/Short */}
        <ToggleRow
          icon={<TrendingDown className="h-4 w-4" />}
          label="Long/Short Extremes"
          description="Alert when L/S > 3.5 or < 0.5"
          enabled={config.longShortExtreme}
          onChange={(v) => updateConfig({ longShortExtreme: v })}
        />

        {/* Price Change */}
        <ToggleRow
          icon={<Activity className="h-4 w-4" />}
          label="Large Price Moves"
          description="Alert when 24h change > 10%"
          enabled={config.priceChange}
          onChange={(v) => updateConfig({ priceChange: v })}
        />

        {/* AI Analysis */}
        <ToggleRow
          icon={<Brain className="h-4 w-4" />}
          label="Include AI Analysis"
          description="Add Groq analysis to alerts"
          enabled={config.aiAnalysis}
          onChange={(v) => updateConfig({ aiAnalysis: v })}
        />

        {/* Min Time Between Alerts */}
        <div className="pt-2 border-t border-terminal-border">
          <label className="text-sm text-terminal-muted">
            Minimum time between alerts
          </label>
          <select
            value={config.minTimeBetweenAlerts}
            onChange={(e) => updateConfig({ minTimeBetweenAlerts: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 text-white text-sm"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={240}>4 hours</option>
            <option value={480}>8 hours</option>
            <option value={1440}>24 hours</option>
          </select>
        </div>
      </div>

      {/* Test Button */}
      <div className="p-4 border-t border-terminal-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={sendTestAlert}
          disabled={isTesting}
          className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            testResult === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : testResult === 'error'
              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
              : 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 hover:bg-accent-cyan/30'
          }`}
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : testResult === 'success' ? (
            <>
              <Check className="h-4 w-4" />
              Alert Sent!
            </>
          ) : testResult === 'error' ? (
            <>
              <X className="h-4 w-4" />
              Failed - Check Config
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Test Alert
            </>
          )}
        </motion.button>
        <p className="text-xs text-terminal-muted text-center mt-2">
          <MessageCircle className="h-3 w-3 inline mr-1" />
          Check your Telegram for the test message
        </p>
      </div>
    </motion.div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="text-terminal-muted">{icon}</div>
        <div>
          <p className="text-sm text-white">{label}</p>
          <p className="text-xs text-terminal-muted">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          enabled ? 'bg-accent-cyan' : 'bg-terminal-border'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
        />
      </button>
    </div>
  );
}