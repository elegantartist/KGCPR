import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// For SSL connections, you might need to add SSL options
const client = postgres(connectionString, { ssl: 'require' });
export const db = drizzle(client, { schema });