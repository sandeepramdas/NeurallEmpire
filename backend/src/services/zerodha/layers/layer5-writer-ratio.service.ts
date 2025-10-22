/**
 * Layer 5: Option Flow with Writer Ratio Filter ⚠️ CRITICAL GATEKEEPER
 *
 * This is the MOST IMPORTANT layer. NO TRADE is allowed without this layer passing.
 *
 * MANDATORY RULE:
 * - For BUY CALL (CE): PUT writers MUST be 2.5x - 3x MORE than CALL writers
 * - For BUY PUT (PE): CALL writers MUST be 2.5x - 3x MORE than PUT writers
 *
 * This ensures we only trade when institutional money (option writers) is positioned
 * on our side, providing a statistical edge.
 *
 * Key Metrics:
 * - Call OI and Put OI analysis
 * - Writer positioning (detected from OI build-up/reduction)
 * - Writer Ratio calculation
 * - Institutional flow direction
 * - PCR (Put-Call Ratio)
 */

export interface OptionChainInput {
  symbol: string;
  expiry: Date;
  strikes: {
    strike: number;
    callOI: number;
    putOI: number;
    callOIChange: number;
    putOIChange: number;
    callVolume: number;
    putVolume: number;
    callLTP: number;
    putLTP: number;
  }[];
  atmStrike: number; // At-the-money strike
  targetStrike: number; // Strike we want to trade
  signalType: 'BUY_CALL' | 'BUY_PUT';
}

export interface WriterRatioResult {
  score: number; // 0-100 (Layer 5 score)
  writerRatio: number; // Actual ratio (e.g., 3.2 = PUT writers are 3.2x CALL writers)
  writerRatioPassed: boolean; // ⚠️ CRITICAL: Must be TRUE to proceed with trade
  callWriters: number; // Estimated CALL writers (OI)
  putWriters: number; // Estimated PUT writers (OI)
  institutionalFlow: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  pcr: number; // Put-Call Ratio (OI based)
  maxPain: number; // Strike where max options expire worthless
  writerDirection: 'ALIGNED' | 'CONFLICTING';
  oiAnalysis: {
    totalCallOI: number;
    totalPutOI: number;
    callOIChange: number;
    putOIChange: number;
  };
  reason: string;
  warning?: string; // Critical warning if ratio doesn't pass
}

export class WriterRatioService {

  // CRITICAL THRESHOLDS
  private readonly MIN_WRITER_RATIO = 2.5; // Minimum required ratio
  private readonly IDEAL_WRITER_RATIO = 3.0; // Ideal ratio for highest confidence

  /**
   * ⚠️ CRITICAL: Analyze writer ratio - THE GATEKEEPER OF ALL TRADES
   *
   * This function determines if a trade is allowed to proceed.
   * If writerRatioPassed = false, the trade MUST be rejected regardless of other layers.
   */
  async analyzeWriterRatio(data: OptionChainInput): Promise<WriterRatioResult> {
    // Step 1: Calculate total OI and changes
    const oiAnalysis = this.calculateOIAnalysis(data.strikes);

    // Step 2: Estimate writer positions from OI data
    const { callWriters, putWriters } = this.estimateWriterPositions(data.strikes, data.atmStrike);

    // Step 3: Calculate the CRITICAL writer ratio
    const { writerRatio, writerRatioPassed } = this.calculateWriterRatio(
      callWriters,
      putWriters,
      data.signalType
    );

    // Step 4: Determine institutional flow
    const institutionalFlow = this.determineInstitutionalFlow(
      oiAnalysis,
      callWriters,
      putWriters
    );

    // Step 5: Calculate PCR
    const pcr = oiAnalysis.totalPutOI / oiAnalysis.totalCallOI;

    // Step 6: Find max pain strike
    const maxPain = this.calculateMaxPain(data.strikes);

    // Step 7: Check if writers are aligned with our trade
    const writerDirection = this.checkWriterAlignment(
      data.signalType,
      institutionalFlow,
      writerRatioPassed
    );

    // Step 8: Calculate Layer 5 score
    const score = this.calculateWriterRatioScore(
      writerRatio,
      writerRatioPassed,
      institutionalFlow,
      writerDirection,
      pcr
    );

    // Step 9: Generate reason and warning
    const reason = this.explainScore(
      score,
      writerRatio,
      writerRatioPassed,
      institutionalFlow,
      data.signalType
    );

    const warning = !writerRatioPassed
      ? this.generateCriticalWarning(writerRatio, data.signalType, callWriters, putWriters)
      : undefined;

    return {
      score,
      writerRatio,
      writerRatioPassed,
      callWriters,
      putWriters,
      institutionalFlow,
      pcr,
      maxPain,
      writerDirection,
      oiAnalysis,
      reason,
      warning,
    };
  }

