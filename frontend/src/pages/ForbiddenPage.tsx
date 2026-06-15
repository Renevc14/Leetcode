import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CardTitle>403 - No tienes permiso</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-sm text-lc-muted">Tu rol no permite acceder a esta ruta.</p>
          <Link to="/problems" className="text-lc-orange underline">
            Volver al catalogo
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
