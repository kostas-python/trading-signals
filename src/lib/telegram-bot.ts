// Telegram Bot Client for SignalPulse Alerts

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

// Send message via Telegram Bot API
export async function sendTelegramMessage({ 
  chatId, 
  text, 
  parseMode = 'HTML' 
}: TelegramMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
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

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data.description);
      return { success: false, error: data.description };
    }

    return { 
      success: true, 
      messageId: data.result?.message_id?.toString() 
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send Telegram message:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Format alert message with rich formatting
export function formatAlertMessage(
  alertType: 'BUY' | 'SELL' | 'CAUTION' | 'INFO',
  data: {
    triggerReason: string;
    fearGreed?: { value: number; classification: string };
    fundingRate?: number;
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

  const actionText = {
    BUY: 'Potential Buy Opportunity',
    SELL: 'Consider Taking Profits',
    CAUTION: 'Proceed with Caution',
    INFO: 'Market Update',
  };

  let message = `${emoji[alertType]} <b>SignalPulse: ${actionText[alertType]}</b>\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;
  
  message += `⚡ <b>Trigger:</b> ${data.triggerReason}\n\n`;

  if (data.price) {
    const priceEmoji = data.price.change24h >= 0 ? '📈' : '📉';
    message += `💰 <b>BTC Price:</b> $${data.price.current.toLocaleString()}\n`;
    message += `${priceEmoji} <b>24h:</b> ${data.price.change24h >= 0 ? '+' : ''}${data.price.change24h.toFixed(2)}%\n\n`;
  }

  message += `📊 <b>Market Sentiment:</b>\n`;
  
  if (data.fearGreed) {
    const fgEmoji = data.fearGreed.value <= 20 ? '😱' : data.fearGreed.value >= 80 ? '🤑' : '😐';
    const fgSignal = data.fearGreed.value <= 25 ? '(Contrarian Buy)' : data.fearGreed.value >= 75 ? '(Contrarian Sell)' : '';
    message += `├ Fear & Greed: ${fgEmoji} <b>${data.fearGreed.value}</b> ${data.fearGreed.classification} ${fgSignal}\n`;
  }
  
  if (data.fundingRate !== undefined) {
    const frEmoji = data.fundingRate > 0.05 ? '⚠️' : data.fundingRate < -0.03 ? '✅' : '➖';
    message += `├ Funding Rate: ${frEmoji} ${data.fundingRate >= 0 ? '+' : ''}${data.fundingRate.toFixed(4)}%\n`;
  }
  
  if (data.longShortRatio) {
    const lsEmoji = data.longShortRatio.ratio > 2.5 ? '⚠️' : data.longShortRatio.ratio < 1.0 ? '✅' : '➖';
    const lsWarning = data.longShortRatio.ratio > 3 ? ' (Liquidation Risk!)' : '';
    message += `└ Long/Short: ${lsEmoji} <b>${data.longShortRatio.ratio.toFixed(2)}</b> (${data.longShortRatio.longPercent.toFixed(1)}% Long)${lsWarning}\n`;
  }

  if (data.aiAnalysis) {
    message += `\n🤖 <b>AI Analysis:</b>\n`;
    message += `<i>${data.aiAnalysis.slice(0, 400)}${data.aiAnalysis.length > 400 ? '...' : ''}</i>\n`;
  }

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC\n`;
  message += `<i>⚠️ Not financial advice. DYOR.</i>`;

  return message;
}

// Check alert conditions and determine if alert should be sent
export function checkAlertConditions(
  config: {
    fear_greed_extreme: boolean;
    fear_greed_buy_threshold: number;
    fear_greed_sell_threshold: number;
    funding_rate_extreme: boolean;
    funding_rate_high_threshold: number;
    funding_rate_low_threshold: number;
    long_short_extreme: boolean;
    long_short_high_threshold: number;
    long_short_low_threshold: number;
    price_change_enabled: boolean;
    price_change_threshold: number;
  },
  data: {
    fearGreed?: number;
    fundingRate?: number;
    longShortRatio?: number;
    priceChange24h?: number;
  }
): { shouldSend: boolean; alertType: 'BUY' | 'SELL' | 'CAUTION' | 'INFO'; reason: string } {
  
  // Priority 1: Extreme Fear - Strong Buy Signal
  if (config.fear_greed_extreme && data.fearGreed !== undefined) {
    if (data.fearGreed <= config.fear_greed_buy_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'BUY', 
        reason: `Extreme Fear detected (F&G: ${data.fearGreed})` 
      };
    }
    if (data.fearGreed >= config.fear_greed_sell_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'SELL', 
        reason: `Extreme Greed detected (F&G: ${data.fearGreed})` 
      };
    }
  }

  // Priority 2: Extreme Funding Rates
  if (config.funding_rate_extreme && data.fundingRate !== undefined) {
    if (data.fundingRate <= config.funding_rate_low_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'BUY', 
        reason: `Negative Funding Rate (${data.fundingRate.toFixed(4)}%) - Shorts paying` 
      };
    }
    if (data.fundingRate >= config.funding_rate_high_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'CAUTION', 
        reason: `High Funding Rate (${data.fundingRate.toFixed(4)}%) - Overleveraged longs` 
      };
    }
  }

  // Priority 3: Extreme Long/Short Ratios
  if (config.long_short_extreme && data.longShortRatio !== undefined) {
    if (data.longShortRatio <= config.long_short_low_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'BUY', 
        reason: `Crowded Shorts (L/S: ${data.longShortRatio.toFixed(2)}) - Squeeze potential` 
      };
    }
    if (data.longShortRatio >= config.long_short_high_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'CAUTION', 
        reason: `Crowded Longs (L/S: ${data.longShortRatio.toFixed(2)}) - Liquidation risk` 
      };
    }
  }

  // Priority 4: Large Price Movements
  if (config.price_change_enabled && data.priceChange24h !== undefined) {
    if (data.priceChange24h <= -config.price_change_threshold) {
      return { 
        shouldSend: true, 
        alertType: 'BUY', 
        reason: `Large Price Drop (${data.priceChange24h.toFixed(2)}%)` 
      };
    }
    if (data.priceChange24h >= config.price_change_threshold * 1.5) {
      return { 
        shouldSend: true, 
        alertType: 'CAUTION', 
        reason: `Large Price Rally (${data.priceChange24h.toFixed(2)}%) - Consider taking profits` 
      };
    }
  }

  return { shouldSend: false, alertType: 'INFO', reason: 'No extreme conditions' };
}

