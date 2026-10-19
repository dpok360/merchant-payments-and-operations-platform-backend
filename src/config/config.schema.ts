import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  APP_API_PREFIX: Joi.string().default('api/v1'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_DIALECT: Joi.string().default('postgres'),
  POSTGRES_USER: Joi.string().optional(),
  POSTGRES_PASSWORD: Joi.string().optional(),
  POSTGRES_DB: Joi.string().optional(),
  DB_SSL: Joi.boolean().default(false),

  REDIS_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),

  BCRYPT_ROUNDS: Joi.number().min(12).default(12),

  RISK_JOB_MAX_ATTEMPTS: Joi.number().min(1).default(3),
  KYB_SIMULATION_MODE: Joi.string()
    .valid('always_pass', 'always_fail', 'random')
    .default('random'),
  KYB_SIMULATION_DELAY_MS: Joi.number().default(500),
});
