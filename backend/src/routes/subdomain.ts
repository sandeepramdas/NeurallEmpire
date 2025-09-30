import { Router } from 'express';
import { subdomainService } from '@/services/subdomain.service';
import { authenticate } from '@/middleware/auth';
import { tenantResolver, requireTenant } from '@/middleware/tenant';
import { authorize } from '@/middleware/auth';

const router = Router();

// Apply authentication and tenant resolution
router.use(tenantResolver);
router.use(authenticate);

/**
 * @route   POST /api/subdomain/create
 * @desc    Create subdomain for organization
 * @access  Private (Admin/Owner only)
 */
router.post('/create', authorize('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId;

    // Check if organization already has a subdomain
    const existingStatus = await subdomainService.getSubdomainStatus(organizationId);
    if (existingStatus.hasSubdomain) {
      return res.status(409).json({
        success: false,
        error: 'Organization already has a subdomain',
        code: 'SUBDOMAIN_EXISTS',
        existingSubdomain: existingStatus.subdomain
      });
    }

    // Create subdomain
    const result = await subdomainService.createSubdomain(organizationId);

    res.status(201).json({
      success: true,
      message: 'Subdomain creation initiated',
      subdomain: result.subdomain,
      fullDomain: result.fullDomain,
      status: result.status,
      estimatedPropagationTime: result.estimatedPropagationTime,
      nextSteps: [
        'DNS record created in Cloudflare',
        'SSL certificate will be automatically provisioned',
        'Health checks will begin in 2 minutes',
        'You will be notified when subdomain is ready'
      ]
    });

  } catch (error: any) {
    console.error('Subdomain creation error:', error);

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'SUBDOMAIN_CREATION_FAILED'
    });
  }
});

/**
 * @route   GET /api/subdomain/status
 * @desc    Get subdomain status for organization
 * @access  Private
 */
router.get('/status', requireTenant, async (req, res) => {
  try {
    const organizationId = req.organization!.id;
    const status = await subdomainService.getSubdomainStatus(organizationId);

    res.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    console.error('Subdomain status error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch subdomain status',
      code: 'STATUS_FETCH_FAILED'
    });
  }
});

/**
 * @route   POST /api/subdomain/verify
 * @desc    Manually trigger subdomain verification
 * @access  Private (Admin/Owner only)
 */
router.post('/verify', authorize('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId;

    // Get subdomain record
    const status = await subdomainService.getSubdomainStatus(organizationId);
    if (!status.hasSubdomain) {
      return res.status(404).json({
        success: false,
        error: 'No subdomain found for organization',
        code: 'NO_SUBDOMAIN'
      });
    }

    // Find subdomain record ID
    const subdomainRecord = await prisma.subdomainRecord.findFirst({
      where: { organizationId },
      select: { id: true, subdomain: true, status: true }
    });

    if (!subdomainRecord) {
      return res.status(404).json({
        success: false,
        error: 'Subdomain record not found',
        code: 'RECORD_NOT_FOUND'
      });
    }

    // Perform verification
    const isHealthy = await subdomainService.verifySubdomain(subdomainRecord.id);

    res.json({
      success: true,
      subdomain: subdomainRecord.subdomain,
      isHealthy,
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      message: isHealthy
        ? 'Subdomain is working correctly'
        : 'Subdomain verification failed - DNS may still be propagating'
    });

  } catch (error: any) {
    console.error('Subdomain verification error:', error);

    res.status(500).json({
      success: false,
      error: 'Verification failed',
      code: 'VERIFICATION_FAILED'
    });
  }
});

/**
 * @route   DELETE /api/subdomain
 * @desc    Delete subdomain for organization
 * @access  Private (Owner only)
 */
