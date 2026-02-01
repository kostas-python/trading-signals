import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketSentiment } from '@/lib/sentiment-api';
import { createCompletion } from '@/lib/ai-client';
import { AI_MODELS } from '@/lib/ai-config';
import { 
  sendTelegramMessage, 
  formatAlertMessage, 
  checkAlertConditions 
} from '@/lib/telegram-bot';
import {
  getAlertConfig,
  addAlertToHistory,
  canSendAlert,
  saveMarketSnapshot,
} from '@/lib/supabase-alerts';

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if not configured (development)
  
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

// This endpoint should be called by a cron job every 15-30 minutes
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get alert configuration
    const config = await getAlertConfig('default');
    
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 500 });
    }

    if (!config.telegram_enabled) {
      return NextResponse.json({ message: 'Telegram alerts disabled' });
    }

    const chatId = config.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({ error: 'No chat ID configured' }, { status: 500 });
    }

    // Check if enough time has passed since last alert
    const canSend = await canSendAlert('default', config.min_minutes_between_alerts);
    if (!canSend) {
      return NextResponse.json({ 
        message: 'Rate limited - too soon since last alert',
        nextAlertIn: `${config.min_minutes_between_alerts} minutes minimum`
      });
    }

    // Fetch current market sentiment
    console.log('Fetching market sentiment...');
    const sentiment = await fetchMarketSentiment('BTCUSDT');

    // Save market snapshot for historical tracking
    await saveMarketSnapshot({
      fear_greed_value: sentiment.fearGreed?.value ?? null,
      fear_greed_classification: sentiment.fearGreed?.classification ?? null,
      funding_rate: sentiment.fundingRate?.ratePercent ?? null,
      long_short_ratio: sentiment.longShortRatio?.ratio ?? null,
      long_percent: sentiment.longShortRatio?.longPercent ?? null,
      short_percent: sentiment.longShortRatio?.shortPercent ?? null,
      open_interest_usd: sentiment.openInterest?.openInterestUSD ?? null,
      btc_price: sentiment.price?.current ?? null,
      btc_change_24h: sentiment.price?.change24h ?? null,
      btc_volume_24h: null,
      overall_signal: sentiment.overallSignal ?? null,
      overall_score: sentiment.overallScore ?? null,
    });

    // Check if alert conditions are met
    const alertCheck = checkAlertConditions(config, {
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
          priceChange24h: sentiment.price?.change24h,
        },
        thresholds: {
          fearGreedBuy: config.fear_greed_buy_threshold,
          fearGreedSell: config.fear_greed_sell_threshold,
          fundingHigh: config.funding_rate_high_threshold,
          fundingLow: config.funding_rate_low_threshold,
          longShortHigh: config.long_short_high_threshold,
          longShortLow: config.long_short_low_threshold,
        }
      });
    }

    // Generate AI analysis if enabled
    let aiAnalysis: string | undefined;
    if (config.ai_analysis_enabled) {
      try {
        const modelConfig = AI_MODELS[config.ai_model] || AI_MODELS['llama-3.3-70b'];
        
        const result = await createCompletion({
          model: modelConfig.id,
          messages: [
            {
              role: 'system',
              content: `You are a crypto market analyst providing brief, actionable insights. 
Be direct and specific. Maximum 2-3 sentences.
Focus on what traders should DO based on the data.`,
            },
            {
              role: 'user',
              content: `Alert triggered: ${alertCheck.reason}

Current Market Data:
- Fear & Greed Index: ${sentiment.fearGreed?.value ?? 'N/A'} (${sentiment.fearGreed?.classification ?? 'N/A'})
- Funding Rate: ${sentiment.fundingRate?.ratePercent?.toFixed(4) ?? 'N/A'}%
- Long/Short Ratio: ${sentiment.longShortRatio?.ratio?.toFixed(2) ?? 'N/A'} (${sentiment.longShortRatio?.longPercent?.toFixed(1) ?? 'N/A'}% Long)
- BTC Price: $${sentiment.price?.current?.toLocaleString() ?? 'N/A'}
- 24h Change: ${sentiment.price?.change24h?.toFixed(2) ?? 'N/A'}%

What's the recommended action?`,
            },
          ],
          temperature: 0.3,
          maxTokens: 150,
        });
        
        aiAnalysis = result.content;
        console.log('AI Analysis generated:', aiAnalysis);
      } catch (e) {
        console.error('AI analysis failed:', e);
      }
    }

    // Format the alert message
    const message = formatAlertMessage(alertCheck.alertType, {
      triggerReason: alertCheck.reason,
      fearGreed: sentiment.fearGreed ? {
        value: sentiment.fearGreed.value,
        classification: sentiment.fearGreed.classification,
      } : undefined,
      fundingRate: sentiment.fundingRate?.ratePercent,
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

    // Send the Telegram message
    console.log('Sending Telegram alert...');
    const result = await sendTelegramMessage({
      chatId,
      text: message,
      parseMode: 'HTML',
    });

    // Save alert to history
    await addAlertToHistory({
      user_id: 'default',
      alert_type: alertCheck.alertType,
      trigger_reason: alertCheck.reason,
      fear_greed_value: sentiment.fearGreed?.value ?? null,
      funding_rate: sentiment.fundingRate?.ratePercent ?? null,
      long_short_ratio: sentiment.longShortRatio?.ratio ?? null,
      btc_price: sentiment.price?.current ?? null,
      btc_change_24h: sentiment.price?.change24h ?? null,
      ai_analysis: aiAnalysis ?? null,
      ai_model_used: config.ai_analysis_enabled ? config.ai_model : null,
      telegram_sent: result.success,
      telegram_message_id: result.messageId ?? null,
      telegram_error: result.error ?? null,
    });

    return NextResponse.json({
      success: result.success,
      alertType: alertCheck.alertType,
      reason: alertCheck.reason,
      messageId: result.messageId,
      error: result.error,
    });

  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check alerts' },
      { status: 500 }
    );
  }
}

// Allow manual trigger via POST (for testing)
export async function POST(request: NextRequest) {
  // For manual triggers, don't check cron secret but require body
  try {
    const body = await request.json();
    const forceAlert = body.force === true;

    if (forceAlert) {
      // Force send an alert regardless of conditions
      const sentiment = await fetchMarketSentiment('BTCUSDT');
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!chatId) {
        return NextResponse.json({ error: 'No chat ID configured' }, { status: 500 });
      }

      const message = formatAlertMessage('INFO', {
        triggerReason: 'Manual test alert',
        fearGreed: sentiment.fearGreed ? {
          value: sentiment.fearGreed.value,
          classification: sentiment.fearGreed.classification,
        } : undefined,
        fundingRate: sentiment.fundingRate?.ratePercent,
        longShortRatio: sentiment.longShortRatio ? {
          ratio: sentiment.longShortRatio.ratio,
          longPercent: sentiment.longShortRatio.longPercent,
        } : undefined,
        price: sentiment.price ? {
          current: sentiment.price.current,
          change24h: sentiment.price.change24h,
        } : undefined,
        aiAnalysis: '🧪 This is a manual test alert to verify your configuration.',
      });

      const result = await sendTelegramMessage({
        chatId,
        text: message,
        parseMode: 'HTML',
      });

      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }

    // Otherwise, run normal check
    return GET(request);

  } catch (error) {
    console.error('Manual alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send manual alert' },
      { status: 500 }
    );
  }
}