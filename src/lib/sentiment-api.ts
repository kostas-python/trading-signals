// Sentiment API - Free APIs for market sentiment data

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: number;
  signal: string;
  description: string;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  ratePercent: number;
  annualizedRate: number;
  signal: string;
  description: string;
}

export interface LongShortData {
  symbol: string;
  longAccount: number;
  shortAccount: number;
  ratio: number;
  longPercent: number;
  shortPercent: number;
  signal: string;
  description: string;
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;
  openInterestUSD: number;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  publishedAt: string;
}

export interface SocialData {
  twitterFollowers: number;
  redditSubscribers: number;
  sentimentScore: number;
}

export interface PriceData {
  current: number;
  change24h: number;
  high24h: number;
  low24h: number;
}

export interface MarketSentiment {
  fearGreed: FearGreedData | null;
  fundingRate: FundingRateData | null;
  longShortRatio: LongShortData | null;
  openInterest: OpenInterestData | null;
  news: NewsItem[] | null;
  social: SocialData | null;
  price: PriceData | null;
  overallSignal: string;
  overallScore: number;
}

// Fetch Fear & Greed Index (Alternative.me - FREE)
export async function fetchFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!response.ok) return null;
    
    const data = await response.json();
    const fng = data.data[0];
    const value = parseInt(fng.value, 10);
    
    let signal = 'neutral';
    let description = 'Market sentiment is neutral';
    
    if (value <= 20) {
      signal = 'strong_buy';
      description = 'Extreme fear - historically a good buying opportunity';
    } else if (value <= 40) {
      signal = 'buy';
      description = 'Fear in the market - potential buying opportunity';
    } else if (value >= 80) {
      signal = 'strong_sell';
      description = 'Extreme greed - consider taking profits';
    } else if (value >= 60) {
      signal = 'sell';
      description = 'Greed in the market - be cautious';
    }
    
    return {
      value,
      classification: fng.value_classification,
      timestamp: parseInt(fng.timestamp, 10) * 1000,
      signal,
      description,
    };
  } catch (error) {
    console.error('Failed to fetch Fear & Greed Index:', error);
    return null;
  }
}

// Fetch Funding Rate (Binance Futures - FREE)
export async function fetchFundingRate(symbol: string = 'BTCUSDT'): Promise<FundingRateData | null> {
  try {
    const response = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const funding = data[0];
    const rate = parseFloat(funding.fundingRate);
    const ratePercent = rate * 100;
    const annualizedRate = ratePercent * 3 * 365; // 3 times per day * 365 days
    
    let signal = 'neutral';
    let description = 'Funding rate is neutral - balanced market';
    
    if (ratePercent >= 0.1) {
      signal = 'sell';
      description = 'High funding - longs are overleveraged';
    } else if (ratePercent >= 0.05) {
      signal = 'caution';
      description = 'Elevated funding - slight long bias';
    } else if (ratePercent <= -0.05) {
      signal = 'buy';
      description = 'Negative funding - shorts are paying, bullish';
    } else if (ratePercent <= -0.03) {
      signal = 'strong_buy';
      description = 'Very negative funding - potential short squeeze';
    }
    
    return {
      symbol,
      fundingRate: rate,
      fundingTime: parseInt(funding.fundingTime, 10),
      ratePercent,
      annualizedRate,
      signal,
      description,
    };
  } catch (error) {
    console.error('Failed to fetch funding rate:', error);
    return null;
  }
}

// Fetch Long/Short Ratio (Binance Futures - FREE)
export async function fetchLongShortRatio(symbol: string = 'BTCUSDT'): Promise<LongShortData | null> {
  try {
    const response = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data || data.length === 0) return null;
    
    const ls = data[0];
    const ratio = parseFloat(ls.longShortRatio);
    const longPercent = (ratio / (1 + ratio)) * 100;
    const shortPercent = 100 - longPercent;
    
    let signal = 'neutral';
    let description = 'Long/Short ratio is balanced';
    
    if (ratio >= 3.0) {
      signal = 'strong_sell';
      description = `Extremely crowded long (${longPercent.toFixed(1)}%) - High liquidation risk`;
    } else if (ratio >= 2.5) {
      signal = 'sell';
      description = `Very crowded long (${longPercent.toFixed(1)}%) - Caution advised`;
    } else if (ratio >= 2.0) {
      signal = 'caution';
      description = `Crowded long (${longPercent.toFixed(1)}%) - Monitor closely`;
    } else if (ratio <= 0.5) {
      signal = 'strong_buy';
      description = `Crowded short (${shortPercent.toFixed(1)}%) - Squeeze potential`;
    } else if (ratio <= 0.7) {
      signal = 'buy';
      description = `Short bias (${shortPercent.toFixed(1)}%) - Potential reversal`;
    }
    
    return {
      symbol,
      longAccount: parseFloat(ls.longAccount),
      shortAccount: parseFloat(ls.shortAccount),
      ratio,
      longPercent,
      shortPercent,
      signal,
      description,
    };
  } catch (error) {
    console.error('Failed to fetch long/short ratio:', error);
    return null;
  }
}

