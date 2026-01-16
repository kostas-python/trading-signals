import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API = 'https://finnhub.io/api/v1';

// Cache for candle data (longer duration since historical data doesn't change often)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Finnhub API key not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const resolution = searchParams.get('resolution') || 'D';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  if (!symbol || !from || !to) {
    return NextResponse.json(
      { error: 'Symbol, from, and to parameters required' },
      { status: 400 }
    );
  }

  const cacheKey = `candles-${symbol}-${resolution}-${from}-${to}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `${FINNHUB_API}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stock candles' },
      { status: 500 }
    );
  }
}
