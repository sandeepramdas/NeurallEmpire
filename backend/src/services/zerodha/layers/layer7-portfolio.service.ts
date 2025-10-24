/**
 * Layer 7: Portfolio Management
 *
 * Manages capital allocation, position sizing, and risk management.
 * Uses Kelly Criterion for optimal position sizing and enforces risk limits.
 *
 * Key Metrics:
 * - Position sizing using Kelly Criterion
 * - Portfolio risk (total capital at risk)
 * - Max positions allowed (diversification)
 * - Win rate and profit factor analysis
 * - Capital preservation rules
 */

export interface PortfolioInput {
  totalCapital: number;
  availableCapital: number; // Capital not in active positions
  openPositions: {
    symbol: string;
    capitalAllocated: number;
    unrealizedPnL: number;
  }[];
  tradingHistory: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  };
  proposedTrade: {
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    target: number;
    signalStrength: number; // 0-100 (combined score from Layers 1-6)
  };
  riskPerTrade: number; // % of capital to risk (e.g., 2%)
  maxOpenPositions: number; // Max concurrent positions
}

export interface PortfolioResult {
  score: number; // 0-100 (Layer 7 score)
  positionSizeRecommended: number; // Recommended quantity
  capitalToAllocate: number; // Total capital for this trade
  riskAmount: number; // Amount at risk (capital * risk%)
  positionAllowed: boolean; // Can we take this position?
  kellyFraction: number; // Kelly Criterion result
  kellyPositionSize: number; // Position size based on Kelly
  adjustedPositionSize: number; // Final position size (may be reduced)
  portfolioRisk: {
    currentRisk: number; // % of capital at risk in open positions
    projectedRisk: number; // % if we add this new position
    maxRiskAllowed: number; // Maximum allowed risk (e.g., 10%)
    withinLimits: boolean;
  };
  diversification: {
    currentPositions: number;
    maxPositions: number;
    withinLimits: boolean;
  };
  capitalAllocation: {
    total: number;
    allocated: number;
    available: number;
    percentAllocated: number;
  };
  reason: string;
  warning?: string;
}

export class PortfolioService {

  // Risk Management Parameters
  private readonly MAX_PORTFOLIO_RISK = 10; // Max 10% of capital at risk at any time
  private readonly KELLY_MULTIPLIER = 0.25; // Use 25% of Kelly (quarter-Kelly for safety)
  private readonly MIN_WIN_RATE = 0.40; // Need at least 40% win rate to trade
  private readonly MIN_PROFIT_FACTOR = 1.2; // Need at least 1.2 profit factor

  /**
   * Analyze portfolio and recommend position sizing
   */
  async analyzePortfolio(data: PortfolioInput): Promise<PortfolioResult> {
    // Step 1: Calculate Kelly Criterion for optimal position sizing
    const kelly = this.calculateKellyCriterion(data.tradingHistory, data.proposedTrade);

    // Step 2: Calculate portfolio risk
    const portfolioRisk = this.calculatePortfolioRisk(
      data.totalCapital,
      data.openPositions,
      data.proposedTrade,
      data.riskPerTrade
    );

    // Step 3: Check diversification limits
    const diversification = this.checkDiversification(
      data.openPositions.length,
      data.maxOpenPositions
    );

    // Step 4: Calculate capital allocation
    const capitalAllocation = this.calculateCapitalAllocation(
      data.totalCapital,
      data.availableCapital,
      data.openPositions
    );

    // Step 5: Determine if position is allowed
    const positionAllowed = this.determinePositionAllowed(
      portfolioRisk,
      diversification,
      kelly.kellyFraction,
      data.tradingHistory
    );

    // Step 6: Calculate recommended position size
    const positionSizing = this.calculatePositionSize(
      data.totalCapital,
      data.availableCapital,
      data.proposedTrade,
      data.riskPerTrade,
      kelly.kellyFraction,
      portfolioRisk,
      positionAllowed
    );

    // Step 7: Calculate Layer 7 score
    const score = this.calculatePortfolioScore(
      positionAllowed,
      kelly.kellyFraction,
      portfolioRisk,
      diversification,
      capitalAllocation,
      data.tradingHistory
    );

    return {
      score,
      positionSizeRecommended: positionSizing.quantity,
      capitalToAllocate: positionSizing.capitalToAllocate,
      riskAmount: positionSizing.riskAmount,
      positionAllowed,
      kellyFraction: kelly.kellyFraction,
      kellyPositionSize: kelly.kellyPositionSize,
      adjustedPositionSize: positionSizing.quantity,
      portfolioRisk,
      diversification,
      capitalAllocation,
      reason: this.explainScore(
        score,
        positionAllowed,
        portfolioRisk,
        diversification,
        kelly.kellyFraction
      ),
      warning: !positionAllowed ? this.generateWarning(portfolioRisk, diversification, kelly) : undefined,
    };
  }

