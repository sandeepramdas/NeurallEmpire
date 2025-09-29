import { Router } from 'express';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get available subscription plans
router.get('/plans', (req, res) => {
  const plans = [
    {
      id: 'free',
      name: 'FREE',
      price: 0,
      features: ['5 AI Agents', '10 Campaigns', '1GB Storage'],
      maxAgents: 5,
      maxCampaigns: 10,
      storageLimit: 1048576,
    },
    {
      id: 'conqueror',
      name: 'CONQUEROR',
      price: 600,
      features: ['50 AI Agents', 'Unlimited Campaigns', '100GB Storage', 'Priority Support'],
      maxAgents: 50,
      maxCampaigns: -1,
      storageLimit: 104857600,
    },
    {
      id: 'emperor',
      name: 'EMPEROR',
      price: 2400,
      features: ['500 AI Agents', 'Unlimited Everything', '1TB Storage', 'White-label Options'],
      maxAgents: 500,
      maxCampaigns: -1,
      storageLimit: 1073741824,
    },
    {
      id: 'overlord',
      name: 'OVERLORD',
      price: 'custom',
      features: ['10000+ AI Agents', 'Enterprise Features', 'Unlimited Storage', 'Dedicated Support'],
      maxAgents: 10000,
      maxCampaigns: -1,
      storageLimit: -1,
    },
  ];

  res.json({
    success: true,
    data: plans,
  });
});

// Create subscription (placeholder)
router.post('/subscribe', (req, res) => {
  res.json({
    success: true,
    message: 'Subscription feature coming soon',
  });
});

export default router;