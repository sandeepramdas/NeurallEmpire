/**
 * Zerodha Trading Routes
 *
 * API routes for Zerodha options trading system
 * All routes require authentication
 */

import { Router } from 'express';
import { zerodhaController } from '../controllers/zerodha.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ==================== SIGNALS ====================

/**
 * @route   POST /api/zerodha/signals
 * @desc    Generate new trading signal using 7-layer strategy
 * @access  Private
 */
router.post('/signals', (req, res) => zerodhaController.generateSignal(req, res));

/**
 * @route   GET /api/zerodha/signals
 * @desc    Get all trading signals
 * @query   status - Filter by signal status (PENDING, APPROVED, REJECTED, EXECUTED)
 * @query   symbol - Filter by symbol (NIFTY, BANKNIFTY)
 * @query   limit - Pagination limit (default: 50)
 * @query   offset - Pagination offset (default: 0)
 * @access  Private
 */
router.get('/signals', (req, res) => zerodhaController.getSignals(req, res));

/**
 * @route   GET /api/zerodha/signals/:id
 * @desc    Get signal by ID
 * @access  Private
 */
router.get('/signals/:id', (req, res) => zerodhaController.getSignalById(req, res));

// ==================== POSITIONS ====================

/**
 * @route   POST /api/zerodha/positions
 * @desc    Open new trading position
 * @access  Private
 */
router.post('/positions', (req, res) => zerodhaController.openPosition(req, res));

/**
 * @route   GET /api/zerodha/positions
 * @desc    Get all positions
 * @query   status - Filter by status (OPEN, CLOSED, STOPPED_OUT)
 * @query   symbol - Filter by symbol
 * @access  Private
 */
router.get('/positions', (req, res) => zerodhaController.getPositions(req, res));

/**
 * @route   PUT /api/zerodha/positions/:id/close
 * @desc    Close a position
 * @body    exitPrice - Exit price
 * @body    exitReason - Reason for exit (STOP_LOSS, TARGET, MANUAL, etc.)
 * @access  Private
 */
router.put('/positions/:id/close', (req, res) => zerodhaController.closePosition(req, res));

// ==================== TRADES ====================

/**
 * @route   GET /api/zerodha/trades
 * @desc    Get trade history
 * @query   symbol - Filter by symbol
 * @query   result - Filter by trade result (WIN, LOSS, BREAKEVEN)
 * @query   limit - Pagination limit (default: 50)
 * @query   offset - Pagination offset (default: 0)
 * @access  Private
 */
router.get('/trades', (req, res) => zerodhaController.getTrades(req, res));

// ==================== DASHBOARD ====================

/**
 * @route   GET /api/zerodha/dashboard
 * @desc    Get dashboard metrics and summary
 * @access  Private
 */
router.get('/dashboard', (req, res) => zerodhaController.getDashboard(req, res));

// ==================== MARKET DATA ====================

/**
 * @route   GET /api/zerodha/writer-ratio/:symbol/:strike
 * @desc    Get writer ratio snapshot for a specific strike
 * @query   expiry - Option expiry date (required)
 * @access  Private
 */
router.get('/writer-ratio/:symbol/:strike', (req, res) => zerodhaController.getWriterRatio(req, res));

export default router;