router.delete('/', authorize('OWNER'), async (req, res) => {
  try {
    const organizationId = req.user!.organizationId;

    // Confirm deletion with password or special token
    const { confirmationPassword, confirmationToken } = req.body;

    if (!confirmationPassword && !confirmationToken) {
      return res.status(400).json({
        success: false,
        error: 'Subdomain deletion requires confirmation',
        code: 'CONFIRMATION_REQUIRED',
        hint: 'Provide confirmationPassword or confirmationToken'
      });
    }

    // Additional security check for destructive operation
    if (confirmationPassword) {
      const bcrypt = require('bcryptjs');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { passwordHash: true }
      });

      if (!user?.passwordHash || !bcrypt.compareSync(confirmationPassword, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid confirmation password',
          code: 'INVALID_CONFIRMATION'
        });
      }
    }

    // Delete subdomain
    await subdomainService.deleteSubdomain(organizationId);

    res.json({
      success: true,
      message: 'Subdomain deleted successfully',
      warning: 'All subdomain-based links will no longer work'
    });

  } catch (error: any) {
    console.error('Subdomain deletion error:', error);

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'SUBDOMAIN_DELETION_FAILED'
    });
  }
});

/**
 * @route   GET /api/subdomain/metrics
 * @desc    Get subdomain performance metrics
 * @access  Private
 */
router.get('/metrics', requireTenant, async (req, res) => {
  try {
    const organizationId = req.organization!.id;
    const days = parseInt(req.query.days as string) || 7;

    const metrics = await subdomainService.getSubdomainMetrics(organizationId, days);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'No subdomain found for metrics',
        code: 'NO_SUBDOMAIN_METRICS'
      });
    }

    res.json({
      success: true,
      metrics,
      period: `${days} days`
    });

  } catch (error: any) {
    console.error('Subdomain metrics error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch subdomain metrics',
      code: 'METRICS_FETCH_FAILED'
    });
  }
});

/**
 * @route   GET /api/subdomain/check-availability/:slug
 * @desc    Check if subdomain slug is available
 * @access  Public
 */
router.get('/check-availability/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Validate subdomain format
    const isValid = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(slug);
    if (!isValid) {
      return res.json({
        success: true,
        available: false,
        reason: 'Invalid format. Use only lowercase letters, numbers, and hyphens.',
        suggestions: []
      });
    }

    // Check reserved subdomains
    const reserved = [
      'www', 'api', 'app', 'admin', 'mail', 'ftp', 'blog', 'shop',
      'support', 'help', 'docs', 'status', 'cdn', 'assets', 'static',
      'dashboard', 'account', 'billing', 'login', 'register', 'auth'
    ];

    if (reserved.includes(slug)) {
      return res.json({
        success: true,
        available: false,
        reason: 'This subdomain is reserved for system use.',
        suggestions: [`${slug}-co`, `${slug}-org`, `${slug}-team`]
      });
    }

    // Check if already taken
    const existing = await prisma.subdomainRecord.findUnique({
      where: { subdomain: slug },
      select: { id: true, organizationId: true, status: true }
    });

    const available = !existing || existing.status === 'DELETED';

    res.json({
      success: true,
      available,
      subdomain: slug,
      reason: available ? null : 'Subdomain is already taken',
      suggestions: available ? [] : [
        `${slug}-co`,
        `${slug}-team`,
        `${slug}-inc`,
        `${slug}co`,
        `${slug}hq`
      ]
    });

  } catch (error: any) {
    console.error('Subdomain availability check error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to check subdomain availability',
      code: 'AVAILABILITY_CHECK_FAILED'
    });
  }
});

/**
 * @route   GET /api/subdomain/admin/list
 * @desc    List all subdomains (Admin only)
 * @access  Private (Platform Admin only)
 */
router.get('/admin/list', async (req, res) => {
  try {
    // This would typically check for platform admin role
    // For now, we'll restrict to specific users or API keys

    const limit = parseInt(req.query.limit as string) || 100;
    const subdomains = await subdomainService.listAllSubdomains(limit);

    res.json({
      success: true,
      subdomains,
      totalCount: subdomains.length,
      limit
    });

  } catch (error: any) {
    console.error('Subdomain admin list error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch subdomain list',
      code: 'ADMIN_LIST_FAILED'
    });
  }
});

export default router;