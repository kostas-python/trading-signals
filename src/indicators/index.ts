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

// ============== NEW INDICATORS ==============

// DMI (Directional Movement Index) - From BTC DMI Slapper
export const DMI: Indicator = {
  id: 'dmi',
  name: 'DMI',
  shortName: 'DMI',
  description: 'Directional Movement Index - measures trend direction and strength using +DI, -DI, and ADX',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const len = 15;
    const adxSmoothing = 34;
    
    if (prices.length < Math.max(len, adxSmoothing) + 5) {
      return { name: 'DMI', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    // Calculate True Range and Directional Movement
    const calcDMI = () => {
      const plusDM: number[] = [];
      const minusDM: number[] = [];
      const tr: number[] = [];

      for (let i = 1; i < prices.length; i++) {
        const high = prices[i];
        const low = prices[i];
        const prevHigh = prices[i - 1];
        const prevLow = prices[i - 1];
        const prevClose = prices[i - 1];

        // Simplified TR calculation using close prices
        const trValue = Math.abs(high - low);
        tr.push(trValue || 0.0001);

        const upMove = high - prevHigh;
        const downMove = prevLow - low;

        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      }

      // RMA (Wilder's smoothing)
      const rma = (arr: number[], period: number): number[] => {
        const result: number[] = [];
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
          if (i < period) {
            sum += arr[i];
            result.push(sum / (i + 1));
          } else {
            const prev = result[result.length - 1];
            result.push((prev * (period - 1) + arr[i]) / period);
          }
        }
        return result;
      };

      const smoothTR = rma(tr, len);
      const smoothPlusDM = rma(plusDM, len);
      const smoothMinusDM = rma(minusDM, len);

      const plusDI: number[] = [];
      const minusDI: number[] = [];
      const dx: number[] = [];

      for (let i = 0; i < smoothTR.length; i++) {
        const pdi = smoothTR[i] > 0 ? (smoothPlusDM[i] / smoothTR[i]) * 100 : 0;
        const mdi = smoothTR[i] > 0 ? (smoothMinusDM[i] / smoothTR[i]) * 100 : 0;
        plusDI.push(pdi);
        minusDI.push(mdi);
        const sum = pdi + mdi;
        dx.push(sum > 0 ? (Math.abs(pdi - mdi) / sum) * 100 : 0);
      }

      const adx = rma(dx, adxSmoothing);

      return {
        plusDI: plusDI[plusDI.length - 1],
        minusDI: minusDI[minusDI.length - 1],
        adx: adx[adx.length - 1],
        prevPlusDI: plusDI[plusDI.length - 2],
        prevMinusDI: minusDI[minusDI.length - 2],
      };
    };

    const { plusDI, minusDI, adx, prevPlusDI, prevMinusDI } = calcDMI();

    // DMI Slapper Logic
    const dmiCrossUp = prevPlusDI <= prevMinusDI && plusDI > minusDI;
    const dmiCrossDown = prevPlusDI >= prevMinusDI && plusDI < minusDI;
    const dmiLong = (plusDI > adx && adx > 20 && plusDI > 20) || (dmiCrossUp && adx > 40) || (adx > 30 && minusDI < plusDI && plusDI > 25);
    const dmiShort = (dmiCrossDown && adx > 20) || (adx > 32 && minusDI > plusDI) || (minusDI > adx && adx > 40 && minusDI > 25);

    let signal: SignalStrength = 'neutral';
    let description = `+DI: ${plusDI.toFixed(1)}, -DI: ${minusDI.toFixed(1)}, ADX: ${adx.toFixed(1)}`;

    if (dmiCrossUp && adx > 40) {
      signal = 'strong_buy';
      description = 'Strong bullish crossover with high ADX';
    } else if (dmiLong) {
      signal = 'buy';
      description = 'Bullish trend - +DI dominant';
    } else if (dmiCrossDown && adx > 40) {
      signal = 'strong_sell';
      description = 'Strong bearish crossover with high ADX';
    } else if (dmiShort) {
      signal = 'sell';
      description = 'Bearish trend - -DI dominant';
    } else if (adx < 20) {
      description = 'Weak trend - ADX below 20';
    }

    return { name: 'DMI', value: Math.round(adx), signal, description };
  },
};

