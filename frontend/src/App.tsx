import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
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
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/problems/:id" element={<ProblemDetailPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/contests/:id" element={<ContestDetailPage />} />
        <Route
          path="/admin/problems/new"
          element={
            <ProtectedRoute>
              <AdminProblemFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/problems/:id/edit"
          element={
            <ProtectedRoute>
              <AdminProblemFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/contests/new"
          element={
            <ProtectedRoute>
              <AdminContestFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/problems" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
