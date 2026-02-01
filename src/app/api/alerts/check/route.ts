import { NextResponse } from 'next/server';
import { fetchMarketSentiment } from '@/lib/sentiment-api';
import { createCompletion } from '@/lib/ai-client';
import { AI_MODELS } from '@/lib/ai-config';
import {
  sendTelegramMessage,
  formatAlertMessage,
  shouldSendAlert,
} from '@/lib/telegram-bot';
import {
  getAlertConfig,
  canSendAlert,
  setLastAlertTime,
  addAlertToHistory,
} from '@/lib/alert-storage';

// This endpoint should be called by a cron job every 15-30 minutes
export async function GET() {
  try {
    const config = getAlertConfig();
    
    if (!config.enabled) {
      return NextResponse.json({ message: 'Alerts disabled' });
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({ error: 'TELEGRAM_CHAT_ID not configured' }, { status: 500 });
    }

    // Check if enough time has passed since last alert
    if (!canSendAlert(config.minTimeBetweenAlerts)) {
      return NextResponse.json({ message: 'Too soon since last alert' });
    }

    // Fetch current market sentiment
    const sentiment = await fetchMarketSentiment('BTCUSDT');

    // Check if we should send an alert
    const alertCheck = shouldSendAlert(config, {
      fearGreed: sentiment.fearGreed?.value,
      fundingRate: sentiment.fundingRate?.ratePercent,
      longShortRatio: sentiment.longShortRatio?.ratio,
      priceChange24h: sentiment.price?.change24h,
    });

    if (!alertCheck.shouldSend) {
      return NextResponse.json({ 
        message: 'No alert conditions met',
        currentData: {
          fearGreed: sentiment.fearGreed?.value,
          fundingRate: sentiment.fundingRate?.ratePercent,
          longShortRatio: sentiment.longShortRatio?.ratio,
        }
      });
    }

    // Generate AI analysis if enabled
    let aiAnalysis: string | undefined;
    if (config.aiAnalysis) {
      try {
        const result = await createCompletion({
          model: AI_MODELS['llama-3.3-70b'].id,
          messages: [
            {
              role: 'system',
              content: `You are a crypto market analyst. Provide a brief (2-3 sentences) actionable analysis based on the market data. Be direct about whether to buy, sell, or wait.`,
            },
            {
              role: 'user',
              content: `Current market conditions:
- Fear & Greed Index: ${sentiment.fearGreed?.value} (${sentiment.fearGreed?.classification})
- Funding Rate: ${sentiment.fundingRate?.ratePercent?.toFixed(4)}%
- Long/Short Ratio: ${sentiment.longShortRatio?.ratio?.toFixed(2)} (${sentiment.longShortRatio?.longPercent?.toFixed(1)}% Long)
- BTC Price: $${sentiment.price?.current?.toLocaleString()}
- 24h Change: ${sentiment.price?.change24h?.toFixed(2)}%

Alert triggered because: ${alertCheck.reason}

What should traders do?`,
            },
          ],
          temperature: 0.3,
          maxTokens: 150,
        });
        aiAnalysis = result.content;
      } catch (e) {
        console.error('AI analysis failed:', e);
      }
    }

    // Format and send the alert
    const message = formatAlertMessage(alertCheck.alertType, {
      fearGreed: sentiment.fearGreed ? {
        value: sentiment.fearGreed.value,
        classification: sentiment.fearGreed.classification,
      } : undefined,
      fundingRate: sentiment.fundingRate ? {
        ratePercent: sentiment.fundingRate.ratePercent,
      } : undefined,
      longShortRatio: sentiment.longShortRatio ? {
        ratio: sentiment.longShortRatio.ratio,
        longPercent: sentiment.longShortRatio.longPercent,
      } : undefined,
      price: sentiment.price ? {
        current: sentiment.price.current,
        change24h: sentiment.price.change24h,
      } : undefined,
      aiAnalysis,
    });

    const sent = await sendTelegramMessage({
      chatId,
      text: message,
      parseMode: 'HTML',
    });

    if (sent) {
      setLastAlertTime(Date.now());
      addAlertToHistory({
        timestamp: Date.now(),
        alertType: alertCheck.alertType,
        reason: alertCheck.reason,
        sent: true,
      });
    }

    return NextResponse.json({
      success: sent,
      alertType: alertCheck.alertType,
      reason: alertCheck.reason,
    });
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    );
  }
}