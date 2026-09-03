import type { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';

const loginSchema = z.object({
  role: z.enum(['developer', 'shelter_admin', 'user']),
  email: z.string().email(),
  password: z.string().min(6),
});

export const authController = {
  async login(req: Request, res: Response) {
    const { role, email, password } = loginSchema.parse(req.body);
    const result = await authService.login(role, email, password);
    res.json(result);
  },
};
