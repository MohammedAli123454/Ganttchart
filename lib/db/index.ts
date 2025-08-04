import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mathstutorials',
});

// Initialize connection
let isConnected = false;

const connectDb = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
};

export const db = drizzle(client, { schema });

export { connectDb };
export * from './schema';