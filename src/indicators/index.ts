import { Indicator, IndicatorResult, SignalStrength, CombinedSignal } from '@/types';

// Helper to determine signal from value and thresholds
const getSignal = (
  value: number,
  strongBuy: number,
  buy: number,
  sell: number,
  strongSell: number,
  inverted = false
): SignalStrength => {
  if (inverted) {
    if (value <= strongBuy) return 'strong_buy';
    if (value <= buy) return 'buy';
    if (value >= strongSell) return 'strong_sell';
    if (value >= sell) return 'sell';
    return 'neutral';
  }
  if (value >= strongBuy) return 'strong_buy';
  if (value >= buy) return 'buy';
  if (value <= strongSell) return 'strong_sell';
  if (value <= sell) return 'sell';
  return 'neutral';
};

// RSI - Relative Strength Index
export const RSI: Indicator = {
  id: 'rsi',
  name: 'Relative Strength Index',
  shortName: 'RSI',
  description: 'Measures the speed and magnitude of price changes. Values below 30 indicate oversold, above 70 indicate overbought.',
  enabled: true,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 15) {
      return { name: 'RSI', value: 50, signal: 'neutral', description: 'Insufficient data' };
    }

    const period = 14;
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const recentChanges = changes.slice(-period);
    
    const gains = recentChanges.filter(c => c > 0);
    const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    const signal = getSignal(rsi, 0, 30, 70, 80, true);
    
    let description = '';
    if (rsi < 30) description = 'Oversold - potential buying opportunity';
    else if (rsi > 70) description = 'Overbought - potential selling opportunity';
    else description = 'Neutral momentum';
    
    return { name: 'RSI', value: Math.round(rsi * 100) / 100, signal, description };
  },
};

// MACD - Moving Average Convergence Divergence
export const MACD: Indicator = {
  id: 'macd',
  name: 'Moving Average Convergence Divergence',
  shortName: 'MACD',
  description: 'Shows the relationship between two EMAs. Positive histogram suggests bullish momentum.',
  enabled: true,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 26) {
      return { name: 'MACD', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const calcEMA = (data: number[], period: number): number => {
      const k = 2 / (period + 1);
      let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
      }
      return ema;
    };

    const ema12 = calcEMA(prices, 12);
    const ema26 = calcEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Normalize MACD as percentage of price
    const currentPrice = prices[prices.length - 1];
    const macdPercent = (macdLine / currentPrice) * 100;
    
    const signal = getSignal(macdPercent, 2, 0.5, -0.5, -2);
    
    let description = '';
    if (macdPercent > 0.5) description = 'Bullish momentum - MACD above signal';
    else if (macdPercent < -0.5) description = 'Bearish momentum - MACD below signal';
    else description = 'Consolidating';
    
    return { name: 'MACD', value: Math.round(macdPercent * 1000) / 1000, signal, description };
  },
};

// Bollinger Bands
export const BollingerBands: Indicator = {
  id: 'bollinger',
  name: 'Bollinger Bands',
  shortName: 'BB',
  description: 'Measures volatility. Price near lower band may indicate oversold, near upper band may indicate overbought.',
  enabled: true,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 20) {
      return { name: 'BB', value: 0.5, signal: 'neutral', description: 'Insufficient data' };
    }

    const period = 20;
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
    
    const squaredDiffs = recentPrices.map(p => Math.pow(p - sma, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
    
    const upperBand = sma + (stdDev * 2);
    const lowerBand = sma - (stdDev * 2);
    const currentPrice = prices[prices.length - 1];
    
    // Position within bands (0 = lower, 1 = upper)
    const position = (currentPrice - lowerBand) / (upperBand - lowerBand);
    
    const signal = getSignal(position, 0, 0.2, 0.8, 1, true);
    
    let description = '';
    if (position < 0.2) description = 'Near lower band - potential bounce';
    else if (position > 0.8) description = 'Near upper band - potential pullback';
    else description = 'Within normal range';
    
    return { name: 'BB', value: Math.round(position * 100) / 100, signal, description };
  },
};

// SMA Crossover (50/200)
export const SMACrossover: Indicator = {
  id: 'sma_cross',
  name: 'SMA Crossover (50/200)',
  shortName: 'SMA',
  description: 'Golden cross (50 above 200) is bullish, death cross is bearish.',
  enabled: true,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 200) {
      // Use shorter periods if not enough data
      const shortPeriod = Math.min(10, Math.floor(prices.length / 3));
      const longPeriod = Math.min(30, Math.floor(prices.length * 0.8));
      
      if (prices.length < longPeriod + 5) {
        return { name: 'SMA', value: 0, signal: 'neutral', description: 'Insufficient data' };
      }
      
      const shortSMA = prices.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod;
      const longSMA = prices.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod;
      const diff = ((shortSMA - longSMA) / longSMA) * 100;
      
      const signal = getSignal(diff, 5, 1, -1, -5);
      
      return { 
        name: 'SMA', 
        value: Math.round(diff * 100) / 100, 
        signal, 
        description: diff > 0 ? 'Short-term bullish trend' : 'Short-term bearish trend'
      };
    }

    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const sma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;
    const diff = ((sma50 - sma200) / sma200) * 100;
    
    const signal = getSignal(diff, 10, 2, -2, -10);
    
    let description = '';
    if (diff > 2) description = 'Golden cross territory - bullish';
    else if (diff < -2) description = 'Death cross territory - bearish';
    else description = 'SMAs converging';
    
    return { name: 'SMA', value: Math.round(diff * 100) / 100, signal, description };
  },
};

