# SignalPulse - Trading Signal Dashboard

A personal trading intelligence dashboard that monitors stocks and cryptocurrencies with technical indicators, AI-powered analysis, and actionable buy/sell signals.

## ✨ Features

### 📊 Real-Time Market Data
- **Crypto**: Live data from CoinGecko API (free, no key required)
- **Stocks**: Real-time quotes from Finnhub API (free tier: 60 calls/min)
- 7-day sparkline charts for quick trend visualization
- Auto-refresh every 60 seconds

### 📈 Technical Indicators (All Toggleable)

| Indicator | Description |
|-----------|-------------|
| **RSI** | Relative Strength Index - Oversold (<30) / Overbought (>70) |
| **MACD** | Moving Average Convergence Divergence |
| **Bollinger Bands** | Price position within volatility bands |
| **SMA Crossover** | 50/200 day moving average (Golden/Death Cross) |
| **Volume Analysis** | Current vs 20-day average volume |
| **Momentum** | Rate of price change |
| **Stochastic** | Price position within recent range |
| **ATR** | Average True Range volatility measure |

### 🎯 Signal System
- **Combined Score**: -100 to +100 based on weighted indicator analysis
- **Signal Levels**: Strong Buy → Buy → Neutral → Sell → Strong Sell
- **Visual Gauge**: Animated SVG gauge showing signal strength
- **Indicator Breakdown**: See which indicators are bullish/bearish

### 🤖 AI-Powered Analysis (OpenAI)
- **Chat Assistant**: Ask questions about market trends, specific assets, or indicator meanings
- **Asset Analysis**: Generate AI analysis for any asset based on current indicators
- Example queries:
  - "Which assets have strong buy signals?"
  - "Explain what RSI means"
  - "Compare BTC and ETH"

### ⭐ Additional Features
- Watchlist with localStorage persistence
- Search for any crypto or stock
- Dark terminal aesthetic with smooth animations
- Responsive design for mobile and desktop

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your API keys to .env.local (see below)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env.local` file:

```env
# Required for stock data (free: https://finnhub.io/)
FINNHUB_API_KEY=your_finnhub_api_key

# Required for AI features (https://platform.openai.com/)
OPENAI_API_KEY=your_openai_api_key

# Optional: For Supabase integration (see supabase/ folder)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🔧 API Rate Limits

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **CoinGecko** | 30 calls/min | No API key needed |
| **Finnhub** | 60 calls/min | Free account required |
| **OpenAI** | Pay-per-use | ~$0.001 per analysis |

## 📁 Project Structure

```
trading-signals/
├── src/
│   ├── app/
│   │   ├── api/            # API routes (stocks, AI)
│   │   ├── globals.css     # Terminal theme styles
│   │   ├── layout.tsx
│   │   └── page.tsx        # Main dashboard
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── indicators/         # Technical indicator calculations
│   ├── lib/                # Utilities and API clients
│   └── types/              # TypeScript definitions
├── supabase/               # Database schema (optional)
│   └── migrations/
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI**: OpenAI GPT-4o-mini
- **APIs**: CoinGecko, Finnhub

## 🛠️ Adding New Indicators

```typescript
// src/indicators/index.ts
export const NewIndicator: Indicator = {
  id: 'new_indicator',
  name: 'New Indicator',
  shortName: 'NEW',
  description: 'What it measures',
  enabled: false,
  calculate: (prices: number[], volumes?: number[]): IndicatorResult => {
    return {
      name: 'New Indicator',
      value: calculatedValue,
      signal: 'buy' | 'sell' | 'neutral' | 'strong_buy' | 'strong_sell',
      description: 'Human-readable explanation',
    };
  }
};
// Add to ALL_INDICATORS array
```

## 🗄️ Supabase Setup (Optional)

For persistent data (watchlists, signal history, alerts):

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql`
3. Add your Supabase URL and anon key to `.env.local`

## 🗺️ Roadmap

- [x] Real-time crypto data (CoinGecko)
- [x] Real-time stock data (Finnhub)
- [x] 8 Technical indicators
- [x] AI Chat assistant (OpenAI)
- [x] AI Asset analysis
- [x] Watchlist (localStorage)
- [ ] Supabase integration (auth, sync)
- [ ] Price/signal alerts
- [ ] Telegram bot notifications
- [ ] Backtesting engine
- [ ] Portfolio tracking

## 📄 License

MIT License - Feel free to use for personal or commercial projects.
