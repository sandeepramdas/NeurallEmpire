import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/server';
import { captureException } from '@/config/sentry';
import sharp from 'sharp';
import path from 'path';
import { randomUUID } from 'crypto';

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'neurallempire-files';
const CDN_URL = process.env.CDN_URL; // Optional CloudFront URL

export interface UploadFileOptions {
  file: Buffer;
  filename: string;
  mimeType: string;
  organizationId: string;
  uploadedBy: string;
  folder?: string;
  isPublic?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
}

export class StorageService {
  /**
   * Upload file to S3 and create database record
   */
  static async uploadFile(options: UploadFileOptions): Promise<UploadResult> {
    try {
      const {
        file,
        filename,
        mimeType,
        organizationId,
        uploadedBy,
        folder,
        isPublic = false,
        tags = [],
        metadata = {},
      } = options;

      // Generate unique filename
      const ext = path.extname(filename);
      const uniqueFilename = `${randomUUID()}${ext}`;
      const fileKey = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

      // Get file size
      const fileSize = file.length;

      // Determine category
      const category = this.getFileCategory(mimeType);

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: fileKey,
          Body: file,
          ContentType: mimeType,
          ACL: isPublic ? 'public-read' : 'private',
          Metadata: {
            organizationId,
            uploadedBy,
            originalName: filename,
            ...metadata,
          },
        })
      );

      // Generate URL
      const url = isPublic
        ? CDN_URL
          ? `${CDN_URL}/${fileKey}`
          : `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`
        : await this.getSignedUrl(fileKey);

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (category === 'image') {
        try {
          thumbnailUrl = await this.generateThumbnail({
            file,
            fileKey,
            organizationId,
          });
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
        }
      }

      // Create database record
      const fileRecord = await prisma.file.create({
        data: {
          organizationId,
          uploadedBy,
          filename: uniqueFilename,
          originalName: filename,
          mimeType,
          size: fileSize,
          extension: ext.substring(1),
          path: fileKey,
          url,
          thumbnailUrl,
          bucket: BUCKET_NAME,
          folder,
          category,
          tags,
          metadata,
          isPublic,
        },
      });

      console.log(`✅ File uploaded: ${filename} (${fileSize} bytes)`);

      return {
        id: fileRecord.id,
        url,
        thumbnailUrl,
        filename: uniqueFilename,
        size: fileSize,
      };
    } catch (error: any) {
      console.error('❌ File upload error:', error);
      captureException(error, { uploadOptions: options });
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail for images
   */
  private static async generateThumbnail(options: {
    file: Buffer;
    fileKey: string;
    organizationId: string;
  }): Promise<string> {
    const { file, fileKey, organizationId } = options;

    // Generate thumbnail
    const thumbnail = await sharp(file)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail
    const thumbnailKey = `thumbnails/${fileKey}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: thumbnailKey,
        Body: thumbnail,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })
    );

    return CDN_URL
      ? `${CDN_URL}/${thumbnailKey}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${thumbnailKey}`;
  }

  /**
   * Get signed URL for private file access
   */
  static async getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Delete file from S3 and database
   */
  static async deleteFile(fileId: string, organizationId: string): Promise<void> {
    try {
      // Get file record
      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          organizationId,
        },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Delete from S3
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.path,
        })
      );

      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const thumbnailKey = `thumbnails/${file.path}`;
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: thumbnailKey,
          })
        );
      }

      // Soft delete in database
      await prisma.file.update({
        where: { id: fileId },
        data: { deletedAt: new Date() },
      });

      console.log(`✅ File deleted: ${file.originalName}`);
    } catch (error: any) {
      console.error('❌ File deletion error:', error);
      captureException(error, { fileId, organizationId });
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * List files for organization
   */
  static async listFiles(organizationId: string, folder?: string) {
    return await prisma.file.findMany({
      where: {
        organizationId,
        ...(folder && { folder }),
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get file by ID
   */
  static async getFile(fileId: string, organizationId: string) {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        organizationId,
        deletedAt: null,
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Update last accessed
    await prisma.file.update({
      where: { id: fileId },
      data: { lastAccessedAt: new Date() },
    });

    return file;
  }

  /**
   * Get file download URL
   */
  static async getDownloadUrl(fileId: string, organizationId: string): Promise<string> {
    const file = await this.getFile(fileId, organizationId);

    // Increment download count
    await prisma.file.update({
      where: { id: fileId },
      data: { downloadCount: { increment: 1 } },
    });

    if (file.isPublic) {
      return file.url;
    }

    return await this.getSignedUrl(file.path, 300); // 5 minutes
  }

  /**
   * Get storage usage for organization
   */
  static async getStorageUsage(organizationId: string) {
    const result = await prisma.file.aggregate({
      where: {
        organizationId,
        deletedAt: null,
      },
      _sum: {
        size: true,
      },
      _count: true,
    });

    return {
      totalSize: result._sum.size || 0,
      totalFiles: result._count,
      byCategory: await this.getUsageByCategory(organizationId),
    };
  }

  /**
   * Get usage breakdown by category
   */
  private static async getUsageByCategory(organizationId: string) {
    const files = await prisma.file.groupBy({
      by: ['category'],
      where: {
        organizationId,
        deletedAt: null,
      },
      _sum: {
        size: true,
      },
      _count: true,
    });

    return files.map(f => ({
      category: f.category,
      size: f._sum.size || 0,
      count: f._count,
    }));
  }

  /**
   * Determine file category from MIME type
   */
  private static getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    if (
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('sheet') ||
      mimeType.includes('presentation')
    ) {
      return 'document';
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
      return 'archive';
    }
    return 'other';
  }
}

export default StorageService;