  /**
   * Calculate Kelly Criterion for optimal position sizing
   *
   * Kelly % = (Win% × Avg Win / Avg Loss) - (1 - Win%)
   */
  private calculateKellyCriterion(
    history: Record<string, unknown>,
    proposedTrade: Record<string, unknown>
  ): { kellyFraction: number; kellyPositionSize: number} {
    const totalTrades = history.totalTrades as number;
    if (totalTrades < 20) {
      // Not enough history, use conservative sizing
      return { kellyFraction: 0.02, kellyPositionSize: 0.02 }; // 2%
    }

    const winningTrades = history.winningTrades as number;
    const winRate = winningTrades / totalTrades;
    const lossRate = 1 - winRate;

    const avgLoss = history.avgLoss as number;
    if (avgLoss === 0) {
      return { kellyFraction: 0.02, kellyPositionSize: 0.02 };
    }

    const avgWin = history.avgWin as number;
    const winLossRatio = Math.abs(avgWin / avgLoss);

    // Kelly Formula
    let kellyFraction = (winRate * winLossRatio - lossRate) / winLossRatio;

    // Cap Kelly at reasonable levels (never risk more than 25% on single trade)
    kellyFraction = Math.max(0, Math.min(0.25, kellyFraction));

    // Apply Kelly multiplier for safety (quarter-Kelly)
    const adjustedKelly = kellyFraction * this.KELLY_MULTIPLIER;

    return {
      kellyFraction: kellyFraction,
      kellyPositionSize: adjustedKelly,
    };
  }

  /**
   * Calculate current and projected portfolio risk
   */
  private calculatePortfolioRisk(
    totalCapital: number,
    openPositions: Record<string, unknown>[],
    proposedTrade: Record<string, unknown>,
    riskPerTrade: number
  ): {
    currentRisk: number;
    projectedRisk: number;
    maxRiskAllowed: number;
    withinLimits: boolean;
  } {
    // Calculate current risk (sum of capital at risk in open positions)
    const currentRiskAmount = openPositions.reduce((total, pos) => {
      return total + (pos.capitalAllocated as number);
    }, 0);

    const currentRisk = (currentRiskAmount / totalCapital) * 100;

    // Calculate risk for proposed trade
    const riskPercentage = riskPerTrade / 100;
    const tradeRiskAmount = totalCapital * riskPercentage;

    const projectedRisk = ((currentRiskAmount + tradeRiskAmount) / totalCapital) * 100;

    const withinLimits = projectedRisk <= this.MAX_PORTFOLIO_RISK;

    return {
      currentRisk,
      projectedRisk,
      maxRiskAllowed: this.MAX_PORTFOLIO_RISK,
      withinLimits,
    };
  }

  /**
   * Check diversification limits
   */
  private checkDiversification(
    currentPositions: number,
    maxPositions: number
  ): { currentPositions: number; maxPositions: number; withinLimits: boolean } {
    const withinLimits = currentPositions < maxPositions;

    return {
      currentPositions,
      maxPositions,
      withinLimits,
    };
  }

