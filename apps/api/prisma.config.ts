import 'dotenv/config';
// Prisma 7: `defineConfig` is provided by `prisma/config`, not by `@prisma/internals`.
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
