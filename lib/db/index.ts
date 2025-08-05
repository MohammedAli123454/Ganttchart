import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

// Global variable to store the client instance
declare global {
  var __db_client: Client | undefined;
  var __db_connected: boolean | undefined;
}

// Database connection with singleton pattern for development
const getClient = () => {
  if (!global.__db_client) {
    global.__db_client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mathstutorials',
    });
    global.__db_connected = false;
  }
  return global.__db_client;
};

const client = getClient();

const connectDb = async () => {
  if (!global.__db_connected) {
    try {
      await client.connect();
      global.__db_connected = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection error:', error);
      // Reset connection status on error
      global.__db_connected = false;
      throw error;
    }
  }
};

export const db = drizzle(client, { schema });

export { connectDb };
export * from './schema';