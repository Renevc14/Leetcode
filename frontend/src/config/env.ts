import { z } from 'zod';

const envSchema = z.object({
  VITE_AUTH_AUTHORITY: z.string().url(),
  VITE_AUTH_CLIENT_ID: z.string().min(1),
  VITE_AUTH_REDIRECT_URI: z.string().url(),
  VITE_API_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  VITE_AUTH_AUTHORITY: import.meta.env.VITE_AUTH_AUTHORITY,
  VITE_AUTH_CLIENT_ID: import.meta.env.VITE_AUTH_CLIENT_ID,
  VITE_AUTH_REDIRECT_URI: import.meta.env.VITE_AUTH_REDIRECT_URI,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});

if (!parsed.success) {
  console.error('Configuración de entorno inválida:', parsed.error.flatten().fieldErrors);
  throw new Error('Variables de entorno faltantes o inválidas. Revisa .env.example.');
}

export const env = parsed.data;
