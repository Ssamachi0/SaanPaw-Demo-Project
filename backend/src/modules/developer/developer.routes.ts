import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { developerController } from './developer.controller';

const router = Router();
router.use(authenticate, authorize('developer'));

router.get('/dashboard', asyncHandler(developerController.dashboard));
router.get('/overview', asyncHandler(developerController.overview));
router.patch('/users/:id/ban', asyncHandler(developerController.banUser));

// Shelter Approval Management
router.get('/shelters/pending', asyncHandler(developerController.listPendingShelters));
router.patch('/shelters/:id/review', asyncHandler(developerController.reviewShelter));

// System Management
router.get('/system', asyncHandler(developerController.systemConfig));

// Report Monitoring
router.get('/flags', asyncHandler(developerController.listFlags));
router.patch('/flags/:id/resolve', asyncHandler(developerController.resolveFlag));

export default router;