  /**
   * Calculate total OI and changes
   */
  private calculateOIAnalysis(strikes: any[]): {
    totalCallOI: number;
    totalPutOI: number;
    callOIChange: number;
    putOIChange: number;
  } {
    let totalCallOI = 0;
    let totalPutOI = 0;
    let callOIChange = 0;
    let putOIChange = 0;

    for (const strike of strikes) {
      totalCallOI += strike.callOI;
      totalPutOI += strike.putOI;
      callOIChange += strike.callOIChange;
      putOIChange += strike.putOIChange;
    }

    return { totalCallOI, totalPutOI, callOIChange, putOIChange };
  }

  /**
   * Estimate writer positions from OI build-up
   *
   * Writers = option sellers (institutional players)
   * We detect them by looking at OI increases at strikes
   */
  private estimateWriterPositions(strikes: any[], atmStrike: number): {
    callWriters: number;
    putWriters: number;
  } {
    let callWriters = 0;
    let putWriters = 0;

    for (const strike of strikes) {
      // Call writers detected by increasing Call OI (especially above ATM)
      if (strike.strike >= atmStrike && strike.callOIChange > 0) {
        callWriters += strike.callOI;
      }

      // Put writers detected by increasing Put OI (especially below ATM)
      if (strike.strike <= atmStrike && strike.putOIChange > 0) {
        putWriters += strike.putOI;
      }
    }

    return { callWriters, putWriters };
  }

  /**
   * ⚠️ CRITICAL: Calculate writer ratio and determine if it passes threshold
   *
   * For BUY CALL: We need PUT writers >> CALL writers (ratio >= 2.5)
   * For BUY PUT: We need CALL writers >> PUT writers (ratio >= 2.5)
   *
   * This ensures institutions are selling the opposite side, which is bullish for our trade.
   */
  private calculateWriterRatio(
    callWriters: number,
    putWriters: number,
    signalType: 'BUY_CALL' | 'BUY_PUT'
  ): { writerRatio: number; writerRatioPassed: boolean } {
    let writerRatio = 0;
    let writerRatioPassed = false;

    if (signalType === 'BUY_CALL') {
      // For buying CALL, we want PUT writers to be much higher than CALL writers
      // Ratio = PUT writers / CALL writers
      if (callWriters === 0) {
        writerRatio = putWriters > 0 ? 999 : 0; // Extremely favorable if no call writers
      } else {
        writerRatio = putWriters / callWriters;
      }

      // Pass if ratio >= 2.5
      writerRatioPassed = writerRatio >= this.MIN_WRITER_RATIO;

    } else if (signalType === 'BUY_PUT') {
      // For buying PUT, we want CALL writers to be much higher than PUT writers
      // Ratio = CALL writers / PUT writers
      if (putWriters === 0) {
        writerRatio = callWriters > 0 ? 999 : 0; // Extremely favorable if no put writers
      } else {
        writerRatio = callWriters / putWriters;
      }

      // Pass if ratio >= 2.5
      writerRatioPassed = writerRatio >= this.MIN_WRITER_RATIO;
    }

    return { writerRatio, writerRatioPassed };
  }

  /**
   * Determine institutional flow direction
   */
  private determineInstitutionalFlow(
    oiAnalysis: any,
    callWriters: number,
    putWriters: number
  ): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    // Heavy PUT writing = institutions are bullish (selling PUTs = bullish)
    // Heavy CALL writing = institutions are bearish (selling CALLs = bearish)

    const writerRatio = putWriters / (callWriters || 1);