// STC (Schaff Trend Cycle)
export const STC: Indicator = {
  id: 'stc',
  name: 'Schaff Trend Cycle',
  shortName: 'STC',
  description: 'Combines MACD with Stochastic for cycle identification. Below 25 = oversold, above 75 = overbought',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const stcLength = 14;
    const fastLength = 25;
    const slowLength = 60;
    const factor = 1.5;

    if (prices.length < slowLength + stcLength) {
      return { name: 'STC', value: 50, signal: 'neutral', description: 'Insufficient data' };
    }

    // EMA calculation
    const ema = (data: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      const result: number[] = [data[0]];
      for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k));
      }
      return result;
    };

    const fastEMA = ema(prices, fastLength);
    const slowEMA = ema(prices, slowLength);
    const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);

    // Stochastic of MACD
    const stochastic = (data: number[], period: number): number[] => {
      const result: number[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(50);
          continue;
        }
        const slice = data.slice(i - period + 1, i + 1);
        const low = Math.min(...slice);
        const high = Math.max(...slice);
        const range = high - low;
        result.push(range > 0 ? ((data[i] - low) / range) * 100 : result[result.length - 1] || 50);
      }
      return result;
    };

    // First stochastic
    const stoch1 = stochastic(macdLine, stcLength);
    
    // Smooth with factor
    const smooth1: number[] = [stoch1[0]];
    for (let i = 1; i < stoch1.length; i++) {
      smooth1.push(smooth1[i - 1] + factor * (stoch1[i] - smooth1[i - 1]));
    }

    // Second stochastic
    const stoch2 = stochastic(smooth1, stcLength);
    
    // Final STC
    const stc: number[] = [stoch2[0]];
    for (let i = 1; i < stoch2.length; i++) {
      stc.push(stc[i - 1] + factor * (stoch2[i] - stc[i - 1]));
    }

    const currentSTC = stc[stc.length - 1];
    const prevSTC = stc[stc.length - 2];
    const prev2STC = stc[stc.length - 3];

    let signal: SignalStrength = 'neutral';
    let description = `STC at ${currentSTC.toFixed(1)}`;

    // Turning points
    const turningUp = prev2STC >= prevSTC && prevSTC <= currentSTC && currentSTC < 60;
    const turningDown = prev2STC <= prevSTC && prevSTC >= currentSTC && currentSTC > 40;

    if (currentSTC < 25) {
      signal = 'strong_buy';
      description = 'Oversold - potential reversal up';
    } else if (turningUp) {
      signal = 'buy';
      description = 'STC turning up from low';
    } else if (currentSTC > 75) {
      signal = 'strong_sell';
      description = 'Overbought - potential reversal down';
    } else if (turningDown) {
      signal = 'sell';
      description = 'STC turning down from high';
    }

    return { name: 'STC', value: Math.round(currentSTC), signal, description };
  },
};

