import { Router } from 'express';
import multer from 'multer';
import FilesController from '../controllers/files.controller';
import { authenticate } from '@/middleware/auth';
import { validateFileUpload } from '@/middleware/file-validation';

const router = Router();

// Configure multer for memory storage
// Basic multer config - comprehensive validation is done by validateFileUpload middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (will be further validated by middleware)
  },
});

// All routes require authentication
router.use(authenticate);

// Storage usage
router.get('/storage/usage', FilesController.getStorageUsage);

// File operations
// Upload with comprehensive validation: file type, size, magic numbers, sanitization
router.post(
  '/upload',
  upload.single('file'),
  validateFileUpload({
    allowedTypes: ['images', 'documents', 'videos', 'audio'],
    maxSize: 50 * 1024 * 1024, // 50MB
  }),
  FilesController.uploadFile
);
router.get('/', FilesController.listFiles);
router.get('/:fileId', FilesController.getFile);
router.get('/:fileId/download', FilesController.getDownloadUrl);
router.delete('/:fileId', FilesController.deleteFile);

export default router;
