import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Cached on `global` (not just a module-level variable) because a serverless platform can reuse
 * the same warm container - and its already-loaded modules - for many invocations. Connecting
 * once and reusing it is required there: opening a fresh connection per request exhausts a
 * database's connection limit almost immediately under any real concurrency. A long-running
 * server (Docker, a VPS) calls this once at startup, where the same caching is simply a no-op.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = (global.__mongooseCache ??= { conn: null, promise: null });

export async function connectDatabase(): Promise<void> {
  if (cache.conn) return;
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose.connect(env.mongoUri);
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  logger.info(`MongoDB connected: ${cache.conn.connection.name}`);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
