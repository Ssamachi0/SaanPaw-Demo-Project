import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { geoFence } from '../../middleware/geoFence';
import { asyncHandler } from '../../utils/asyncHandler';
import { shelterController } from './shelter.controller';

const router = Router();

// Register is public (account is created in `pending` state, Developer approves).
router.post('/register', geoFence, asyncHandler(shelterController.register));

router.use(authenticate, authorize('shelter_admin'));

router.get('/dashboard', asyncHandler(shelterController.dashboard));

// Shelter Animals Management + Recovered Animals Posting
router.get('/animals', asyncHandler(shelterController.listShelterAnimals));
router.post('/animals', asyncHandler(shelterController.addShelterAnimal));
router.post('/animals/recovered', asyncHandler(shelterController.postRecovered));

// Animal Report Management + Animal Status Management
router.get('/reports', asyncHandler(shelterController.listAreaReports));
router.patch('/cases/:id/status', asyncHandler(shelterController.updateCaseStatus));

// Shelter Profile Management
router.patch('/profile', geoFence, asyncHandler(shelterController.updateProfile));

// Notification Management
router.get('/notifications', asyncHandler(shelterController.listNotifications));
router.patch('/notifications/:id/read', asyncHandler(shelterController.markNotificationRead));

export default router;
