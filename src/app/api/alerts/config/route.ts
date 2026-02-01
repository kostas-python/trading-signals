import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, updateAlertConfig } from '@/lib/supabase-alerts';
import { verifyTelegramConfig } from '@/lib/telegram-bot';

// GET - Retrieve current alert configuration
export async function GET() {
  try {
    const config = await getAlertConfig('default');
    
    if (!config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    // Don't expose sensitive data
    return NextResponse.json({
      ...config,
      telegram_chat_id: config.telegram_chat_id ? '***configured***' : null,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

// POST - Update alert configuration
export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    
    // Validate thresholds
    if (updates.fear_greed_buy_threshold !== undefined) {
      if (updates.fear_greed_buy_threshold < 0 || updates.fear_greed_buy_threshold > 100) {
        return NextResponse.json(
          { error: 'Fear & Greed buy threshold must be 0-100' },
          { status: 400 }
        );
      }
    }

    if (updates.fear_greed_sell_threshold !== undefined) {
      if (updates.fear_greed_sell_threshold < 0 || updates.fear_greed_sell_threshold > 100) {
        return NextResponse.json(
          { error: 'Fear & Greed sell threshold must be 0-100' },
          { status: 400 }
        );
      }
    }

    if (updates.min_minutes_between_alerts !== undefined) {
      if (updates.min_minutes_between_alerts < 5) {
        return NextResponse.json(
          { error: 'Minimum time between alerts must be at least 5 minutes' },
          { status: 400 }
        );
      }
    }

    // If enabling Telegram and setting chat ID, verify the configuration
    if (updates.telegram_enabled && updates.telegram_chat_id) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json(
          { error: 'TELEGRAM_BOT_TOKEN not configured on server' },
          { status: 500 }
        );
      }

      const verification = await verifyTelegramConfig(botToken, updates.telegram_chat_id);
      if (!verification.valid) {
        return NextResponse.json(
          { error: `Telegram verification failed: ${verification.error}` },
          { status: 400 }
        );
      }
    }

    const newConfig = await updateAlertConfig('default', updates);
    
    if (!newConfig) {
      return NextResponse.json(
        { error: 'Failed to update config' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        ...newConfig,
        telegram_chat_id: newConfig.telegram_chat_id ? '***configured***' : null,
      },
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

// PUT - Reset to default configuration
export async function PUT() {
  try {
    const defaultConfig = {
      telegram_enabled: false,
      fear_greed_extreme: true,
      fear_greed_buy_threshold: 15,
      fear_greed_sell_threshold: 85,
      funding_rate_extreme: true,
      funding_rate_high_threshold: 0.1,
      funding_rate_low_threshold: -0.05,
      long_short_extreme: true,
      long_short_high_threshold: 3.5,
      long_short_low_threshold: 0.5,
      price_change_enabled: true,
      price_change_threshold: 10,
      ai_analysis_enabled: true,
      ai_model: 'llama-3.3-70b',
      min_minutes_between_alerts: 60,
    };

    const newConfig = await updateAlertConfig('default', defaultConfig);
    
    return NextResponse.json({
      success: true,
      message: 'Config reset to defaults',
      config: newConfig,
    });
  } catch (error) {
    console.error('Error resetting config:', error);
    return NextResponse.json(
      { error: 'Failed to reset config' },
      { status: 500 }
    );
  }
}