/**
 * Zerodha Trading Service
 *
 * Frontend API service for Zerodha trading system
 */

import { api } from './api';

export interface TradingSignal {
  id: string;
  symbol: string;
  strike: number;
  expiry: Date;
  optionType: 'CE' | 'PE';
  signalType: string;
  signalStrength: number;
  entryPrice: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
  quantity: number;

  // Layer scores
  layer1Score: number;
  layer2Score: number;
  layer3Score: number;
  layer4Score: number;
  layer5Score: number;
  layer6Score: number;
  layer7Score: number;

  // Writer ratio (critical)
  writerRatio: number | null;
  writerRatioPassed: boolean;
  callWriters: number | null;
  putWriters: number | null;

  // Context
  vixLevel: number | null;
  marketRegime: string | null;
  status: string;
  statusReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface TradingPosition {
  id: string;
  symbol: string;
  strike: number;
  expiry: Date;
  optionType: 'CE' | 'PE';
  positionType: string;
  entryPrice: number;
  entryTime: Date;
  quantity: number;
  entryValue: number;

  currentPrice: number | null;
  unrealizedPnL: number | null;
  unrealizedROI: number | null;

  exitPrice: number | null;
  exitTime: Date | null;
  realizedPnL: number | null;
  realizedROI: number | null;

  stopLoss: number;
  target: number;
  status: string;
  exitReason: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface TradingTrade {
  id: string;
  symbol: string;
  strike: number;
  expiry: Date;
  optionType: 'CE' | 'PE';
  positionType: string;

  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryValue: number;
  exitValue: number;

  grossPnL: number;
  netPnL: number;
  roi: number;

  entryTime: Date;
  exitTime: Date;
  holdingPeriod: number; // minutes

  tradeResult: 'WIN' | 'LOSS' | 'BREAKEVEN';
  exitReason: string;

  writerRatio: number | null;
  vixLevel: number | null;

  createdAt: Date;
}

export interface DashboardMetrics {
  metrics: {
    openPositions: number;
    totalPnL: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  openPositions: TradingPosition[];
  recentTrades: TradingTrade[];
  pendingSignals: TradingSignal[];
}

class ZerodhaService {

  /**
   * Generate new trading signal
   */
  async generateSignal(data: any): Promise<any> {
    const response = await api.post('/zerodha/signals', data);
    return response.data;
  }

  /**
   * Get all signals
   */
  async getSignals(params?: {
    status?: string;
    symbol?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: TradingSignal[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get(`/zerodha/signals?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get signal by ID
   */
  async getSignalById(id: string): Promise<{ success: boolean; data: TradingSignal }> {
    const response = await api.get(`/zerodha/signals/${id}`);
    return response.data;
  }

  /**
   * Open new position
   */
  async openPosition(data: {
    signalId?: string;
    symbol: string;
    strike: number;
    expiry: string;
    optionType: 'CE' | 'PE';
    positionType: string;
    entryPrice: number;
    quantity: number;
    stopLoss: number;
    target: number;
  }): Promise<{ success: boolean; data: TradingPosition }> {
    const response = await api.post('/zerodha/positions', data);
    return response.data;
  }

  /**
   * Get all positions
   */
  async getPositions(params?: {
    status?: string;
    symbol?: string;
  }): Promise<{ success: boolean; data: TradingPosition[] }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.symbol) queryParams.append('symbol', params.symbol);

    const response = await api.get(`/zerodha/positions?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Close position
   */
  async closePosition(
    id: string,
    data: { exitPrice: number; exitReason: string }
  ): Promise<{ success: boolean; data: any }> {
    const response = await api.put(`/zerodha/positions/${id}/close`, data);
    return response.data;
  }

  /**
   * Get trade history
   */
  async getTrades(params?: {
    symbol?: string;
    result?: 'WIN' | 'LOSS' | 'BREAKEVEN';
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: TradingTrade[]; summary: any; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.result) queryParams.append('result', params.result);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await api.get(`/zerodha/trades?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get dashboard metrics
   */
  async getDashboard(): Promise<{ success: boolean; data: DashboardMetrics }> {
    const response = await api.get('/zerodha/dashboard');
    return response.data;
  }

  /**
   * Get writer ratio snapshot
   */
  async getWriterRatio(
    symbol: string,
    strike: number,
    expiry: string
  ): Promise<{ success: boolean; data: any }> {
    const response = await api.get(`/zerodha/writer-ratio/${symbol}/${strike}?expiry=${expiry}`);
    return response.data;
  }
}

export const zerodhaService = new ZerodhaService();
export default zerodhaService;
