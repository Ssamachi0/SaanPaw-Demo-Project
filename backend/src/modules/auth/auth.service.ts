import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '../../config/constants';
import { User } from '../../models/User';
import { Shelter } from '../../models/Shelter';
import { DeveloperAccount } from '../../models/DeveloperAccount';
import { ApiError } from '../../utils/ApiError';

function sign(payload: Express.UserPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export const authService = {
  async login(role: Role, email: string, password: string) {
    const normalized = email.toLowerCase().trim();

    if (role === 'developer') {
      const acct = await DeveloperAccount.findOne({ email: normalized });
      if (!acct || !(await bcrypt.compare(password, acct.passwordHash))) {
        throw ApiError.unauthorized('Invalid developer credentials');
      }
      return { token: sign({ id: String(acct._id), role: 'developer' }) };
    }

    if (role === 'shelter_admin') {
      const shelter = await Shelter.findOne({ adminEmail: normalized });
      if (!shelter?.adminPasswordHash || !(await bcrypt.compare(password, shelter.adminPasswordHash))) {
        throw ApiError.unauthorized('Invalid shelter credentials');
      }
      if (shelter.approvalStatus !== 'approved') {
        throw ApiError.forbidden(`Shelter account is ${shelter.approvalStatus}`);
      }
      return {
        token: sign({ id: String(shelter._id), role: 'shelter_admin', shelterId: String(shelter._id) }),
      };
    }

    const user = await User.findOne({ email: normalized });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.unauthorized('Invalid credentials');
    }
    if (user.isBanned) throw ApiError.forbidden('Account is banned');
    return { token: sign({ id: String(user._id), role: 'user' }) };
  },

  hashPassword(plain: string) {
    return bcrypt.hash(plain, 10);
  },
};