  /**
   * Calculate capital allocation
   */
  private calculateCapitalAllocation(
    totalCapital: number,
    availableCapital: number,
    openPositions: Record<string, unknown>[]
  ): {
    total: number;
    allocated: number;
    available: number;
    percentAllocated: number;
  } {
    const allocated = openPositions.reduce((total, pos) => total + (pos.capitalAllocated as number), 0);
    const percentAllocated = (allocated / totalCapital) * 100;

    return {
      total: totalCapital,
      allocated,
      available: availableCapital,
      percentAllocated,
    };
  }

  /**
   * Determine if position is allowed based on all constraints
   */
  private determinePositionAllowed(
    portfolioRisk: Record<string, unknown>,
    diversification: Record<string, unknown>,
    kellyFraction: number,
    tradingHistory: Record<string, unknown>
  ): boolean {
    // Check all constraints
    if (!portfolioRisk.withinLimits) return false; // Portfolio risk too high
    if (!diversification.withinLimits) return false; // Too many open positions

    // Check if Kelly is negative (negative edge)
    if (kellyFraction <= 0) return false;

    // Check minimum win rate and profit factor
    const totalTrades = tradingHistory.totalTrades as number;
    if (totalTrades >= 20) {
      const winningTrades = tradingHistory.winningTrades as number;
      const winRate = winningTrades / totalTrades;
      if (winRate < this.MIN_WIN_RATE) return false;
      const profitFactor = tradingHistory.profitFactor as number;
      if (profitFactor < this.MIN_PROFIT_FACTOR) return false;
    }

    return true;
  }

  /**
   * Calculate recommended position size
   */
  private calculatePositionSize(
    totalCapital: number,
    availableCapital: number,
    proposedTrade: Record<string, unknown>,
    riskPerTrade: number,
    kellyFraction: number,
    portfolioRisk: Record<string, unknown>,
    positionAllowed: boolean
  ): {
    quantity: number;
    capitalToAllocate: number;
    riskAmount: number;
  } {
    if (!positionAllowed) {
      return {
        quantity: 0,
        capitalToAllocate: 0,
        riskAmount: 0,
      };
    }

    // Calculate risk amount (how much we're willing to lose)
    const riskPercentage = riskPerTrade / 100;
    const riskAmount = totalCapital * riskPercentage;

    // Calculate distance to stop loss
    const entryPrice = proposedTrade.entryPrice as number;
    const stopLoss = proposedTrade.stopLoss as number;
    const stopDistance = Math.abs(entryPrice - stopLoss);
    const stopPercentage = stopDistance / entryPrice;

    // Calculate position size based on risk
    // Position Size = Risk Amount / (Entry Price × Stop %)
    let quantity = Math.floor(riskAmount / (entryPrice * stopPercentage));

    // Apply Kelly sizing if available
    if (kellyFraction > 0) {
      const kellySize = Math.floor((totalCapital * kellyFraction * this.KELLY_MULTIPLIER) / entryPrice);
      quantity = Math.min(quantity, kellySize); // Take the more conservative size
    }

    // Calculate capital to allocate
    const capitalToAllocate = quantity * entryPrice;

    // Ensure we don't exceed available capital
    if (capitalToAllocate > availableCapital) {
      quantity = Math.floor(availableCapital / entryPrice);
    }

    return {
      quantity: Math.max(0, quantity),
      capitalToAllocate: quantity * entryPrice,
      riskAmount,
    };
  }

