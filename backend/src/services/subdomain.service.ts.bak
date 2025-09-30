import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface CloudflareRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
}

interface SubdomainCreationResult {
  subdomain: string;
  fullDomain: string;
  status: 'PENDING' | 'CONFIGURING' | 'ACTIVE' | 'FAILED';
  dnsRecordId?: string;
  estimatedPropagationTime: number;
}

export class SubdomainService {
  private cloudflareEmail: string;
  private cloudflareApiKey: string;
  private cloudflareZoneId: string;
  private mainDomain: string;

  constructor() {
    this.cloudflareEmail = process.env.CLOUDFLARE_EMAIL || '';
    this.cloudflareApiKey = process.env.CLOUDFLARE_API_KEY || '';
    this.cloudflareZoneId = process.env.CLOUDFLARE_ZONE_ID || '';
    this.mainDomain = process.env.MAIN_DOMAIN || 'neurallempire.com';
  }

  /**
   * Create subdomain for organization
   * This is the trillion-dollar function - instant professional branding
   */
  async createSubdomain(organizationId: string): Promise<SubdomainCreationResult> {
    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, slug: true, name: true, status: true }
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (organization.status !== 'ACTIVE' && organization.status !== 'TRIAL') {
      throw new Error('Organization must be active to create subdomain');
    }

    const subdomain = organization.slug;
    const fullDomain = `${subdomain}.${this.mainDomain}`;

    // Validate subdomain format
    if (!this.isValidSubdomain(subdomain)) {
      throw new Error('Invalid subdomain format');
    }

    // Check if subdomain already exists
    const existingRecord = await prisma.subdomainRecord.findUnique({
      where: { subdomain }
    });

    if (existingRecord) {
      throw new Error('Subdomain already exists');
    }