// Aroon Indicator
export const Aroon: Indicator = {
  id: 'aroon',
  name: 'Aroon',
  shortName: 'AROON',
  description: 'Identifies trend changes and strength. Aroon Up > Aroon Down = bullish',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const length = 25;
    
    if (prices.length < length + 1) {
      return { name: 'Aroon', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const recent = prices.slice(-length - 1);
    
    // Find bars since highest high and lowest low
    let highestIdx = 0;
    let lowestIdx = 0;
    let highest = recent[0];
    let lowest = recent[0];
    
    for (let i = 0; i < recent.length; i++) {
      if (recent[i] >= highest) {
        highest = recent[i];
        highestIdx = i;
      }
      if (recent[i] <= lowest) {
        lowest = recent[i];
        lowestIdx = i;
      }
    }

    const aroonUp = ((length - (recent.length - 1 - highestIdx)) / length) * 100;
    const aroonDown = ((length - (recent.length - 1 - lowestIdx)) / length) * 100;
    const aroonOsc = aroonUp - aroonDown;

    let signal: SignalStrength = 'neutral';
    let description = `Up: ${aroonUp.toFixed(0)}, Down: ${aroonDown.toFixed(0)}`;

    if (aroonUp > 70 && aroonDown < 30) {
      signal = 'strong_buy';
      description = 'Strong uptrend - Aroon Up dominant';
    } else if (aroonUp > aroonDown && aroonUp > 50) {
      signal = 'buy';
      description = 'Uptrend forming';
    } else if (aroonDown > 70 && aroonUp < 30) {
      signal = 'strong_sell';
      description = 'Strong downtrend - Aroon Down dominant';
    } else if (aroonDown > aroonUp && aroonDown > 50) {
      signal = 'sell';
      description = 'Downtrend forming';
    } else {
      description = 'Consolidation - no clear trend';
    }

    return { name: 'Aroon', value: Math.round(aroonOsc), signal, description };
  },
};

// SuperTrend Indicator
export const SuperTrend: Indicator = {
  id: 'supertrend',
  name: 'SuperTrend',
  shortName: 'ST',
  description: 'Trend-following indicator combining ATR with price action',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const atrPeriod = 10;
    const factor = 3;

    if (prices.length < atrPeriod + 5) {
      return { name: 'SuperTrend', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    // Calculate ATR
    const tr: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      tr.push(Math.abs(prices[i] - prices[i - 1]));
    }

    const atr: number[] = [];
    for (let i = 0; i < tr.length; i++) {
      if (i < atrPeriod - 1) {
        atr.push(tr.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
      } else {
        const prev = atr[atr.length - 1];
        atr.push((prev * (atrPeriod - 1) + tr[i]) / atrPeriod);
      }
    }

    // SuperTrend calculation
    let direction = 1; // 1 = up, -1 = down
    let superTrend = prices[atrPeriod];
    
    for (let i = atrPeriod; i < prices.length; i++) {
      const atrVal = atr[i - 1] * factor;
      const basicUpperBand = prices[i] + atrVal;
      const basicLowerBand = prices[i] - atrVal;

      if (prices[i] > superTrend) {
        direction = 1;
        superTrend = basicLowerBand;
      } else {
        direction = -1;
        superTrend = basicUpperBand;
      }
    }

    const currentPrice = prices[prices.length - 1];
    const percentFromST = ((currentPrice - superTrend) / superTrend) * 100;

    let signal: SignalStrength = 'neutral';
    let description = direction > 0 ? 'Uptrend' : 'Downtrend';

    if (direction > 0) {
      signal = percentFromST > 5 ? 'strong_buy' : 'buy';
      description = `Bullish - price ${percentFromST.toFixed(1)}% above SuperTrend`;
    } else {
      signal = percentFromST < -5 ? 'strong_sell' : 'sell';
      description = `Bearish - price ${Math.abs(percentFromST).toFixed(1)}% below SuperTrend`;
    }

    return { name: 'SuperTrend', value: direction, signal, description };
  },
};

// EMA Crossover (9/21)
export const EMACrossover: Indicator = {
  id: 'ema_cross',
  name: 'EMA Crossover',
  shortName: 'EMA',
  description: 'Exponential Moving Average 9/21 crossover for trend direction',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    if (prices.length < 25) {
      return { name: 'EMA Cross', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const calcEMA = (data: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      const result: number[] = [data[0]];
      for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k));
      }
      return result;
    };

    const ema9 = calcEMA(prices, 9);
    const ema21 = calcEMA(prices, 21);

    const current9 = ema9[ema9.length - 1];
    const current21 = ema21[ema21.length - 1];
    const prev9 = ema9[ema9.length - 2];
    const prev21 = ema21[ema21.length - 2];

    const diff = ((current9 - current21) / current21) * 100;
    const crossUp = prev9 <= prev21 && current9 > current21;
    const crossDown = prev9 >= prev21 && current9 < current21;

    let signal: SignalStrength = 'neutral';
    let description = `EMA9 ${diff >= 0 ? 'above' : 'below'} EMA21 by ${Math.abs(diff).toFixed(2)}%`;

    if (crossUp) {
      signal = 'strong_buy';
      description = 'Bullish crossover - EMA9 crossed above EMA21';
    } else if (crossDown) {
      signal = 'strong_sell';
      description = 'Bearish crossover - EMA9 crossed below EMA21';
    } else if (diff > 2) {
      signal = 'buy';
      description = 'Bullish - EMA9 well above EMA21';
    } else if (diff < -2) {
      signal = 'sell';
      description = 'Bearish - EMA9 well below EMA21';
    }

    return { name: 'EMA Cross', value: Number(diff.toFixed(2)), signal, description };
  },
};

// Williams %R
export const WilliamsR: Indicator = {
  id: 'williams_r',
  name: 'Williams %R',
  shortName: 'W%R',
  description: 'Momentum indicator showing overbought/oversold. Below -80 = oversold, above -20 = overbought',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const period = 14;
    
    if (prices.length < period) {
      return { name: 'Williams %R', value: -50, signal: 'neutral', description: 'Insufficient data' };
    }

    const recent = prices.slice(-period);
    const high = Math.max(...recent);
    const low = Math.min(...recent);
    const current = prices[prices.length - 1];
    
    const wr = high !== low ? ((high - current) / (high - low)) * -100 : -50;

    let signal: SignalStrength = 'neutral';
    let description = `W%R at ${wr.toFixed(1)}`;

    if (wr > -20) {
      signal = 'sell';
      description = 'Overbought (above -20) - potential pullback';
    } else if (wr < -80) {
      signal = 'buy';
      description = 'Oversold (below -80) - potential bounce';
    } else if (wr > -40) {
      signal = 'neutral';
      description = 'Upper neutral zone';
    } else if (wr < -60) {
      signal = 'neutral';
      description = 'Lower neutral zone';
    }

    return { name: 'Williams %R', value: Math.round(wr), signal, description };
  },
};

