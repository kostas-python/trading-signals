import { SignalStrength } from '@/types';

// Format large numbers
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '$0';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// Format price based on value
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '$0.00';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

// Format percentage
export function formatPercent(percent: number | null | undefined): string {
  if (percent == null) return '0.00%';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

// Get color class based on value
export function getChangeColor(value: number | null | undefined): string {
  if (value == null || value === 0) return 'text-terminal-muted';
  return value > 0 ? 'text-signal-buy' : 'text-signal-sell';
}

// Get signal color
export function getSignalColor(signal: SignalStrength): string {
  switch (signal) {
    case 'strong_buy': return 'text-signal-strong';
    case 'buy': return 'text-signal-buy';
    case 'strong_sell': return 'text-signal-sell';
    case 'sell': return 'text-signal-sell';
    default: return 'text-signal-neutral';
  }
}

// Get signal background color
export function getSignalBgColor(signal: SignalStrength): string {
  switch (signal) {
    case 'strong_buy': return 'bg-signal-strong/20 border-signal-strong';
    case 'buy': return 'bg-signal-buy/20 border-signal-buy';
    case 'strong_sell': return 'bg-signal-sell/20 border-signal-sell';
    case 'sell': return 'bg-signal-sell/20 border-signal-sell';
    default: return 'bg-signal-neutral/20 border-signal-neutral';
  }
}

// Get signal text
export function getSignalText(signal: SignalStrength): string {
  switch (signal) {
    case 'strong_buy': return 'STRONG BUY';
    case 'buy': return 'BUY';
    case 'strong_sell': return 'STRONG SELL';
    case 'sell': return 'SELL';
    default: return 'NEUTRAL';
  }
}

// Get signal emoji
export function getSignalEmoji(signal: SignalStrength): string {
  switch (signal) {
    case 'strong_buy': return '🚀';
    case 'buy': return '📈';
    case 'strong_sell': return '🔻';
    case 'sell': return '📉';
    default: return '➖';
  }
}

// Calculate score color gradient
export function getScoreGradient(score: number): string {
  // Score is -100 to 100
  if (score >= 50) return 'from-signal-strong to-signal-buy';
  if (score >= 20) return 'from-signal-buy to-signal-neutral';
  if (score <= -50) return 'from-signal-sell to-red-700';
  if (score <= -20) return 'from-signal-neutral to-signal-sell';
  return 'from-signal-neutral to-signal-neutral';
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Local storage helpers
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}
