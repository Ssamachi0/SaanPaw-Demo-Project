import type { Role } from '../config/constants';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: Role;
      shelterId?: string;
    }
    interface Request {
      auth?: UserPayload;
    }
  }
}

export {};
