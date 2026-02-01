// Supabase client for SignalPulse Alerts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for our tables
export interface AlertConfig {
  id: string;
  user_id: string;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
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
  ai_analysis_enabled: boolean;
  ai_model: string;
  min_minutes_between_alerts: number;
  created_at: string;
  updated_at: string;
}

export interface AlertHistory {
  id: string;
  user_id: string;
  alert_type: 'BUY' | 'SELL' | 'CAUTION' | 'INFO';
  trigger_reason: string;
  fear_greed_value: number | null;
  funding_rate: number | null;
  long_short_ratio: number | null;
  btc_price: number | null;
  btc_change_24h: number | null;
  ai_analysis: string | null;
  ai_model_used: string | null;
  telegram_sent: boolean;
  telegram_message_id: string | null;
  telegram_error: string | null;
  created_at: string;
}

export interface MarketSnapshot {
  id: string;
  fear_greed_value: number | null;
  fear_greed_classification: string | null;
  funding_rate: number | null;
  long_short_ratio: number | null;
  long_percent: number | null;
  short_percent: number | null;
  open_interest_usd: number | null;
  btc_price: number | null;
  btc_change_24h: number | null;
  btc_volume_24h: number | null;
  overall_signal: string | null;
  overall_score: number | null;
  created_at: string;
}

// Lazy initialize Supabase client
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured - using fallback storage');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// =============================================
// Alert Config Functions
// =============================================

export async function getAlertConfig(userId: string = 'default'): Promise<AlertConfig | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    // Return default config if Supabase not available
    return getDefaultConfig(userId);
  }

  const { data, error } = await supabase
    .from('signalpulse_alert_configs')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching alert config:', error);
    // Create default config if not exists
    if (error.code === 'PGRST116') {
      return await createDefaultConfig(userId);
    }
    return getDefaultConfig(userId);
  }

  return data;
}

export async function updateAlertConfig(
  userId: string = 'default',
  updates: Partial<AlertConfig>
): Promise<AlertConfig | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.warn('Supabase not configured - config not saved');
    return null;
  }

  const { data, error } = await supabase
    .from('signalpulse_alert_configs')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating alert config:', error);
    return null;
  }

  return data;
}

async function createDefaultConfig(userId: string): Promise<AlertConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return getDefaultConfig(userId);

  const { data, error } = await supabase
    .from('signalpulse_alert_configs')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('Error creating default config:', error);
    return getDefaultConfig(userId);
  }

  return data;
}

function getDefaultConfig(userId: string): AlertConfig {
  return {
    id: 'default',
    user_id: userId,
    telegram_enabled: false,
    telegram_chat_id: null,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// =============================================
// Alert History Functions
// =============================================

export async function addAlertToHistory(
  alert: Omit<AlertHistory, 'id' | 'created_at'>
): Promise<AlertHistory | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.warn('Supabase not configured - alert not saved to history');
    return null;
  }

  const { data, error } = await supabase
    .from('signalpulse_alert_history')
    .insert(alert)
    .select()
    .single();

  if (error) {
    console.error('Error adding alert to history:', error);
    return null;
  }

  return data;
}

export async function getAlertHistory(
  userId: string = 'default',
  limit: number = 50
): Promise<AlertHistory[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('signalpulse_alert_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching alert history:', error);
    return [];
  }

  return data || [];
}

export async function getLastAlertTime(userId: string = 'default'): Promise<Date | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('signalpulse_alert_history')
    .select('created_at')
    .eq('user_id', userId)
    .eq('telegram_sent', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.created_at);
}

export async function canSendAlert(
  userId: string = 'default',
  minMinutesBetween: number = 60
): Promise<boolean> {
  const lastAlert = await getLastAlertTime(userId);
  
  if (!lastAlert) {
    return true; // No previous alerts
  }

  const now = new Date();
  const diffMs = now.getTime() - lastAlert.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes >= minMinutesBetween;
}

// =============================================
// Market Snapshot Functions
// =============================================

export async function saveMarketSnapshot(
  snapshot: Omit<MarketSnapshot, 'id' | 'created_at'>
): Promise<MarketSnapshot | null> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('signalpulse_market_snapshots')
    .insert(snapshot)
    .select()
    .single();

  if (error) {
    console.error('Error saving market snapshot:', error);
    return null;
  }

  return data;
}

export async function getMarketSnapshots(
  hours: number = 24,
  limit: number = 100
): Promise<MarketSnapshot[]> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return [];
  }

  const since = new Date();
  since.setHours(since.getHours() - hours);

  const { data, error } = await supabase
    .from('signalpulse_market_snapshots')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching market snapshots:', error);
    return [];
  }

  return data || [];
}

// =============================================
// Utility Functions
// =============================================

export async function getAlertStats(userId: string = 'default'): Promise<{
  totalAlerts: number;
  buyAlerts: number;
  sellAlerts: number;
  cautionAlerts: number;
  last24h: number;
  last7d: number;
}> {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    return { totalAlerts: 0, buyAlerts: 0, sellAlerts: 0, cautionAlerts: 0, last24h: 0, last7d: 0 };
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all alerts for user
  const { data: allAlerts } = await supabase
    .from('signalpulse_alert_history')
    .select('alert_type, created_at')
    .eq('user_id', userId)
    .eq('telegram_sent', true);

  if (!allAlerts) {
    return { totalAlerts: 0, buyAlerts: 0, sellAlerts: 0, cautionAlerts: 0, last24h: 0, last7d: 0 };
  }

  return {
    totalAlerts: allAlerts.length,
    buyAlerts: allAlerts.filter(a => a.alert_type === 'BUY').length,
    sellAlerts: allAlerts.filter(a => a.alert_type === 'SELL').length,
    cautionAlerts: allAlerts.filter(a => a.alert_type === 'CAUTION').length,
    last24h: allAlerts.filter(a => new Date(a.created_at) >= yesterday).length,
    last7d: allAlerts.filter(a => new Date(a.created_at) >= lastWeek).length,
  };
}