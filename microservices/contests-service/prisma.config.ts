import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const rawUrl = process.env['DATABASE_URL'] ?? '';
const url = rawUrl.replace(
  /\$\{([A-Z_][A-Z0-9_]*)\}/g,
  (_, name: string) => process.env[name] ?? '',
);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url,
  },
});
