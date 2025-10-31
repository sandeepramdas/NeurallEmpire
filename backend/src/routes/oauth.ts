import { Router } from 'express';
import { prisma } from '@/server';
import { oauthService } from '@/services/oauth.service';
import { tenantResolver, requireTenant } from '@/middleware/tenant';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { logger } from '@/infrastructure/logger';

const router = Router();

// Apply tenant resolution to all OAuth routes
router.use(tenantResolver);

/**
 * @route   GET /api/oauth/providers
 * @desc    Get available OAuth providers for organization
 * @access  Public
 */
router.get('/providers', async (req, res) => {
  try {
    let providers = [];

    if (req.organization) {
      // Get organization-specific OAuth configurations
      const oauthConfigs = await prisma.oAuthConfig.findMany({
        where: {
          organizationId: req.organization.id,
          enabled: true
        },
        select: {
          provider: true,
          buttonText: true,
          buttonColor: true,
          logoUrl: true
        }
      });

      providers = oauthConfigs.map(config => ({
        provider: config.provider.toLowerCase(),
        customization: {
          buttonText: config.buttonText,
          buttonColor: config.buttonColor,
          logoUrl: config.logoUrl
        }
      }));
    }

    // If no org-specific configs, return default providers
    if (providers.length === 0) {
      providers = [
        { provider: 'google', enabled: !!process.env.GOOGLE_CLIENT_ID },
        { provider: 'github', enabled: !!process.env.GITHUB_CLIENT_ID },
        { provider: 'linkedin', enabled: !!process.env.LINKEDIN_CLIENT_ID }
      ].filter(p => p.enabled);
    }

    res.json({
      success: true,
      providers,
      organization: req.organization?.slug || null
    });

  } catch (error: any) {
    logger.error('Error fetching OAuth providers:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch OAuth providers',
      code: 'PROVIDERS_FETCH_FAILED'
    });
  }
});

/**
 * @route   GET /api/oauth/linked-accounts
 * @desc    Get user's linked OAuth accounts
 * @access  Private
 */
router.get('/linked-accounts', authenticate, requireTenant, async (req, res) => {
  try {
    const userId = req.user!.id;

    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        displayName: true,
        avatarUrl: true,
        isPrimary: true,
        lastUsedAt: true,
        createdAt: true,
        scope: true
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      linkedAccounts: socialAccounts,
      totalCount: socialAccounts.length
    });

  } catch (error: any) {
    logger.error('Error fetching linked accounts:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch linked accounts',
      code: 'FETCH_FAILED'
    });
  }
});

/**
 * @route   GET /api/oauth/:provider
 * @desc    Initiate OAuth flow for specific provider
 * @access  Public
 * @example GET /api/oauth/google?org=acme
 */
router.get('/:provider', optionalAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const orgSlug = req.query.org as string || req.tenant || 'new'; // Allow 'new' for org creation

    // Validate provider
    const validProviders = ['google', 'github', 'linkedin', 'microsoft'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported OAuth provider',
        code: 'INVALID_PROVIDER',
        supportedProviders: validProviders
      });
    }

    // Build redirect URI based on environment
    // MUST use Railway URL directly - www.neurallempire.com proxy doesn't work for OAuth callbacks
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://neurallempire-production.up.railway.app/api'
      : `http://localhost:3001/api`;

    const redirectUri = `${baseUrl}/oauth/${provider}/callback`;

    // Initiate OAuth flow
    const authUrl = await oauthService.initiateOAuth(
      provider.toUpperCase() as any,
      orgSlug,
      redirectUri
    );

    // Return auth URL for frontend redirect
    res.json({
      success: true,
      authUrl,
      provider,
      organization: orgSlug !== 'new' ? orgSlug : null
    });

  } catch (error: any) {
    logger.error(`OAuth initiation error for ${req.params.provider}:`, error);

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'OAUTH_INIT_FAILED'
    });
  }
});

