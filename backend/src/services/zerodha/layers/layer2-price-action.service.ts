/**
 * Layer 2: Price Action Analysis
 *
 * Analyzes price structure, supply/demand zones, and institutional patterns.
 * Identifies high-probability entry zones based on order flow and market structure.
 *
 * Key Metrics:
 * - Supply and Demand zones
 * - Institutional order blocks
 * - Fair Value Gaps (FVG)
 * - Liquidity pools and sweeps
 * - Market structure breaks
 */

export interface PriceActionData {
  symbol: string;
  timeframe: string;
  historicalData: {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  currentPrice: number;
}

export interface Zone {
  type: 'SUPPLY' | 'DEMAND' | 'ORDER_BLOCK' | 'FVG';
  high: number;
  low: number;
  strength: number; // 0-100
  tested: number; // How many times tested
  fresh: boolean; // Never been tested
}

export interface PriceActionResult {
  score: number; // 0-100 (Layer 2 score)
  priceLevel: 'AT_DEMAND' | 'AT_SUPPLY' | 'IN_RANGE' | 'NO_ZONE';
  supplyZones: Zone[];
  demandZones: Zone[];
  orderBlocks: Zone[];
  fairValueGaps: Zone[];
  marketStructure: 'HIGHER_HIGHS' | 'LOWER_LOWS' | 'RANGING';
  structureBreak: boolean;
  liquiditySweep: boolean;
  tradingBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reason: string;
}

export class PriceActionService {

  /**
   * Analyze price action and calculate Layer 2 score
   */
  async analyzePriceAction(data: PriceActionData): Promise<PriceActionResult> {
    const demandZones = this.identifyDemandZones(data.historicalData);
    const supplyZones = this.identifySupplyZones(data.historicalData);
    const orderBlocks = this.identifyOrderBlocks(data.historicalData);
    const fairValueGaps = this.identifyFairValueGaps(data.historicalData);

    const marketStructure = this.analyzeMarketStructure(data.historicalData);
    const structureBreak = this.detectStructureBreak(data.historicalData);
    const liquiditySweep = this.detectLiquiditySweep(data.historicalData);

    const priceLevel = this.determinePriceLevel(data.currentPrice, demandZones, supplyZones);
    const tradingBias = this.calculateTradingBias(
      priceLevel,
      marketStructure,
      structureBreak,
      liquiditySweep
    );

    const score = this.calculatePriceActionScore(
      priceLevel,
      demandZones,
      supplyZones,
      orderBlocks,
      marketStructure,
      structureBreak,
      liquiditySweep
    );

    return {
      score,
      priceLevel,
      supplyZones,
      demandZones,
      orderBlocks,
      fairValueGaps,
      marketStructure,
      structureBreak,
      liquiditySweep,
      tradingBias,
      reason: this.explainScore(score, priceLevel, tradingBias, structureBreak),
    };
  }

  /**
   * Identify demand zones (strong buying areas)
   */
  private identifyDemandZones(data: { open: number; high: number; low: number; close: number; volume: number }[]): Zone[] {
    const zones: Zone[] = [];

    for (let i = 2; i < data.length - 2; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];

      // Look for strong bullish candle after consolidation
      const isBullishEngulfing = current.close > current.open && current.close > prev.high;
      const hasVolume = current.volume > data[i - 1].volume * 1.5;

      if (isBullishEngulfing && hasVolume) {
        const zone: Zone = {
          type: 'DEMAND',
          high: current.high,
          low: current.low,
          strength: this.calculateZoneStrength(data, i, 'DEMAND'),
          tested: this.countZoneTouches(data, current.low, current.high, i),
          fresh: true,
        };

        zone.fresh = zone.tested === 0;
        zones.push(zone);
      }
    }

    // Return only the strongest zones (top 5)
    return zones.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  /**
   * Identify supply zones (strong selling areas)
   */
  private identifySupplyZones(data: { open: number; high: number; low: number; close: number; volume: number }[]): Zone[] {
    const zones: Zone[] = [];

    for (let i = 2; i < data.length - 2; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];

      // Look for strong bearish candle after consolidation
      const isBearishEngulfing = current.close < current.open && current.close < prev.low;
      const hasVolume = current.volume > data[i - 1].volume * 1.5;

      if (isBearishEngulfing && hasVolume) {
        const zone: Zone = {
          type: 'SUPPLY',
          high: current.high,
          low: current.low,
          strength: this.calculateZoneStrength(data, i, 'SUPPLY'),
          tested: this.countZoneTouches(data, current.low, current.high, i),
          fresh: true,
        };

        zone.fresh = zone.tested === 0;
        zones.push(zone);
      }
    }

