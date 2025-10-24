/**
 * Zerodha Trading Controller
 *
 * Handles all Zerodha trading-related API requests including:
 * - Signal generation
 * - Position management
 * - Trade history
 * - Backtesting
 * - Dashboard metrics
 */

import { Request, Response } from 'express';
import { PrismaClient, SignalType, OptionType } from '@prisma/client';
import { tradingStrategyService } from '../services/zerodha/trading-strategy.service';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

export class ZerodhaController {

  /**
   * Generate new trading signal
   * POST /api/zerodha/signals
   */
  async generateSignal(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const {
        symbol,
        strike,
        expiry,
        optionType,
        signalType,
        marketData,
        optionChain,
        riskData,
        portfolioData,
      } = req.body;

      // Validate required fields
      if (!symbol || !strike || !expiry || !optionType || !signalType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: symbol, strike, expiry, optionType, signalType',
        });
      }

      // Generate signal using 7-layer strategy
      const result = await tradingStrategyService.generateSignal({
        userId,
        organizationId,
        symbol,
        strike,
        expiry: new Date(expiry),
        optionType,
        signalType,
        marketData,
        optionChain,
        riskData: {
          ...riskData,
          currentTime: new Date(riskData.currentTime),
          marketOpenTime: new Date(riskData.marketOpenTime),
          marketCloseTime: new Date(riskData.marketCloseTime),
        },
        portfolioData,
      });

      return res.status(result.success ? 201 : 200).json({
        success: result.success,
        data: {
          signal: result.signal,
          recommendation: result.recommendation,
          overallScore: result.overallScore,
          executionDetails: result.executionDetails,
          rejectionReason: result.rejectionReason,
        },
        analysis: result.analysis,
      });
    } catch (error: any) {
      logger.error('Error generating signal:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate trading signal',
        message: error.message,
      });
    }
  }

  /**
   * Get all signals
   * GET /api/zerodha/signals
   */
  async getSignals(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { status, symbol, limit = 50, offset = 0 } = req.query;

      const where: any = {
        organizationId,
        userId,
      };

      if (status) where.status = status;
      if (symbol) where.symbol = symbol;

      const signals = await prisma.tradingSignal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.tradingSignal.count({ where });

      return res.json({
        success: true,
        data: signals,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching signals:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch signals',
        message: error.message,
      });
    }
  }

  /**
   * Get signal by ID
   * GET /api/zerodha/signals/:id
   */
  async getSignalById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { id } = req.params;

      const signal = await prisma.tradingSignal.findFirst({
        where: {
          id,
          organizationId,
          userId,
        },
      });

      if (!signal) {
        return res.status(404).json({
          success: false,
          error: 'Signal not found',
        });
      }

      return res.json({
        success: true,
        data: signal,
      });
    } catch (error: any) {
      logger.error('Error fetching signal:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch signal',
        message: error.message,
      });
    }
  }

  /**
   * Open new position from signal
   * POST /api/zerodha/positions
   */
  async openPosition(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      const {
        signalId,
        symbol,
        strike,
        expiry,
        optionType,
        positionType,
        entryPrice,
        quantity,
        stopLoss,
        target,
      } = req.body;

      // Validate required fields
      if (!symbol || !strike || !expiry || !optionType || !entryPrice || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      // Create position
      const position = await prisma.tradingPosition.create({
        data: {
          organizationId,
          userId,
          signalId: signalId || null,
          symbol,
          strike,
          expiry: new Date(expiry),
          optionType,
          positionType,
          entryPrice,
          quantity,
          entryValue: entryPrice * quantity,
          stopLoss,
          target,
          status: 'OPEN',
        },
      });

      // Update signal status if provided
      if (signalId) {
        await prisma.tradingSignal.update({
          where: { id: signalId },
          data: {
            status: 'EXECUTED',
            executedAt: new Date(),
            actualEntry: entryPrice,
          },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Position opened successfully',
        data: position,
      });
    } catch (error: any) {
      logger.error('Error opening position:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to open position',
        message: error.message,
      });
    }
  }

  /**
   * Get all positions
   * GET /api/zerodha/positions
   */
  async getPositions(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { status = 'OPEN', symbol } = req.query;

      const where: any = {
        organizationId,
        userId,
      };

      if (status) where.status = status;
      if (symbol) where.symbol = symbol;

      const positions = await prisma.tradingPosition.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          signal: true,
        },
      });

      return res.json({
        success: true,
        data: positions,
      });
    } catch (error: any) {
      logger.error('Error fetching positions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch positions',
        message: error.message,
      });
    }
  }

  /**
   * Close position
   * PUT /api/zerodha/positions/:id/close
   */
  async closePosition(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { id } = req.params;
      const { exitPrice, exitReason } = req.body;

      // Get position
      const position = await prisma.tradingPosition.findFirst({
        where: {
          id,
          organizationId,
          userId,
          status: 'OPEN',
        },
      });

      if (!position) {
        return res.status(404).json({
          success: false,
          error: 'Position not found or already closed',
        });
      }

      // Calculate P&L
      const exitValue = exitPrice * position.quantity;
      const realizedPnL = exitValue - position.entryValue;
      const realizedROI = (realizedPnL / position.entryValue) * 100;

      // Update position
      const updatedPosition = await prisma.tradingPosition.update({
        where: { id },
        data: {
          exitPrice,
          exitTime: new Date(),
          exitValue,
          realizedPnL,
          realizedROI,
          status: 'CLOSED',
          exitReason: exitReason || 'MANUAL',
        },
      });

      // Create trade record
      const trade = await prisma.tradingTrade.create({
        data: {
          organizationId,
          userId,
          positionId: position.id,
          symbol: position.symbol,
          strike: position.strike,
          expiry: position.expiry,
          optionType: position.optionType,
          positionType: position.positionType,
          entryPrice: position.entryPrice,
          exitPrice,
          quantity: position.quantity,
          entryValue: position.entryValue,
          exitValue,
          grossPnL: realizedPnL,
          netPnL: realizedPnL, // Assume no brokerage for now
          roi: realizedROI,
          entryTime: position.entryTime,
          exitTime: new Date(),
          holdingPeriod: Math.floor((new Date().getTime() - position.entryTime.getTime()) / (1000 * 60)),
          tradeResult: realizedPnL > 0 ? 'WIN' : realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN',
          exitReason: exitReason || 'MANUAL',
        },
      });

      return res.json({
        success: true,
        message: 'Position closed successfully',
        data: {
          position: updatedPosition,
          trade,
        },
      });
    } catch (error: any) {
      logger.error('Error closing position:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to close position',
        message: error.message,
      });
    }
  }

  /**
   * Get trade history
   * GET /api/zerodha/trades
   */
  async getTrades(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;
      const { symbol, result, limit = 50, offset = 0 } = req.query;

      const where: any = {
        organizationId,
        userId,
      };

      if (symbol) where.symbol = symbol;
      if (result) where.tradeResult = result;

      const trades = await prisma.tradingTrade.findMany({
        where,
        orderBy: { entryTime: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      });

      const total = await prisma.tradingTrade.count({ where });

      // Calculate summary statistics
      const summary = {
        totalTrades: total,
        winningTrades: trades.filter(t => t.tradeResult === 'WIN').length,
        losingTrades: trades.filter(t => t.tradeResult === 'LOSS').length,
        totalPnL: trades.reduce((sum, t) => sum + Number(t.netPnL), 0),
        winRate: total > 0 ? (trades.filter(t => t.tradeResult === 'WIN').length / total) * 100 : 0,
      };

      return res.json({
        success: true,
        data: trades,
        summary,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      logger.error('Error fetching trades:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch trades',
        message: error.message,
      });
    }
  }

  /**
   * Get dashboard metrics
   * GET /api/zerodha/dashboard
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const organizationId = (req as any).user.organizationId;

      // Get open positions
      const openPositions = await prisma.tradingPosition.findMany({
        where: {
          organizationId,
          userId,
          status: 'OPEN',
        },
      });

      // Get recent trades
      const recentTrades = await prisma.tradingTrade.findMany({
        where: {
          organizationId,
          userId,
        },
        orderBy: { entryTime: 'desc' },
        take: 10,
      });

      // Get pending signals
      const pendingSignals = await prisma.tradingSignal.findMany({
        where: {
          organizationId,
          userId,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Calculate metrics
      const totalPnL = recentTrades.reduce((sum, t) => sum + Number(t.netPnL), 0);
      const winningTrades = recentTrades.filter(t => t.tradeResult === 'WIN').length;
      const losingTrades = recentTrades.filter(t => t.tradeResult === 'LOSS').length;
      const winRate = recentTrades.length > 0 ? (winningTrades / recentTrades.length) * 100 : 0;

      return res.json({
        success: true,
        data: {
          metrics: {
            openPositions: openPositions.length,
            totalPnL,
            winRate,
            totalTrades: recentTrades.length,
            winningTrades,
            losingTrades,
          },
          openPositions,
          recentTrades,
          pendingSignals,
        },
      });
    } catch (error: any) {
      logger.error('Error fetching dashboard:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message,
      });
    }
  }

  /**
   * Get writer ratio snapshot for a strike
   * GET /api/zerodha/writer-ratio/:symbol/:strike
   */
  async getWriterRatio(req: Request, res: Response) {
    try {
      const { symbol, strike } = req.params;
      const { expiry } = req.query;

      if (!expiry) {
        return res.status(400).json({
          success: false,
          error: 'Expiry date required',
        });
      }

      const snapshot = await prisma.writerRatioSnapshot.findFirst({
        where: {
          symbol,
          strike: parseFloat(strike),
          expiry: new Date(expiry as string),
        },
        orderBy: { timestamp: 'desc' },
      });

      return res.json({
        success: true,
        data: snapshot,
      });
    } catch (error: any) {
      logger.error('Error fetching writer ratio:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch writer ratio',
        message: error.message,
      });
    }
  }
}

export const zerodhaController = new ZerodhaController();
