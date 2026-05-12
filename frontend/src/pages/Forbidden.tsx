import { Link } from 'react-router-dom';

export function Forbidden() {
  return (
    <section>
      <h1>403 — Sin permiso</h1>
      <p>No tienes el rol necesario para acceder a esta página.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}
