/**
 * Layer 6: Risk Regime Filter
 *
 * Filters out trades during high-risk periods to protect capital.
 * Considers time-based restrictions, event-based restrictions, and market conditions.
 *
 * Key Filters:
 * - Time-based: First 15 min of market, last 15 min of market, lunch time
 * - Event-based: Major news events, earnings, economic data releases
 * - Market-based: Circuit breakers, extreme volatility, low liquidity
 * - Day-specific: Expiry day, Monday gap risks, Friday close risks
 */

export interface RiskRegimeInput {
  currentTime: Date;
  marketOpenTime: Date;
  marketCloseTime: Date;
  symbol: string;
  isExpiryDay: boolean;
  upcomingEvents: {
    eventType: 'EARNINGS' | 'ECONOMIC_DATA' | 'RBI_POLICY' | 'FII_DII_DATA' | 'OTHER';
    eventTime: Date;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  currentVolume: number;
  avgVolume: number;
  circuitBreaker: boolean;
  vixLevel: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export interface RiskRegimeResult {
  score: number; // 0-100 (Layer 6 score)
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  tradingAllowed: boolean; // Can we trade in this risk regime?
  timeRestrictions: {
    marketOpen: boolean; // Within first 15 min
    marketClose: boolean; // Within last 15 min
    lunchHour: boolean; // 12:00-1:00 PM
    allowed: boolean;
  };
  eventRestrictions: {
    majorEventNear: boolean;
    eventType?: string;
    timeToEvent?: number; // minutes
    allowed: boolean;
  };
  marketRestrictions: {
    circuitBreaker: boolean;
    extremeVolatility: boolean;
    lowLiquidity: boolean;
    allowed: boolean;
  };
  dayRestrictions: {
    isExpiry: boolean;
    isMonday: boolean;
    isFriday: boolean;
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    allowed: boolean;
  };
  overallRestriction: string;
  reason: string;
}

export class RiskRegimeService {

  /**
   * Analyze risk regime and determine if trading is allowed
   */
  async analyzeRiskRegime(data: RiskRegimeInput): Promise<RiskRegimeResult> {
    const timeRestrictions = this.checkTimeRestrictions(
      data.currentTime,
      data.marketOpenTime,
      data.marketCloseTime
    );

    const eventRestrictions = this.checkEventRestrictions(
      data.currentTime,
      data.upcomingEvents
    );

    const marketRestrictions = this.checkMarketRestrictions(
      data.circuitBreaker,
      data.vixLevel,
      data.currentVolume,
      data.avgVolume
    );

    const dayRestrictions = this.checkDayRestrictions(
      data.isExpiryDay,
      data.dayOfWeek
    );

    const tradingAllowed = this.determineTradingAllowed(
      timeRestrictions,
      eventRestrictions,
      marketRestrictions,
      dayRestrictions
    );

    const riskLevel = this.calculateRiskLevel(
      timeRestrictions,
      eventRestrictions,
      marketRestrictions,
      dayRestrictions
    );

    const score = this.calculateRiskRegimeScore(
      riskLevel,
      tradingAllowed,
      timeRestrictions,
      eventRestrictions,
      marketRestrictions,
      dayRestrictions
    );

    const overallRestriction = this.identifyMainRestriction(
      timeRestrictions,
      eventRestrictions,
      marketRestrictions,
      dayRestrictions
    );

    return {
      score,
      riskLevel,
      tradingAllowed,
      timeRestrictions,
      eventRestrictions,
      marketRestrictions,
      dayRestrictions,
      overallRestriction,
      reason: this.explainScore(score, riskLevel, tradingAllowed, overallRestriction),
    };
  }

  /**
   * Check time-based restrictions
   */
  private checkTimeRestrictions(
    currentTime: Date,
    marketOpen: Date,
    marketClose: Date
  ): { marketOpen: boolean; marketClose: boolean; lunchHour: boolean; allowed: boolean } {
    const minutesSinceOpen = (currentTime.getTime() - marketOpen.getTime()) / (1000 * 60);
    const minutesToClose = (marketClose.getTime() - currentTime.getTime()) / (1000 * 60);

    const isMarketOpen = minutesSinceOpen <= 15; // First 15 min
    const isMarketClose = minutesToClose <= 15; // Last 15 min

    const hour = currentTime.getHours();
    const isLunchHour = hour === 12; // 12:00 PM - 1:00 PM (low liquidity)

    // Allow trading only if none of these restrictions apply
    const allowed = !isMarketOpen && !isMarketClose && !isLunchHour;

    return {
      marketOpen: isMarketOpen,
      marketClose: isMarketClose,
      lunchHour: isLunchHour,
      allowed,
    };
  }

  /**
   * Check event-based restrictions
   */
  private checkEventRestrictions(
    currentTime: Date,
    upcomingEvents: any[]
  ): { majorEventNear: boolean; eventType?: string; timeToEvent?: number; allowed: boolean } {
    // Check if any major event is within 2 hours
    for (const event of upcomingEvents) {
      const timeToEvent = (event.eventTime.getTime() - currentTime.getTime()) / (1000 * 60); // minutes

      if (event.severity === 'HIGH' && timeToEvent <= 120 && timeToEvent >= -60) {
        // Major event within 2 hours before or 1 hour after
        return {
          majorEventNear: true,
          eventType: event.eventType,
          timeToEvent,
          allowed: false,
        };
      }
    }

    return {
      majorEventNear: false,
      allowed: true,
    };
  }

  /**
   * Check market condition restrictions
   */
  private checkMarketRestrictions(
    circuitBreaker: boolean,
    vixLevel: number,
    currentVolume: number,
    avgVolume: number
  ): { circuitBreaker: boolean; extremeVolatility: boolean; lowLiquidity: boolean; allowed: boolean } {
    const extremeVolatility = vixLevel > 30; // VIX > 30 = extreme fear
    const lowLiquidity = currentVolume < avgVolume * 0.5; // Volume < 50% of average

    // Don't trade if circuit breaker hit or extreme volatility or low liquidity
    const allowed = !circuitBreaker && !extremeVolatility && !lowLiquidity;

    return {
      circuitBreaker,
      extremeVolatility,
      lowLiquidity,
      allowed,
    };
  }

  /**
   * Check day-specific restrictions
   */
  private checkDayRestrictions(
    isExpiryDay: boolean,
    dayOfWeek: number
  ): { isExpiry: boolean; isMonday: boolean; isFriday: boolean; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'; allowed: boolean } {
    const isMonday = dayOfWeek === 1; // Monday = gap risk from weekend
    const isFriday = dayOfWeek === 5; // Friday = end of week, rollover risk

    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let allowed = true;

    if (isExpiryDay) {
      riskLevel = 'HIGH'; // Expiry day = high volatility, pin risk
      allowed = false; // Avoid trading on expiry day
    } else if (isMonday) {
      riskLevel = 'MEDIUM'; // Monday = gap risk
      allowed = true; // Can trade but with caution
    } else if (isFriday) {
      riskLevel = 'MEDIUM'; // Friday = weekend risk
      allowed = true; // Can trade but with caution
    }

    return {
      isExpiry: isExpiryDay,
      isMonday,
      isFriday,
      riskLevel,
      allowed,
    };
  }

  /**
   * Determine if trading is allowed overall
   */
  private determineTradingAllowed(
    time: any,
    event: any,
    market: any,
    day: any
  ): boolean {
    // All categories must allow trading
    return time.allowed && event.allowed && market.allowed && day.allowed;
  }

  /**
   * Calculate overall risk level
   */
  private calculateRiskLevel(
    time: any,
    event: any,
    market: any,
    day: any
  ): 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    let riskPoints = 0;

    // Time restrictions
    if (!time.allowed) riskPoints += 2;

    // Event restrictions
    if (event.majorEventNear) riskPoints += 3;

    // Market restrictions
    if (market.circuitBreaker) riskPoints += 4; // Circuit breaker = extreme risk
    if (market.extremeVolatility) riskPoints += 3;
    if (market.lowLiquidity) riskPoints += 2;

    // Day restrictions
    if (day.riskLevel === 'HIGH') riskPoints += 3;
    else if (day.riskLevel === 'MEDIUM') riskPoints += 1;

    if (riskPoints >= 6) return 'EXTREME';
    if (riskPoints >= 4) return 'HIGH';
    if (riskPoints >= 2) return 'MEDIUM';
    if (riskPoints >= 1) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * Identify main restriction reason
   */
  private identifyMainRestriction(
    time: any,
    event: any,
    market: any,
    day: any
  ): string {
    if (market.circuitBreaker) return 'CIRCUIT_BREAKER';
    if (event.majorEventNear) return 'MAJOR_EVENT_NEAR';
    if (market.extremeVolatility) return 'EXTREME_VOLATILITY';
    if (day.isExpiry) return 'EXPIRY_DAY';
    if (time.marketOpen) return 'MARKET_OPENING';
    if (time.marketClose) return 'MARKET_CLOSING';
    if (time.lunchHour) return 'LUNCH_HOUR';
    if (market.lowLiquidity) return 'LOW_LIQUIDITY';
    if (day.isMonday) return 'MONDAY_GAP_RISK';
    if (day.isFriday) return 'FRIDAY_ROLLOVER_RISK';
    return 'NONE';
  }

  /**
   * Calculate Layer 6 score (0-100)
   */
  private calculateRiskRegimeScore(
    riskLevel: string,
    tradingAllowed: boolean,
    time: any,
    event: any,
    market: any,
    day: any
  ): number {
    // If trading not allowed, score is automatically low
    if (!tradingAllowed) {
      if (riskLevel === 'EXTREME') return 0;
      if (riskLevel === 'HIGH') return 20;
      if (riskLevel === 'MEDIUM') return 40;
      return 50;
    }

    let score = 100; // Start with perfect score

    // Deduct for each risk factor
    if (!time.allowed) score -= 20;
    if (!event.allowed) score -= 25;
    if (!market.allowed) score -= 30;
    if (!day.allowed) score -= 25;

    // Risk level penalty
    if (riskLevel === 'EXTREME') score -= 50;
    else if (riskLevel === 'HIGH') score -= 30;
    else if (riskLevel === 'MEDIUM') score -= 15;
    else if (riskLevel === 'LOW') score -= 5;

    return Math.max(0, score);
  }

  /**
   * Explain the score
   */
  private explainScore(
    score: number,
    riskLevel: string,
    tradingAllowed: boolean,
    restriction: string
  ): string {
    const reasons: string[] = [];

    reasons.push(`Risk level: ${riskLevel}`);

    if (!tradingAllowed) {
      reasons.push(`❌ Trading NOT allowed: ${restriction}`);

      if (restriction === 'CIRCUIT_BREAKER') {
        reasons.push('Circuit breaker hit, market is in extreme stress');
      } else if (restriction === 'MAJOR_EVENT_NEAR') {
        reasons.push('Major event within 2 hours, avoid directional trades');
      } else if (restriction === 'EXTREME_VOLATILITY') {
        reasons.push('VIX > 30, extreme volatility present');
      } else if (restriction === 'EXPIRY_DAY') {
        reasons.push('Options expiry day, high pin risk and volatility');
      } else if (restriction === 'MARKET_OPENING') {
        reasons.push('First 15 minutes, wait for volatility to settle');
      } else if (restriction === 'MARKET_CLOSING') {
        reasons.push('Last 15 minutes, avoid new positions');
      }
    } else {
      reasons.push('✅ Trading allowed');

      if (score >= 80) {
        reasons.push('Low risk environment, favorable for trading');
      } else if (score >= 60) {
        reasons.push('Moderate risk, trade with normal position sizing');
      } else {
        reasons.push('Elevated risk, consider reducing position size');
      }
    }

    return reasons.join('. ');
  }
}

export const riskRegimeService = new RiskRegimeService();
