/**
 * ==================== FILE UPLOAD VALIDATION MIDDLEWARE ====================
 *
 * Comprehensive file upload security validation
 *
 * Features:
 * - File size limits
 * - MIME type validation (magic number verification)
 * - File name sanitization
 * - Dangerous file type blocking
 * - File content scanning
 *
 * @module middleware/file-validation
 */

import { Request, Response, NextFunction } from 'express';
import fileType from 'file-type';
import path from 'path';
import { logger } from '@/infrastructure/logger';

// File size limits (in bytes)
const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB for images
  document: 50 * 1024 * 1024, // 50MB for documents
  video: 500 * 1024 * 1024, // 500MB for videos
  default: 25 * 1024 * 1024, // 25MB default
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/json',
  ],
  videos: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ],
};

// Dangerous file extensions to block
const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.pif',
  '.scr',
  '.vbs',
  '.js',
  '.jar',
  '.msi',
  '.dll',
  '.sh',
  '.app',
  '.deb',
  '.rpm',
];

// Dangerous MIME types to block
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'application/x-dosexec',
  'text/javascript',
  'application/javascript',
];

export interface FileValidationOptions {
  allowedTypes?: ('images' | 'documents' | 'videos' | 'audio')[];
  maxSize?: number;
  customAllowedMimeTypes?: string[];
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = path.basename(filename);

  // Replace dangerous characters
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // Replace multiple dots
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length

  return sanitized || 'file';
}

/**
 * Check if file type is allowed based on magic numbers
 */
async function validateFileType(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
  try {
    // Get actual file type from magic numbers
    const detectedType = await fileType.fromBuffer(buffer);

    // If we can't detect the type, check if it's a text file
    if (!detectedType) {
      // Allow text files if declared as text
      if (declaredMimeType.startsWith('text/') || declaredMimeType === 'application/json') {
        return true;
      }
      logger.warn('Could not detect file type from magic numbers', { declaredMimeType });
      return false;
    }

    // Check if detected MIME type matches declared MIME type
    // Allow minor variations (e.g., image/jpg vs image/jpeg)
    const detectedMime = detectedType.mime;
    const normalizedDeclared = declaredMimeType.toLowerCase();
    const normalizedDetected = detectedMime.toLowerCase();

    if (normalizedDeclared === normalizedDetected) {
      return true;
    }

    // Allow common aliases
    const mimeAliases: Record<string, string[]> = {
      'image/jpeg': ['image/jpg'],
      'video/quicktime': ['video/mov'],
    };

    for (const [primary, aliases] of Object.entries(mimeAliases)) {
      if (normalizedDetected === primary && aliases.includes(normalizedDeclared)) {
        return true;
      }
      if (normalizedDeclared === primary && aliases.includes(normalizedDetected)) {
        return true;
      }
    }

    logger.warn('File type mismatch - possible MIME type spoofing', {
      declared: declaredMimeType,
      detected: detectedMime,
    });

    return false;
  } catch (error) {
    logger.error('Error validating file type', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * File validation middleware
 */
export const validateFileUpload = (options: FileValidationOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
        });
        return;
      }

      const file = req.file;
      const originalFilename = file.originalname;
      const mimeType = file.mimetype.toLowerCase();
      const fileSize = file.size;
      const fileBuffer = file.buffer;

      // 1. Check file extension
      const extension = path.extname(originalFilename).toLowerCase();
      if (BLOCKED_EXTENSIONS.includes(extension)) {
        logger.warn('Blocked dangerous file extension', {
          filename: originalFilename,
          extension,
          userId: (req as any).user?.id,
        });

        res.status(400).json({
          success: false,
          error: `File type ${extension} is not allowed for security reasons`,
        });
        return;
      }

      // 2. Check blocked MIME types
      if (BLOCKED_MIME_TYPES.includes(mimeType)) {
        logger.warn('Blocked dangerous MIME type', {
          filename: originalFilename,
          mimeType,
          userId: (req as any).user?.id,
        });

        res.status(400).json({
          success: false,
          error: 'File type is not allowed for security reasons',
        });
        return;
      }

      // 3. Check allowed types if specified
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const allowedMimeTypes = options.allowedTypes.flatMap(
          (type) => ALLOWED_MIME_TYPES[type] || []
        );

        if (!allowedMimeTypes.includes(mimeType)) {
          res.status(400).json({
            success: false,
            error: `File type ${mimeType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
          });
          return;
        }
      } else if (options.customAllowedMimeTypes) {
        if (!options.customAllowedMimeTypes.includes(mimeType)) {
          res.status(400).json({
            success: false,
            error: `File type ${mimeType} is not allowed`,
          });
          return;
        }
      }

      // 4. Validate file type using magic numbers (prevent MIME type spoofing)
      const isValidType = await validateFileType(fileBuffer, mimeType);
      if (!isValidType) {
        logger.warn('File type validation failed - possible MIME spoofing', {
          filename: originalFilename,
          declaredMimeType: mimeType,
          userId: (req as any).user?.id,
        });

        res.status(400).json({
          success: false,
          error: 'File type validation failed. The file content does not match the declared type.',
        });
        return;
      }

      // 5. Check file size
      const maxSize = options.maxSize || MAX_FILE_SIZE.default;
      if (fileSize > maxSize) {
        res.status(400).json({
          success: false,
          error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
        });
        return;
      }

      // 6. Sanitize filename
      const sanitizedFilename = sanitizeFilename(originalFilename);
      req.file.originalname = sanitizedFilename;

      // 7. Add validation metadata to request
      (req as any).fileValidation = {
        originalName: originalFilename,
        sanitizedName: sanitizedFilename,
        mimeType,
        size: fileSize,
        validatedAt: new Date(),
      };

      logger.info('File validation passed', {
        filename: sanitizedFilename,
        mimeType,
        size: fileSize,
        userId: (req as any).user?.id,
      });

      next();
    } catch (error) {
      logger.error('File validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: req.file?.originalname,
      });

      res.status(500).json({
        success: false,
        error: 'File validation failed',
      });
    }
  };
};

export default validateFileUpload;
