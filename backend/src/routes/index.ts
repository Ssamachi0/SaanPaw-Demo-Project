import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import developerRoutes from '../modules/developer/developer.routes';
import shelterRoutes from '../modules/shelter/shelter.routes';
import userRoutes from '../modules/user/user.routes';

const api = Router();

api.get('/health', (_req, res) => res.json({ status: 'ok', service: 'saanpaw-api' }));
api.use('/auth', authRoutes);
api.use('/developer', developerRoutes);
api.use('/shelter', shelterRoutes);
api.use('/user', userRoutes);

export default api;
