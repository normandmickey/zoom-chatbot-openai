import pkg from "pg";
import * as dotenv from "dotenv";
import settings from "../constants/settings.json" with { type: "json" };

dotenv.config();

const { Pool } = pkg;

// Validate required environment variables
const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  ssl: process.env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
  ...settings.database.poolConfig,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(-1);
  });

export default pool;