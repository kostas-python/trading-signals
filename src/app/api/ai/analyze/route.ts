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
  content: `
You are a professional technical market analyst.

Your task is to analyze the provided market data and technical indicators and produce a concise, structured technical analysis.

Rules:
- Base your analysis strictly on the provided data
- Do NOT speculate beyond the indicators
- Do NOT provide financial advice or guarantees
- This is technical analysis only

Response format (use these exact section titles):
1. Market Overview (1–2 sentences)
2. Indicator Interpretation (key signals only)
3. Key Levels (support / resistance if inferable)
4. Technical Outlook (Bullish / Bearish / Neutral)
5. Risk Notes (1 short sentence)

Style guidelines:
- Professional, neutral tone
- Clear and direct language
- No emojis
- Under 180 words total
`
},
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
max_tokens: 300,

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
