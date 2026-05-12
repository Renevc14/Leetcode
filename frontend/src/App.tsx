import { Route, Routes } from 'react-router-dom';
import { RequireRole } from './auth/guards';
import { AuthBridge } from './components/AuthBridge';
import { Nav } from './components/Nav';
import { Admin } from './pages/Admin';
import { Callback } from './pages/Callback';
import { Forbidden } from './pages/Forbidden';
import { Home } from './pages/Home';
import { Problems } from './pages/Problems';
import { Setter } from './pages/Setter';
import { Submit } from './pages/Submit';

export default function App() {
  return (
    <>
      <AuthBridge />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/problems" element={<Problems />} />
          <Route
            path="/submit"
            element={
              <RequireRole role="USER">
                <Submit />
              </RequireRole>
            }
          />
          <Route
            path="/setter"
            element={
              <RequireRole role="SETTER">
                <Setter />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="ADMIN">
                <Admin />
              </RequireRole>
            }
          />
          <Route path="/auth/callback" element={<Callback />} />
          <Route path="/403" element={<Forbidden />} />
        </Routes>
      </main>
    </>
  );
}
