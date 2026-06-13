import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Code2, Info } from 'lucide-react';
import { usersApi } from '@/api/users';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Registro simulado: el backend no expone POST /v1/users/register (el alta
 * real la hará un servicio de autenticación externo). Para poder probar el
 * resto de endpoints, este formulario crea una sesión local anclada al
 * usuario semilla user-001 del users-service (validado con una llamada real
 * a GET /v1/users/user-001), conservando el username que escribas.
 */
const DEMO_BACKING_USER_ID = 'user-001';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => usersApi.getUser(DEMO_BACKING_USER_ID),
    onSuccess: (profile) => {
      login(`demo-token-${profile.id}`, {
        id: profile.id,
        username: username.trim() || profile.username,
        email,
        role: 'USER',
        createdAt: new Date().toISOString(),
      });
      navigate('/problems', { replace: true });
    },
  });

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Code2 className="mb-2 h-10 w-10 text-lc-orange" />
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2 rounded-md border border-lc-orange/40 bg-lc-orange/10 p-3 text-xs text-lc-text">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-lc-orange" />
            <span>
              Registro demo: el alta real la hará un servicio de autenticación externo. Tu sesión
              quedará vinculada al usuario semilla <code className="font-mono">user-001</code> del
              backend.
            </span>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                autoComplete="username"
                placeholder="coder123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-lc-red">
                {extractErrorMessage(mutation.error)} — ¿está corriendo el users-service en el
                puerto 3002?
              </p>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating account…' : 'Sign Up (demo)'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-lc-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-lc-orange hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
