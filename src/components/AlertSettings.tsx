'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  Send, 
  Settings, 
  Check, 
  X, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  History,
  ChevronDown,
  AlertTriangle,
  Zap
} from 'lucide-react';

// Interface matching Supabase schema
interface AlertConfig {
  id: string;
  user_id: string;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  fear_greed_extreme: boolean;
  fear_greed_buy_threshold: number;
  fear_greed_sell_threshold: number;
  funding_rate_extreme: boolean;
  funding_rate_high_threshold: number;
  funding_rate_low_threshold: number;
  long_short_extreme: boolean;
  long_short_high_threshold: number;
  long_short_low_threshold: number;
  price_change_enabled: boolean;
  price_change_threshold: number;
  ai_analysis_enabled: boolean;
  ai_model: string;
  min_minutes_between_alerts: number;
  created_at: string;
  updated_at: string;
}

interface AlertHistoryItem {
  id: string;
  alert_type: 'BUY' | 'SELL' | 'CAUTION' | 'INFO';
  trigger_reason: string;
  btc_price: number | null;
  created_at: string;
  telegram_sent: boolean;
}

interface AlertStats {
  totalAlerts: number;
  buyAlerts: number;
  sellAlerts: number;
  cautionAlerts: number;
  last24h: number;
  last7d: number;
}

// AI Models config
const AI_MODELS: Record<string, { name: string; provider: string }> = {
  'gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'openai' },
  'llama-3.3-70b': { name: 'Llama 3.3 70B', provider: 'groq' },
  'deepseek-chat': { name: 'DeepSeek V3', provider: 'deepseek' },
};