// CCI (Commodity Channel Index)
export const CCI: Indicator = {
  id: 'cci',
  name: 'CCI',
  shortName: 'CCI',
  description: 'Measures price deviation from average. Above +100 = overbought, below -100 = oversold',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const period = 20;
    
    if (prices.length < period) {
      return { name: 'CCI', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const recent = prices.slice(-period);
    const sma = recent.reduce((a, b) => a + b, 0) / period;
    const meanDev = recent.reduce((sum, p) => sum + Math.abs(p - sma), 0) / period;
    const cci = meanDev > 0 ? (recent[recent.length - 1] - sma) / (0.015 * meanDev) : 0;

    let signal: SignalStrength = 'neutral';
    let description = `CCI at ${cci.toFixed(1)}`;

    if (cci > 200) {
      signal = 'strong_sell';
      description = 'Extremely overbought (>200)';
    } else if (cci > 100) {
      signal = 'sell';
      description = 'Overbought (>100)';
    } else if (cci < -200) {
      signal = 'strong_buy';
      description = 'Extremely oversold (<-200)';
    } else if (cci < -100) {
      signal = 'buy';
      description = 'Oversold (<-100)';
    }

    return { name: 'CCI', value: Math.round(cci), signal, description };
  },
};

// ROC (Rate of Change)
export const ROC: Indicator = {
  id: 'roc',
  name: 'Rate of Change',
  shortName: 'ROC',
  description: 'Measures percentage price change over a period',
  enabled: false,
  calculate: (prices: number[]): IndicatorResult => {
    const period = 12;
    
    if (prices.length < period + 1) {
      return { name: 'ROC', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    const roc = ((current - past) / past) * 100;

    let signal: SignalStrength = 'neutral';
    let description = `${roc >= 0 ? '+' : ''}${roc.toFixed(2)}% over ${period} periods`;

    if (roc > 10) {
      signal = 'strong_buy';
      description = 'Strong momentum up';
    } else if (roc > 3) {
      signal = 'buy';
      description = 'Positive momentum';
    } else if (roc < -10) {
      signal = 'strong_sell';
      description = 'Strong momentum down';
    } else if (roc < -3) {
      signal = 'sell';
      description = 'Negative momentum';
    }

    return { name: 'ROC', value: Number(roc.toFixed(2)), signal, description };
  },
};

// VWAP Deviation (simplified - uses volume if available)
export const VWAPDeviation: Indicator = {
  id: 'vwap',
  name: 'VWAP Deviation',
  shortName: 'VWAP',
  description: 'Price deviation from Volume Weighted Average Price',
  enabled: false,
  calculate: (prices: number[], volumes?: number[]): IndicatorResult => {
    if (prices.length < 20) {
      return { name: 'VWAP Dev', value: 0, signal: 'neutral', description: 'Insufficient data' };
    }

    // Calculate VWAP (or SMA if no volume)
    let vwap: number;
    if (volumes && volumes.length === prices.length) {
      let cumVolume = 0;
      let cumVolumePrice = 0;
      for (let i = 0; i < prices.length; i++) {
        cumVolume += volumes[i];
        cumVolumePrice += prices[i] * volumes[i];
      }
      vwap = cumVolumePrice / cumVolume;
    } else {
      // Fallback to SMA
      vwap = prices.reduce((a, b) => a + b, 0) / prices.length;
    }

    const currentPrice = prices[prices.length - 1];
    const deviation = ((currentPrice - vwap) / vwap) * 100;

    let signal: SignalStrength = 'neutral';
    let description = `Price ${deviation >= 0 ? 'above' : 'below'} VWAP by ${Math.abs(deviation).toFixed(2)}%`;

    if (deviation > 5) {
      signal = 'sell';
      description = 'Price far above VWAP - potential pullback';
    } else if (deviation > 2) {
      signal = 'neutral';
      description = 'Price above VWAP - bullish bias';
    } else if (deviation < -5) {
      signal = 'buy';
      description = 'Price far below VWAP - potential bounce';
    } else if (deviation < -2) {
      signal = 'neutral';
      description = 'Price below VWAP - bearish bias';
    }

    return { name: 'VWAP Dev', value: Number(deviation.toFixed(2)), signal, description };
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
  // New indicators
  DMI,
  STC,
  Aroon,
  SuperTrend,
  EMACrossover,
  WilliamsR,
  CCI,
  ROC,
  VWAPDeviation,
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