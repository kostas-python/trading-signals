import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketSentiment } from '@/lib/sentiment-api';

// Lazy load OpenAI to avoid build errors when key not present
let openai: any = null;

async function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export async function POST(request: NextRequest) {
  try {
    const { symbol = 'BTCUSDT', includePrice = true } = await request.json();
    
    const client = await getOpenAI();
    if (!client) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Fetch all sentiment data
    const sentiment = await fetchMarketSentiment(symbol);
    
    // Fetch current price from Binance
    let priceData = null;
    if (includePrice) {
      try {
        const priceRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        if (priceRes.ok) {
          priceData = await priceRes.json();
        }
      } catch (e) {
        console.error('Error fetching price:', e);
      }
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(symbol, sentiment, priceData);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert crypto/trading analyst. Analyze market sentiment data and provide clear, actionable insights. 

Your analysis should:
1. Explain what each indicator means in simple terms
2. Identify conflicting or confirming signals
3. Provide a clear recommendation (BUY, SELL, WAIT, or ACCUMULATE)
4. Include specific conditions to watch for
5. Mention key risk factors

Use emojis for visual clarity. Be concise but thorough. Format with markdown.
Never give financial advice disclaimers in the middle - put one brief disclaimer at the very end only.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const analysis = response.choices[0]?.message?.content || 'Unable to generate analysis';

    return NextResponse.json({
      analysis,
      data: {
        symbol,
        sentiment,
        price: priceData ? {
          current: parseFloat(priceData.lastPrice),
          change24h: parseFloat(priceData.priceChangePercent),
          high24h: parseFloat(priceData.highPrice),
          low24h: parseFloat(priceData.lowPrice),
          volume24h: parseFloat(priceData.volume),
        } : null,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating market analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(symbol: string, sentiment: any, priceData: any): string {
  const parts: string[] = [];
  
  // Header
  const asset = symbol.replace('USDT', '');
  parts.push(`## Current Market Data for ${asset}\n`);
  
  // Price data
  if (priceData) {
    parts.push(`### Price Information`);
    parts.push(`- Current Price: $${parseFloat(priceData.lastPrice).toLocaleString()}`);
    parts.push(`- 24h Change: ${parseFloat(priceData.priceChangePercent) >= 0 ? '+' : ''}${parseFloat(priceData.priceChangePercent).toFixed(2)}%`);
    parts.push(`- 24h High: $${parseFloat(priceData.highPrice).toLocaleString()}`);
    parts.push(`- 24h Low: $${parseFloat(priceData.lowPrice).toLocaleString()}`);
    parts.push(`- 24h Volume: ${(parseFloat(priceData.volume) / 1000).toFixed(0)}K ${asset}\n`);
  }
  
  // Fear & Greed
  if (sentiment.fearGreed) {
    parts.push(`### Fear & Greed Index`);
    parts.push(`- Value: ${sentiment.fearGreed.value}/100`);
    parts.push(`- Classification: ${sentiment.fearGreed.classification}`);
    parts.push(`- This is a CONTRARIAN indicator (extreme fear = potential buy, extreme greed = potential sell)\n`);
  }
  
  // Funding Rate
  if (sentiment.fundingRate) {
    parts.push(`### Funding Rate (Binance Perpetual)`);
    parts.push(`- Current Rate: ${sentiment.fundingRate.ratePercent >= 0 ? '+' : ''}${sentiment.fundingRate.ratePercent.toFixed(4)}%`);
    parts.push(`- Annualized: ${sentiment.fundingRate.annualized.toFixed(1)}%`);
    parts.push(`- Meaning: ${sentiment.fundingRate.ratePercent > 0 ? 'Longs pay shorts (bullish sentiment in market)' : sentiment.fundingRate.ratePercent < 0 ? 'Shorts pay longs (bearish sentiment in market)' : 'Balanced'}`);
    parts.push(`- Signal interpretation: High positive (>0.1%) = overleveraged longs = bearish. High negative (<-0.1%) = overleveraged shorts = bullish squeeze potential.\n`);
  }
  
  // Long/Short Ratio
  if (sentiment.longShortRatio) {
    parts.push(`### Long/Short Ratio (Binance Futures)`);
    parts.push(`- Ratio: ${sentiment.longShortRatio.ratio.toFixed(2)}`);
    parts.push(`- Longs: ${sentiment.longShortRatio.longPercent.toFixed(1)}%`);
    parts.push(`- Shorts: ${sentiment.longShortRatio.shortPercent.toFixed(1)}%`);
    parts.push(`- This is a CONTRARIAN indicator. Extreme long positioning (>70%) often precedes drops. Extreme short positioning (<30%) often precedes squeezes.\n`);
  }
  
  // Open Interest
  if (sentiment.openInterest) {
    parts.push(`### Open Interest`);
    parts.push(`- Total: $${(sentiment.openInterest.openInterestUSD / 1e9).toFixed(2)} billion`);
    parts.push(`- Rising OI + rising price = strong trend. Rising OI + falling price = potential capitulation.\n`);
  }
  
  // News
  if (sentiment.news) {
    parts.push(`### News Sentiment`);
    parts.push(`- Overall Score: ${sentiment.news.overallSentiment} (range: -100 to +100)`);
    parts.push(`- Positive headlines: ${sentiment.news.positiveCount}`);
    parts.push(`- Negative headlines: ${sentiment.news.negativeCount}`);
    parts.push(`- Neutral headlines: ${sentiment.news.neutralCount}\n`);
  }
  
  // Social
  if (sentiment.social) {
    parts.push(`### Social Media Activity`);
    parts.push(`- Sentiment Score: ${sentiment.social.sentimentScore}% bullish`);
    parts.push(`- Reddit Active Users (48h): ${sentiment.social.redditActiveUsers.toLocaleString()}`);
    parts.push(`- Activity ratio: ${((sentiment.social.redditActiveUsers / sentiment.social.redditSubscribers) * 100).toFixed(2)}% of subscribers active\n`);
  }
  
  // Overall
  parts.push(`### Combined Signal`);
  parts.push(`- Overall Score: ${sentiment.overallScore} (range: -100 to +100)`);
  parts.push(`- Signal: ${sentiment.overallSignal.replace('_', ' ').toUpperCase()}\n`);
  
  // Request
  parts.push(`---`);
  parts.push(`\nBased on this data, please provide:`);
  parts.push(`1. A clear summary of the current market situation`);
  parts.push(`2. What each key indicator is telling us`);
  parts.push(`3. Any conflicting signals and what they mean`);
  parts.push(`4. Your recommendation: BUY, SELL, WAIT, or ACCUMULATE (with DCA)`);
  parts.push(`5. Specific price levels or conditions to watch`);
  parts.push(`6. Key risks to be aware of`);
  
  return parts.join('\n');
}