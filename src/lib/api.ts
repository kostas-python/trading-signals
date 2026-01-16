import { Asset, CoinGeckoMarket, AssetType } from '@/types';

// API Configuration
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const FINNHUB_API = 'https://finnhub.io/api/v1';

// Check if Finnhub API key is configured (client-side check via API)
export async function hasFinnhubApiKey(): Promise<boolean> {
  try {
    const response = await fetch('/api/stocks/status');
    if (!response.ok) return false;
    const data = await response.json();
    return data.configured === true;
  } catch {
    return false;
  }
}

// Popular crypto IDs for CoinGecko
export const POPULAR_CRYPTO = [
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano',
  'ripple', 'dogecoin', 'polkadot', 'avalanche-2', 'chainlink',
  'polygon', 'litecoin', 'uniswap', 'stellar', 'cosmos',
];

// Popular stock symbols
export const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
  'META', 'TSLA', 'JPM', 'V', 'WMT',
  'JNJ', 'PG', 'MA', 'HD', 'DIS',
];

// Stock name mapping
const STOCK_NAMES: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corp.',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'NVDA': 'NVIDIA Corp.',
  'META': 'Meta Platforms',
  'TSLA': 'Tesla Inc.',
  'JPM': 'JPMorgan Chase',
  'V': 'Visa Inc.',
  'WMT': 'Walmart Inc.',
  'JNJ': 'Johnson & Johnson',
  'PG': 'Procter & Gamble',
  'MA': 'Mastercard Inc.',
  'HD': 'Home Depot',
  'DIS': 'Walt Disney Co.',
  'NFLX': 'Netflix Inc.',
  'PYPL': 'PayPal Holdings',
  'ADBE': 'Adobe Inc.',
  'CRM': 'Salesforce Inc.',
  'INTC': 'Intel Corp.',
  'AMD': 'AMD Inc.',
  'BA': 'Boeing Co.',
  'KO': 'Coca-Cola Co.',
  'PEP': 'PepsiCo Inc.',
  'MCD': 'McDonald\'s Corp.',
};

// ============== CRYPTO APIs (CoinGecko) ==============

export async function fetchCryptoMarkets(
  ids?: string[],
  sparkline = true
): Promise<Asset[]> {
  try {
    const idsParam = ids ? ids.join(',') : POPULAR_CRYPTO.join(',');
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&sparkline=${sparkline}&price_change_percentage=24h`,
      { next: { revalidate: 30 } }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data: CoinGeckoMarket[] = await response.json();
    
    return data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      type: 'crypto' as AssetType,
      price: coin.current_price,
      change24h: coin.price_change_24h,
      changePercent24h: coin.price_change_percentage_24h,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      image: coin.image,
      sparkline: coin.sparkline_in_7d?.price,
    }));
  } catch (error) {
    console.error('Error fetching crypto markets:', error);
    return [];
  }
}

export async function fetchCryptoDetails(id: string): Promise<{
  prices: number[];
  volumes: number[];
} | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`,
      { next: { revalidate: 300 } }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      prices: data.prices.map((p: number[]) => p[1]),
      volumes: data.total_volumes.map((v: number[]) => v[1]),
    };
  } catch (error) {
    console.error('Error fetching crypto details:', error);
    return null;
  }
}

// ============== STOCK APIs (Finnhub) ==============

interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

interface FinnhubCandle {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volume
}

// Get Finnhub API key from environment or use demo
function getFinnhubKey(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use API route
    return '';
  }
  return process.env.FINNHUB_API_KEY || '';
}

// Fetch single stock quote from Finnhub
export async function fetchStockQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const apiKey = getFinnhubKey();
    if (!apiKey) {
      // Use API route for client-side
      const response = await fetch(`/api/stocks/quote?symbol=${symbol}`);
      if (!response.ok) return null;
      return response.json();
    }
    
    const response = await fetch(
      `${FINNHUB_API}/quote?symbol=${symbol}&token=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

// Fetch historical candles from Finnhub
export async function fetchStockCandles(
  symbol: string,
  resolution: string = 'D',
  from?: number,
  to?: number
): Promise<FinnhubCandle | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const defaultFrom = now - (30 * 24 * 60 * 60); // 30 days ago
    
    const response = await fetch(
      `/api/stocks/candles?symbol=${symbol}&resolution=${resolution}&from=${from || defaultFrom}&to=${to || now}`
    );
    
    if (!response.ok) {
      throw new Error(`Finnhub candles API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.s === 'no_data') {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error);
    return null;
  }
}

// Fetch all stock data with quotes
export async function fetchStockData(symbols?: string[]): Promise<Asset[]> {
  const stockSymbols = symbols || POPULAR_STOCKS;
  
  try {
    // Fetch all quotes via API route (handles rate limiting)
    const response = await fetch(`/api/stocks/quotes?symbols=${stockSymbols.join(',')}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stock quotes');
    }
    
    const quotes: Record<string, FinnhubQuote> = await response.json();
    
    // Transform to Asset format
    const assets: Asset[] = [];
    
    for (const symbol of stockSymbols) {
      const quote = quotes[symbol];
      if (quote && quote.c > 0) {
        assets.push({
          id: symbol.toLowerCase(),
          symbol: symbol,
          name: STOCK_NAMES[symbol] || symbol,
          type: 'stock' as AssetType,
          price: quote.c,
          change24h: quote.d,
          changePercent24h: quote.dp,
          volume24h: 0, // Finnhub doesn't provide volume in quote
          high24h: quote.h,
          low24h: quote.l,
          open24h: quote.o,
          previousClose: quote.pc,
        });
      }
    }
    
    return assets;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    // Return empty array on error
    return [];
  }
}

// Fetch stock details with historical data
export async function fetchStockDetails(symbol: string): Promise<{
  prices: number[];
  volumes: number[];
} | null> {
  try {
    const candles = await fetchStockCandles(symbol, 'D');
    
    if (!candles || candles.s === 'no_data') {
      return null;
    }
    
    return {
      prices: candles.c,
      volumes: candles.v,
    };
  } catch (error) {
    console.error(`Error fetching stock details for ${symbol}:`, error);
    return null;
  }
}

// ============== Search APIs ==============

// Search for crypto assets
export async function searchCrypto(query: string): Promise<Asset[]> {
  try {
    const response = await fetch(
      `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const coinIds = data.coins.slice(0, 10).map((c: { id: string }) => c.id);
    
    if (coinIds.length === 0) return [];
    
    return fetchCryptoMarkets(coinIds, false);
  } catch {
    return [];
  }
}

// Search for stocks via Finnhub symbol lookup
export async function searchStocks(query: string): Promise<Asset[]> {
  try {
    const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (!data.result || data.result.length === 0) return [];
    
    // Get quotes for search results
    const symbols = data.result
      .filter((r: { type: string }) => r.type === 'Common Stock')
      .slice(0, 10)
      .map((r: { symbol: string }) => r.symbol);
    
    if (symbols.length === 0) return [];
    
    return fetchStockData(symbols);
  } catch {
    return [];
  }
}

// Unified search function
export async function searchAssets(
  query: string,
  type: AssetType
): Promise<Asset[]> {
  if (type === 'crypto') {
    return searchCrypto(query);
  } else {
    return searchStocks(query);
  }
}
