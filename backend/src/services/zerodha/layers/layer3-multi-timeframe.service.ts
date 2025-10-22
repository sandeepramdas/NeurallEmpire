/**
 * Layer 3: Multi-Timeframe Alignment
 *
 * Ensures all timeframes are aligned before taking a trade.
 * Analyzes 1H (higher timeframe), 15M (entry timeframe), and 5M (confirmation).
 *
 * Key Metrics:
 * - Trend alignment across timeframes
 * - Support/Resistance confluence
 * - Momentum alignment
 * - Entry timing based on MTF confluence
 */

export interface TimeframeData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MultiTimeframeInput {
  symbol: string;
  oneHour: TimeframeData[];
  fifteenMin: TimeframeData[];
  fiveMin: TimeframeData[];
}

export interface TimeframeTrend {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100
  ema20: number;
  ema50: number;
  rsi: number;
}

export interface MultiTimeframeResult {
  score: number; // 0-100 (Layer 3 score)
  alignment: 'PERFECT' | 'STRONG' | 'WEAK' | 'CONFLICTING';
  oneHourTrend: TimeframeTrend;
  fifteenMinTrend: TimeframeTrend;
  fiveMinTrend: TimeframeTrend;
  confluenceZones: { level: number; strength: number }[];
  entrySignal: 'BUY' | 'SELL' | 'WAIT';
  reason: string;
}

export class MultiTimeframeService {

  /**
   * Analyze multi-timeframe alignment and calculate Layer 3 score
   */
  async analyzeTimeframes(data: MultiTimeframeInput): Promise<MultiTimeframeResult> {
    const oneHourTrend = this.analyzeTrend(data.oneHour, '1H');
    const fifteenMinTrend = this.analyzeTrend(data.fifteenMin, '15M');
    const fiveMinTrend = this.analyzeTrend(data.fiveMin, '5M');

    const alignment = this.determineAlignment(oneHourTrend, fifteenMinTrend, fiveMinTrend);
    const confluenceZones = this.findConfluenceZones(data.oneHour, data.fifteenMin, data.fiveMin);
    const entrySignal = this.generateEntrySignal(alignment, oneHourTrend, fifteenMinTrend, fiveMinTrend);

    const score = this.calculateMTFScore(alignment, oneHourTrend, fifteenMinTrend, fiveMinTrend, confluenceZones);

    return {
      score,
      alignment,
      oneHourTrend,
      fifteenMinTrend,
      fiveMinTrend,
      confluenceZones,
      entrySignal,
      reason: this.explainScore(score, alignment, entrySignal),
    };
  }

  /**
   * Analyze trend for a specific timeframe
   */
  private analyzeTrend(data: TimeframeData[], timeframe: string): TimeframeTrend {
    if (data.length < 50) {
      return {
        direction: 'NEUTRAL',
        strength: 0,
        ema20: data[data.length - 1]?.close || 0,
        ema50: data[data.length - 1]?.close || 0,
        rsi: 50,
      };
    }

    const prices = data.map(d => d.close);
    const ema20 = this.calculateEMA(prices, 20);
    const ema50 = this.calculateEMA(prices, 50);
    const rsi = this.calculateRSI(prices, 14);
    const currentPrice = prices[prices.length - 1];

    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength = 0;

    // Determine direction
    if (currentPrice > ema20 && ema20 > ema50 && rsi > 50) {
      direction = 'BULLISH';
      strength = this.calculateTrendStrength(prices, ema20, ema50, rsi, 'BULLISH');
    } else if (currentPrice < ema20 && ema20 < ema50 && rsi < 50) {
      direction = 'BEARISH';
      strength = this.calculateTrendStrength(prices, ema20, ema50, rsi, 'BEARISH');
    } else {
      direction = 'NEUTRAL';
      strength = 30;
    }

    return { direction, strength, ema20, ema50, rsi };
  }

  /**
   * Calculate trend strength
   */
  private calculateTrendStrength(
    prices: number[],
    ema20: number,
    ema50: number,
    rsi: number,
    direction: 'BULLISH' | 'BEARISH'
  ): number {
    let strength = 50; // Base strength

    const currentPrice = prices[prices.length - 1];
    const emaSpread = Math.abs(ema20 - ema50) / ema50 * 100;

    // EMA spread (wider = stronger trend)
    if (emaSpread > 2) strength += 20;
    else if (emaSpread > 1) strength += 10;

    // Price distance from EMAs
    const priceAboveEma20 = (currentPrice - ema20) / ema20 * 100;
    if (direction === 'BULLISH' && priceAboveEma20 > 1) strength += 15;
    if (direction === 'BEARISH' && priceAboveEma20 < -1) strength += 15;

    // RSI confirmation
    if (direction === 'BULLISH' && rsi > 55 && rsi < 75) strength += 15;
    if (direction === 'BEARISH' && rsi < 45 && rsi > 25) strength += 15;

    return Math.min(100, strength);
  }

  /**
   * Determine overall timeframe alignment
   */
  private determineAlignment(
    oneHour: TimeframeTrend,
    fifteenMin: TimeframeTrend,
    fiveMin: TimeframeTrend
  ): 'PERFECT' | 'STRONG' | 'WEAK' | 'CONFLICTING' {
    const trends = [oneHour.direction, fifteenMin.direction, fiveMin.direction];

    // Perfect: All 3 timeframes in same direction
    if (trends.every(t => t === 'BULLISH')) return 'PERFECT';
    if (trends.every(t => t === 'BEARISH')) return 'PERFECT';

    // Strong: 1H and 15M aligned (most important)
    if (oneHour.direction === fifteenMin.direction && oneHour.direction !== 'NEUTRAL') {
      return 'STRONG';
    }

    // Weak: Only 2 timeframes aligned (but not 1H and 15M)
    const bullishCount = trends.filter(t => t === 'BULLISH').length;
    const bearishCount = trends.filter(t => t === 'BEARISH').length;

    if (bullishCount === 2 || bearishCount === 2) return 'WEAK';

    // Conflicting: Timeframes in opposite directions
    return 'CONFLICTING';
  }

