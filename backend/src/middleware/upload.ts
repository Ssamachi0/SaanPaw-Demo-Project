import multer from 'multer';
import { ApiError } from '../utils/ApiError';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Single `photo` field, buffered in memory rather than written to disk: where it ends up
 * (local disk or Vercel Blob) is `storage.service.ts`'s call, made after this middleware runs.
 */
export const receivePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest('Only JPEG, PNG or WebP photos are accepted.'));
  },
}).single('photo');
