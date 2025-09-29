import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Public marketplace endpoints (no auth required)

// Get featured agent templates
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const where: any = {
      isPublic: true,
      isApproved: true
    };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.agentTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
              totalExecutions: true,
              successRate: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { rating: 'desc' },
          { installCount: 'desc' }
        ]
      }),
      prisma.agentTemplate.count({ where })
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get marketplace agents error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace agents' });
  }
});

// Get featured workflow templates
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const where: any = {
      isPublic: true
    };

    if (category) where.category = category;

    const [templates, total] = await Promise.all([
      prisma.workflowTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { rating: 'desc' },
          { useCount: 'desc' }
        ]
      }),
      prisma.workflowTemplate.count({ where })
    ]);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get marketplace workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace workflows' });
  }
});

// Get template categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const agentCategories = await prisma.agentTemplate.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category']
    });

    const workflowCategories = await prisma.workflowTemplate.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category']
    });

    res.json({
      success: true,
      data: {
        agents: agentCategories.map(c => c.category),
        workflows: workflowCategories.map(c => c.category)
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get template details
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.agentTemplate.findUnique({
      where: { id },
      include: {
        agent: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!template || !template.isPublic) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

export default router;