  /**
   * Find confluence zones (where multiple timeframe levels align)
   */
  private findConfluenceZones(
    oneHour: TimeframeData[],
    fifteenMin: TimeframeData[],
    fiveMin: TimeframeData[]
  ): { level: number; strength: number }[] {
    const confluenceZones: { level: number; strength: number }[] = [];

    // Get key levels from each timeframe
    const oneHourLevels = this.findKeyLevels(oneHour);
    const fifteenMinLevels = this.findKeyLevels(fifteenMin);
    const fiveMinLevels = this.findKeyLevels(fiveMin);

    const allLevels = [...oneHourLevels, ...fifteenMinLevels, ...fiveMinLevels];

    // Find confluences (levels within 0.3% of each other)
    const tolerance = 0.003;

    for (let i = 0; i < allLevels.length; i++) {
      const level = allLevels[i];
      let strength = 1;

      for (let j = i + 1; j < allLevels.length; j++) {
        const otherLevel = allLevels[j];
        if (Math.abs(level - otherLevel) / level < tolerance) {
          strength++;
        }
      }

      if (strength >= 2) {
        // At least 2 timeframes have a level here
        confluenceZones.push({ level, strength: strength * 33.33 }); // Scale to 0-100
      }
    }

    // Return top 5 confluence zones
    return confluenceZones
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }

  /**
   * Find key support/resistance levels for a timeframe
   */
  private findKeyLevels(data: TimeframeData[]): number[] {
    if (data.length < 20) return [];

    const levels: number[] = [];
    const recentData = data.slice(-50);

    // Find swing highs and lows
    for (let i = 2; i < recentData.length - 2; i++) {
      const current = recentData[i];
      const prev1 = recentData[i - 1];
      const prev2 = recentData[i - 2];
      const next1 = recentData[i + 1];
      const next2 = recentData[i + 2];

      // Swing high
      if (current.high > prev1.high && current.high > prev2.high &&
          current.high > next1.high && current.high > next2.high) {
        levels.push(current.high);
      }

      // Swing low
      if (current.low < prev1.low && current.low < prev2.low &&
          current.low < next1.low && current.low < next2.low) {
        levels.push(current.low);
      }
    }

    return levels;
  }

  /**
   * Generate entry signal based on MTF analysis
   */
  private generateEntrySignal(
    alignment: string,
    oneHour: TimeframeTrend,
    fifteenMin: TimeframeTrend,
    fiveMin: TimeframeTrend
  ): 'BUY' | 'SELL' | 'WAIT' {
    // Only enter on PERFECT or STRONG alignment
    if (alignment === 'PERFECT') {
      if (oneHour.direction === 'BULLISH' && fiveMin.direction === 'BULLISH') {
        return 'BUY';
      }
      if (oneHour.direction === 'BEARISH' && fiveMin.direction === 'BEARISH') {
        return 'SELL';
      }
    }

    if (alignment === 'STRONG') {
      // 1H and 15M aligned, wait for 5M confirmation
      if (oneHour.direction === 'BULLISH' && fifteenMin.direction === 'BULLISH') {
        if (fiveMin.direction === 'BULLISH') return 'BUY';
      }
      if (oneHour.direction === 'BEARISH' && fifteenMin.direction === 'BEARISH') {
        if (fiveMin.direction === 'BEARISH') return 'SELL';
      }
    }

    return 'WAIT';
  }

  /**
   * Calculate Layer 3 score (0-100)
   */
  private calculateMTFScore(
    alignment: string,
    oneHour: TimeframeTrend,
    fifteenMin: TimeframeTrend,
    fiveMin: TimeframeTrend,
    confluenceZones: { level: number; strength: number }[]
  ): number {
    let score = 0;

    // Alignment score (most important)
    if (alignment === 'PERFECT') score += 50;
    else if (alignment === 'STRONG') score += 35;
    else if (alignment === 'WEAK') score += 15;
    else score += 0; // CONFLICTING

    // Trend strength score (average of all timeframes)
    const avgStrength = (oneHour.strength + fifteenMin.strength + fiveMin.strength) / 3;
    score += avgStrength * 0.3; // Up to 30 points

    // Confluence zones bonus
    if (confluenceZones.length > 0) {
      score += Math.min(20, confluenceZones.length * 5);
    }

    return Math.min(100, score);
  }

  /**
   * Explain the score
   */
  private explainScore(score: number, alignment: string, signal: string): string {
    const reasons: string[] = [];

    reasons.push(`Timeframe alignment: ${alignment}`);
    reasons.push(`Entry signal: ${signal}`);

    if (score >= 70) {
      reasons.push('Perfect MTF setup, all timeframes aligned');
    } else if (score >= 50) {
      reasons.push('Strong MTF setup, major timeframes aligned');
    } else if (score >= 30) {
      reasons.push('Weak MTF setup, partial alignment');
    } else {
      reasons.push('Conflicting timeframes, do not trade');
    }

    return reasons.join('. ');
  }

  // ==================== TECHNICAL CALCULATIONS ====================

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
}

export const multiTimeframeService = new MultiTimeframeService();
