import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => logger.info(`SaanPaw API listening on :${env.port}`));
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
