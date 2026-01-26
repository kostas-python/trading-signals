import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { fetchMarketSentiment } from '@/lib/sentiment-api';

// Lazy initialize OpenAI client
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  const openai = getOpenAIClient();
  
  if (!openai) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message required' },
        { status: 400 }
      );
    }

    // Build context from current market data
    const marketContext = context?.assets
      ? buildMarketContext(context.assets, context.signals)
      : '';

    // Always fetch sentiment data for comprehensive context
    let sentimentContext = '';
    try {
      const sentiment = await fetchMarketSentiment('BTCUSDT');
      sentimentContext = buildSentimentContext(sentiment);
    } catch (e) {
      console.error('Failed to fetch sentiment for chat:', e);
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful trading assistant for the SignalPulse dashboard. You help users understand their portfolio, analyze market conditions, and explain technical indicators.

Current Market Context:
${marketContext || 'No market data loaded yet.'}

${sentimentContext ? `Current Market Sentiment:\n${sentimentContext}` : ''}

Key capabilities:
- Explain what technical indicators mean (RSI, MACD, Bollinger Bands, etc.)
- Analyze market sentiment (Fear & Greed, Funding Rates, Long/Short Ratio)
- Compare assets and their signals
- Identify conflicting signals between technicals and sentiment
- Suggest which assets to watch based on signals
- Explain market trends and patterns

IMPORTANT - Sentiment Interpretation (CONTRARIAN):
- Fear & Greed Index: 
  * 0-25 = Extreme Fear = historically good buying opportunity
  * 25-45 = Fear = cautious optimism
  * 45-55 = Neutral
  * 55-75 = Greed = caution advised
  * 75-100 = Extreme Greed = historically good time to take profits

- Long/Short Ratio:
  * >2.5 = Very crowded long (73%+ long) = HIGH RISK of liquidation cascade
  * 1.5-2.5 = Moderately long biased
  * 0.8-1.5 = Balanced
  * <0.7 = Crowded short = potential short squeeze

- Funding Rate:
  * >0.1% = Longs heavily overleveraged
  * 0.01-0.1% = Slightly bullish
  * -0.01 to 0.01% = Neutral
  * <-0.03% = Shorts paying premium, bullish

Guidelines:
- Be concise and helpful
- When asked about market conditions, ALWAYS reference the sentiment data
- Highlight when sentiment and technicals conflict
- Never provide financial advice or guarantee outcomes
- Use specific numbers from the data`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I couldn\'t process that request.';

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

interface AssetContext {
  id?: string;
  symbol: string;
  name: string;
  price: number;
  changePercent24h: number;
  type: string;
}

interface SignalContext {
  overall: string;
  score: number;
}

function buildMarketContext(
  assets: AssetContext[],
  signals: Record<string, SignalContext>
): string {
  if (!assets || assets.length === 0) return '';

  const summaries = assets.slice(0, 15).map(asset => {
    const signal = signals?.[asset.id || asset.symbol.toLowerCase()];
    const signalStr = signal ? ` | Signal: ${signal.overall} (${signal.score})` : '';
    return `${asset.symbol}: $${asset.price.toFixed(2)} (${asset.changePercent24h >= 0 ? '+' : ''}${asset.changePercent24h.toFixed(2)}%)${signalStr}`;
  });

  const bullish = Object.values(signals || {}).filter(s => s.score > 20).length;
  const bearish = Object.values(signals || {}).filter(s => s.score < -20).length;

  return `
Loaded ${assets.length} assets
Bullish signals: ${bullish} | Bearish signals: ${bearish}

Top assets:
${summaries.join('\n')}
`.trim();
}

function buildSentimentContext(sentiment: any): string {
  if (!sentiment) return '';
  
  const parts: string[] = [];
  
  if (sentiment.fearGreed) {
    const fg = sentiment.fearGreed;
    parts.push(`Fear & Greed Index: ${fg.value}/100 (${fg.classification})`);
    if (fg.value <= 25) {
      parts.push(`  → EXTREME FEAR: Historically a good buying opportunity (contrarian)`);
    } else if (fg.value >= 75) {
      parts.push(`  → EXTREME GREED: Historically a good time to take profits (contrarian)`);
    }
  }
  
  if (sentiment.fundingRate) {
    const fr = sentiment.fundingRate;
    parts.push(`Funding Rate: ${fr.ratePercent >= 0 ? '+' : ''}${fr.ratePercent.toFixed(4)}%`);
    parts.push(`  → ${fr.description}`);
  }
  
  if (sentiment.longShortRatio) {
    const ls = sentiment.longShortRatio;
    parts.push(`Long/Short Ratio: ${ls.ratio.toFixed(2)} (${ls.longPercent.toFixed(1)}% Long / ${ls.shortPercent.toFixed(1)}% Short)`);
    parts.push(`  → ${ls.description}`);
    if (ls.ratio > 2.5) {
      parts.push(`  ⚠️ WARNING: Very crowded long position - high liquidation risk`);
    }
  }
  
  if (sentiment.openInterest) {
    parts.push(`Open Interest: $${(sentiment.openInterest.openInterestUSD / 1e9).toFixed(2)}B`);
  }
  
  parts.push(`Overall Sentiment: ${sentiment.overallSignal.replace('_', ' ').toUpperCase()} (Score: ${sentiment.overallScore})`);
  
  return parts.join('\n');
}