    return zones.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  /**
   * Identify order blocks (institutional footprints)
   */
  private identifyOrderBlocks(data: { open: number; high: number; low: number; close: number }[]): Zone[] {
    const zones: Zone[] = [];

    for (let i = 3; i < data.length - 1; i++) {
      const candle1 = data[i - 3];
      const candle2 = data[i - 2];
      const candle3 = data[i - 1];
      const candle4 = data[i];

      // Bullish Order Block: Small red candle before big green move
      if (candle3.close < candle3.open && candle4.close > candle4.open) {
        const moveSize = candle4.close - candle4.open;
        const prevSize = candle3.open - candle3.close;

        if (moveSize > prevSize * 2) {
          zones.push({
            type: 'ORDER_BLOCK',
            high: candle3.high,
            low: candle3.low,
            strength: 80,
            tested: 0,
            fresh: true,
          });
        }
      }

      // Bearish Order Block: Small green candle before big red move
      if (candle3.close > candle3.open && candle4.close < candle4.open) {
        const moveSize = candle4.open - candle4.close;
        const prevSize = candle3.close - candle3.open;

        if (moveSize > prevSize * 2) {
          zones.push({
            type: 'ORDER_BLOCK',
            high: candle3.high,
            low: candle3.low,
            strength: 80,
            tested: 0,
            fresh: true,
          });
        }
      }
    }

    return zones.slice(-10); // Last 10 order blocks
  }

  /**
   * Identify Fair Value Gaps (inefficiencies in price)
   */
  private identifyFairValueGaps(data: { high: number; low: number }[]): Zone[] {
    const gaps: Zone[] = [];

    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];

      // Bullish FVG: Gap between prev.high and next.low
      if (next.low > prev.high && (current as any).close > (current as any).open) {
        gaps.push({
          type: 'FVG',
          high: next.low,
          low: prev.high,
          strength: 70,
          tested: 0,
          fresh: true,
        });
      }

      // Bearish FVG: Gap between prev.low and next.high
      if (next.high < prev.low && (current as any).close < (current as any).open) {
        gaps.push({
          type: 'FVG',
          high: prev.low,
          low: next.high,
          strength: 70,
          tested: 0,
          fresh: true,
        });
      }
    }