// Volume Analysis
export const VolumeAnalysis: Indicator = {
  id: 'volume',
  name: 'Volume Analysis',
  shortName: 'VOL',
  description: 'Compares current volume to average. High volume confirms price moves.',
  enabled: true,
  calculate: (prices: number[], volumes?: number[]): IndicatorResult => {
    if (!volumes || volumes.length < 20) {
      return { name: 'VOL', value: 1, signal: 'neutral', description: 'Volume data unavailable' };
    }

    const avgVolume = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
    const currentVolume = volumes[volumes.length - 1];
    const ratio = currentVolume / avgVolume;
    
    // Combine with price direction
    const priceChange = prices[prices.length - 1] - prices[prices.length - 2];
    const isUp = priceChange > 0;
    
    let signal: SignalStrength = 'neutral';
    let description = '';
    
    if (ratio > 1.5 && isUp) {
      signal = 'strong_buy';
      description = 'High volume breakout';
    } else if (ratio > 1.5 && !isUp) {
      signal = 'strong_sell';
      description = 'High volume selloff';
    } else if (ratio > 1.2 && isUp) {
      signal = 'buy';
      description = 'Above average volume on uptrend';
    } else if (ratio > 1.2 && !isUp) {
      signal = 'sell';
      description = 'Above average volume on downtrend';
    } else {
      description = 'Normal volume levels';
    }
    
    return { name: 'VOL', value: Math.round(ratio * 100) / 100, signal, description };
  },
};

// Momentum
export const Momentum: Indicator = {
  id: 'momentum',
  name: 'Price Momentum',
  shortName: 'MOM',
  description: 'Measures the rate of price change over a period.',
  enabled: false, // Disabled by default
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 10) {
      return { name: 'MOM', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const period = 10;
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - period - 1];
    const momentum = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    const signal = getSignal(momentum, 10, 3, -3, -10);
    
    let description = '';
    if (momentum > 3) description = 'Strong upward momentum';
    else if (momentum < -3) description = 'Strong downward momentum';
    else description = 'Momentum neutral';
    
    return { name: 'MOM', value: Math.round(momentum * 100) / 100, signal, description };
  },
};

// Stochastic Oscillator
export const Stochastic: Indicator = {
  id: 'stochastic',
  name: 'Stochastic Oscillator',
  shortName: 'STOCH',
  description: 'Compares closing price to price range. Below 20 is oversold, above 80 is overbought.',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 14) {
      return { name: 'STOCH', value: 50, signal: 'neutral', description: 'Insufficient data' };
    }

    const period = 14;
    const recentPrices = prices.slice(-period);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);
    const close = recentPrices[recentPrices.length - 1];
    
    const stochK = high === low ? 50 : ((close - low) / (high - low)) * 100;
    
    const signal = getSignal(stochK, 0, 20, 80, 100, true);
    
    let description = '';
    if (stochK < 20) description = 'Oversold condition';
    else if (stochK > 80) description = 'Overbought condition';
    else description = 'Normal range';
    
    return { name: 'STOCH', value: Math.round(stochK * 100) / 100, signal, description };
  },
};

// Average True Range (Volatility)
export const ATR: Indicator = {
  id: 'atr',
  name: 'Average True Range',
  shortName: 'ATR',
  description: 'Measures market volatility. Higher values indicate more volatile conditions.',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 15) {
      return { name: 'ATR', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const period = 14;
    const trueRanges: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const high = prices[i];
      const low = prices[i - 1];
      const prevClose = prices[i - 1];
      
      // Simplified TR using just price differences
      const tr = Math.abs(high - low);
      trueRanges.push(tr);
    }
    
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((a, b) => a + b, 0) / period;
    const atrPercent = (atr / prices[prices.length - 1]) * 100;
    
    // ATR doesn't give buy/sell signals, just volatility info
    const signal: SignalStrength = 'neutral';
    
    let description = '';
    if (atrPercent > 5) description = 'High volatility - use caution';
    else if (atrPercent < 1) description = 'Low volatility - potential breakout coming';
    else description = 'Normal volatility';
    
    return { name: 'ATR', value: Math.round(atrPercent * 100) / 100, signal, description };
  },
};

// All available indicators
export const ALL_INDICATORS: Indicator[] = [
  RSI,
  MACD,
  BollingerBands,
  SMACrossover,
  VolumeAnalysis,
  Momentum,
  Stochastic,
  ATR,
];

// Calculate combined signal from all enabled indicators
export const calculateCombinedSignal = (
  prices: number[],
  volumes?: number[],
  enabledIndicators?: Indicator[]
): CombinedSignal => {
  const indicators = enabledIndicators || ALL_INDICATORS.filter(i => i.enabled);
  
  const results = indicators.map(indicator => indicator.calculate(prices, volumes));
  
  const signalWeights: Record<SignalStrength, number> = {
    strong_buy: 2,
    buy: 1,
    neutral: 0,
    sell: -1,
    strong_sell: -2,
  };
  
  let totalScore = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  
  results.forEach(result => {
    totalScore += signalWeights[result.signal];
    if (result.signal === 'strong_buy' || result.signal === 'buy') bullishCount++;
    else if (result.signal === 'strong_sell' || result.signal === 'sell') bearishCount++;
    else neutralCount++;
  });
  
  // Normalize score to -100 to 100
  const maxScore = indicators.length * 2;
  const normalizedScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  
  let overall: SignalStrength;
  if (normalizedScore >= 50) overall = 'strong_buy';
  else if (normalizedScore >= 20) overall = 'buy';
  else if (normalizedScore <= -50) overall = 'strong_sell';
  else if (normalizedScore <= -20) overall = 'sell';
  else overall = 'neutral';
  
  return {
    overall,
    score: Math.round(normalizedScore),
    bullishCount,
    bearishCount,
    neutralCount,
    indicators: results,
  };
};
