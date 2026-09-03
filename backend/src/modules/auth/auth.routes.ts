import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';

const router = Router();

// Shared login for all three roles; registration lives in the user & shelter modules.
router.post('/login', asyncHandler(authController.login));

export default router;
