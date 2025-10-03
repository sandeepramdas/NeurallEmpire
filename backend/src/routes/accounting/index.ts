/**
 * Accounting Routes Index
 * Aggregate all accounting routes
 */

import { Router } from 'express';
import accountsRoutes from './accounts';
import transactionsRoutes from './transactions';
import customersRoutes from './customers';
import vendorsRoutes from './vendors';

const router = Router();

// Mount sub-routes
router.use('/accounts', accountsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/customers', customersRoutes);
router.use('/vendors', vendorsRoutes);

export default router;
