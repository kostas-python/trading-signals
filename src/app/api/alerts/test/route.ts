import { NextResponse } from 'next/server';
import { sendTelegramMessage, formatAlertMessage } from '@/lib/telegram-bot';
import { fetchMarketSentiment } from '@/lib/sentiment-api';

// Send a test alert to verify Telegram connection
export async function POST() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!chatId || !botToken) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch real data for the test
    const sentiment = await fetchMarketSentiment('BTCUSDT');

    const message = formatAlertMessage('INFO', {
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
      aiAnalysis: '🧪 This is a TEST alert to verify your Telegram connection is working correctly!',
    });

    const sent = await sendTelegramMessage({
      chatId,
      text: message,
      parseMode: 'HTML',
    });

    return NextResponse.json({ success: sent });
  } catch (error) {
    console.error('Test alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send test alert' },
      { status: 500 }
    );
  }
}