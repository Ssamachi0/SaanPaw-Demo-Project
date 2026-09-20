/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // The app's tsconfig has rootDir "src", which would reject files under tests/, so ts-jest gets its own options.
  transform: {
    '^.+\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2021',
          module: 'CommonJS',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          types: ['node', 'jest'],
        },
      },
    ],
  },
};
