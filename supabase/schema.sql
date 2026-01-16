-- SignalPulse Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Watchlist table: stores user's watched assets
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL DEFAULT 'anonymous', -- Use 'anonymous' for single user, or integrate with Supabase Auth
    asset_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock')),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure no duplicate entries per user
    UNIQUE(user_id, asset_id, asset_type)
);

-- Signal history table: tracks signals over time for analysis
CREATE TABLE IF NOT EXISTS signal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock')),
    symbol TEXT NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    signal_score INTEGER NOT NULL,
    signal_type TEXT NOT NULL,
    indicators JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table: price and signal alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    asset_id TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('crypto', 'stock')),
    symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'signal_buy', 'signal_sell')),
    threshold DECIMAL(20, 8),
    enabled BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_asset ON watchlist(asset_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_signal_history_asset ON signal_history(asset_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_signal_history_created ON signal_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_asset ON alerts(asset_id, asset_type);

-- Enable Row Level Security (optional, for multi-user setup)
-- ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (uncomment if using Supabase Auth)
-- CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid()::text = user_id);
-- CREATE POLICY "Users can insert own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- CREATE POLICY "Users can delete own watchlist" ON watchlist FOR DELETE USING (auth.uid()::text = user_id);

-- Function to clean up old signal history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_signals()
RETURNS void AS $$
BEGIN
    DELETE FROM signal_history WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-signals', '0 0 * * *', 'SELECT cleanup_old_signals()');

-- Sample queries for reference:

-- Get watchlist for a user
-- SELECT * FROM watchlist WHERE user_id = 'anonymous' ORDER BY created_at DESC;

-- Get signal history for an asset (last 7 days)
-- SELECT * FROM signal_history 
-- WHERE asset_id = 'bitcoin' AND asset_type = 'crypto' 
-- AND created_at > NOW() - INTERVAL '7 days'
-- ORDER BY created_at DESC;

-- Get active alerts for a user
-- SELECT * FROM alerts WHERE user_id = 'anonymous' AND enabled = true;

-- Get signal trend (average score per day)
-- SELECT 
--     DATE(created_at) as date,
--     AVG(signal_score) as avg_score,
--     COUNT(*) as readings
-- FROM signal_history
-- WHERE asset_id = 'bitcoin'
-- GROUP BY DATE(created_at)
-- ORDER BY date DESC
-- LIMIT 30;
