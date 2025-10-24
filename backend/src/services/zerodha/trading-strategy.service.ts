/**
 * Trading Strategy Service - 7-Layer Professional Options Trading System
 *
 * This service coordinates all 7 layers of analysis and generates trading signals.
 *
 * CRITICAL RULE:
 * Layer 5 (Writer Ratio Filter) MUST pass for any trade to be allowed.
 * Even if all other layers score 100%, if Layer 5 fails, the trade is REJECTED.
 *
 * Layers:
 * 1. Market Regime Detection
 * 2. Price Action Analysis
 * 3. Multi-Timeframe Alignment
 * 4. Volatility Analysis
 * 5. ⚠️ Writer Ratio Filter (MANDATORY GATEKEEPER)
 * 6. Risk Regime Filter
 * 7. Portfolio Management
 */

import { PrismaClient, SignalType, SignalStatus, OptionType } from '@prisma/client';
import { marketRegimeService, MarketRegimeData } from './layers/layer1-market-regime.service';
import { priceActionService, PriceActionData } from './layers/layer2-price-action.service';
import { multiTimeframeService, MultiTimeframeInput } from './layers/layer3-multi-timeframe.service';
import { volatilityService, VolatilityInput } from './layers/layer4-volatility.service';
import { writerRatioService, OptionChainInput } from './layers/layer5-writer-ratio.service';
import { riskRegimeService, RiskRegimeInput } from './layers/layer6-risk-regime.service';
import { portfolioService, PortfolioInput } from './layers/layer7-portfolio.service';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

export interface TradingSignalInput {
  userId: string;
  organizationId: string;
  symbol: string;
  strike: number;
  expiry: Date;
  optionType: OptionType;
  signalType: SignalType;

  // Market data for all layers
  marketData: {
    spotPrice: number;
    vixLevel: number;
    vixHistory: number[];
    historicalData: any[];
    oneHourData: any[];
    fifteenMinData: any[];
    fiveMinData: any[];
  };

  // Option chain data for Layer 5
  optionChain: {
    strikes: any[];
    atmStrike: number;
    targetStrike: number;
  };

  // Risk regime data for Layer 6
  riskData: {
    currentTime: Date;
    marketOpenTime: Date;
    marketCloseTime: Date;
    isExpiryDay: boolean;
    upcomingEvents: any[];
    currentVolume: number;
    avgVolume: number;
    circuitBreaker: boolean;
    dayOfWeek: number;
  };

  // Portfolio data for Layer 7
  portfolioData: {
    totalCapital: number;
    availableCapital: number;
    openPositions: any[];
    tradingHistory: any;
    riskPerTrade: number;
    maxOpenPositions: number;
  };
}

export interface TradingSignalOutput {
  success: boolean;
  signal: any; // Database signal record
  analysis: {
    layer1: any;
    layer2: any;
    layer3: any;
    layer4: any;
    layer5: any;
    layer6: any;
    layer7: any;
  };
  overallScore: number;
  recommendation: 'EXECUTE' | 'REJECT' | 'WAIT';
  rejectionReason?: string;
  executionDetails?: {
    entryPrice: number;
    target: number;
    stopLoss: number;
    quantity: number;
    capitalToAllocate: number;
    riskAmount: number;
  };
}

export class TradingStrategyService {

