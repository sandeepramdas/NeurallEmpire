# 🚀 Zerodha 7-Layer Professional Options Trading System

## Overview

A sophisticated, institutional-grade options trading system built into NeurallEmpire with a mandatory **Writer Ratio Filter** that ensures trades are only executed when institutional money (option writers) is positioned favorably.

---

## 🎯 System Architecture

### Backend: 7-Layer Trading Strategy

Each trade goes through 7 layers of analysis. **Layer 5 is the CRITICAL GATEKEEPER** - all trades MUST pass this layer.

#### **Layer 1: Market Regime Detection**
- Analyzes overall market conditions (trending/ranging/volatile)
- VIX level categorization
- Trend direction and strength using ADX
- Technical indicators (EMA, RSI, MACD)
- **Score Output**: 0-100

#### **Layer 2: Price Action Analysis**
- Identifies supply/demand zones
- Institutional order blocks
- Fair Value Gaps (FVG)
- Liquidity sweeps and structure breaks
- **Score Output**: 0-100

#### **Layer 3: Multi-Timeframe Alignment**
- Ensures 1H, 15M, and 5M timeframes are aligned
- Confluence zone detection
- Entry timing optimization
- **Score Output**: 0-100

#### **Layer 4: Volatility Analysis**
- VIX analysis and trend
- IV Percentile calculation
- IV vs HV ratio (option pricing)
- Optimal strike selection
- **Score Output**: 0-100

#### **Layer 5: Writer Ratio Filter** ⚠️ **CRITICAL GATEKEEPER**
- **MANDATORY RULE**: Trade only if writer ratio ≥ 2.5x
  - **BUY CALL (CE)**: PUT writers must be 2.5-3x MORE than CALL writers
  - **BUY PUT (PE)**: CALL writers must be 2.5-3x MORE than PUT writers
- Analyzes option chain OI data
- Detects institutional positioning
- **Score Output**: 0-100
- **Pass/Fail**: `writerRatioPassed` boolean

**If Layer 5 fails, the trade is AUTOMATICALLY REJECTED regardless of other layers.**

#### **Layer 6: Risk Regime Filter**
- Time-based restrictions (market open/close, lunch hour)
- Event-based restrictions (major news, RBI policy)
- Market condition checks (circuit breakers, extreme volatility)
- Day-specific filters (expiry day, Monday gaps)
- **Score Output**: 0-100

#### **Layer 7: Portfolio Management**
- Kelly Criterion for position sizing
- Portfolio risk management (max 10% at risk)
- Diversification limits
- Capital allocation optimization
- **Score Output**: 0-100

---

## 📊 Database Schema

Created 8 new models in Prisma:

### Core Models:
1. **TradingSignal** - Generated signals with all 7 layer scores
2. **TradingPosition** - Active trading positions
3. **TradingTrade** - Completed trades with P&L tracking
4. **BacktestResult** - Backtest performance data
5. **WriterRatioSnapshot** - Historical option chain data
6. **OptionChainData** - Real-time option chain
7. **MarketRegime** - Market regime analysis
8. **Enums** - OptionType, SignalType, PositionType, etc.

All models include organization isolation and audit trails.

---

## 🔌 API Endpoints

### Signals
- `POST /api/zerodha/signals` - Generate new trading signal
- `GET /api/zerodha/signals` - List all signals
- `GET /api/zerodha/signals/:id` - Get signal details

### Positions
- `POST /api/zerodha/positions` - Open new position
- `GET /api/zerodha/positions` - List all positions
- `PUT /api/zerodha/positions/:id/close` - Close position

### Trades & Analytics
- `GET /api/zerodha/trades` - Get trade history
- `GET /api/zerodha/dashboard` - Dashboard metrics
- `GET /api/zerodha/writer-ratio/:symbol/:strike` - Get writer ratio

All endpoints require authentication.

---

## 💻 Frontend Dashboard

### Main Dashboard (`/org/:orgSlug/zerodha`)

**Key Metrics:**
- Open Positions count
- Total P&L
- Win Rate
- Total Trades

**Sections:**
1. **Open Positions Table** - Real-time position tracking
2. **Pending Signals** - Approved signals awaiting execution
3. **Recent Trades** - Trade history with P&L

**Navigation:**
- Added "Zerodha Trading" menu item with TrendingUp icon
- Located after Healthcare in sidebar

