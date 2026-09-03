/**
 * Dev seed: one developer account, one approved shelter, one user - all inside
 * the San Jose Del Monte service area.
 */
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { DeveloperAccount } from '../models/DeveloperAccount';
import { Shelter } from '../models/Shelter';
import { User } from '../models/User';
import { SJDM_CENTER } from '../config/serviceArea';
import { logger } from '../utils/logger';

async function seed() {
  await connectDatabase();
  const pass = await bcrypt.hash('password123', 10);
  const center: [number, number] = [SJDM_CENTER.longitude, SJDM_CENTER.latitude];

  await DeveloperAccount.updateOne(
    { email: 'dev@saanpaw.local' },
    { $setOnInsert: { email: 'dev@saanpaw.local', passwordHash: pass } },
    { upsert: true },
  );

  await Shelter.updateOne(
    { name: 'SJDM City Pound (seed)' },
    {
      $setOnInsert: {
        name: 'SJDM City Pound (seed)',
        contactNumber: '0900-000-0000',
        address: 'Poblacion, San Jose Del Monte, Bulacan',
        location: { type: 'Point', coordinates: center },
        operatingRadiusMeters: 5000,
        approvalStatus: 'approved',
        adminEmail: 'shelter@saanpaw.local',
        adminPasswordHash: pass,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: 'user@saanpaw.local' },
    {
      $setOnInsert: {
        fullName: 'Seed User',
        email: 'user@saanpaw.local',
        passwordHash: pass,
        alertRadiusMeters: 3000,
        homeLocation: { type: 'Point', coordinates: center },
      },
    },
    { upsert: true },
  );

  logger.info('Seed complete. Logins: dev@ / shelter@ / user@saanpaw.local  (password123)');
  await disconnectDatabase();
}

seed().catch((e) => {
  logger.error(e);
  process.exit(1);
});
