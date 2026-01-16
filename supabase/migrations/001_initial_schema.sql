-- SignalPulse Database Schema
-- Run this in Supabase SQL Editor or via migrations

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Watchlists table
create table if not exists public.watchlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  asset_id text not null,
  asset_type text check (asset_type in ('crypto', 'stock')) not null,
  symbol text not null,
  name text not null,
  created_at timestamptz default now() not null,
  
  -- Ensure unique asset per user
  unique(user_id, asset_id, asset_type)
);

-- Signal history table (for tracking signals over time)
create table if not exists public.signal_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  asset_id text not null,
  asset_type text check (asset_type in ('crypto', 'stock')) not null,
  symbol text not null,
  price numeric not null,
  signal text not null,
  score integer not null,
  indicators jsonb not null default '[]'::jsonb,
  recorded_at timestamptz default now() not null
);

-- Alerts table
create table if not exists public.alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  asset_id text not null,
  asset_type text check (asset_type in ('crypto', 'stock')) not null,
  symbol text not null,
  alert_type text check (alert_type in ('price_above', 'price_below', 'signal_buy', 'signal_sell')) not null,
  threshold numeric,
  enabled boolean default true not null,
  triggered_at timestamptz,
  created_at timestamptz default now() not null
);

-- User settings table
create table if not exists public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  enabled_indicators text[] default array['rsi', 'macd', 'bollinger', 'sma_cross', 'volume']::text[],
  telegram_chat_id text,
  telegram_enabled boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance
create index if not exists idx_watchlists_user_id on public.watchlists(user_id);
create index if not exists idx_signal_history_user_id on public.signal_history(user_id);
create index if not exists idx_signal_history_asset on public.signal_history(asset_id, asset_type);
create index if not exists idx_signal_history_recorded_at on public.signal_history(recorded_at desc);
create index if not exists idx_alerts_user_id on public.alerts(user_id);
create index if not exists idx_alerts_enabled on public.alerts(enabled) where enabled = true;

-- Row Level Security (RLS)
alter table public.watchlists enable row level security;
alter table public.signal_history enable row level security;
alter table public.alerts enable row level security;
alter table public.user_settings enable row level security;

-- RLS Policies - Users can only access their own data
create policy "Users can view own watchlists" on public.watchlists
  for select using (auth.uid() = user_id);

create policy "Users can insert own watchlists" on public.watchlists
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own watchlists" on public.watchlists
  for delete using (auth.uid() = user_id);

create policy "Users can view own signal history" on public.signal_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own signal history" on public.signal_history
  for insert with check (auth.uid() = user_id);

create policy "Users can view own alerts" on public.alerts
  for select using (auth.uid() = user_id);

create policy "Users can insert own alerts" on public.alerts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own alerts" on public.alerts
  for update using (auth.uid() = user_id);

create policy "Users can delete own alerts" on public.alerts
  for delete using (auth.uid() = user_id);

create policy "Users can view own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for user_settings updated_at
create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row execute function update_updated_at();

-- Function to clean old signal history (keep last 30 days)
create or replace function cleanup_old_signals()
returns void as $$
begin
  delete from public.signal_history
  where recorded_at < now() - interval '30 days';
end;
$$ language plpgsql;
