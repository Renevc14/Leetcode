import { api } from './client';
import type { Me, PublicUser, UserStats } from '@/types';

/**
 * Endpoints reales del users-service (Smithy). No existe register/login:
 * la autenticación la proveerá un servicio externo más adelante; mientras
 * tanto el frontend usa una sesión demo sobre los usuarios semilla
 * (user-001 alice_dev, user-002 bob_setter, user-003 carol_admin).
 */
export const usersApi = {
  getMe: () => api.get<Me>('/api/users/me').then((r) => r.data),

  getUser: (userId: string) => api.get<PublicUser>(`/api/users/${userId}`).then((r) => r.data),

  getStats: (userId: string) =>
    api.get<UserStats>(`/api/users/${userId}/stats`).then((r) => r.data),
};
