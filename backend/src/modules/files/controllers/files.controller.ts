import { Request, Response } from 'express';
import StorageService from '@/infrastructure/storage/storage.service';
import { captureException } from '@/config/sentry';

export class FilesController {
  /**
   * Upload file
   * POST /api/files/upload
   */
  static async uploadFile(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const uploadedBy = (req as any).user?.id;

      if (!organizationId || !uploadedBy) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      const {
        folder,
        isPublic = 'false',
        tags = '[]',
        metadata = '{}',
      } = req.body;

      const result = await StorageService.uploadFile({
        file: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        organizationId,
        uploadedBy,
        folder,
        isPublic: isPublic === 'true',
        tags: JSON.parse(tags),
        metadata: JSON.parse(metadata),
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'File uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload file',
      });
    }
  }

  /**
   * List files
   * GET /api/files
   */
  static async listFiles(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { folder } = req.query;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const files = await StorageService.listFiles(organizationId, folder as string);

      res.json({
        success: true,
        data: files,
        count: files.length,
      });
    } catch (error: any) {
      console.error('Error listing files:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list files',
      });
    }
  }

  /**
   * Get file details
   * GET /api/files/:fileId
   */
  static async getFile(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const file = await StorageService.getFile(fileId, organizationId);

      res.json({
        success: true,
        data: file,
      });
    } catch (error: any) {
      console.error('Error getting file:', error);
      captureException(error);
      res.status(404).json({
        success: false,
        message: error.message || 'File not found',
      });
    }
  }

  /**
   * Get file download URL
   * GET /api/files/:fileId/download
   */
  static async getDownloadUrl(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const url = await StorageService.getDownloadUrl(fileId, organizationId);

      res.json({
        success: true,
        data: { url },
      });
    } catch (error: any) {
      console.error('Error getting download URL:', error);
      captureException(error);
      res.status(404).json({
        success: false,
        message: error.message || 'File not found',
      });
    }
  }

  /**
   * Delete file
   * DELETE /api/files/:fileId
   */
  static async deleteFile(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      await StorageService.deleteFile(fileId, organizationId);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting file:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete file',
      });
    }
  }

  /**
   * Get storage usage
   * GET /api/files/storage/usage
   */
  static async getStorageUsage(req: Request, res: Response) {
    try {
      const organizationId = (req as any).user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const usage = await StorageService.getStorageUsage(organizationId);

      res.json({
        success: true,
        data: usage,
      });
    } catch (error: any) {
      console.error('Error getting storage usage:', error);
      captureException(error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get storage usage',
      });
    }
  }
}

export default FilesController;