// Fetch Open Interest (Binance Futures - FREE)
export async function fetchOpenInterest(symbol: string = 'BTCUSDT'): Promise<OpenInterestData | null> {
  try {
    const [oiResponse, priceResponse] = await Promise.all([
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`),
    ]);
    
    if (!oiResponse.ok || !priceResponse.ok) return null;
    
    const oiData = await oiResponse.json();
    const priceData = await priceResponse.json();
    
    const openInterest = parseFloat(oiData.openInterest);
    const price = parseFloat(priceData.price);
    
    return {
      symbol,
      openInterest,
      openInterestUSD: openInterest * price,
    };
  } catch (error) {
    console.error('Failed to fetch open interest:', error);
    return null;
  }
}

// Fetch BTC Price (Binance - FREE)
export async function fetchPrice(symbol: string = 'BTCUSDT'): Promise<PriceData | null> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      current: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
    };
  } catch (error) {
    console.error('Failed to fetch price:', error);
    return null;
  }
}

// Calculate overall sentiment signal
function calculateOverallSignal(
  fearGreed: FearGreedData | null,
  fundingRate: FundingRateData | null,
  longShortRatio: LongShortData | null
): { signal: string; score: number } {
  let score = 0;
  let factors = 0;
  
  // Fear & Greed (weight: 40%)
  if (fearGreed) {
    factors++;
    if (fearGreed.value <= 20) score += 40;
    else if (fearGreed.value <= 35) score += 20;
    else if (fearGreed.value >= 80) score -= 40;
    else if (fearGreed.value >= 65) score -= 20;
  }
  
  // Funding Rate (weight: 30%)
  if (fundingRate) {
    factors++;
    if (fundingRate.ratePercent <= -0.05) score += 30;
    else if (fundingRate.ratePercent <= -0.02) score += 15;
    else if (fundingRate.ratePercent >= 0.1) score -= 30;
    else if (fundingRate.ratePercent >= 0.05) score -= 15;
  }
  
  // Long/Short Ratio (weight: 30%)
  if (longShortRatio) {
    factors++;
    if (longShortRatio.ratio <= 0.5) score += 30;
    else if (longShortRatio.ratio <= 0.8) score += 15;
    else if (longShortRatio.ratio >= 3.0) score -= 30;
    else if (longShortRatio.ratio >= 2.5) score -= 15;
  }
  
  // Normalize score
  const normalizedScore = factors > 0 ? Math.round(score / factors * factors) : 0;
  
  let signal = 'neutral';
  if (normalizedScore >= 50) signal = 'strong_buy';
  else if (normalizedScore >= 25) signal = 'buy';
  else if (normalizedScore <= -50) signal = 'strong_sell';
  else if (normalizedScore <= -25) signal = 'sell';
  
  return { signal, score: normalizedScore };
}

// Main function to fetch all market sentiment data
export async function fetchMarketSentiment(symbol: string = 'BTCUSDT'): Promise<MarketSentiment> {
  const [fearGreed, fundingRate, longShortRatio, openInterest, price] = await Promise.all([
    fetchFearGreedIndex(),
    fetchFundingRate(symbol),
    fetchLongShortRatio(symbol),
    fetchOpenInterest(symbol),
    fetchPrice(symbol),
  ]);
  
  const { signal: overallSignal, score: overallScore } = calculateOverallSignal(
    fearGreed,
    fundingRate,
    longShortRatio
  );
  
  return {
    fearGreed,
    fundingRate,
    longShortRatio,
    openInterest,
    news: null, // Can be added later
    social: null, // Can be added later
    price,
    overallSignal,
    overallScore,
  };
}