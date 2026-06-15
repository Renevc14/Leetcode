import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { RequireAuth, RequireRole } from '@/auth/guards';
import { LoginPage } from '@/pages/LoginPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { ProblemsPage } from '@/pages/ProblemsPage';
import { ProblemDetailPage } from '@/pages/ProblemDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ContestsPage } from '@/pages/ContestsPage';
import { ContestDetailPage } from '@/pages/ContestDetailPage';
import { AdminProblemFormPage } from '@/pages/AdminProblemFormPage';
import { AdminContestFormPage } from '@/pages/AdminContestFormPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/problems" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/problems/:id" element={<ProblemDetailPage />} />
        <Route
          path="/profile/:userId"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/contests/:id" element={<ContestDetailPage />} />
        <Route
          path="/admin/problems/new"
          element={
            <RequireRole role="SETTER">
              <AdminProblemFormPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/problems/:id/edit"
          element={
            <RequireRole role="SETTER">
              <AdminProblemFormPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/contests/new"
          element={
            <RequireRole role="SETTER">
              <AdminContestFormPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/problems" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
