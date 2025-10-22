/**
 * Layer 4: Volatility Analysis
 *
 * Analyzes volatility metrics to ensure favorable option pricing and timing.
 * Uses VIX, Implied Volatility (IV), Historical Volatility (HV), and IV Rank.
 *
 * Key Metrics:
 * - VIX level and trend
 * - IV Percentile (where current IV stands historically)
 * - IV vs HV comparison
 * - Option Greeks (Delta, Gamma, Theta, Vega)
 * - Optimal strike selection based on volatility
 */

export interface VolatilityInput {
  symbol: string;
  vixCurrent: number;
  vixHistory: number[]; // Last 30 days of VIX
  strikeIV: number; // Implied Volatility at target strike
  atmIV: number; // At-the-money IV
  historicalData: {
    timestamp: Date;
    close: number;
  }[];
  optionData?: {
    strike: number;
    iv: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface VolatilityResult {
  score: number; // 0-100 (Layer 4 score)
  vixLevel: number;
  vixCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  vixTrend: 'RISING' | 'FALLING' | 'STABLE';
  ivPercentile: number; // 0-100 (where current IV ranks historically)
  ivRank: 'LOW' | 'MEDIUM' | 'HIGH';
  historicalVol: number;
  impliedVol: number;
  ivVsHvRatio: number; // IV/HV ratio (>1 = IV elevated, <1 = IV compressed)
  volRegime: 'COMPRESSED' | 'NORMAL' | 'ELEVATED' | 'EXTREME';
  optionPricing: 'CHEAP' | 'FAIR' | 'EXPENSIVE';
  optimalStrikeSuggestion: string;
  reason: string;
}

export class VolatilityService {

  /**
   * Analyze volatility and calculate Layer 4 score
   */
  async analyzeVolatility(data: VolatilityInput): Promise<VolatilityResult> {
    const vixCategory = this.categorizeVIX(data.vixCurrent);
    const vixTrend = this.analyzeVIXTrend(data.vixHistory);
    const historicalVol = this.calculateHistoricalVolatility(data.historicalData);
    const ivPercentile = this.calculateIVPercentile(data.strikeIV, data.vixHistory);
    const ivRank = this.rankIV(ivPercentile);
    const ivVsHvRatio = data.strikeIV / historicalVol;
    const volRegime = this.determineVolatilityRegime(ivVsHvRatio, vixCategory);
    const optionPricing = this.evaluateOptionPricing(ivVsHvRatio, ivPercentile);
    const optimalStrike = this.suggestOptimalStrike(data, volRegime, ivVsHvRatio);

    const score = this.calculateVolatilityScore(
      vixCategory,
      vixTrend,
      ivPercentile,
      ivVsHvRatio,
      volRegime,
      optionPricing
    );

    return {
      score,
      vixLevel: data.vixCurrent,
      vixCategory,
      vixTrend,
      ivPercentile,
      ivRank,
      historicalVol,
      impliedVol: data.strikeIV,
      ivVsHvRatio,
      volRegime,
      optionPricing,
      optimalStrikeSuggestion: optimalStrike,
      reason: this.explainScore(score, vixCategory, volRegime, optionPricing),
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
   * Analyze VIX trend (rising = increasing fear, falling = decreasing fear)
   */
  private analyzeVIXTrend(vixHistory: number[]): 'RISING' | 'FALLING' | 'STABLE' {
    if (vixHistory.length < 5) return 'STABLE';

    const recent = vixHistory.slice(-5);
    const older = vixHistory.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 5) return 'RISING';
    if (change < -5) return 'FALLING';
    return 'STABLE';
  }

  /**
   * Calculate Historical Volatility (20-day)
   */
  private calculateHistoricalVolatility(data: { close: number }[]): number {
    if (data.length < 21) return 0;

    const returns: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const dailyReturn = Math.log(data[i].close / data[i - 1].close);
      returns.push(dailyReturn);
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize volatility (252 trading days, sqrt to annualize)
    const annualizedVol = stdDev * Math.sqrt(252) * 100;

    return annualizedVol;
  }

  /**
   * Calculate IV Percentile (where current IV ranks over past period)
   */
  private calculateIVPercentile(currentIV: number, vixHistory: number[]): number {
    if (vixHistory.length === 0) return 50;

    // Use VIX as proxy for IV history
    const lowerCount = vixHistory.filter(v => v < currentIV).length;
    const percentile = (lowerCount / vixHistory.length) * 100;

    return percentile;
  }

  /**
   * Rank IV level
   */
  private rankIV(percentile: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (percentile < 30) return 'LOW';
    if (percentile < 70) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Determine volatility regime
   */
  private determineVolatilityRegime(
    ivHvRatio: number,
    vixCategory: string
  ): 'COMPRESSED' | 'NORMAL' | 'ELEVATED' | 'EXTREME' {
    // IV vs HV ratio tells us if options are cheap or expensive
    // Ratio < 0.9 = Compressed (IV < HV = options underpriced)
    // Ratio 0.9-1.1 = Normal
    // Ratio 1.1-1.3 = Elevated (IV > HV = options overpriced)
    // Ratio > 1.3 = Extreme

    if (ivHvRatio < 0.9) return 'COMPRESSED';
    if (ivHvRatio < 1.1) return 'NORMAL';
    if (ivHvRatio < 1.3) return 'ELEVATED';
    return 'EXTREME';
  }

  /**
   * Evaluate option pricing
   */
  private evaluateOptionPricing(ivHvRatio: number, ivPercentile: number): 'CHEAP' | 'FAIR' | 'EXPENSIVE' {
    // Options are cheap when IV is compressed
    if (ivHvRatio < 0.9 || ivPercentile < 25) return 'CHEAP';

    // Options are expensive when IV is elevated
    if (ivHvRatio > 1.2 || ivPercentile > 75) return 'EXPENSIVE';

    return 'FAIR';
  }

  /**
   * Suggest optimal strike based on volatility
   */
  private suggestOptimalStrike(
    data: VolatilityInput,
    volRegime: string,
    ivHvRatio: number
  ): string {
    // In low volatility: Trade closer to ATM (lower premium, higher delta)
    // In high volatility: Trade further OTM (higher R:R, lower delta)

    if (volRegime === 'COMPRESSED' || volRegime === 'NORMAL') {
      return 'ATM or 1-2 strikes OTM (Delta 0.40-0.60)';
    } else if (volRegime === 'ELEVATED') {
      return '2-3 strikes OTM (Delta 0.25-0.40)';
    } else {
      return '3-5 strikes OTM (Delta 0.15-0.30) or avoid trading';
    }
  }

  /**
   * Calculate Layer 4 score (0-100)
   * Higher score = more favorable volatility conditions for options buying
   */
  private calculateVolatilityScore(
    vixCategory: string,
    vixTrend: string,
    ivPercentile: number,
    ivHvRatio: number,
    volRegime: string,
    optionPricing: string
  ): number {
    let score = 0;

    // VIX level scoring (prefer LOW to MEDIUM for buying options)
    if (vixCategory === 'LOW') score += 30;
    else if (vixCategory === 'MEDIUM') score += 25;
    else if (vixCategory === 'HIGH') score += 15;
    else score += 5; // EXTREME

    // VIX trend scoring (prefer FALLING or STABLE)
    if (vixTrend === 'FALLING') score += 15;
    else if (vixTrend === 'STABLE') score += 10;
    else score += 5; // RISING

    // IV Percentile scoring (prefer lower IV percentile = cheaper options)
    if (ivPercentile < 25) score += 25; // Very cheap
    else if (ivPercentile < 50) score += 20; // Cheap
    else if (ivPercentile < 75) score += 10; // Fair
    else score += 5; // Expensive

    // Volatility regime scoring
    if (volRegime === 'COMPRESSED') score += 20; // Best for buying
    else if (volRegime === 'NORMAL') score += 15;
    else if (volRegime === 'ELEVATED') score += 5;
    else score += 0; // EXTREME

    // Option pricing bonus
    if (optionPricing === 'CHEAP') score += 10;
    else if (optionPricing === 'FAIR') score += 5;

    return Math.min(100, score);
  }

  /**
   * Explain the score
   */
  private explainScore(score: number, vixCategory: string, volRegime: string, pricing: string): string {
    const reasons: string[] = [];

    reasons.push(`VIX: ${vixCategory}`);
    reasons.push(`Volatility regime: ${volRegime}`);
    reasons.push(`Option pricing: ${pricing}`);

    if (score >= 70) {
      reasons.push('Excellent volatility conditions for option buying');
    } else if (score >= 50) {
      reasons.push('Good volatility conditions');
    } else if (score >= 30) {
      reasons.push('Fair volatility, be selective');
    } else {
      reasons.push('Poor volatility conditions, options are expensive');
    }

    return reasons.join('. ');
  }
}

export const volatilityService = new VolatilityService();
