// Asset types
export type AssetType = 'crypto' | 'stock';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  image?: string;
  sparkline?: number[];
  // Additional stock-specific fields
  high24h?: number;
  low24h?: number;
  open24h?: number;
  previousClose?: number;
}

// Indicator types
export type SignalStrength = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

export interface IndicatorResult {
  name: string;
  value: number;
  signal: SignalStrength;
  description: string;
}

export interface Indicator {
  id: string;
  name: string;
  shortName: string;
  description: string;
  calculate: (prices: number[], volumes?: number[]) => IndicatorResult;
  enabled: boolean;
}

// Combined signal
export interface CombinedSignal {
  overall: SignalStrength;
  score: number; // -100 to 100
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  indicators: IndicatorResult[];
}

// Watchlist
export interface WatchlistItem {
  assetId: string;
  assetType: AssetType;
  addedAt: Date;
  alerts?: Alert[];
}

export interface Alert {
  id: string;
  type: 'price_above' | 'price_below' | 'signal_change';
  value?: number;
  enabled: boolean;
}

// API Response types
export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
  sparkline_in_7d?: {
    price: number[];
  };
}

export interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

// Chart data
export interface ChartDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

// Theme
export interface ThemeColors {
  buy: string;
  sell: string;
  neutral: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}