  /**
   * Generate trading signal by running all 7 layers
   */
  async generateSignal(input: TradingSignalInput): Promise<TradingSignalOutput> {
    logger.info(`🎯 Generating trading signal for ${input.symbol} ${input.strike} ${input.optionType}`);

    // ==================== LAYER 1: Market Regime Detection ====================
    logger.info('📊 Layer 1: Analyzing market regime...');
    const layer1Result = await marketRegimeService.detectRegime({
      symbol: input.symbol,
      spotPrice: input.marketData.spotPrice,
      vixLevel: input.marketData.vixLevel,
      historicalData: input.marketData.historicalData,
    });
    logger.info(`✓ Layer 1 Score: ${layer1Result.score}/100 - ${layer1Result.regimeType}`);

    // ==================== LAYER 2: Price Action Analysis ====================
    logger.info('📈 Layer 2: Analyzing price action...');
    const layer2Result = await priceActionService.analyzePriceAction({
      symbol: input.symbol,
      timeframe: '15M',
      historicalData: input.marketData.fifteenMinData,
      currentPrice: input.marketData.spotPrice,
    });
    logger.info(`✓ Layer 2 Score: ${layer2Result.score}/100 - ${layer2Result.priceLevel}`);

    // ==================== LAYER 3: Multi-Timeframe Alignment ====================
    logger.info('⏰ Layer 3: Checking multi-timeframe alignment...');
    const layer3Result = await multiTimeframeService.analyzeTimeframes({
      symbol: input.symbol,
      oneHour: input.marketData.oneHourData,
      fifteenMin: input.marketData.fifteenMinData,
      fiveMin: input.marketData.fiveMinData,
    });
    logger.info(`✓ Layer 3 Score: ${layer3Result.score}/100 - ${layer3Result.alignment}`);

    // ==================== LAYER 4: Volatility Analysis ====================
    logger.info('📉 Layer 4: Analyzing volatility...');

    const atmIV = this.getATMImpliedVolatility(input.optionChain.strikes, input.optionChain.atmStrike);

    const layer4Result = await volatilityService.analyzeVolatility({
      symbol: input.symbol,
      vixCurrent: input.marketData.vixLevel,
      vixHistory: input.marketData.vixHistory,
      strikeIV: atmIV,
      atmIV: atmIV,
      historicalData: input.marketData.historicalData,
    });
    logger.info(`✓ Layer 4 Score: ${layer4Result.score}/100 - ${layer4Result.volRegime}`);

    // ==================== LAYER 5: Writer Ratio Filter ⚠️ CRITICAL ====================
    logger.info('🔥 Layer 5: Checking writer ratio (CRITICAL GATEKEEPER)...');
    const layer5Result = await writerRatioService.analyzeWriterRatio({
      symbol: input.symbol,
      expiry: input.expiry,
      strikes: input.optionChain.strikes,
      atmStrike: input.optionChain.atmStrike,
      targetStrike: input.optionChain.targetStrike,
      signalType: input.signalType,
    });

    if (layer5Result.writerRatioPassed) {
      logger.info(`✅ Layer 5 PASSED: Writer ratio ${layer5Result.writerRatio.toFixed(2)}x (minimum 2.5x)`);
    } else {
      logger.info(`❌ Layer 5 FAILED: Writer ratio ${layer5Result.writerRatio.toFixed(2)}x (need minimum 2.5x)`);
      logger.info(`⛔ TRADE REJECTED - Layer 5 mandatory requirement not met`);

      // Save rejected signal to database
      return this.saveRejectedSignal(input, {
        layer1: layer1Result,
        layer2: layer2Result,
        layer3: layer3Result,
        layer4: layer4Result,
        layer5: layer5Result,
        layer6: null,
        layer7: null,
      }, 'WRITER_RATIO_FAILED');
    }

    // ==================== LAYER 6: Risk Regime Filter ====================
    logger.info('⚡ Layer 6: Checking risk regime...');
    const layer6Result = await riskRegimeService.analyzeRiskRegime({
      currentTime: input.riskData.currentTime,
      marketOpenTime: input.riskData.marketOpenTime,
      marketCloseTime: input.riskData.marketCloseTime,
      symbol: input.symbol,
      isExpiryDay: input.riskData.isExpiryDay,
      upcomingEvents: input.riskData.upcomingEvents,
      currentVolume: input.riskData.currentVolume,
      avgVolume: input.riskData.avgVolume,
      circuitBreaker: input.riskData.circuitBreaker,
      vixLevel: input.marketData.vixLevel,
      dayOfWeek: input.riskData.dayOfWeek,
    });
    logger.info(`✓ Layer 6 Score: ${layer6Result.score}/100 - Risk: ${layer6Result.riskLevel}`);

    if (!layer6Result.tradingAllowed) {
      logger.info(`⚠️  Layer 6: Trading not recommended due to ${layer6Result.overallRestriction}`);
    }

    // ==================== LAYER 7: Portfolio Management ====================
    logger.info('💼 Layer 7: Calculating position sizing...');

    const proposedTrade = {
      symbol: input.symbol,
      entryPrice: input.marketData.spotPrice,
      stopLoss: this.calculateStopLoss(input.marketData.spotPrice, input.signalType, layer2Result),
      target: this.calculateTarget(input.marketData.spotPrice, input.signalType, layer2Result),
      signalStrength: (layer1Result.score + layer2Result.score + layer3Result.score + layer4Result.score + layer5Result.score + layer6Result.score) / 6,
    };

    const layer7Result = await portfolioService.analyzePortfolio({
      ...input.portfolioData,
      proposedTrade,
    });
    logger.info(`✓ Layer 7 Score: ${layer7Result.score}/100 - Position: ${layer7Result.positionSizeRecommended} units`);

    // ==================== FINAL DECISION ====================
    const overallScore = this.calculateOverallScore({
      layer1: layer1Result.score,
      layer2: layer2Result.score,
      layer3: layer3Result.score,
      layer4: layer4Result.score,
      layer5: layer5Result.score,
      layer6: layer6Result.score,
      layer7: layer7Result.score,
    });

    logger.info(`\n📊 Overall Score: ${overallScore}/100`);

    const recommendation = this.generateRecommendation(
      overallScore,
      layer5Result.writerRatioPassed,
      layer6Result.tradingAllowed,
      layer7Result.positionAllowed
    );

    logger.info(`\n🎯 Final Recommendation: ${recommendation}`);

    if (recommendation === 'EXECUTE') {
      return this.saveApprovedSignal(input, {
        layer1: layer1Result,
        layer2: layer2Result,
        layer3: layer3Result,
        layer4: layer4Result,
        layer5: layer5Result,
        layer6: layer6Result,
        layer7: layer7Result,
      }, overallScore, proposedTrade, layer7Result);
    } else {
      return this.saveRejectedSignal(input, {
        layer1: layer1Result,
        layer2: layer2Result,
        layer3: layer3Result,
        layer4: layer4Result,
        layer5: layer5Result,
        layer6: layer6Result,
        layer7: layer7Result,
      }, this.getRejectionReason(recommendation, layer6Result, layer7Result));
    }
  }

