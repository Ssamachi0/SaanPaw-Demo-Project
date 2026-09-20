/**
 * Creates (or resets the password of) a Developer account for a real deployment.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run create-admin
 *
 * The password comes from the environment so it never lands in shell history or the repo.
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { DeveloperAccount } from '../models/DeveloperAccount';
import { logger } from '../utils/logger';

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');

  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await DeveloperAccount.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    logger.info(`Password updated for developer ${email}`);
  } else {
    await DeveloperAccount.create({ email, passwordHash, role: 'developer' });
    logger.info(`Developer account created: ${email}`);
  }
  await disconnectDatabase();
}

createAdmin().catch((err) => {
  logger.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