---

## 🎮 How to Use

### 1. Generate Trading Signal

```bash
POST /api/zerodha/signals
```

**Required Input:**
```javascript
{
  symbol: "NIFTY" | "BANKNIFTY" | "FINNIFTY",
  strike: 19000,
  expiry: "2025-01-30",
  optionType: "CE" | "PE",
  signalType: "BUY_CALL" | "BUY_PUT",

  // Market data for all layers
  marketData: {
    spotPrice: 19050,
    vixLevel: 14.5,
    vixHistory: [14.1, 14.3, ...],
    historicalData: [...],
    oneHourData: [...],
    fifteenMinData: [...],
    fiveMinData: [...]
  },

  // Option chain for Layer 5
  optionChain: {
    strikes: [{
      strike: 19000,
      callOI: 50000,
      putOI: 150000,
      callOIChange: 5000,
      putOIChange: 20000,
      ...
    }],
    atmStrike: 19000,
    targetStrike: 19000
  },

  // Risk data for Layer 6
  riskData: {
    currentTime: "2025-01-22T10:30:00Z",
    marketOpenTime: "2025-01-22T09:15:00Z",
    marketCloseTime: "2025-01-22T15:30:00Z",
    isExpiryDay: false,
    upcomingEvents: [],
    currentVolume: 1500000,
    avgVolume: 1200000,
    circuitBreaker: false,
    dayOfWeek: 3
  },

  // Portfolio data for Layer 7
  portfolioData: {
    totalCapital: 500000,
    availableCapital: 400000,
    openPositions: [],
    tradingHistory: {
      totalTrades: 50,
      winningTrades: 35,
      losingTrades: 15,
      avgWin: 2500,
      avgLoss: 1000,
      profitFactor: 1.75
    },
    riskPerTrade: 2.0,
    maxOpenPositions: 5
  }
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    signal: {
      id: "...",
      status: "APPROVED" | "REJECTED",
      writerRatioPassed: true | false,
      writerRatio: 3.2,
      layer1Score: 85,
      layer2Score: 75,
      layer3Score: 90,
      layer4Score: 80,
      layer5Score: 95,  // ⚠️ Critical
      layer6Score: 85,
      layer7Score: 88
    },
    recommendation: "EXECUTE" | "REJECT" | "WAIT",
    overallScore: 86,
    executionDetails: {
      entryPrice: 150.50,
      target: 195.00,
      stopLoss: 135.00,
      quantity: 100,
      capitalToAllocate: 15050,
      riskAmount: 1550
    }
  }
}
```

### 2. Open Position (if signal approved)

```bash
POST /api/zerodha/positions
```

```javascript
{
  signalId: "signal_id_from_above",
  symbol: "NIFTY",
  strike: 19000,
  expiry: "2025-01-30",
  optionType: "CE",
  positionType: "LONG_CALL",
  entryPrice: 150.50,
  quantity: 100,
  stopLoss: 135.00,
  target: 195.00
}
```

### 3. Close Position

```bash
PUT /api/zerodha/positions/:id/close
```

```javascript
{
  exitPrice: 195.00,
  exitReason: "TARGET"
}
```

---

## ⚠️ Critical Trading Rules

### Writer Ratio Rule (MANDATORY)

**For BUY CALL (CE):**
```
PUT Writers / CALL Writers >= 2.5
```

**Example:**
- Call OI: 50,000 (writers selling calls = bearish)
- Put OI: 150,000 (writers selling puts = bullish)
- Ratio: 150,000 / 50,000 = 3.0x ✅ PASS

This means institutional money is bullish (heavy PUT writing), so buying CALL is favorable.

**For BUY PUT (PE):**
```
CALL Writers / PUT Writers >= 2.5
```

**Example:**
- Call OI: 180,000 (writers selling calls = bearish)
- Put OI: 60,000 (writers selling puts = bullish)
- Ratio: 180,000 / 60,000 = 3.0x ✅ PASS

This means institutional money is bearish (heavy CALL writing), so buying PUT is favorable.

---

## 📁 File Structure

