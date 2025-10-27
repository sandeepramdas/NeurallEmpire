/**
 * Layer 1: Market Regime Detection
 *
 * Analyzes overall market conditions to determine if trading is favorable.
 * Classifies market into: TRENDING_BULLISH, TRENDING_BEARISH, RANGING, VOLATILE, UNCERTAIN
 *
 * Key Metrics:
 * - Trend direction and strength (ADX, moving averages)
 * - VIX levels (volatility regime)
 * - Market phase detection
 * - Higher timeframe context
 */

import { RegimeType } from '@prisma/client';

export interface MarketRegimeData {
  symbol: string;
  spotPrice: number;
  vixLevel: number;
  historicalData: {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export interface MarketRegimeResult {
  regimeType: RegimeType;
  regimeStrength: number; // 0-100
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  trendStrength: number; // 0-100
  vixLevel: number;
  vixCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  score: number; // 0-100 (Layer 1 score)
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number; // -100 to +100
  indicators: {
    adx: number;
    ema20: number;
    ema50: number;
    ema200: number;
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
  };
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  reason: string;
}

export class MarketRegimeService {

  /**
   * Detect market regime and calculate Layer 1 score
   */
  async detectRegime(data: MarketRegimeData): Promise<MarketRegimeResult> {
    const vixCategory = this.categorizeVIX(data.vixLevel);
    const trend = this.detectTrend(data.historicalData);
    const indicators = this.calculateIndicators(data.historicalData);
    const sentiment = this.calculateSentiment(trend, indicators, data.vixLevel);
    const regimeType = this.classifyRegime(trend, vixCategory, indicators);
    const keyLevels = this.identifyKeyLevels(data.historicalData);

    // Calculate Layer 1 Score (0-100)
    const score = this.calculateRegimeScore(regimeType, trend, vixCategory, indicators);

    return {
      regimeType,
      regimeStrength: this.calculateRegimeStrength(regimeType, trend, indicators),
      trendDirection: trend.direction,
      trendStrength: trend.strength,
      vixLevel: data.vixLevel,
      vixCategory,
      score,
      marketSentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      indicators,
      keyLevels,
      reason: this.explainScore(regimeType, trend, vixCategory, score),
    };
  }

  /**
   * Categorize VIX level
   */
  private categorizeVIX(vix: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (vix < 15) return 'LOW';
    if (vix < 20) return 'MEDIUM';
    if (vix < 30) return 'HIGH';
    return 'EXTREME';
  }

  /**
   * Detect trend direction and strength using ADX and moving averages
   */
  private detectTrend(data: { close: number }[]): { direction: 'UP' | 'DOWN' | 'SIDEWAYS'; strength: number } {
    if (data.length < 50) {
      return { direction: 'SIDEWAYS', strength: 0 };
    }

    const prices = data.map(d => d.close);
    const ema20 = this.calculateEMA(prices, 20);
    const ema50 = this.calculateEMA(prices, 50);
    const currentPrice = prices[prices.length - 1];
    const adx = this.calculateADX(data as any, 14);

    let direction: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';

    if (currentPrice > ema20 && ema20 > ema50) {
      direction = 'UP';
    } else if (currentPrice < ema20 && ema20 < ema50) {
      direction = 'DOWN';
    }

    // ADX > 25 = strong trend, ADX < 20 = weak/ranging
    const strength = Math.min(100, adx * 3.33); // Scale to 0-100

    return { direction, strength };
  }

  /**
   * Calculate technical indicators
   */
  private calculateIndicators(data: { open: number; high: number; low: number; close: number; volume: number }[]) {
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    return {
      adx: this.calculateADX(data, 14),
      ema20: this.calculateEMA(prices, 20),
      ema50: this.calculateEMA(prices, 50),
      ema200: this.calculateEMA(prices, 200),
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
    };
  }

  /**
   * Classify market regime
   */
  private classifyRegime(
    trend: { direction: string; strength: number },
    vixCategory: string,
    indicators: any
  ): RegimeType {
    // High volatility = VOLATILE regime regardless of trend
    if (vixCategory === 'EXTREME' || indicators.adx < 20) {
      return RegimeType.VOLATILE;
    }

    // Strong trend with ADX > 25
    if (trend.strength > 25) {
      if (trend.direction === 'UP') return RegimeType.TRENDING_BULLISH;
      if (trend.direction === 'DOWN') return RegimeType.TRENDING_BEARISH;
    }

    // Weak trend = RANGING
    if (indicators.adx < 25) {
      return RegimeType.RANGING;
    }

    return RegimeType.UNCERTAIN;
  }

  /**
   * Calculate market sentiment
   */
  private calculateSentiment(
    trend: { direction: string; strength: number },
    indicators: any,
    vix: number
  ): { sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; score: number } {
    let score = 0;

    // Trend contribution
    if (trend.direction === 'UP') score += 30;
    else if (trend.direction === 'DOWN') score -= 30;

    // RSI contribution
    if (indicators.rsi > 50) score += 20;
    else if (indicators.rsi < 50) score -= 20;

    // MACD contribution
    if (indicators.macd.histogram > 0) score += 20;
    else if (indicators.macd.histogram < 0) score -= 20;

    // VIX contribution (high VIX = fear = bearish)
    if (vix < 15) score += 15;
    else if (vix > 25) score -= 15;

    // EMA alignment
    if (indicators.ema20 > indicators.ema50) score += 15;
    else if (indicators.ema20 < indicators.ema50) score -= 15;

    const sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      score > 20 ? 'BULLISH' : score < -20 ? 'BEARISH' : 'NEUTRAL';

    return { sentiment, score };
  }

  /**
   * Calculate regime strength
   */
  private calculateRegimeStrength(regime: RegimeType, trend: any, indicators: any): number {
    if (regime === RegimeType.TRENDING_BULLISH || regime === RegimeType.TRENDING_BEARISH) {
      return trend.strength;
    }
    if (regime === RegimeType.RANGING) {
      return 100 - trend.strength; // Strong ranging = low ADX
    }
    return 50; // VOLATILE or UNCERTAIN
  }

  /**
   * Calculate Layer 1 score (0-100)
   * Higher score = more favorable trading conditions
   */
  private calculateRegimeScore(
    regime: RegimeType,
    trend: { direction: string; strength: number },
    vixCategory: string,
    indicators: any
  ): number {
    let score = 0;

    // Regime type scoring
    if (regime === RegimeType.TRENDING_BULLISH || regime === RegimeType.TRENDING_BEARISH) {
      score += 40; // Trending markets are good
    } else if (regime === RegimeType.RANGING) {
      score += 25; // Ranging can work with mean reversion
    } else if (regime === RegimeType.VOLATILE) {
      score += 10; // High volatility = high risk
    }

    // Trend strength scoring (stronger = better)
    score += trend.strength * 0.3; // Up to 30 points

    // VIX scoring (prefer LOW to MEDIUM)
    if (vixCategory === 'LOW') score += 20;
    else if (vixCategory === 'MEDIUM') score += 15;
    else if (vixCategory === 'HIGH') score += 5;
    else score += 0; // EXTREME

    // ADX scoring (prefer trending)
    if (indicators.adx > 25) score += 10;
    else if (indicators.adx > 20) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Identify key support and resistance levels
   */
  private identifyKeyLevels(data: { high: number; low: number; close: number }[]): { support: number[]; resistance: number[] } {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Simple pivot points for now (can be enhanced)
    const recentHigh = Math.max(...highs.slice(-20));
    const recentLow = Math.min(...lows.slice(-20));

    return {
      support: [recentLow * 0.99, recentLow * 0.98],
      resistance: [recentHigh * 1.01, recentHigh * 1.02],
    };
  }

  /**
   * Explain the score
   */
  private explainScore(regime: RegimeType, trend: any, vixCategory: string, score: number): string {
    const reasons: string[] = [];

    reasons.push(`Market regime: ${regime}`);
    reasons.push(`Trend: ${trend.direction} with ${trend.strength.toFixed(0)}% strength`);
    reasons.push(`VIX: ${vixCategory}`);

    if (score >= 70) {
      reasons.push('Strong favorable conditions for trading');
    } else if (score >= 50) {
      reasons.push('Moderate conditions, proceed with caution');
    } else if (score >= 30) {
      reasons.push('Weak conditions, be selective');
    } else {
      reasons.push('Unfavorable conditions, avoid trading');
    }

    return reasons.join('. ');
  }

  // ==================== TECHNICAL INDICATOR CALCULATIONS ====================

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Signal line is 9-period EMA of MACD line
    // For simplicity, using a rough approximation
    const signalLine = macdLine * 0.9; // Simplified

    return {
      value: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine,
    };
  }

  private calculateADX(data: { high: number; low: number; close: number }[], period: number): number {
    if (data.length < period + 1) return 0;

    let plusDM = 0;
    let minusDM = 0;
    let tr = 0;

    for (let i = data.length - period; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;

      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      if (upMove > downMove && upMove > 0) plusDM += upMove;
      if (downMove > upMove && downMove > 0) minusDM += downMove;

      const trueRange = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      tr += trueRange;
    }

    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;

    if (plusDI + minusDI === 0) return 0;

    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    return dx;
  }
}

export const marketRegimeService = new MarketRegimeService();