    if (writerRatio >= 2) return 'BULLISH'; // Heavy PUT writing
    if (writerRatio <= 0.5) return 'BEARISH'; // Heavy CALL writing
    return 'NEUTRAL';
  }

  /**
   * Check if institutional writers are aligned with our trade
   */
  private checkWriterAlignment(
    signalType: 'BUY_CALL' | 'BUY_PUT',
    institutionalFlow: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    writerRatioPassed: boolean
  ): 'ALIGNED' | 'CONFLICTING' {
    if (!writerRatioPassed) return 'CONFLICTING';

    if (signalType === 'BUY_CALL' && institutionalFlow === 'BULLISH') return 'ALIGNED';
    if (signalType === 'BUY_PUT' && institutionalFlow === 'BEARISH') return 'ALIGNED';

    return 'CONFLICTING';
  }

  /**
   * Calculate Max Pain (strike where most options expire worthless)
   */
  private calculateMaxPain(strikes: any[]): number {
    let maxPainStrike = strikes[0]?.strike || 0;
    let minPain = Infinity;

    for (const targetStrike of strikes) {
      let totalPain = 0;

      for (const strike of strikes) {
        // Calculate pain for call writers
        if (strike.strike < targetStrike.strike) {
          totalPain += (targetStrike.strike - strike.strike) * strike.callOI;
        }

        // Calculate pain for put writers
        if (strike.strike > targetStrike.strike) {
          totalPain += (strike.strike - targetStrike.strike) * strike.putOI;
        }
      }

      if (totalPain < minPain) {
        minPain = totalPain;
        maxPainStrike = targetStrike.strike;
      }
    }

    return maxPainStrike;
  }

  /**
   * ⚠️ CRITICAL: Calculate Layer 5 score
   *
   * This score heavily weights the writer ratio.
   * If writerRatioPassed = false, score is automatically < 50 (failing grade)
   */
  private calculateWriterRatioScore(
    writerRatio: number,
    writerRatioPassed: boolean,
    institutionalFlow: string,
    writerDirection: string,
    pcr: number
  ): number {
    // If ratio doesn't pass, maximum score is 40 (failing)
    if (!writerRatioPassed) {
      return Math.min(40, writerRatio * 16); // Scale ratio to 0-40
    }

    let score = 0;

    // Writer ratio score (0-50 points)
    if (writerRatio >= 3.0) {
      score += 50; // Ideal ratio
    } else if (writerRatio >= 2.5) {
      score += 40; // Minimum acceptable ratio
    } else {
      score += writerRatio * 16; // Below threshold
    }

    // Writer alignment score (0-30 points)
    if (writerDirection === 'ALIGNED') score += 30;
    else score += 5;

    // PCR bonus (0-20 points)
    if (pcr > 1.2) score += 20; // More puts = bullish
    else if (pcr > 0.8) score += 10; // Neutral
    else score += 5; // More calls = bearish

    return Math.min(100, score);
  }

  /**
   * Generate critical warning if ratio doesn't pass
   */
  private generateCriticalWarning(
    ratio: number,
    signalType: string,
    callWriters: number,
    putWriters: number
  ): string {
    const required = this.MIN_WRITER_RATIO;

    return `⚠️ CRITICAL: Writer ratio FAILED (${ratio.toFixed(2)}x, need ${required}x minimum). ` +
           `${signalType === 'BUY_CALL' ? 'PUT' : 'CALL'} writers (${signalType === 'BUY_CALL' ? putWriters : callWriters}) ` +
           `are NOT sufficiently higher than ${signalType === 'BUY_CALL' ? 'CALL' : 'PUT'} writers ` +
           `(${signalType === 'BUY_CALL' ? callWriters : putWriters}). ` +
           `TRADE REJECTED. Institutional positioning is against this trade.`;
  }

  /**
   * Explain the score
   */
  private explainScore(
    score: number,
    ratio: number,
    passed: boolean,
    institutionalFlow: string,
    signalType: string
  ): string {
    const reasons: string[] = [];

    if (passed) {
      reasons.push(`✅ Writer ratio PASSED: ${ratio.toFixed(2)}x (minimum 2.5x required)`);
      reasons.push(`Institutional flow: ${institutionalFlow}`);

      if (ratio >= 3.0) {
        reasons.push('EXCELLENT writer positioning, institutions heavily on our side');
      } else {
        reasons.push('GOOD writer positioning, minimum threshold met');
      }
    } else {
      reasons.push(`❌ Writer ratio FAILED: ${ratio.toFixed(2)}x (need minimum 2.5x)`);
      reasons.push('Institutional positioning is AGAINST this trade');
      reasons.push('DO NOT TRADE - violates Layer 5 mandatory requirement');
    }

    return reasons.join('. ');
  }
}

export const writerRatioService = new WriterRatioService();