```
backend/
├── prisma/
│   └── schema.prisma                      # +8 new trading models
├── src/
│   ├── controllers/
│   │   └── zerodha.controller.ts          # API request handlers
│   ├── routes/
│   │   └── zerodha.ts                     # Route definitions
│   └── services/
│       └── zerodha/
│           ├── layers/
│           │   ├── layer1-market-regime.service.ts
│           │   ├── layer2-price-action.service.ts
│           │   ├── layer3-multi-timeframe.service.ts
│           │   ├── layer4-volatility.service.ts
│           │   ├── layer5-writer-ratio.service.ts     # ⚠️ CRITICAL
│           │   ├── layer6-risk-regime.service.ts
│           │   └── layer7-portfolio.service.ts
│           └── trading-strategy.service.ts  # Coordinator

frontend/
├── src/
│   ├── pages/
│   │   └── dashboard/
│   │       └── Zerodha.tsx                # Main dashboard
│   ├── services/
│   │   └── zerodha.service.ts             # API client
│   ├── components/
│   │   └── layouts/
│   │       └── DashboardLayout.tsx        # +Zerodha menu item
│   └── App.tsx                            # +Zerodha route
```

---

## 🧪 Testing the System

### Prerequisites
1. Have a logged-in user with authentication token
2. Access to option chain data (NSE, Zerodha Kite, or mock data)
3. Historical price data for the symbol

### Test Flow

1. **Navigate to Dashboard**
   ```
   https://www.neurallempire.com/org/your-org/zerodha
   ```

2. **Generate Signal** (via API or UI)
   - The system will analyze all 7 layers
   - Check writer ratio (Layer 5)
   - If passed, generate approved signal

3. **Monitor Dashboard**
   - View pending signals
   - Check scores for each layer
   - Verify writer ratio passed

4. **Execute Trade** (Paper Trading Recommended Initially)
   - Open position from approved signal
   - Track in Open Positions table
   - Monitor P&L in real-time

5. **Close Position**
   - Close manually or via stop/target
   - Review in Trade History

---

## 📊 Performance Metrics Tracked

- **Per Trade:**
  - Entry/Exit prices
  - P&L (gross and net)
  - ROI %
  - Holding period
  - Writer ratio at entry
  - VIX level at entry
  - All 7 layer scores

- **Overall:**
  - Total trades
  - Win rate
  - Profit factor
  - Max drawdown
  - Average holding period
  - Sharpe ratio (backtest)

---

## 🔒 Risk Management Built-In

1. **Portfolio Risk Limit**: Max 10% of capital at risk
2. **Position Sizing**: Kelly Criterion with 0.25x multiplier
3. **Max Open Positions**: Configurable diversification
4. **Mandatory Stop Loss**: Every position requires SL
5. **Writer Ratio Filter**: Institutional alignment check

---

## 🎯 Next Steps

1. **Data Integration**: Connect real-time option chain data source (NSE/Zerodha)
2. **Paper Trading**: Test strategy with paper money first
3. **Backtesting**: Run historical backtests to validate strategy
4. **Alert System**: Add notifications for approved signals
5. **Auto-Execution**: Integrate with broker API for auto-trading (optional)

---

## 📝 Important Notes

- **Paper trade first** before using real capital
- Writer ratio filter is non-negotiable - respect it
- Review Layer 5 score on every trade
- Monitor VIX levels (high VIX = expensive options)
- Keep position sizes small initially
- Track performance metrics religiously
- Adjust strategy based on actual results

---

## 🆘 Support

- Check Layer 5 logs if trades are rejected
- Verify option chain data is accurate
- Ensure all 7 layer inputs are provided
- Review `statusReason` field on rejected signals

---

**Built with:**
- Backend: TypeScript + Express + Prisma
- Frontend: React + TypeScript + TailwindCSS
- Database: PostgreSQL (Supabase)

**Version**: 1.0.0
**Author**: NeurallEmpire AI System
**Date**: January 2025

---

## ⚡ Quick Command Reference

```bash
# Backend
cd backend
npm run dev                 # Start backend server

# Frontend
cd frontend
npm run dev                 # Start frontend dev server

# Database
cd backend
npx prisma studio          # Open Prisma Studio
npx prisma db push         # Sync schema to database
npx prisma generate        # Generate Prisma Client

# API Testing
# See TESTING_GUIDE.md for complete API test examples
```

---

**🎉 System is ready to use! Access it at `/org/:orgSlug/zerodha` in your NeurallEmpire dashboard.**
