import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/auth/useAuth';

export function RegisterPage() {
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      login();
    }
  }, [isAuthenticated, login]);

  if (isAuthenticated) return <Navigate to="/problems" replace />;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Code2 className="mb-2 h-10 w-10 text-lc-orange" />
          <CardTitle>El registro lo gestiona Authentik</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-lc-muted">
            Crea tu cuenta directamente en el proveedor de identidad. Si no eres redirigido,{' '}
            <button onClick={() => login()} className="text-lc-orange underline">
              haz click aqui
            </button>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
