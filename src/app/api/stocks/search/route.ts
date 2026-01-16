import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API = 'https://finnhub.io/api/v1';

// Cache for search results
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Finnhub API key not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter required' },
      { status: 400 }
    );
  }

  const cacheKey = `search-${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `${FINNHUB_API}/search?q=${encodeURIComponent(query)}&token=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter to only US stocks and limit results
    const filtered = {
      ...data,
      result: data.result
        ?.filter((r: { type: string; symbol: string }) => 
          r.type === 'Common Stock' && !r.symbol.includes('.')
        )
        .slice(0, 15) || []
    };
    
    // Cache the result
    cache.set(cacheKey, { data: filtered, timestamp: Date.now() });
    
    return NextResponse.json(filtered);
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    return NextResponse.json(
      { error: 'Failed to search stocks' },
      { status: 500 }
    );
  }
}
