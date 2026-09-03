import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { geoFence } from '../../middleware/geoFence';
import { asyncHandler } from '../../utils/asyncHandler';
import { userController } from './user.controller';

const router = Router();

// Registration (public)
router.post('/register', geoFence, asyncHandler(userController.register));

router.use(authenticate, authorize('user'));

router.get('/dashboard', asyncHandler(userController.dashboard));

// Report Lost Pet + status update
router.post('/reports/lost', geoFence, asyncHandler(userController.createLostReport));
router.patch('/reports/lost/:id/status', asyncHandler(userController.updateLostReportStatus));

// Report Found Animal
router.post('/reports/found', geoFence, asyncHandler(userController.createFoundReport));

// Shelter View
router.get('/shelters', asyncHandler(userController.listShelters));
router.get('/shelters/:id/animals', asyncHandler(userController.listShelterAnimals));

// Image Recognition Matching (suggestions for one lost report)
router.get('/reports/lost/:id/matches', asyncHandler(userController.matchSuggestions));

// Map View Interface
router.get('/map/reports', asyncHandler(userController.mapReports));

// Search and Filter Reports
router.get('/reports/search', asyncHandler(userController.searchReports));

// Smart Notifications
router.get('/notifications', asyncHandler(userController.listNotifications));
router.patch('/notifications/:id/read', asyncHandler(userController.markNotificationRead));
router.put('/push-token', asyncHandler(userController.updatePushToken));

export default router;