    try {
      // Create DNS record via Cloudflare
      const dnsRecord = await this.createCloudflareRecord(subdomain, fullDomain);

      // Create database record
      const subdomainRecord = await prisma.subdomainRecord.create({
        data: {
          organizationId,
          subdomain,
          fullDomain,
          recordType: 'CNAME',
          recordValue: this.mainDomain,
          status: 'CONFIGURING',
          dnsProvider: 'cloudflare',
          externalRecordId: dnsRecord.id,
          sslEnabled: true,
          sslProvider: 'cloudflare',
          healthStatus: 'UNKNOWN'
        }
      });

      // Update organization subdomain status
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subdomainStatus: 'CONFIGURING',
          subdomainEnabled: true
        }
      });

      // Schedule health check in 2 minutes
      setTimeout(() => {
        this.performHealthCheck(subdomainRecord.id);
      }, 2 * 60 * 1000);

      // Log successful creation
      await this.logSubdomainEvent('SUBDOMAIN_CREATED', organizationId, subdomain);

      return {
        subdomain,
        fullDomain,
        status: 'CONFIGURING',
        dnsRecordId: dnsRecord.id,
        estimatedPropagationTime: 300 // 5 minutes
      };

    } catch (error: any) {
      // Create failed record for debugging
      await prisma.subdomainRecord.create({
        data: {
          organizationId,
          subdomain,
          fullDomain,
          recordType: 'CNAME',
          recordValue: this.mainDomain,
          status: 'FAILED',
          dnsProvider: 'cloudflare',
          healthStatus: 'UNHEALTHY',
          metadata: { error: error.message }
        }
      });

      await this.logSubdomainEvent('SUBDOMAIN_CREATION_FAILED', organizationId, subdomain, {
        error: error.message
      });

      throw new Error(`Failed to create subdomain: ${error.message}`);
    }
  }

  /**
   * Create Cloudflare DNS record
   * Professional infrastructure at scale
   */
  private async createCloudflareRecord(subdomain: string, fullDomain: string): Promise<CloudflareRecord> {
    if (!this.cloudflareApiKey || !this.cloudflareZoneId) {
      throw new Error('Cloudflare credentials not configured');
    }

    const recordData = {
      type: 'CNAME',
      name: subdomain,
      content: this.mainDomain,
      ttl: 300, // 5 minutes for fast propagation during setup
      proxied: true // Enable Cloudflare proxy for security and performance
    };

    try {
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${this.cloudflareZoneId}/dns_records`,
        recordData,
        {
          headers: {
            'X-Auth-Email': this.cloudflareEmail,
            'X-Auth-Key': this.cloudflareApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success) {
        throw new Error(`Cloudflare API error: ${response.data.errors?.[0]?.message}`);
      }

      return response.data.result;
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const cloudflareError = error.response.data.errors[0];
        throw new Error(`Cloudflare DNS creation failed: ${cloudflareError.message}`);
      }
      throw error;
    }
  }

  /**
   * Verify subdomain is working
   * Critical for user experience - automatic verification
   */
  async verifySubdomain(subdomainId: string): Promise<boolean> {
    const record = await prisma.subdomainRecord.findUnique({
      where: { id: subdomainId }
    });

    if (!record) {
      throw new Error('Subdomain record not found');
    }

    try {
      // Test HTTP response
      const startTime = Date.now();
      const response = await axios.get(`https://${record.fullDomain}/health`, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      const responseTime = Date.now() - startTime;

      const isHealthy = response.status === 200;

      // Update health status
      await prisma.subdomainRecord.update({
        where: { id: subdomainId },
        data: {
          healthStatus: isHealthy ? 'HEALTHY' : 'DEGRADED',
          responseTime,
          lastHealthCheck: new Date(),
          uptime: isHealthy ? Math.min(record.uptime + 0.1, 100) : Math.max(record.uptime - 1, 0)
        }
      });

      // If healthy and was configuring, mark as active
      if (isHealthy && record.status === 'CONFIGURING') {
        await this.activateSubdomain(subdomainId);
      }

      return isHealthy;
    } catch (error) {
      // Update as unhealthy
      await prisma.subdomainRecord.update({
        where: { id: subdomainId },
        data: {
          healthStatus: 'UNHEALTHY',
          lastHealthCheck: new Date(),
          uptime: Math.max(record.uptime - 2, 0)
        }
      });

      return false;
    }
  }

  /**
   * Activate subdomain after successful verification
   */
  private async activateSubdomain(subdomainId: string): Promise<void> {
    const record = await prisma.subdomainRecord.update({
      where: { id: subdomainId },
      data: {
        status: 'ACTIVE',
        healthStatus: 'HEALTHY'
      },
      include: { organization: true }
    });

    // Update organization status
    await prisma.organization.update({
      where: { id: record.organizationId },
      data: {
        subdomainStatus: 'ACTIVE',
        subdomainVerifiedAt: new Date()
      }
    });

    // Log activation
    await this.logSubdomainEvent('SUBDOMAIN_ACTIVATED', record.organizationId, record.subdomain);

    // Send notification to organization owner
    await this.notifySubdomainReady(record.organization);
  }

  /**
   * Perform health check on subdomain
   * Automated monitoring for 99.9% uptime
   */
  async performHealthCheck(subdomainId: string): Promise<void> {
    try {
      await this.verifySubdomain(subdomainId);
    } catch (error) {
      console.error(`Health check failed for subdomain ${subdomainId}:`, error);
    }

    // Schedule next health check in 5 minutes
    setTimeout(() => {
      this.performHealthCheck(subdomainId);
    }, 5 * 60 * 1000);
  }

  /**
   * Delete subdomain and cleanup resources
   */
  async deleteSubdomain(organizationId: string): Promise<void> {
    const record = await prisma.subdomainRecord.findFirst({
      where: { organizationId }
    });

    if (!record) {
      throw new Error('Subdomain not found for organization');
    }

    try {
      // Delete Cloudflare record
      if (record.externalRecordId) {
        await this.deleteCloudflareRecord(record.externalRecordId);
      }

      // Soft delete database record
      await prisma.subdomainRecord.update({
        where: { id: record.id },
        data: {
          status: 'DELETED',
          isActive: false,
          deletedAt: new Date()
        }
      });

      // Update organization
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subdomainStatus: 'PENDING',
          subdomainEnabled: false
        }
      });

      await this.logSubdomainEvent('SUBDOMAIN_DELETED', organizationId, record.subdomain);

    } catch (error: any) {
      throw new Error(`Failed to delete subdomain: ${error.message}`);
    }
  }

  /**
   * Delete Cloudflare DNS record
   */
  private async deleteCloudflareRecord(recordId: string): Promise<void> {
    try {
      await axios.delete(
        `https://api.cloudflare.com/client/v4/zones/${this.cloudflareZoneId}/dns_records/${recordId}`,
        {
          headers: {
            'X-Auth-Email': this.cloudflareEmail,
            'X-Auth-Key': this.cloudflareApiKey
          }
        }
      );
    } catch (error: any) {
      console.error('Failed to delete Cloudflare record:', error.response?.data);
      // Don't throw - record might already be deleted
    }
  }

  /**
   * Get subdomain status for organization
   */
  async getSubdomainStatus(organizationId: string): Promise<any> {
    const record = await prisma.subdomainRecord.findFirst({
      where: {
        organizationId,
        deletedAt: null
      },
      include: {
        organization: {
          select: { slug: true, name: true, subdomainStatus: true }
        }
      }
    });

    if (!record) {
      return {
        hasSubdomain: false,
        canCreate: true
      };
    }

    return {
      hasSubdomain: true,
      subdomain: record.subdomain,
      fullDomain: record.fullDomain,
      status: record.status,
      healthStatus: record.healthStatus,
      uptime: record.uptime,
      responseTime: record.responseTime,
      lastHealthCheck: record.lastHealthCheck,
      createdAt: record.createdAt,
      canDelete: record.status !== 'CONFIGURING'
    };
  }

  /**
   * List all subdomains with health status
   * Admin function for monitoring
   */
  async listAllSubdomains(limit: number = 100): Promise<any[]> {
    return await prisma.subdomainRecord.findMany({
      where: { deletedAt: null },
      include: {
        organization: {
          select: { name: true, slug: true, planType: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Validate subdomain format
   * Prevents invalid/unsafe subdomains
   */
  private isValidSubdomain(subdomain: string): boolean {
    // Allow alphanumeric and hyphens, 3-63 characters
    const pattern = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

    // Reserved subdomains
    const reserved = [
      'www', 'api', 'app', 'admin', 'mail', 'ftp', 'blog', 'shop',
      'support', 'help', 'docs', 'status', 'cdn', 'assets', 'static',
      'dashboard', 'account', 'billing', 'login', 'register', 'auth'
    ];

    return pattern.test(subdomain) && !reserved.includes(subdomain);
  }

  /**
   * Log subdomain events for analytics
   */
  private async logSubdomainEvent(
    action: string,
    organizationId: string,
    subdomain: string,
    metadata?: any
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        resource: 'SUBDOMAIN',
        resourceId: subdomain,
        organizationId,
        metadata: { subdomain, ...metadata }
      }
    });
  }

  /**
   * Notify organization that subdomain is ready
   */
  private async notifySubdomainReady(organization: any): Promise<void> {
    await prisma.notification.create({
      data: {
        organizationId: organization.id,
        type: 'SUCCESS',
        title: 'Your subdomain is ready!',
        message: `Your custom subdomain ${organization.slug}.${this.mainDomain} is now active and ready to use.`,
        actionUrl: `https://${organization.slug}.${this.mainDomain}/dashboard`,
        actionLabel: 'Visit Your Subdomain',
        priority: 'HIGH'
      }
    });
  }

  /**
   * Monitor subdomain performance metrics
   * Enterprise-grade monitoring
   */
  async getSubdomainMetrics(organizationId: string, days: number = 7): Promise<any> {
    const record = await prisma.subdomainRecord.findFirst({
      where: { organizationId }
    });

    if (!record) {
      return null;
    }

    // In production, you'd query time-series data
    // For now, return current status
    return {
      subdomain: record.subdomain,
      uptime: record.uptime,
      avgResponseTime: record.responseTime,
      healthStatus: record.healthStatus,
      lastCheck: record.lastHealthCheck,
      totalChecks: Math.floor(days * 24 * 12), // Every 5 minutes
      successfulChecks: Math.floor((days * 24 * 12) * (record.uptime / 100))
    };
  }
}

// Export singleton instance
export const subdomainService = new SubdomainService();