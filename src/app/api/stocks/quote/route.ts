import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API = 'https://finnhub.io/api/v1';

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
  
  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${FINNHUB_API}/quote?symbol=${symbol}&token=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stock quote' },
      { status: 500 }
    );
  }
}
