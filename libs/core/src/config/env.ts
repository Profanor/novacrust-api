import * as dotenv from 'dotenv';
import * as env from 'env-var';

dotenv.config();

//  --------------->> ENVIRONMENTS <<--------------//
const NODE_ENV = env.get('NODE_ENV').required().asString();
const isDevelopment =
  env.get('NODE_ENV').required().asString() === 'development';
const isProduction = env.get('NODE_ENV').required().asString() === 'production';

//  --------------->> DATABASE CONFIG <<--------------//
const DatabaseUrl = env.get('DATABASE_URL').required().asString();

//  --------------->> JWT CONFIG <<--------------//
const JWTSecret = env.get('JWT_SECRET').required().asString();
const JWTExpires = env.get('JWT_ACCESS_TOKEN_EXPIRES_IN').required().asString();

// //  --------------->> PAYMENT / DEPOSIT CONFIG [PAYSTACK] <<--------------//

//  --------------->> REDIS CONFIG <<--------------//
const REDIS_HOST = env.get('REDIS_HOST').default('127.0.0.1').asString();
const REDIS_PORT = env.get('REDIS_PORT').default('6379').asInt();
const REDIS_PASSWORD = env.get('REDIS_PASSWORD').asString();
const REDIS_DB = env.get('REDIS_DB').default('0').asInt();

const isLocalInstance = env.get('IS_LOCAL_INSTANCE').asBool();

export const envVariables = {
  isDevelopment,
  isProduction,
  DatabaseUrl,
  isLocalInstance,
  NODE_ENV,
  JWT: { JWTSecret, JWTExpires },
  REDIS: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD || undefined,
    db: REDIS_DB,
  },
  PAYMENT_GATEWAYS: {},
  EMAIL: {},
};
