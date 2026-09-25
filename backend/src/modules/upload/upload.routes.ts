import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { receivePhoto } from '../../middleware/upload';
import { looksLikeImage, saveUploadedPhoto } from '../../services/storage.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';

const router = Router();

// Only the two mobile roles attach photos. Authenticate first so nobody unauthenticated can trigger a save.
router.post(
  '/',
  authenticate,
  authorize('user', 'shelter_admin'),
  receivePhoto,
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest('Attach a photo in the "photo" field.');
    if (!looksLikeImage(file.buffer)) {
      throw ApiError.badRequest('That file is not a valid JPEG, PNG or WebP image.');
    }
    const url = await saveUploadedPhoto(file.buffer, file.mimetype);
    res.status(201).json({ url });
  }),
);

export default router;
