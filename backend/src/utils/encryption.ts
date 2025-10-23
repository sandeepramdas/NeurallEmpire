import crypto from 'crypto';

/**
 * Encryption utility for sensitive data like API keys
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

// Get encryption key from environment
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Derive a 256-bit key from the environment variable
  return crypto.scryptSync(key, 'salt', 32);
};

/**
 * Encrypt a string value
 * @param plaintext - The value to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export const encrypt = (plaintext: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt an encrypted string
 * @param encryptedData - The encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plaintext
 */
export const decrypt = (encryptedData: string): string => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generate a preview of an API key (last 4 characters)
 * @param apiKey - The full API key
 * @returns Preview string like "****1234"
 */
export const generateApiKeyPreview = (apiKey: string): string => {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }

  const lastFour = apiKey.slice(-4);
  return `****${lastFour}`;
};

/**
 * Hash a value using SHA-256 (one-way, for verification)
 * @param value - The value to hash
 * @returns Hex-encoded hash
 */
export const hash = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Generate a secure random token
 * @param length - Length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate encryption key strength
 * @returns true if key is strong enough
 */
export const validateEncryptionKey = (): boolean => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    return false;
  }

  // Key should be at least 32 characters for good security
  return key.length >= 32;
};
