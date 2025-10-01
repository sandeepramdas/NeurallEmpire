import { Router } from 'express';

const router = Router();

router.post('/razorpay', (req, res) => {
  res.json({ success: true, message: 'Razorpay webhook - coming soon' });
});

export default router;