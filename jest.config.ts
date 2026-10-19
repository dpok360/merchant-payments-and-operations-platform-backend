import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json',
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.(t|j)s',
    '!src/database/migrations/**',
    '!src/database/seeds/**',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