/**
 * @route   GET /api/oauth/:provider/callback
 * @desc    Handle OAuth callback from provider
 * @access  Public
 * @example GET /api/oauth/google/callback?code=xxx&state=yyy
 */
router.get('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth errors (user denied, etc.)
    if (oauthError) {
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://www.neurallempire.com/auth/error'
        : 'http://localhost:3000/auth/error';

      return res.redirect(`${errorUrl}?error=${oauthError}&provider=${provider}`);
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state',
        code: 'MISSING_PARAMS'
      });
    }

    // Build redirect URI (MUST use Railway URL - www.neurallempire.com proxy doesn't work)
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://neurallempire-production.up.railway.app/api'
      : `http://localhost:3001/api`;

    const redirectUri = `${baseUrl}/oauth/${provider}/callback`;

    // Handle OAuth callback
    const result = await oauthService.handleCallback(
      provider.toUpperCase() as any,
      code as string,
      state as string,
      redirectUri
    );

    // Determine redirect destination - use FRONTEND URL
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.neurallempire.com'
      : 'http://localhost:3000';

    // Pass token in URL for frontend to store (cross-domain cookie issue)
    let redirectUrl;
    if (result.isNewUser || !result.organization) {
      // New user or no org context - redirect to org selection/creation
      redirectUrl = `${frontendUrl}/auth/callback?token=${result.token}&new=true`;
    } else {
      // Existing user with org - redirect to dashboard
      redirectUrl = `${frontendUrl}/auth/callback?token=${result.token}`;
    }

    res.redirect(redirectUrl);

  } catch (error: any) {
    logger.error(`OAuth callback error for ${req.params.provider}:`, error);

    // Redirect to error page with details
    const errorUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.neurallempire.com/auth/error'
      : 'http://localhost:3000/auth/error';

    res.redirect(`${errorUrl}?provider=${req.params.provider}&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * @route   POST /api/oauth/link-account
 * @desc    Link additional OAuth account to existing user
 * @access  Private
 */
router.post('/link-account', authenticate, requireTenant, async (req, res) => {
  try {
    const { provider, code, state } = req.body;

    if (!provider || !code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_FIELDS'
      });
    }

    // Build redirect URI
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `https://${req.organization.slug}.neurallempire.com`
      : `http://localhost:3000`;

    const redirectUri = `${baseUrl}/settings/oauth/callback`;

    // Handle linking flow (similar to callback but links to existing user)
    const result = await oauthService.handleCallback(
      provider.toUpperCase(),
      code,
      state,
      redirectUri
    );

    res.json({
      success: true,
      message: `${provider} account linked successfully`,
      provider,
      linkedAccount: {
        provider: result.user.socialAccounts?.find((acc: any) => acc.provider === provider.toUpperCase())
      }
    });

  } catch (error: any) {
    logger.error('Account linking error:', error);

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'ACCOUNT_LINK_FAILED'
    });
  }
});

/**
 * @route   DELETE /api/oauth/unlink/:provider
 * @desc    Unlink OAuth account from user
 * @access  Private
 */
router.delete('/unlink/:provider', authenticate, requireTenant, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user!.id;

    // Find and deactivate social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        userId,
        provider: provider.toUpperCase() as any,
        isActive: true
      }
    });

    if (!socialAccount) {
      return res.status(404).json({
        success: false,
        error: 'OAuth account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Soft delete the social account
    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: {
        isActive: false
      }
    });

    // Log the unlinking event
    await prisma.auditLog.create({
      data: {
        action: 'OAUTH_UNLINK',
        resourceType: 'SOCIAL_ACCOUNT',
        resourceId: socialAccount.id,
        userId,
        organizationId: req.organization.id,
        metadata: { provider }
      }
    });

    res.json({
      success: true,
      message: `${provider} account unlinked successfully`,
      provider
    });

  } catch (error: any) {
    logger.error('Account unlinking error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to unlink account',
      code: 'UNLINK_FAILED'
    });
  }
});

export default router;