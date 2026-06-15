import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

const rawUrl = process.env['DATABASE_URL'] ?? '';
const connectionString = rawUrl.replace(
  /\$\{([A-Z_][A-Z0-9_]*)\}/g,
  (_, name: string) => process.env[name] ?? '',
);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
