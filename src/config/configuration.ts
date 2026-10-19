function validateProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const secret = process.env.JWT_SECRET ?? '';
  if (!secret || secret.length < 32 || secret === 'changeme-replace-with-a-long-random-secret-in-production') {
    throw new Error('JWT_SECRET must be at least 32 chars and not a default value in production');
  }

  const kybMode = process.env.KYB_SIMULATION_MODE;
  if (kybMode === 'always_pass') {
    throw new Error('KYB_SIMULATION_MODE=always_pass is not allowed in production');
  }
}

validateProductionSecrets();

export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.APP_API_PREFIX ?? 'api/v1',

  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  },

  risk: {
    jobMaxAttempts: parseInt(process.env.RISK_JOB_MAX_ATTEMPTS ?? '3', 10),
    kybSimulationMode: process.env.KYB_SIMULATION_MODE ?? 'random',
    kybSimulationDelayMs: parseInt(process.env.KYB_SIMULATION_DELAY_MS ?? '500', 10),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