  /**
   * Calculate Layer 7 score (0-100)
   */
  private calculatePortfolioScore(
    positionAllowed: boolean,
    kellyFraction: number,
    portfolioRisk: Record<string, unknown>,
    diversification: Record<string, unknown>,
    capitalAllocation: Record<string, unknown>,
    tradingHistory: Record<string, unknown>
  ): number {
    if (!positionAllowed) {
      return 0; // No position allowed = 0 score
    }

    let score = 100;

    // Portfolio risk penalty
    const projectedRisk = portfolioRisk.projectedRisk as number;
    if (projectedRisk > 8) score -= 20;
    else if (projectedRisk > 6) score -= 10;

    // Diversification penalty
    const currentPositions = diversification.currentPositions as number;
    const maxPositions = diversification.maxPositions as number;
    const diversificationRatio = currentPositions / maxPositions;
    if (diversificationRatio > 0.8) score -= 15; // Using 80%+ of allowed positions
    else if (diversificationRatio > 0.6) score -= 5;

    // Capital allocation penalty
    const percentAllocated = capitalAllocation.percentAllocated as number;
    if (percentAllocated > 80) score -= 15;
    else if (percentAllocated > 60) score -= 5;

    // Kelly fraction bonus/penalty
    if (kellyFraction > 0.15) score += 10; // Strong edge
    else if (kellyFraction > 0.10) score += 5; // Good edge
    else if (kellyFraction < 0.05) score -= 10; // Weak edge

    // Trading history bonus (if profitable)
    const totalTrades = tradingHistory.totalTrades as number;
    if (totalTrades >= 20) {
      const profitFactor = tradingHistory.profitFactor as number;
      if (profitFactor > 2.0) score += 10;
      else if (profitFactor > 1.5) score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate warning message
   */
  private generateWarning(portfolioRisk: Record<string, unknown>, diversification: Record<string, unknown>, kelly: Record<string, unknown>): string {
    const reasons: string[] = [];

    if (!portfolioRisk.withinLimits) {
      const projectedRisk = portfolioRisk.projectedRisk as number;
      const maxRiskAllowed = portfolioRisk.maxRiskAllowed as number;
      reasons.push(`Portfolio risk too high (${projectedRisk.toFixed(1)}% > ${maxRiskAllowed}%)`);
    }

    if (!diversification.withinLimits) {
      const currentPos = diversification.currentPositions as number;
      const maxPos = diversification.maxPositions as number;
      reasons.push(`Max positions reached (${currentPos}/${maxPos})`);
    }

    const kellyFraction = kelly.kellyFraction as number;
    if (kellyFraction <= 0) {
      reasons.push('Negative Kelly Criterion (no statistical edge)');
    }

    return `⚠️ Position NOT allowed: ${reasons.join(', ')}`;
  }

  /**
   * Explain the score
   */
  private explainScore(
    score: number,
    positionAllowed: boolean,
    portfolioRisk: Record<string, unknown>,
    diversification: Record<string, unknown>,
    kellyFraction: number
  ): string {
    const reasons: string[] = [];

    if (!positionAllowed) {
      reasons.push('❌ Position NOT allowed');
      if (!portfolioRisk.withinLimits) {
        reasons.push('Portfolio risk limit exceeded');
      }
      if (!diversification.withinLimits) {
        reasons.push('Maximum positions reached');
      }
    } else {
      reasons.push('✅ Position allowed');
      const projectedRisk = portfolioRisk.projectedRisk as number;
      const maxRiskAllowed = portfolioRisk.maxRiskAllowed as number;
      const currentPos = diversification.currentPositions as number;
      const maxPos = diversification.maxPositions as number;
      reasons.push(`Portfolio risk: ${projectedRisk.toFixed(1)}% (limit: ${maxRiskAllowed}%)`);
      reasons.push(`Open positions: ${currentPos}/${maxPos}`);
      reasons.push(`Kelly fraction: ${(kellyFraction * 100).toFixed(1)}%`);

      if (score >= 80) {
        reasons.push('Excellent portfolio health');
      } else if (score >= 60) {
        reasons.push('Good portfolio health');
      } else {
        reasons.push('Portfolio near limits, reduce position size');
      }
    }

    return reasons.join('. ');
  }
}

export const portfolioService = new PortfolioService();
