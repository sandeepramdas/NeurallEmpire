import { Router } from 'express';
import { authenticate } from '@/middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res) => {
  res.json({ success: true, message: 'Campaigns endpoint - coming soon' });
});

export default router;