    return gaps.slice(-5); // Last 5 FVGs
  }

  /**
   * Analyze market structure (Higher Highs, Lower Lows, or Ranging)
   */
  private analyzeMarketStructure(data: { high: number; low: number }[]): 'HIGHER_HIGHS' | 'LOWER_LOWS' | 'RANGING' {
    if (data.length < 20) return 'RANGING';

    const recentData = data.slice(-20);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);

    const recentHigh = Math.max(...highs.slice(-5));
    const previousHigh = Math.max(...highs.slice(0, 10));

    const recentLow = Math.min(...lows.slice(-5));
    const previousLow = Math.min(...lows.slice(0, 10));

    if (recentHigh > previousHigh && recentLow > previousLow) {
      return 'HIGHER_HIGHS';
    } else if (recentHigh < previousHigh && recentLow < previousLow) {
      return 'LOWER_LOWS';
    }

    return 'RANGING';
  }

  /**
   * Detect structure break (change in trend)
   */
  private detectStructureBreak(data: { high: number; low: number; close: number }[]): boolean {
    if (data.length < 10) return false;

    const recent = data.slice(-10);
    const current = data[data.length - 1];
    const previousHigh = Math.max(...recent.slice(0, 5).map(d => d.high));
    const previousLow = Math.min(...recent.slice(0, 5).map(d => d.low));

    // Bullish structure break: Close above previous high
    if (current.close > previousHigh) return true;

    // Bearish structure break: Close below previous low
    if (current.close < previousLow) return true;

    return false;
  }

  /**
   * Detect liquidity sweep (stop hunt before reversal)
   */
  private detectLiquiditySweep(data: { open: number; high: number; low: number; close: number }[]): boolean {
    if (data.length < 5) return false;

    const current = data[data.length - 1];
    const prev = data[data.length - 2];

    // Bullish sweep: Wick below previous low, then close higher
    const bullishSweep = current.low < prev.low && current.close > current.open && current.close > prev.close;

    // Bearish sweep: Wick above previous high, then close lower
    const bearishSweep = current.high > prev.high && current.close < current.open && current.close < prev.close;

    return bullishSweep || bearishSweep;
  }

  /**
   * Determine if price is at a key level
   */
  private determinePriceLevel(price: number, demandZones: Zone[], supplyZones: Zone[]): 'AT_DEMAND' | 'AT_SUPPLY' | 'IN_RANGE' | 'NO_ZONE' {
    const tolerance = 0.002; // 0.2% tolerance

    for (const zone of demandZones) {
      if (price >= zone.low * (1 - tolerance) && price <= zone.high * (1 + tolerance)) {
        return 'AT_DEMAND';
      }
    }

    for (const zone of supplyZones) {
      if (price >= zone.low * (1 - tolerance) && price <= zone.high * (1 + tolerance)) {
        return 'AT_SUPPLY';
      }
    }

    return 'NO_ZONE';
  }

  /**
   * Calculate trading bias based on price action
   */
  private calculateTradingBias(
    priceLevel: string,
    structure: string,
    structureBreak: boolean,
    liquiditySweep: boolean
  ): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    let bullishPoints = 0;
    let bearishPoints = 0;

    if (priceLevel === 'AT_DEMAND') bullishPoints += 2;
    if (priceLevel === 'AT_SUPPLY') bearishPoints += 2;

    if (structure === 'HIGHER_HIGHS') bullishPoints += 2;
    if (structure === 'LOWER_LOWS') bearishPoints += 2;

    if (structureBreak) bullishPoints += 1; // Structure breaks can signal reversals

    if (liquiditySweep) bullishPoints += 1; // Liquidity sweeps often lead to reversals

    if (bullishPoints > bearishPoints + 1) return 'BULLISH';
    if (bearishPoints > bullishPoints + 1) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Calculate Layer 2 score (0-100)
   */
  private calculatePriceActionScore(
    priceLevel: string,
    demandZones: Zone[],
    supplyZones: Zone[],
    orderBlocks: Zone[],
    structure: string,
    structureBreak: boolean,
    liquiditySweep: boolean
  ): number {
    let score = 0;

    // Price at key level = high score
    if (priceLevel === 'AT_DEMAND' || priceLevel === 'AT_SUPPLY') {
      score += 40;

      // Fresh zone = bonus
      const zones = priceLevel === 'AT_DEMAND' ? demandZones : supplyZones;
      if (zones[0]?.fresh) score += 20;
    } else {
      score += 10; // Not at key level = lower score
    }

    // Market structure alignment
    if (structure === 'HIGHER_HIGHS' || structure === 'LOWER_LOWS') {
      score += 20; // Clear trend
    } else {
      score += 5; // Ranging
    }

    // Structure break = potential reversal opportunity
    if (structureBreak) score += 10;

    // Liquidity sweep = potential reversal
    if (liquiditySweep) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate zone strength
   */
  private calculateZoneStrength(data: any[], index: number, type: 'SUPPLY' | 'DEMAND'): number {
    let strength = 50;

    // Volume strength
    const avgVolume = data.slice(Math.max(0, index - 10), index).reduce((sum, d) => sum + d.volume, 0) / 10;
    if (data[index].volume > avgVolume * 1.5) strength += 20;

    // Price range strength
    const range = data[index].high - data[index].low;
    const avgRange = data.slice(Math.max(0, index - 10), index).reduce((sum, d) => sum + (d.high - d.low), 0) / 10;
    if (range > avgRange * 1.3) strength += 15;

    // Reaction strength (how price moved after)
    if (index < data.length - 5) {
      const futureMove = Math.abs(data[index + 5].close - data[index].close);
      const avgMove = avgRange * 3;
      if (futureMove > avgMove) strength += 15;
    }

    return Math.min(100, strength);
  }

  /**
   * Count how many times a zone has been touched
   */
  private countZoneTouches(data: any[], zoneLow: number, zoneHigh: number, startIndex: number): number {
    let touches = 0;

    for (let i = startIndex + 1; i < data.length; i++) {
      if (data[i].low <= zoneHigh && data[i].high >= zoneLow) {
        touches++;
      }
    }

    return touches;
  }

  /**
   * Explain the score
   */
  private explainScore(score: number, priceLevel: string, bias: string, structureBreak: boolean): string {
    const reasons: string[] = [];

    reasons.push(`Price level: ${priceLevel}`);
    reasons.push(`Trading bias: ${bias}`);

    if (structureBreak) {
      reasons.push('Structure break detected');
    }

    if (score >= 70) {
      reasons.push('Strong price action setup');
    } else if (score >= 50) {
      reasons.push('Moderate price action setup');
    } else {
      reasons.push('Weak price action, wait for better setup');
    }

    return reasons.join('. ');
  }
}

export const priceActionService = new PriceActionService();
