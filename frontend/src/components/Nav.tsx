import { Link } from 'react-router-dom';
import { Show } from '../auth/guards';
import { useAuth } from '../auth/useAuth';

export function Nav() {
  const { isAuthenticated, user, signinRedirect, signoutRedirect } = useAuth();

  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/problems">Problemas</Link>
        </li>
        {isAuthenticated && (
          <li>
            <Link to="/submit">Enviar</Link>
          </li>
        )}
        <Show ifRole="SETTER">
          <li>
            <Link to="/setter">Setter</Link>
          </li>
        </Show>
        <Show ifRole="ADMIN">
          <li>
            <Link to="/admin">Admin</Link>
          </li>
        </Show>
      </ul>
      <div>
        {isAuthenticated ? (
          <>
            <span>{user?.profile.email}</span>
            <button onClick={() => void signoutRedirect()}>Salir</button>
          </>
        ) : (
          <button onClick={() => void signinRedirect()}>Iniciar sesión</button>
        )}
      </div>
    </nav>
  );
}
