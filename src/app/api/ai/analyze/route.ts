import { NextRequest, NextResponse } from 'next/server';
import { createCompletion } from '@/lib/ai-client';
import { fetchMarketSentiment } from '@/lib/sentiment-api';
import { AI_MODELS, DEFAULT_MODEL } from '@/lib/ai-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { asset, indicators, signal, prices, model: modelKey } = body;

    if (!asset || !indicators) {
      return NextResponse.json(
        { error: 'Asset and indicators data required' },
        { status: 400 }
      );
    }

    // Get model configuration
    const modelConfig = AI_MODELS[modelKey] || AI_MODELS[DEFAULT_MODEL];
    const modelId = modelConfig.id;

    // Fetch market sentiment for crypto assets
    let sentimentData = null;
    if (asset.type === 'crypto') {
      try {
        sentimentData = await fetchMarketSentiment('BTCUSDT');
      } catch (e) {
        console.error('Failed to fetch sentiment:', e);
      }
    }

    // Build prompt with market data context
    const prompt = buildAnalysisPrompt(asset, indicators, signal, prices, sentimentData);

    const systemPrompt = `You are a professional technical and sentiment market analyst.

Your task is to analyze the provided market data, technical indicators, AND market sentiment data to produce a concise, actionable analysis.

Rules:
- Base your analysis strictly on the provided data
- Consider BOTH technical indicators AND market sentiment
- Market sentiment indicators are CONTRARIAN:
  * Fear & Greed below 25 = Extreme Fear = potential buying opportunity
  * Fear & Greed above 75 = Extreme Greed = potential selling opportunity
  * High Long/Short ratio (>2.0) = crowded long = risk of liquidation cascade
  * Low Long/Short ratio (<0.7) = crowded short = short squeeze potential
  * Positive funding = longs pay shorts = slightly bullish bias
  * Negative funding = shorts pay longs = slightly bearish bias
- Do NOT provide financial advice or guarantees

Response format (use these exact section titles):
1. Market Overview (2-3 sentences combining price action and sentiment)
2. Technical Signals (key indicator interpretations)
3. Sentiment Analysis (interpret Fear/Greed, Funding, L/S ratio)
4. Conflicting Signals (if technical and sentiment disagree, explain)
5. Outlook & Key Levels (Bullish/Bearish/Neutral + support/resistance)
6. Risk Factors (1-2 sentences)

Style guidelines:
- Professional but accessible tone
- Be specific with numbers
- Under 250 words total`;

    const result = await createCompletion({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      maxTokens: 400,
    });

    return NextResponse.json({ 
      analysis: result.content,
      model: result.model,
      provider: result.provider,
      sentiment: sentimentData ? {
        fearGreed: sentimentData.fearGreed?.value,
        fundingRate: sentimentData.fundingRate?.ratePercent,
        longShortRatio: sentimentData.longShortRatio?.ratio,
      } : null
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate analysis';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

interface SentimentData {
  fearGreed?: {
    value: number;
    classification: string;
    signal: string;
  } | null;
  fundingRate?: {
    ratePercent: number;
    description: string;
  } | null;
  longShortRatio?: {
    ratio: number;
    longPercent: number;
    shortPercent: number;
    description: string;
  } | null;
  openInterest?: {
    openInterestUSD: number;
  } | null;
  overallSignal: string;
  overallScore: number;
}

function buildAnalysisPrompt(
  asset: { symbol: string; name: string; price: number; changePercent24h: number; type: string },
  indicators: Array<{ name: string; value: number; signal: string; description: string }>,
  signal: { overall: string; score: number; bullishCount: number; bearishCount: number },
  prices?: number[],
  sentiment?: SentimentData | null
): string {
  const indicatorSummary = indicators
    .map(i => `- ${i.name}: ${i.value} (${i.signal}) - ${i.description}`)
    .join('\n');

  const priceContext = prices && prices.length > 0
    ? `Recent price range: $${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
    : '';

  // Build sentiment section
  let sentimentSection = '';
  if (sentiment) {
    sentimentSection = `
**Market Sentiment (Contrarian Indicators):**`;
    
    if (sentiment.fearGreed) {
      sentimentSection += `
- Fear & Greed Index: ${sentiment.fearGreed.value}/100 (${sentiment.fearGreed.classification})
  * Below 25 = Extreme Fear (historically good to buy)
  * Above 75 = Extreme Greed (historically good to sell)`;
    }
    
    if (sentiment.fundingRate) {
      sentimentSection += `
- Funding Rate: ${sentiment.fundingRate.ratePercent >= 0 ? '+' : ''}${sentiment.fundingRate.ratePercent.toFixed(4)}%
  * ${sentiment.fundingRate.description}`;
    }
    
    if (sentiment.longShortRatio) {
      sentimentSection += `
- Long/Short Ratio: ${sentiment.longShortRatio.ratio.toFixed(2)} (${sentiment.longShortRatio.longPercent.toFixed(1)}% Long / ${sentiment.longShortRatio.shortPercent.toFixed(1)}% Short)
  * ${sentiment.longShortRatio.description}
  * Ratio >2.5 = very crowded long, high liquidation risk
  * Ratio <0.7 = very crowded short, squeeze potential`;
    }
    
    if (sentiment.openInterest) {
      sentimentSection += `
- Open Interest: $${(sentiment.openInterest.openInterestUSD / 1e9).toFixed(2)}B`;
    }
    
    sentimentSection += `
- Overall Sentiment Signal: ${sentiment.overallSignal.replace('_', ' ').toUpperCase()} (Score: ${sentiment.overallScore})`;
  }

  return `
Analyze the following ${asset.type === 'crypto' ? 'cryptocurrency' : 'stock'}:

**${asset.symbol} - ${asset.name}**
- Current Price: $${asset.price.toFixed(2)}
- 24h Change: ${asset.changePercent24h >= 0 ? '+' : ''}${asset.changePercent24h.toFixed(2)}%
${priceContext}

**Technical Indicators:**
${indicatorSummary}

**Combined Technical Signal:**
- Overall: ${signal.overall.toUpperCase().replace('_', ' ')}
- Score: ${signal.score}/100
- Bullish indicators: ${signal.bullishCount}
- Bearish indicators: ${signal.bearishCount}
${sentimentSection}

Provide a comprehensive analysis combining technical indicators with market sentiment. Highlight any conflicting signals between technicals and sentiment.
`.trim();
}