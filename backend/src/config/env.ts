import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/saanpaw'),
  jwtSecret: required('JWT_SECRET', 'dev-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
  imageRecognition: {
    model: process.env.IR_MODEL ?? 'mobilenet_v3',
    matchThreshold: Number(process.env.IR_MATCH_THRESHOLD ?? 0.82),
    maxResults: Number(process.env.IR_MAX_RESULTS ?? 10),
  },
  alerts: {
    defaultUserRadius: Number(process.env.DEFAULT_USER_ALERT_RADIUS ?? 3000),
    defaultShelterRadius: Number(process.env.DEFAULT_SHELTER_RADIUS ?? 5000),
  },
  moderation: {
    falseReportBanThreshold: Number(process.env.MODERATION_FALSE_REPORT_BAN_THRESHOLD ?? 3),
  },
};
