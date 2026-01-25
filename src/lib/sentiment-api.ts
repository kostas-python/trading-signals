// Free Sentiment & Market Data APIs

// ============== FEAR & GREED INDEX ==============
// https://alternative.me/crypto/fear-and-greed-index/

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: Date;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

export async function fetchFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!response.ok) return null;
    
    const data: FearGreedResponse = await response.json();
    const latest = data.data[0];
    const value = parseInt(latest.value);
    
    // Contrarian signals: extreme fear = buy, extreme greed = sell
    let signal: FearGreedData['signal'] = 'neutral';
    if (value <= 20) signal = 'strong_buy';      // Extreme Fear
    else if (value <= 35) signal = 'buy';         // Fear
    else if (value >= 80) signal = 'strong_sell'; // Extreme Greed
    else if (value >= 65) signal = 'sell';        // Greed
    
    return {
      value,
      classification: latest.value_classification,
      timestamp: new Date(parseInt(latest.timestamp) * 1000),
      signal,
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error);
    return null;
  }
}

// ============== BINANCE FUNDING RATES ==============
// Positive = longs pay shorts (bullish sentiment)
// Negative = shorts pay longs (bearish sentiment)

interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export interface FundingRateData {
  symbol: string;
  rate: number;
  ratePercent: number;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  description: string;
}

export async function fetchBinanceFundingRate(symbol: string = 'BTCUSDT'): Promise<FundingRateData | null> {
  try {
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
    );
    if (!response.ok) return null;
    
    const data: BinanceFundingRate[] = await response.json();
    if (!data.length) return null;
    
    const rate = parseFloat(data[0].fundingRate);
    const ratePercent = rate * 100;
    
    // Contrarian: high positive = overleveraged longs = potential drop
    // High negative = overleveraged shorts = potential squeeze
    let signal: FundingRateData['signal'] = 'neutral';
    let description = 'Neutral funding rate';
    
    if (ratePercent > 0.1) {
      signal = 'sell';
      description = 'High positive funding - longs overleveraged';
    } else if (ratePercent > 0.05) {
      signal = 'neutral';
      description = 'Slightly bullish sentiment';
    } else if (ratePercent < -0.1) {
      signal = 'buy';
      description = 'High negative funding - potential short squeeze';
    } else if (ratePercent < -0.05) {
      signal = 'neutral';
      description = 'Slightly bearish sentiment';
    }
    
    return { symbol, rate, ratePercent, signal, description };
  } catch (error) {
    console.error('Error fetching funding rate:', error);
    return null;
  }
}

// ============== BINANCE LONG/SHORT RATIO ==============

interface LongShortRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export interface LongShortData {
  symbol: string;
  ratio: number;
  longPercent: number;
  shortPercent: number;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  description: string;
}

export async function fetchLongShortRatio(symbol: string = 'BTCUSDT'): Promise<LongShortData | null> {
  try {
    const response = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`
    );
    if (!response.ok) return null;
    
    const data: LongShortRatio[] = await response.json();
    if (!data.length) return null;
    
    const ratio = parseFloat(data[0].longShortRatio);
    const longPercent = parseFloat(data[0].longAccount) * 100;
    const shortPercent = parseFloat(data[0].shortAccount) * 100;
    
    // Contrarian: too many longs = potential drop, too many shorts = potential squeeze
    let signal: LongShortData['signal'] = 'neutral';
    let description = 'Balanced long/short ratio';
    
    if (ratio > 2.5) {
      signal = 'sell';
      description = 'Extremely long-heavy - potential reversal down';
    } else if (ratio > 1.8) {
      signal = 'neutral';
      description = 'More longs than shorts';
    } else if (ratio < 0.6) {
      signal = 'buy';
      description = 'Extremely short-heavy - potential squeeze';
    } else if (ratio < 0.8) {
      signal = 'neutral';
      description = 'More shorts than longs';
    }
    
    return { symbol, ratio, longPercent, shortPercent, signal, description };
  } catch (error) {
    console.error('Error fetching long/short ratio:', error);
    return null;
  }
}

// ============== BINANCE OPEN INTEREST ==============

interface OpenInterest {
  symbol: string;
  openInterest: string;
  time: number;
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;
  change24h: number;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  description: string;
}

export async function fetchOpenInterest(symbol: string = 'BTCUSDT'): Promise<OpenInterestData | null> {
  try {
    // Get current OI
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`
    );
    if (!response.ok) return null;
    
    const data: OpenInterest = await response.json();
    const currentOI = parseFloat(data.openInterest);
    
    // Get historical for comparison (would need more calls for proper 24h change)
    // Simplified: just return current value
    
    return {
      symbol,
      openInterest: currentOI,
      change24h: 0, // Would need historical data
      signal: 'neutral',
      description: `Open Interest: ${(currentOI / 1000).toFixed(2)}K contracts`,
    };
  } catch (error) {
    console.error('Error fetching open interest:', error);
    return null;
  }
}

// ============== COMBINED MARKET SENTIMENT ==============

export interface MarketSentiment {
  fearGreed: FearGreedData | null;
  fundingRate: FundingRateData | null;
  longShortRatio: LongShortData | null;
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  overallScore: number; // -100 to 100
}

export async function fetchMarketSentiment(symbol: string = 'BTCUSDT'): Promise<MarketSentiment> {
  const [fearGreed, fundingRate, longShortRatio] = await Promise.all([
    fetchFearGreedIndex(),
    fetchBinanceFundingRate(symbol),
    fetchLongShortRatio(symbol),
  ]);
  
  // Calculate overall score
  const signalToScore = {
    strong_buy: 2,
    buy: 1,
    neutral: 0,
    sell: -1,
    strong_sell: -2,
  };
  
  let totalScore = 0;
  let count = 0;
  
  if (fearGreed) {
    totalScore += signalToScore[fearGreed.signal];
    count++;
  }
  if (fundingRate) {
    totalScore += signalToScore[fundingRate.signal];
    count++;
  }
  if (longShortRatio) {
    totalScore += signalToScore[longShortRatio.signal];
    count++;
  }
  
  const avgScore = count > 0 ? (totalScore / count) * 50 : 0; // Normalize to -100 to 100
  
  let overallSignal: MarketSentiment['overallSignal'] = 'neutral';
  if (avgScore >= 50) overallSignal = 'strong_buy';
  else if (avgScore >= 20) overallSignal = 'buy';
  else if (avgScore <= -50) overallSignal = 'strong_sell';
  else if (avgScore <= -20) overallSignal = 'sell';
  
  return {
    fearGreed,
    fundingRate,
    longShortRatio,
    overallSignal,
    overallScore: Math.round(avgScore),
  };
}