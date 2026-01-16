import { NextResponse } from 'next/server';

export async function GET() {
  const configured = !!process.env.FINNHUB_API_KEY;
  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({ 
    configured,
    openaiConfigured,
  });
}
