// Stops dotenv from reading a developer's real .env, so each case controls its own variables.
jest.mock('dotenv', () => ({ __esModule: true, default: { config: jest.fn() } }));

const STRONG = 'a'.repeat(40);
const ORIGINAL = process.env;

/** Loads config/env.ts fresh under the given environment. */
function loadEnv(vars: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL };
  for (const key of ['NODE_ENV', 'JWT_SECRET', 'MONGODB_URI', 'CORS_ORIGINS', 'TRUST_PROXY']) delete process.env[key];
  for (const [key, value] of Object.entries(vars)) if (value !== undefined) process.env[key] = value;
  let loaded: typeof import('../src/config/env');
  jest.isolateModules(() => {
    loaded = require('../src/config/env');
  });
  return loaded!.env;
}

afterAll(() => {
  process.env = ORIGINAL;
});

describe('production configuration', () => {
  const prod = { NODE_ENV: 'production', MONGODB_URI: 'mongodb://db/saanpaw' };

  it('refuses to start without a JWT secret', () => {
    expect(() => loadEnv(prod)).toThrow('JWT_SECRET');
  });

  it.each(['dev-secret', 'change-me-in-production', 'tooshort'])('refuses the weak secret %s', (secret) => {
    expect(() => loadEnv({ ...prod, JWT_SECRET: secret })).toThrow('at least 32 characters');
  });

  it('refuses to start without a database address', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', JWT_SECRET: STRONG })).toThrow('MONGODB_URI');
  });

  it('starts with a strong secret and a database address', () => {
    const env = loadEnv({ ...prod, JWT_SECRET: STRONG });
    expect(env.isProduction).toBe(true);
    expect(env.corsOrigins).toEqual([]);
  });

  it('reads a comma-separated list of allowed origins', () => {
    const env = loadEnv({ ...prod, JWT_SECRET: STRONG, CORS_ORIGINS: ' https://a.example.com , https://b.example.com,' });
    expect(env.corsOrigins).toEqual(['https://a.example.com', 'https://b.example.com']);
  });
});

describe('development configuration', () => {
  it('falls back to local defaults so a fresh checkout runs', () => {
    const env = loadEnv({});
    expect(env.isProduction).toBe(false);
    expect(env.jwtSecret).toBe('dev-secret');
    expect(env.mongoUri).toContain('127.0.0.1');
  });
});
