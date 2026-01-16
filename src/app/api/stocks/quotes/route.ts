import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API = 'https://finnhub.io/api/v1';

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 15000; // 15 seconds

async function fetchWithCache(url: string, cacheKey: string) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Finnhub API key not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const symbolsParam = searchParams.get('symbols');
  
  if (!symbolsParam) {
    return NextResponse.json(
      { error: 'Symbols parameter required' },
      { status: 400 }
    );
  }

  const symbols = symbolsParam.split(',').slice(0, 20); // Limit to 20 symbols
  const quotes: Record<string, unknown> = {};

  try {
    // Fetch quotes in parallel with small batches to respect rate limits
    const batchSize = 10;
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const promises = batch.map(async (symbol) => {
        try {
          const data = await fetchWithCache(
            `${FINNHUB_API}/quote?symbol=${symbol}&token=${apiKey}`,
            `quote-${symbol}`
          );
          return { symbol, data };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return { symbol, data: null };
        }
      });

      const results = await Promise.all(promises);
      
      for (const { symbol, data } of results) {
        if (data && data.c > 0) {
          quotes[symbol] = data;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching stock quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock quotes' },
      { status: 500 }
    );
  }
}