  /**
   * Calculate overall score (weighted average)
   */
  private calculateOverallScore(scores: any): number {
    // Weighted scoring:
    // Layer 5 (Writer Ratio) has double weight as it's the gatekeeper
    const weights = {
      layer1: 1.0,  // Market Regime
      layer2: 1.0,  // Price Action
      layer3: 1.0,  // Multi-Timeframe
      layer4: 1.0,  // Volatility
      layer5: 2.0,  // ⚠️ Writer Ratio (DOUBLE WEIGHT)
      layer6: 1.0,  // Risk Regime
      layer7: 1.0,  // Portfolio
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    const weightedSum =
      scores.layer1 * weights.layer1 +
      scores.layer2 * weights.layer2 +
      scores.layer3 * weights.layer3 +
      scores.layer4 * weights.layer4 +
      scores.layer5 * weights.layer5 +
      scores.layer6 * weights.layer6 +
      scores.layer7 * weights.layer7;

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Generate final recommendation
   */
  private generateRecommendation(
    overallScore: number,
    writerRatioPassed: boolean,
    tradingAllowed: boolean,
    positionAllowed: boolean
  ): 'EXECUTE' | 'REJECT' | 'WAIT' {
    // CRITICAL: Writer ratio must pass
    if (!writerRatioPassed) return 'REJECT';

    // Risk regime must allow trading
    if (!tradingAllowed) return 'WAIT';

    // Portfolio must allow position
    if (!positionAllowed) return 'REJECT';

    // Overall score must be >= 70
    if (overallScore >= 70) return 'EXECUTE';
    if (overallScore >= 50) return 'WAIT';

    return 'REJECT';
  }

  /**
   * Get rejection reason
   */
  private getRejectionReason(recommendation: string, layer6: any, layer7: any): string {
    if (recommendation === 'WAIT') {
      return layer6.overallRestriction || 'WEAK_SIGNAL';
    }
    if (!layer7.positionAllowed) {
      return layer7.warning || 'PORTFOLIO_LIMITS';
    }
    return 'LOW_OVERALL_SCORE';
  }

  /**
   * Save approved signal to database
   */
  private async saveApprovedSignal(input: any, analysis: any, overallScore: number, trade: any, layer7: any): Promise<TradingSignalOutput> {
    const signal = await prisma.tradingSignal.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        symbol: input.symbol,
        strike: input.strike,
        expiry: input.expiry,
        optionType: input.optionType,
        signalType: input.signalType,
        signalStrength: overallScore,
        entryPrice: trade.entryPrice,
        targetPrice: trade.target,
        stopLoss: trade.stopLoss,
        quantity: layer7.positionSizeRecommended,

        // Layer scores
        layer1Score: analysis.layer1.score,
        layer2Score: analysis.layer2.score,
        layer3Score: analysis.layer3.score,
        layer4Score: analysis.layer4.score,
        layer5Score: analysis.layer5.score,
        layer6Score: analysis.layer6.score,
        layer7Score: analysis.layer7.score,

        // Writer ratio (CRITICAL)
        writerRatio: analysis.layer5.writerRatio,
        writerRatioPassed: analysis.layer5.writerRatioPassed,
        callWriters: analysis.layer5.callWriters,
        putWriters: analysis.layer5.putWriters,

        // Market context
        vixLevel: input.marketData.vixLevel,
        marketRegime: analysis.layer1.regimeType,
        timeframe: '15M',

        // Analysis data
        priceActionZones: analysis.layer2,
        multiTimeframeData: analysis.layer3,
        volatilityMetrics: analysis.layer4,
        riskMetrics: layer7,

        // Signal status
        status: SignalStatus.APPROVED,
        statusReason: `All layers passed. Overall score: ${overallScore}/100`,
      },
    });

