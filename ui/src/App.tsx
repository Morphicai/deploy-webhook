import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { Environment } from './pages/Environment';
import { Secrets } from './pages/Secrets';
import { SecretGroups } from './pages/SecretGroups';
import { SecretSyncs } from './pages/SecretSyncs';
import { Repositories } from './pages/Repositories';
import { Settings } from './pages/Settings';
import { APIKeys } from './pages/APIKeys';
import { MCPSetup } from './pages/MCPSetup';
import { Docs } from './pages/Docs';
import { Webhooks } from './pages/Webhooks';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, hasUser } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If no user exists, redirect to register
  if (!hasUser && window.location.pathname === '/login') {
    return <Navigate to="/register" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="environment" element={<Environment />} />
        <Route path="secrets" element={<Secrets />} />
        <Route path="secret-groups" element={<SecretGroups />} />
        <Route path="secret-syncs" element={<SecretSyncs />} />
        <Route path="repositories" element={<Repositories />} />
        <Route path="api-keys" element={<APIKeys />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="mcp-setup" element={<MCPSetup />} />
        <Route path="settings" element={<Settings />} />
        <Route path="docs" element={<Docs />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
