import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful trading assistant for the SignalPulse dashboard. You help users understand their portfolio, analyze market conditions, and explain technical indicators.

Current Market Context:
${marketContext || 'No market data loaded yet.'}

Key capabilities:
- Explain what technical indicators mean
- Compare assets and their signals
- Suggest which assets to watch based on signals
- Explain market trends and patterns
- Answer questions about specific assets

Guidelines:
- Be concise and helpful
- Reference specific data from the dashboard when available
- Never provide financial advice or guarantee outcomes
- Suggest exploring specific assets based on signal strength
- Use the indicator data to support your explanations`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 600,
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
