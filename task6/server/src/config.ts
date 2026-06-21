import dotenv from 'dotenv';
import path from 'path';

// Load the repo-root .env (one level up from /server) so a single file configures both apps.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

/** CLIENT_ORIGIN may be a single origin or a comma-separated allow-list. */
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 3001,
  clientOrigins: origins,
  clientOrigin: origins[0],
  isProduction: process.env.NODE_ENV === 'production',
  /** Grace period (ms) for a dropped player to reconnect before forfeiting. */
  reconnectGraceMs: 60_000,
};
