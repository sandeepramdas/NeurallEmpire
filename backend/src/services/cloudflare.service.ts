import axios from 'axios';

const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_EMAIL = process.env.CLOUDFLARE_EMAIL;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'neurallempire.com';
const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';

interface CloudflareResponse {
  success: boolean;
  errors: any[];
  messages: any[];
  result?: any;
}

interface DNSRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

/**
 * Create a subdomain DNS record in Cloudflare
 */
export async function createSubdomainDNS(
  subdomain: string,
  targetIP?: string
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_EMAIL || !CLOUDFLARE_ZONE_ID) {
      console.error('❌ Cloudflare credentials not configured');
      return {
        success: false,
        error: 'Cloudflare credentials not configured'
      };
    }

    const fullDomain = `${subdomain}.${BASE_DOMAIN}`;

    // Get the Railway/production app URL to point to
    const target = targetIP || process.env.RAILWAY_PUBLIC_DOMAIN || 'www.neurallempire.com';

    // Create DNS record
    const dnsRecord: DNSRecord = {
      type: 'CNAME',  // Using CNAME to point to main domain
      name: fullDomain,
      content: target,
      ttl: 1,  // Auto (Cloudflare proxy)
      proxied: true,  // Enable Cloudflare proxy for SSL/security
    };

    console.log(`🌐 Creating Cloudflare DNS record for ${fullDomain}...`);

    const response = await axios.post<CloudflareResponse>(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      dnsRecord,
      {
        headers: {
          'X-Auth-Email': CLOUDFLARE_EMAIL,
          'X-Auth-Key': CLOUDFLARE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.result) {
      console.log(`✅ DNS record created: ${fullDomain} -> ${target}`);
      return {
        success: true,
        recordId: response.data.result.id,
      };
    } else {
      console.error('❌ Cloudflare API error:', response.data.errors);
      return {
        success: false,
        error: response.data.errors?.[0]?.message || 'Unknown Cloudflare error',
      };
    }
  } catch (error: any) {
    console.error('❌ Error creating Cloudflare DNS record:', error.message);

    // Check if subdomain already exists
    if (error.response?.data?.errors?.[0]?.code === 81057) {
      console.log(`⚠️ DNS record already exists for ${subdomain}`);
      return {
        success: true,  // Treat as success since record exists
        recordId: 'existing',
      };
    }

    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || error.message,
    };
  }
}

/**
 * Delete a subdomain DNS record from Cloudflare
 */
export async function deleteSubdomainDNS(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_EMAIL || !CLOUDFLARE_ZONE_ID) {
      return {
        success: false,
        error: 'Cloudflare credentials not configured'
      };
    }

    const response = await axios.delete<CloudflareResponse>(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        headers: {
          'X-Auth-Email': CLOUDFLARE_EMAIL,
          'X-Auth-Key': CLOUDFLARE_API_KEY,
        },
      }
    );

    if (response.data.success) {
      console.log(`✅ DNS record deleted: ${recordId}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: response.data.errors?.[0]?.message || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error('❌ Error deleting Cloudflare DNS record:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verify subdomain is accessible
 */
export async function verifySubdomain(subdomain: string): Promise<boolean> {
  try {
    const fullDomain = `${subdomain}.${BASE_DOMAIN}`;
    const response = await axios.get(`https://${fullDomain}/health`, {
      timeout: 5000,
      validateStatus: () => true,  // Don't throw on any status
    });

    return response.status === 200;
  } catch (error) {
    console.log(`⚠️  Subdomain ${subdomain} not yet accessible`);
    return false;
  }
}

/**
 * Get Cloudflare zone details
 */
export async function getZoneInfo(): Promise<any> {
  try {
    if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_EMAIL || !CLOUDFLARE_ZONE_ID) {
      throw new Error('Cloudflare credentials not configured');
    }

    const response = await axios.get(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}`,
      {
        headers: {
          'X-Auth-Email': CLOUDFLARE_EMAIL,
          'X-Auth-Key': CLOUDFLARE_API_KEY,
        },
      }
    );

    return response.data.result;
  } catch (error: any) {
    console.error('❌ Error fetching zone info:', error.message);
    throw error;
  }
}