export function AlertSettings() {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch config on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch config
      const configRes = await fetch('/api/alerts/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      } else {
        throw new Error('Failed to fetch config');
      }

      // Fetch history with stats
      const historyRes = await fetch('/api/alerts/history?limit=10&stats=true');
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
        setStats(historyData.stats);
      }
    } catch (e) {
      console.error('Failed to fetch alert data:', e);
      setError('Failed to load settings. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update config in Supabase
  const updateConfig = async (updates: Partial<AlertConfig>) => {
    if (!config) return;
    
    // Optimistic update
    const previousConfig = config;
    setConfig({ ...config, ...updates });
    setIsSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }
      
      // Refresh config from server to ensure sync
      const newConfigRes = await fetch('/api/alerts/config');
      if (newConfigRes.ok) {
        const newConfig = await newConfigRes.json();
        setConfig(newConfig);
      }
    } catch (e) {
      console.error('Failed to save config:', e);
      setConfig(previousConfig);
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Send test alert
  const sendTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const res = await fetch('/api/alerts/test', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      
      if (data.success) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setError(data.error || 'Test failed');
      }
    } catch (e) {
      setTestResult('error');
      setError('Network error - please try again');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'text-green-400 bg-green-500/20';
      case 'SELL': return 'text-red-400 bg-red-500/20';
      case 'CAUTION': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-terminal-border bg-terminal-surface/50 p-6 sm:p-8">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-terminal-muted mx-auto" />
        <p className="text-center text-terminal-muted mt-2 text-sm">Loading alert settings...</p>
      </div>
    );
  }

  // Error state with no config
  if (!config) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 sm:p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm sm:text-base">Failed to load settings</p>
            <p className="text-xs sm:text-sm text-red-400/70 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="mt-4 w-full rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentModel = AI_MODELS[config.ai_model] || AI_MODELS['llama-3.3-70b'];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-terminal-border bg-terminal-surface/50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-terminal-border">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${
              config.telegram_enabled 
                ? 'bg-green-500/20 border border-green-500/50' 
                : 'bg-red-500/20 border border-red-500/50'
            }`}>
              {config.telegram_enabled ? (
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
              ) : (
                <BellOff className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2 flex-wrap">
                <span>Telegram Alerts</span>
                {config.telegram_enabled && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-[10px] sm:text-xs text-terminal-muted truncate">
                {config.telegram_enabled ? 'Receiving market alerts' : 'Alerts paused'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isSaving && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-terminal-muted" />}
            <button
              onClick={() => updateConfig({ telegram_enabled: !config.telegram_enabled })}
              className={`relative w-11 sm:w-14 h-6 sm:h-7 rounded-full transition-all duration-300 ${
                config.telegram_enabled ? 'bg-green-500' : 'bg-terminal-border'
              }`}
            >
              <motion.div
                animate={{ x: config.telegram_enabled ? 20 : 2 }}
                className="absolute top-0.5 sm:top-1 w-5 h-5 rounded-full bg-white shadow-lg"
              />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {stats && stats.totalAlerts > 0 && (
          <div className="grid grid-cols-4 gap-px bg-terminal-border">
            <div className="bg-terminal-surface p-2 sm:p-3 text-center">
              <p className="text-sm sm:text-lg font-bold text-white">{stats.totalAlerts}</p>
              <p className="text-[9px] sm:text-[10px] text-terminal-muted">Total</p>
            </div>
            <div className="bg-terminal-surface p-2 sm:p-3 text-center">
              <p className="text-sm sm:text-lg font-bold text-green-400">{stats.buyAlerts}</p>
              <p className="text-[9px] sm:text-[10px] text-terminal-muted">Buy</p>
            </div>
            <div className="bg-terminal-surface p-2 sm:p-3 text-center">
              <p className="text-sm sm:text-lg font-bold text-red-400">{stats.sellAlerts}</p>
              <p className="text-[9px] sm:text-[10px] text-terminal-muted">Sell</p>
            </div>
            <div className="bg-terminal-surface p-2 sm:p-3 text-center">
              <p className="text-sm sm:text-lg font-bold text-yellow-400">{stats.cautionAlerts}</p>
              <p className="text-[9px] sm:text-[10px] text-terminal-muted">Caution</p>
            </div>
          </div>
        )}

        {/* Alert Triggers */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-medium text-terminal-muted flex items-center gap-2">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            Alert Triggers
          </h4>

          <ToggleRow
            icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Fear & Greed Extremes"
            description={`F&G ≤ ${config.fear_greed_buy_threshold} or ≥ ${config.fear_greed_sell_threshold}`}
            enabled={config.fear_greed_extreme}
            onChange={(v) => updateConfig({ fear_greed_extreme: v })}
          />

          <ToggleRow
            icon={<TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Funding Rate Extremes"
            description={`Rate ≥ ${config.funding_rate_high_threshold}% or ≤ ${config.funding_rate_low_threshold}%`}
            enabled={config.funding_rate_extreme}
            onChange={(v) => updateConfig({ funding_rate_extreme: v })}
          />

          <ToggleRow
            icon={<TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Long/Short Extremes"
            description={`L/S ≥ ${config.long_short_high_threshold} or ≤ ${config.long_short_low_threshold}`}
            enabled={config.long_short_extreme}
            onChange={(v) => updateConfig({ long_short_extreme: v })}
          />

          <ToggleRow
            icon={<Activity className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Large Price Moves"
            description={`24h change ≥ ${config.price_change_threshold}%`}
            enabled={config.price_change_enabled}
            onChange={(v) => updateConfig({ price_change_enabled: v })}
          />

          <ToggleRow
            icon={<Brain className="h-3 w-3 sm:h-4 sm:w-4" />}
            label="Include AI Analysis"
            description={currentModel.name}
            enabled={config.ai_analysis_enabled}
            onChange={(v) => updateConfig({ ai_analysis_enabled: v })}
          />
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-terminal-border">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs sm:text-sm text-terminal-muted hover:bg-terminal-border/30"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              Advanced Settings
            </span>
            <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-terminal-bg/50">
                  {/* Thresholds */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="text-[10px] sm:text-xs text-terminal-muted">F&G Buy Threshold</label>
                      <input
                        type="number"
                        value={config.fear_greed_buy_threshold}
                        onChange={(e) => updateConfig({ fear_greed_buy_threshold: Number(e.target.value) })}
                        min={0}
                        max={50}
                        className="w-full mt-1 rounded-lg border border-terminal-border bg-terminal-surface px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs text-terminal-muted">F&G Sell Threshold</label>
                      <input
                        type="number"
                        value={config.fear_greed_sell_threshold}
                        onChange={(e) => updateConfig({ fear_greed_sell_threshold: Number(e.target.value) })}
                        min={50}
                        max={100}
                        className="w-full mt-1 rounded-lg border border-terminal-border bg-terminal-surface px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                 {/* AI Model */}
                  <div>
                    <label className="text-[10px] sm:text-xs text-terminal-muted">AI Model for Analysis</label>
                    <select
                      value={config.ai_model}
                      onChange={(e) => updateConfig({ ai_model: e.target.value })}
                      className="w-full mt-1 rounded-lg border border-terminal-border bg-terminal-surface px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm truncate max-w-full"
                      style={{ textOverflow: 'ellipsis' }}
                    >
                      {Object.entries(AI_MODELS).map(([key, model]) => (
                        <option key={key} value={key} className="truncate">
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min time between alerts */}
                  <div>
                    <label className="text-[10px] sm:text-xs text-terminal-muted">Min Time Between Alerts</label>
                    <select
                      value={config.min_minutes_between_alerts}
                      onChange={(e) => updateConfig({ min_minutes_between_alerts: Number(e.target.value) })}
                      className="w-full mt-1 rounded-lg border border-terminal-border bg-terminal-surface px-2 sm:px-3 py-1.5 sm:py-2 text-white text-xs sm:text-sm"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={240}>4 hours</option>
                      <option value={480}>8 hours</option>
                      <option value={1440}>24 hours</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Test Button */}
        <div className="p-3 sm:p-4 border-t border-terminal-border">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={sendTestAlert}
            disabled={isTesting}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all ${
              testResult === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : testResult === 'error'
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 hover:bg-accent-cyan/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                <span>Sending Test Alert...</span>
              </>
            ) : testResult === 'success' ? (
              <>
                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Alert Sent! Check Telegram</span>
              </>
            ) : testResult === 'error' ? (
              <>
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Failed - Check Config</span>
              </>
            ) : (
              <>
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Send Test Alert</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* History Section */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-terminal-border bg-terminal-surface/50 overflow-hidden"
        >
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-terminal-border/20"
          >
            <span className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white">
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              Recent Alerts ({history.length})
            </span>
            <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 text-terminal-muted transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-terminal-border divide-y divide-terminal-border">
                  {history.map((alert) => (
                    <div key={alert.id} className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${getAlertTypeColor(alert.alert_type)}`}>
                          {alert.alert_type}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-white truncate">{alert.trigger_reason}</p>
                          <p className="text-[10px] sm:text-xs text-terminal-muted">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {alert.btc_price && (
                        <span className="text-[10px] sm:text-sm text-terminal-muted flex-shrink-0">
                          ${alert.btc_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// Toggle Row Component
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
    <div className="flex items-center justify-between py-1.5 sm:py-2 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="text-terminal-muted flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-white truncate">{label}</p>
          <p className="text-[10px] sm:text-xs text-terminal-muted truncate">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-8 sm:w-10 h-4 sm:h-5 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-accent-cyan' : 'bg-terminal-border'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 16 : 2 }}
          className="absolute top-0.5 w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-white"
        />
      </button>
    </div>
  );
}