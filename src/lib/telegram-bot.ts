// Telegram Bot Client for SignalPulse Alerts

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

interface AlertConfig {
  enabled: boolean;
  fearGreedExtreme: boolean;      // Alert on F&G < 20 or > 80
  fundingRateExtreme: boolean;    // Alert on funding > 0.1% or < -0.05%
  longShortExtreme: boolean;      // Alert on L/S > 3.0 or < 0.5
  priceChange: boolean;           // Alert on 24h change > 10%
  aiAnalysis: boolean;            // Include AI analysis in alerts
  minTimeBetweenAlerts: number;   // Minutes between alerts (prevent spam)
}

const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  fearGreedExtreme: true,
  fundingRateExtreme: true,
  longShortExtreme: true,
  priceChange: true,
  aiAnalysis: true,
  minTimeBetweenAlerts: 60, // 1 hour minimum between alerts
};

// Send message via Telegram Bot API
export async function sendTelegramMessage({ chatId, text, parseMode = 'HTML' }: TelegramMessage): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

// Format alert message
export function formatAlertMessage(
  alertType: 'BUY' | 'SELL' | 'CAUTION' | 'INFO',
  data: {
    fearGreed?: { value: number; classification: string };
    fundingRate?: { ratePercent: number };
    longShortRatio?: { ratio: number; longPercent: number };
    price?: { current: number; change24h: number };
    aiAnalysis?: string;
  }
): string {
  const emoji = {
    BUY: '🟢',
    SELL: '🔴',
    CAUTION: '🟡',
    INFO: 'ℹ️',
  };

  let message = `${emoji[alertType]} <b>SignalPulse Alert: ${alertType}</b>\n\n`;
  message += `📅 ${new Date().toLocaleString()}\n\n`;

  if (data.price) {
    message += `<b>💰 BTC Price:</b> $${data.price.current.toLocaleString()}\n`;
    message += `<b>📈 24h Change:</b> ${data.price.change24h >= 0 ? '+' : ''}${data.price.change24h.toFixed(2)}%\n\n`;
  }

  message += `<b>📊 Market Sentiment:</b>\n`;
  
  if (data.fearGreed) {
    const fgEmoji = data.fearGreed.value < 25 ? '😱' : data.fearGreed.value > 75 ? '🤑' : '😐';
    message += `• Fear & Greed: ${fgEmoji} <b>${data.fearGreed.value}</b> (${data.fearGreed.classification})\n`;
  }
  
  if (data.fundingRate) {
    const frEmoji = data.fundingRate.ratePercent > 0.05 ? '⚠️' : data.fundingRate.ratePercent < -0.03 ? '✅' : '➖';
    message += `• Funding Rate: ${frEmoji} ${data.fundingRate.ratePercent >= 0 ? '+' : ''}${data.fundingRate.ratePercent.toFixed(4)}%\n`;
  }
  
  if (data.longShortRatio) {
    const lsEmoji = data.longShortRatio.ratio > 2.5 ? '⚠️' : data.longShortRatio.ratio < 1.0 ? '✅' : '➖';
    message += `• Long/Short: ${lsEmoji} ${data.longShortRatio.ratio.toFixed(2)} (${data.longShortRatio.longPercent.toFixed(1)}% Long)\n`;
  }

  if (data.aiAnalysis) {
    message += `\n<b>🤖 AI Analysis:</b>\n${data.aiAnalysis.slice(0, 500)}${data.aiAnalysis.length > 500 ? '...' : ''}\n`;
  }

  message += `\n<i>⚠️ Not financial advice. DYOR.</i>`;

  return message;
}

// Check if alert should be sent based on config and conditions
export function shouldSendAlert(
  config: AlertConfig,
  data: {
    fearGreed?: number;
    fundingRate?: number;
    longShortRatio?: number;
    priceChange24h?: number;
  }
): { shouldSend: boolean; alertType: 'BUY' | 'SELL' | 'CAUTION' | 'INFO'; reason: string } {
  if (!config.enabled) {
    return { shouldSend: false, alertType: 'INFO', reason: 'Alerts disabled' };
  }

  // Extreme Fear - Strong Buy Signal
  if (config.fearGreedExtreme && data.fearGreed !== undefined && data.fearGreed <= 15) {
    return { shouldSend: true, alertType: 'BUY', reason: `Extreme Fear (F&G: ${data.fearGreed})` };
  }

  // Extreme Greed - Strong Sell Signal
  if (config.fearGreedExtreme && data.fearGreed !== undefined && data.fearGreed >= 85) {
    return { shouldSend: true, alertType: 'SELL', reason: `Extreme Greed (F&G: ${data.fearGreed})` };
  }

  // Very negative funding - Bullish
  if (config.fundingRateExtreme && data.fundingRate !== undefined && data.fundingRate <= -0.05) {
    return { shouldSend: true, alertType: 'BUY', reason: `Negative Funding (${data.fundingRate.toFixed(4)}%)` };
  }

  // Very high funding - Bearish
  if (config.fundingRateExtreme && data.fundingRate !== undefined && data.fundingRate >= 0.1) {
    return { shouldSend: true, alertType: 'SELL', reason: `High Funding (${data.fundingRate.toFixed(4)}%)` };
  }

  // Extremely crowded short - Squeeze potential
  if (config.longShortExtreme && data.longShortRatio !== undefined && data.longShortRatio <= 0.5) {
    return { shouldSend: true, alertType: 'BUY', reason: `Crowded Shorts (L/S: ${data.longShortRatio.toFixed(2)})` };
  }

  // Extremely crowded long - Liquidation risk
  if (config.longShortExtreme && data.longShortRatio !== undefined && data.longShortRatio >= 3.5) {
    return { shouldSend: true, alertType: 'CAUTION', reason: `Crowded Longs (L/S: ${data.longShortRatio.toFixed(2)})` };
  }

  // Large price movement
  if (config.priceChange && data.priceChange24h !== undefined) {
    if (data.priceChange24h <= -10) {
      return { shouldSend: true, alertType: 'BUY', reason: `Large Drop (${data.priceChange24h.toFixed(2)}%)` };
    }
    if (data.priceChange24h >= 15) {
      return { shouldSend: true, alertType: 'CAUTION', reason: `Large Rally (${data.priceChange24h.toFixed(2)}%)` };
    }
  }

  return { shouldSend: false, alertType: 'INFO', reason: 'No extreme conditions' };
}

export { DEFAULT_CONFIG, AlertConfig };