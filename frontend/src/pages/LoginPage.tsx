import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Code2, Info } from 'lucide-react';
import { usersApi } from '@/api/users';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserRole } from '@/types';

/**
 * Auth simulada: el backend no implementa register/login (eso lo hará un
 * servicio de autenticación externo). Aquí eliges uno de los usuarios
 * semilla del users-service y se valida contra el endpoint REAL
 * GET /v1/users/{userId} antes de crear la sesión local.
 */
const DEMO_USERS: { id: string; username: string; email: string; role: UserRole }[] = [
  { id: 'user-001', username: 'alice_dev', email: 'alice@example.com', role: 'USER' },
  { id: 'user-002', username: 'bob_setter', email: 'bob@example.com', role: 'SETTER' },
  { id: 'user-003', username: 'carol_admin', email: 'carol@example.com', role: 'ADMIN' },
];

export function LoginPage() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/problems';

  const mutation = useMutation({
    mutationFn: async (demoId: string) => {
      // Llamada real al users-service: confirma que el usuario existe.
      const profile = await usersApi.getUser(demoId);
      const demo = DEMO_USERS.find((d) => d.id === demoId);
      return { profile, demo };
    },
    onSuccess: ({ profile, demo }) => {
      login(`demo-token-${profile.id}`, {
        id: profile.id,
        username: profile.username,
        email: demo?.email,
        role: demo?.role,
        createdAt: profile.createdAt,
      });
      navigate(from, { replace: true });
    },
    onSettled: () => setPendingId(null),
  });

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Code2 className="mb-2 h-10 w-10 text-lc-orange" />
          <CardTitle>Sign in to LeetClone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2 rounded-md border border-lc-orange/40 bg-lc-orange/10 p-3 text-xs text-lc-text">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lc-orange" />
            <span>
              Modo demo: la autenticación real la manejará un servicio externo. Elige un usuario
              semilla del backend para iniciar sesión.
            </span>
          </div>

          <div className="space-y-2">
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.id}
                disabled={mutation.isPending}
                onClick={() => {
                  setPendingId(demo.id);
                  mutation.mutate(demo.id);
                }}
                className="flex w-full items-center gap-3 rounded-md border border-lc-border bg-lc-bg p-3 text-left transition-colors hover:border-lc-orange/60 hover:bg-lc-panel-hover disabled:opacity-50"
              >
                <Avatar name={demo.username} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{demo.username}</div>
                  <div className="truncate text-xs text-lc-muted">{demo.email}</div>
                </div>
                <Badge
                  variant={
                    demo.role === 'ADMIN' ? 'red' : demo.role === 'SETTER' ? 'orange' : 'green'
                  }
                >
                  {demo.role}
                </Badge>
                {pendingId === demo.id && <span className="text-xs text-lc-muted">…</span>}
              </button>
            ))}
          </div>

          {mutation.isError && (
            <p className="mt-3 text-sm text-lc-red">
              {extractErrorMessage(mutation.error)} — ¿está corriendo el users-service en el puerto
              3002?
            </p>
          )}

          <p className="mt-4 text-center text-sm text-lc-muted">
            ¿Sin cuenta?{' '}
            <Link to="/register" className="text-lc-orange hover:underline">
              Regístrate (demo)
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
