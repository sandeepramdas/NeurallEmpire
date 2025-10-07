import { Router } from 'express';
import multer from 'multer';
import FilesController from '../controllers/files.controller';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'text/plain',
      'text/csv',
      'text/html',
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      // Other
      'application/json',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Storage usage
router.get('/storage/usage', FilesController.getStorageUsage);

// File operations
router.post('/upload', upload.single('file'), FilesController.uploadFile);
router.get('/', FilesController.listFiles);
router.get('/:fileId', FilesController.getFile);
router.get('/:fileId/download', FilesController.getDownloadUrl);
router.delete('/:fileId', FilesController.deleteFile);

export default router;
