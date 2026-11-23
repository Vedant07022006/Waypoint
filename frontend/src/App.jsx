import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/common/Navbar";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RepoListPage } from "./pages/RepoListPage";
import { RepoDetailPage } from "./pages/RepoDetailPage";
import { PRDetailPage } from "./pages/PRDetailPage";
import { CodeExplorerPage } from "./pages/CodeExplorerPage";
import { ProfilePage } from "./pages/ProfilePage";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repos"
            element={
              <ProtectedRoute>
                <RepoListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repos/:repoId"
            element={
              <ProtectedRoute>
                <RepoDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repos/:repoId/branches/:branchId/code"
            element={
              <ProtectedRoute>
                <CodeExplorerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pr/:prId"
            element={
              <ProtectedRoute>
                <PRDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