// Verify Telegram bot token and chat ID
export async function verifyTelegramConfig(
  botToken: string,
  chatId: string
): Promise<{ valid: boolean; error?: string; botName?: string }> {
  try {
    // Test by getting bot info
    const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botData = await botResponse.json();
    
    if (!botData.ok) {
      return { valid: false, error: 'Invalid bot token' };
    }

    const botName = botData.result?.username;

    // Test by sending a verification message
    const testResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ SignalPulse bot connected successfully!\n\nYou will now receive market alerts when conditions meet your thresholds.',
        parse_mode: 'HTML',
      }),
    });
    
    const testData = await testResponse.json();
    
    if (!testData.ok) {
      return { valid: false, error: `Chat ID error: ${testData.description}` };
    }

    return { valid: true, botName };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: `Network error: ${errorMsg}` };
  }
}

// Get bot info
export async function getBotInfo(): Promise<{ 
  ok: boolean; 
  username?: string; 
  firstName?: string;
  error?: string;
}> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    if (!data.ok) {
      return { ok: false, error: data.description };
    }

    return {
      ok: true,
      username: data.result?.username,
      firstName: data.result?.first_name,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: errorMsg };
  }
}

// Send photo/image via Telegram
export async function sendTelegramPhoto({
  chatId,
  photoUrl,
  caption,
}: {
  chatId: string;
  photoUrl: string;
  caption?: string;
}): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

// Format a quick status update message
export function formatQuickStatus(data: {
  fearGreed: number;
  fundingRate: number;
  longShortRatio: number;
  btcPrice: number;
  change24h: number;
}): string {
  const fgEmoji = data.fearGreed <= 25 ? '🟢' : data.fearGreed >= 75 ? '🔴' : '🟡';
  const priceEmoji = data.change24h >= 0 ? '📈' : '📉';
  
  return `📊 <b>Market Status</b>

💰 BTC: $${data.btcPrice.toLocaleString()} ${priceEmoji} ${data.change24h >= 0 ? '+' : ''}${data.change24h.toFixed(2)}%

${fgEmoji} Fear & Greed: ${data.fearGreed}
⚖️ Funding: ${data.fundingRate >= 0 ? '+' : ''}${data.fundingRate.toFixed(4)}%
📊 L/S Ratio: ${data.longShortRatio.toFixed(2)}

🕐 ${new Date().toLocaleTimeString('en-US', { timeZone: 'UTC' })} UTC`;
}