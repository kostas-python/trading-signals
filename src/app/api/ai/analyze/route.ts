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
    const { asset, indicators, signal, prices } = body;

    if (!asset || !indicators) {
      return NextResponse.json(
        { error: 'Asset and indicators data required' },
        { status: 400 }
      );
    }

    // Build prompt with market data context
    const prompt = buildAnalysisPrompt(asset, indicators, signal, prices);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model for analysis
      messages: [
        {
          role: 'system',
          content: `You are a professional technical analyst assistant. Provide concise, actionable analysis based on technical indicators. 
          
Key guidelines:
- Be specific about what the indicators suggest
- Mention key support/resistance levels if applicable
- Provide a clear outlook (bullish, bearish, or neutral)
- Include potential entry/exit points when relevant
- Keep response under 200 words
- Use professional but accessible language
- NEVER provide financial advice or guarantee outcomes
- Always mention this is technical analysis only, not investment advice`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || 'Unable to generate analysis.';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(
  asset: { symbol: string; name: string; price: number; changePercent24h: number; type: string },
  indicators: Array<{ name: string; value: number; signal: string; description: string }>,
  signal: { overall: string; score: number; bullishCount: number; bearishCount: number },
  prices?: number[]
): string {
  const indicatorSummary = indicators
    .map(i => `- ${i.name}: ${i.value} (${i.signal}) - ${i.description}`)
    .join('\n');

  const priceContext = prices && prices.length > 0
    ? `Recent price range: $${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
    : '';

  return `
Analyze the following ${asset.type === 'crypto' ? 'cryptocurrency' : 'stock'}:

**${asset.symbol} - ${asset.name}**
- Current Price: $${asset.price.toFixed(2)}
- 24h Change: ${asset.changePercent24h >= 0 ? '+' : ''}${asset.changePercent24h.toFixed(2)}%
${priceContext}

**Technical Indicators:**
${indicatorSummary}

**Combined Signal:**
- Overall: ${signal.overall.toUpperCase().replace('_', ' ')}
- Score: ${signal.score}/100
- Bullish indicators: ${signal.bullishCount}
- Bearish indicators: ${signal.bearishCount}

Please provide a brief technical analysis and outlook based on these indicators.
`.trim();
}
