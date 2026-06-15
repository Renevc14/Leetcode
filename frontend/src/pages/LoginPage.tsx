import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/auth/useAuth';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/problems';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login();
    }
  }, [isLoading, isAuthenticated, login]);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Code2 className="mb-2 h-10 w-10 text-lc-orange" />
          <CardTitle>Redirigiendo a Authentik...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-lc-muted">
            Si no eres redirigido en unos segundos,{' '}
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