    return {
      success: true,
      signal,
      analysis,
      overallScore,
      recommendation: 'EXECUTE',
      executionDetails: {
        entryPrice: trade.entryPrice,
        target: trade.target,
        stopLoss: trade.stopLoss,
        quantity: layer7.positionSizeRecommended,
        capitalToAllocate: layer7.capitalToAllocate,
        riskAmount: layer7.riskAmount,
      },
    };
  }

  /**
   * Save rejected signal to database
   */
  private async saveRejectedSignal(input: any, analysis: any, rejectionReason: string): Promise<TradingSignalOutput> {
    const signal = await prisma.tradingSignal.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        symbol: input.symbol,
        strike: input.strike,
        expiry: input.expiry,
        optionType: input.optionType,
        signalType: input.signalType,
        signalStrength: 0,

        // Layer scores (may be partial)
        layer1Score: analysis.layer1?.score || 0,
        layer2Score: analysis.layer2?.score || 0,
        layer3Score: analysis.layer3?.score || 0,
        layer4Score: analysis.layer4?.score || 0,
        layer5Score: analysis.layer5?.score || 0,
        layer6Score: analysis.layer6?.score || 0,
        layer7Score: analysis.layer7?.score || 0,

        // Writer ratio
        writerRatio: analysis.layer5?.writerRatio || 0,
        writerRatioPassed: false,
        callWriters: analysis.layer5?.callWriters || 0,
        putWriters: analysis.layer5?.putWriters || 0,

        // Market context
        vixLevel: input.marketData.vixLevel,
        marketRegime: analysis.layer1?.regimeType || 'UNCERTAIN',

        // Signal status
        status: SignalStatus.REJECTED,
        statusReason: rejectionReason,
      },
    });

    return {
      success: false,
      signal,
      analysis,
      overallScore: 0,
      recommendation: 'REJECT',
      rejectionReason,
    };
  }

  /**
   * Helper: Get ATM Implied Volatility
   */
  private getATMImpliedVolatility(strikes: any[], atmStrike: number): number {
    const atmOption = strikes.find(s => s.strike === atmStrike);
    return atmOption?.callIV || 20; // Default 20% if not found
  }

  /**
   * Helper: Calculate stop loss based on price action zones
   */
  private calculateStopLoss(entryPrice: number, signalType: SignalType, layer2: any): number {
    // For BUY CALL: Stop below demand zone
    // For BUY PUT: Stop above supply zone

    const stopPercentage = 0.02; // 2% default stop

    if (signalType === 'BUY_CALL') {
      return entryPrice * (1 - stopPercentage);
    } else {
      return entryPrice * (1 + stopPercentage);
    }
  }

  /**
   * Helper: Calculate target based on risk-reward ratio
   */
  private calculateTarget(entryPrice: number, signalType: SignalType, layer2: any): number {
    const targetPercentage = 0.05; // 5% target (2.5:1 R:R)

    if (signalType === 'BUY_CALL') {
      return entryPrice * (1 + targetPercentage);
    } else {
      return entryPrice * (1 - targetPercentage);
    }
  }
}

export const tradingStrategyService = new TradingStrategyService();
