/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'yarn',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
  },
  coverageAnalysis: 'perTest',
  // Focus mutation testing on critical paths only
  mutate: [
    // Authentication — critical for security
    'packages/backend/server/src/core/auth/**/*.ts',
    '!packages/backend/server/src/core/auth/**/*.spec.ts',
    '!packages/backend/server/src/core/auth/**/*.e2e.ts',

    // Permission system — critical for authorization
    'packages/backend/server/src/core/permission/**/*.ts',
    '!packages/backend/server/src/core/permission/**/*.spec.ts',

    // Quota system — critical for billing
    'packages/backend/server/src/core/quota/**/*.ts',
    '!packages/backend/server/src/core/quota/**/*.spec.ts',

    // Error handling — critical for security and UX
    'packages/common/error/src/**/*.ts',
    '!packages/common/error/src/**/*.spec.ts',
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail CI if mutation score drops below 50%
  },
  timeoutMS: 30000,
  concurrency: 4,
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
};

export default config;
