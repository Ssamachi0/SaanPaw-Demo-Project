import fs from 'node:fs';
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { looksLikeImage, receivePhoto } from '../../middleware/upload';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';

const router = Router();

// Only the two mobile roles attach photos. Authenticate first so nobody unauthenticated can write to disk.
router.post(
  '/',
  authenticate,
  authorize('user', 'shelter_admin'),
  receivePhoto,
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest('Attach a photo in the "photo" field.');
    if (!(await looksLikeImage(file.path))) {
      await fs.promises.unlink(file.path);
      throw ApiError.badRequest('That file is not a valid JPEG, PNG or WebP image.');
    }
    // A path, not a full URL: clients resolve it against whichever host they reach the API on.
    res.status(201).json({ url: `/uploads/${file.filename}` });
  }),
);

export default router;
