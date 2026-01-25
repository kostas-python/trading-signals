import { NextResponse } from 'next/server';
import { fetchMarketSentiment } from '@/lib/sentiment-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  
  try {
    const sentiment = await fetchMarketSentiment(symbol);
    return NextResponse.json(sentiment);
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    return NextResponse.json({ error: 'Failed to fetch sentiment' }, { status: 500 });
  }
}