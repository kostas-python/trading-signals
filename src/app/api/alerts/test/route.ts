import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, formatAlertMessage } from '@/lib/telegram-bot';
import { fetchMarketSentiment } from '@/lib/sentiment-api';
import { getAlertConfig, addAlertToHistory } from '@/lib/supabase-alerts';

// POST - Send a test alert to verify Telegram connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customChatId = body.chatId;

    // Get config to find chat ID
    const config = await getAlertConfig('default');
    const chatId = customChatId || config?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { 
          error: 'TELEGRAM_BOT_TOKEN not configured',
          help: 'Add TELEGRAM_BOT_TOKEN to your .env.local file'
        },
        { status: 500 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { 
          error: 'No Telegram Chat ID configured',
          help: 'Either set TELEGRAM_CHAT_ID in .env.local or configure it in the dashboard'
        },
        { status: 400 }
      );
    }

    // Fetch real market data for the test
    console.log('Fetching market data for test alert...');
    const sentiment = await fetchMarketSentiment('BTCUSDT');

    // Format test message
    const message = formatAlertMessage('INFO', {
      triggerReason: '🧪 Test Alert - Verifying Connection',
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
      aiAnalysis: '✅ Your Telegram bot is configured correctly! You will receive alerts when market conditions meet your thresholds.',
    });

    // Send the test message
    const result = await sendTelegramMessage({
      chatId,
      text: message,
      parseMode: 'HTML',
    });

    // Log to history
    if (result.success) {
      await addAlertToHistory({
        user_id: 'default',
        alert_type: 'INFO',
        trigger_reason: 'Test alert',
        fear_greed_value: sentiment.fearGreed?.value ?? null,
        funding_rate: sentiment.fundingRate?.ratePercent ?? null,
        long_short_ratio: sentiment.longShortRatio?.ratio ?? null,
        btc_price: sentiment.price?.current ?? null,
        btc_change_24h: sentiment.price?.change24h ?? null,
        ai_analysis: 'Test alert',
        ai_model_used: null,
        telegram_sent: true,
        telegram_message_id: result.messageId ?? null,
        telegram_error: null,
      });
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      chatId: chatId.slice(0, 3) + '***', // Partially hide chat ID
    });

  } catch (error) {
    console.error('Test alert error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test alert' },
      { status: 500 }
    );
  }
}

// GET - Check Telegram configuration status
export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  
  const config = await getAlertConfig('default');
  const dbChatId = config?.telegram_chat_id;

  return NextResponse.json({
    botTokenConfigured: !!botToken,
    chatIdConfigured: !!(envChatId || dbChatId),
    chatIdSource: dbChatId ? 'database' : envChatId ? 'environment' : 'none',
    telegramEnabled: config?.telegram_enabled ?? false,
    setupComplete: !!botToken && !!(envChatId || dbChatId),
    instructions: !botToken ? [
      '1. Create a bot via @BotFather on Telegram',
      '2. Copy the bot token',
      '3. Add TELEGRAM_BOT_TOKEN=your_token to .env.local',
    ] : !(envChatId || dbChatId) ? [
      '1. Start a chat with your bot on Telegram',
      '2. Send any message to the bot',
      '3. Get your chat ID from the dashboard or API',
    ] : [],
  });
}