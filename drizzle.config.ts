import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: 'ep-billowing-pond-a1bipvqo-pooler.ap-southeast-1.aws.neon.tech',
    port: 5432,
    user: 'neondb_owner',
    password: 'npg_KGJ2aukZOY9N',
    database: 'neondb',
    ssl: 'require', // or just `true`
  },
});
