import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import { logger } from '@/infrastructure/logger';

const prisma = new PrismaClient();

// OAuth Provider Configurations
const OAUTH_CONFIGS = {
  GOOGLE: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile'
  },
  GITHUB: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scope: 'user:email'
  },
  LINKEDIN: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userUrl: 'https://api.linkedin.com/v2/people/~',
    scope: 'r_liteprofile r_emailaddress'
  }
};

export interface OAuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: string;
}

export class OAuthService {
  private redis: any; // Redis client for state storage

  constructor() {
    // Initialize Redis connection
    // this.redis = new Redis(process.env.REDIS_URL);
  }

  /**
   * Generate secure OAuth state parameter
   * Prevents CSRF attacks and maintains organization context
   */
  private generateState(orgSlug: string): string {
    const payload = {
      orgSlug,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Validate OAuth state parameter
   * Returns organization slug if valid, throws if invalid/expired
   */
  private validateState(state: string): { orgSlug: string } {
    try {
      const payload = JSON.parse(Buffer.from(state, 'base64url').toString());

      // State expires after 10 minutes
      if (Date.now() - payload.timestamp > 10 * 60 * 1000) {
        throw new Error('State expired');
      }

      return { orgSlug: payload.orgSlug };
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Initiate OAuth flow
   * Returns authorization URL with organization context
   */
  async initiateOAuth(
    provider: keyof typeof OAUTH_CONFIGS,
    orgSlug: string,
    redirectUri: string
  ): Promise<string> {
    const config = OAUTH_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // Get organization-specific OAuth config if exists
    const orgOAuthConfig = await prisma.oAuthConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId: await this.getOrgIdBySlug(orgSlug),
          provider: provider
        }
      }
    });

    const clientId = orgOAuthConfig?.clientId || process.env[`${provider}_CLIENT_ID`];
    if (!clientId) {
      throw new Error(`OAuth not configured for ${provider}`);
    }

    const state = this.generateState(orgSlug);

    // Store state for validation (in production, use Redis)
    // await this.redis.setex(`oauth:state:${state}`, 600, orgSlug);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scope,
      response_type: 'code',
      state: state,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent' // Force consent to get refresh token
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   * Exchanges code for tokens and creates/links user account
   */
  async handleCallback(
    provider: keyof typeof OAUTH_CONFIGS,
    code: string,
    state: string,
    redirectUri: string
  ): Promise<{ user: any; token: string; isNewUser: boolean }> {
    // Validate state and extract organization
    const { orgSlug } = this.validateState(state);
    const organization = await this.getOrganizationBySlug(orgSlug);

    // Exchange code for access token
    const tokens = await this.exchangeCodeForTokens(provider, code, redirectUri, orgSlug);

    // Get user profile from provider
    const oauthUser = await this.getUserProfile(provider, tokens.access_token);

    // Create or link user account
    const result = await this.createOrLinkUser(oauthUser, organization, tokens);

    return result;
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    provider: keyof typeof OAUTH_CONFIGS,
    code: string,
    redirectUri: string,
    orgSlug: string
  ): Promise<any> {
    const config = OAUTH_CONFIGS[provider];

    // Get client credentials (org-specific or global)
    const orgId = await this.getOrgIdBySlug(orgSlug);
    const orgOAuthConfig = await prisma.oAuthConfig.findUnique({
      where: { organizationId_provider: { organizationId: orgId, provider } }
    });

    const clientId = orgOAuthConfig?.clientId || process.env[`${provider}_CLIENT_ID`];
    const clientSecret = orgOAuthConfig?.clientSecret || process.env[`${provider}_CLIENT_SECRET`];

    const tokenData = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    };

    try {
      const response = await axios.post(config.tokenUrl, tokenData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error(`Token exchange failed for ${provider}:`, error.response?.data);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  /**
   * Get user profile from OAuth provider
   */
  private async getUserProfile(
    provider: keyof typeof OAUTH_CONFIGS,
    accessToken: string
  ): Promise<OAuthUser> {
    const config = OAUTH_CONFIGS[provider];

    try {
      const response = await axios.get(config.userUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      // Normalize user data across providers
      switch (provider) {
        case 'GOOGLE':
          return {
            id: data.id,
            email: data.email,
            firstName: data.given_name,
            lastName: data.family_name,
            avatar: data.picture,
            provider: 'GOOGLE'
          };

        case 'GITHUB':
          // GitHub requires separate email API call
          const emailResponse = await axios.get('https://api.github.com/user/emails', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const primaryEmail = emailResponse.data.find((email: any) => email.primary)?.email;

          return {
            id: data.id.toString(),
            email: primaryEmail || data.email,
            firstName: data.name?.split(' ')[0],
            lastName: data.name?.split(' ').slice(1).join(' '),
            avatar: data.avatar_url,
            provider: 'GITHUB'
          };

        case 'LINKEDIN':
          // LinkedIn v2 API requires separate calls for profile and email
          const emailResp = await axios.get(
            'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );

          return {
            id: data.id,
            email: emailResp.data.elements?.[0]?.['handle~']?.emailAddress,
            firstName: data.localizedFirstName,
            lastName: data.localizedLastName,
            avatar: data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
            provider: 'LINKEDIN'
          };

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error: any) {
      logger.error(`Failed to fetch user profile for ${provider}:`, error.response?.data);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  /**
   * Create new user or link to existing user
   * This is the money-making function - seamless user onboarding
   */
  private async createOrLinkUser(
    oauthUser: OAuthUser,
    organization: any,
    tokens: any
  ): Promise<{ user: any; token: string; isNewUser: boolean }> {
    let user;
    let isNewUser = false;

    // Try to find existing user by email
    user = await prisma.user.findUnique({
      where: { email: oauthUser.email },
      include: { organization: true, socialAccounts: true }
    });

    if (user) {
      // Existing user - verify organization access
      if (user.organizationId !== organization.id) {
        throw new Error('User belongs to different organization');
      }

      // Link social account if not already linked
      const existingAccount = user.socialAccounts.find(
        acc => acc.provider === oauthUser.provider
      );

      if (!existingAccount) {
        await this.createSocialAccount(user.id, organization.id, oauthUser, tokens);
      } else {
        // Update existing account with new tokens
        await this.updateSocialAccount(existingAccount.id, tokens);
      }
    } else {
      // New user - create account
      isNewUser = true;

      user = await prisma.user.create({
        data: {
          email: oauthUser.email,
          firstName: oauthUser.firstName,
          lastName: oauthUser.lastName,
          avatar: oauthUser.avatar,
          organizationId: organization.id,
          role: 'MEMBER',
          status: 'ACTIVE',
          emailVerified: true, // OAuth emails are pre-verified
          lastLoginMethod: oauthUser.provider as any,
          onboardingStep: 1
        },
        include: { organization: true }
      });

      // Create social account
      await this.createSocialAccount(user.id, organization.id, oauthUser, tokens);

      // Update organization user count
      await prisma.organization.update({
        where: { id: organization.id },
        data: { currentUsers: { increment: 1 } }
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    // Log successful OAuth login
    await this.logOAuthEvent('LOGIN_SUCCESS', user.id, organization.id, oauthUser.provider);

    return { user, token: jwtToken, isNewUser };
  }

  /**
   * Create social account record
   */
  private async createSocialAccount(
    userId: string,
    organizationId: string,
    oauthUser: OAuthUser,
    tokens: any
  ): Promise<void> {
    await prisma.socialAccount.create({
      data: {
        userId,
        organizationId,
        provider: oauthUser.provider as any,
        providerId: oauthUser.id,
        providerEmail: oauthUser.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ?
          new Date(Date.now() + tokens.expires_in * 1000) : null,
        scope: tokens.scope?.split(' ') || [],
        displayName: `${oauthUser.firstName} ${oauthUser.lastName}`.trim(),
        avatarUrl: oauthUser.avatar,
        providerData: oauthUser as any,
        isPrimary: true,
        lastUsedAt: new Date()
      }
    });
  }

  /**
   * Update existing social account with new tokens
   */
  private async updateSocialAccount(accountId: string, tokens: any): Promise<void> {
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ?
          new Date(Date.now() + tokens.expires_in * 1000) : null,
        lastUsedAt: new Date()
      }
    });
  }

  /**
   * Helper: Get organization by slug
   */
  private async getOrganizationBySlug(slug: string): Promise<any> {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        planType: true,
        maxUsers: true,
        currentUsers: true
      }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    if (org.status !== 'ACTIVE') {
      throw new Error('Organization is not active');
    }

    // Check user limits
    if (org.currentUsers >= org.maxUsers) {
      throw new Error('Organization has reached user limit');
    }

    return org;
  }

  /**
   * Helper: Get organization ID by slug
   */
  private async getOrgIdBySlug(slug: string): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    return org.id;
  }

  /**
   * Log OAuth events for analytics and security
   */
  private async logOAuthEvent(
    action: string,
    userId: string,
    organizationId: string,
    provider: string
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType: 'OAUTH',
        resourceId: userId,
        userId,
        organizationId,
        metadata: { provider }
      }
    });
  }

  /**
   * Refresh OAuth tokens
   * Critical for maintaining long-term access
   */
  async refreshTokens(socialAccountId: string): Promise<void> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId }
    });

    if (!account || !account.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = OAUTH_CONFIGS[account.provider as keyof typeof OAUTH_CONFIGS];

    try {
      const response = await axios.post(config.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: process.env[`${account.provider}_CLIENT_ID`],
        client_secret: process.env[`${account.provider}_CLIENT_SECRET`]
      });

      await this.updateSocialAccount(socialAccountId, response.data);
    } catch (error) {
      logger.error('Token refresh failed:', error);
      // Mark account as requiring re-authentication
      await prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: { isActive: false }
      });
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();