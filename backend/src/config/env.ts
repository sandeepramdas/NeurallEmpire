/**
 * Environment Configuration
 * Centralizes all environment variables with validation
 */

interface EnvConfig {
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  APP_VERSION: string;
  APP_NAME: string;

  // Base URLs
  BASE_DOMAIN: string;
  FRONTEND_URL: string;
  BACKEND_URL: string;
  API_BASE_URL: string;

  // Database
  DATABASE_URL: string;

  // JWT & Security
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  COOKIE_SECRET: string;
  ENCRYPTION_KEY: string;

  // CORS
  CORS_ORIGINS: string[];

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  AUTH_RATE_LIMIT_MAX: number;

  // Monitoring & Logging
  SENTRY_DSN?: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';

  // Email (for future use)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM?: string;

  // Payment Processing (for future use)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  // File Storage (for future use)
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  S3_BUCKET?: string;

  // Feature Flags
  ENABLE_CSRF: boolean;
  ENABLE_RATE_LIMITING: boolean;
  ENABLE_AUDIT_LOGGING: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;

  // Cloudflare
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

/**
 * Load and validate environment variables
 */
const loadEnv = (): EnvConfig => {
  const env = process.env;

  // Required variables
  const required = {
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
  };

  // Check for missing required variables
  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set them in your .env file`
    );
  }

  // Parse CORS origins
  const parseCorsOrigins = (origins?: string): string[] => {
    if (!origins) return [];
    return origins.split(',').map(o => o.trim());
  };

  // Parse boolean
  const parseBoolean = (value?: string, defaultValue: boolean = false): boolean => {
    if (!value) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  };

  return {
    // Application
    NODE_ENV: (env.NODE_ENV as any) || 'development',
    PORT: parseInt(env.PORT || '3001', 10),
    APP_VERSION: env.npm_package_version || '1.0.0',
    APP_NAME: env.APP_NAME || 'NeurallEmpire',

    // Base URLs
    BASE_DOMAIN: env.BASE_DOMAIN || 'neurallempire.com',
    FRONTEND_URL: env.FRONTEND_URL || 'https://www.neurallempire.com',
    BACKEND_URL: env.BACKEND_URL || 'https://www.neurallempire.com',
    API_BASE_URL: env.API_BASE_URL || 'https://www.neurallempire.com/api',

    // Database
    DATABASE_URL: env.DATABASE_URL!,

    // JWT & Security
    JWT_SECRET: env.JWT_SECRET!,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN || '7d',
    COOKIE_SECRET: env.COOKIE_SECRET || 'your-cookie-secret-change-in-production',
    ENCRYPTION_KEY: env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long',

    // CORS
    CORS_ORIGINS: parseCorsOrigins(env.CORS_ORIGINS),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    RATE_LIMIT_MAX_REQUESTS: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
    AUTH_RATE_LIMIT_MAX: parseInt(env.AUTH_RATE_LIMIT_MAX || '50', 10),

    // Monitoring & Logging
    SENTRY_DSN: env.SENTRY_DSN,
    LOG_LEVEL: (env.LOG_LEVEL as any) || 'info',

    // Email
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    EMAIL_FROM: env.EMAIL_FROM,

    // Payment
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,

    // File Storage
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: env.AWS_REGION || 'us-east-1',
    S3_BUCKET: env.S3_BUCKET,

    // Feature Flags
    ENABLE_CSRF: parseBoolean(env.ENABLE_CSRF, true),
    ENABLE_RATE_LIMITING: parseBoolean(env.ENABLE_RATE_LIMITING, true),
    ENABLE_AUDIT_LOGGING: parseBoolean(env.ENABLE_AUDIT_LOGGING, true),
    ENABLE_PERFORMANCE_MONITORING: parseBoolean(env.ENABLE_PERFORMANCE_MONITORING, false),

    // Cloudflare
    CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ZONE_ID: env.CLOUDFLARE_ZONE_ID,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
  };
};

// Export singleton instance
export const config = loadEnv();

// Export helper to check if in production
export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';

// Validate configuration on import
if (isDevelopment()) {
  console.log('🔧 Environment Configuration:');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   BASE_DOMAIN: ${config.BASE_DOMAIN}`);
  console.log(`   DATABASE: ${config.DATABASE_URL ? '✓ Connected' : '✗ Not configured'}`);
  console.log(`   JWT_SECRET: ${config.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`   SENTRY: ${config.SENTRY_DSN ? '✓ Enabled' : 'ℹ Disabled'}`);
  console.log(`   CSRF Protection: ${config.ENABLE_CSRF ? '✓ Enabled' : '✗ Disabled'}`);
  console.log(`   Rate Limiting: ${config.ENABLE_RATE_LIMITING ? '✓ Enabled' : '✗ Disabled'}`);
}

export default config;
