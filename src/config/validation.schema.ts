import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Auth
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(24).required(),
    otherwise: Joi.string().default('fallback_secret_key_123'),
  }),

  // AI Providers
  OPENROUTER_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Twilio (optional unless you rely on SMS)
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_API_KEY_SID: Joi.string().optional(),
  TWILIO_API_KEY_SECRET: Joi.string().optional(),
  TWILIO_PHONE_NUMBER: Joi.string().optional(),

  // Database (Fail if these are missing)
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
});
