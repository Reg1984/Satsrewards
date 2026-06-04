import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SchoolSetup } from './components/SchoolSetup';
import { SchoolAdmin } from './components/SchoolAdmin';
import { SchoolWalletFunding } from './components/SchoolWalletFunding';
import { WalletPage } from './components/WalletPage';
import { Learn } from './components/Learn';
import { Games } from './components/Games';
import { Messages } from './components/Messages';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { LanguageProvider } from './contexts/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000
    }
  }
});

function AppRoutes() {
  const { initializeAuth, loading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      {loading ? (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated app */}
          <Route path="/app" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="school-setup" element={<SchoolSetup />} />
            <Route path="school-admin" element={<SchoolAdmin />} />
            <Route path="funding" element={<SchoolWalletFunding />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="learn" element={<Learn />} />
            <Route path="games" element={<Games />} />
            <Route path="messages" element={<Messages />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/school-setup" element={<Navigate to="/app/school-setup" replace />} />
          <Route path="/school-admin" element={<Navigate to="/app/school-admin" replace />} />
          <Route path="/funding" element={<Navigate to="/app/funding" replace />} />
          <Route path="/wallet" element={<Navigate to="/app/wallet" replace />} />
          <Route path="/learn" element={<Navigate to="/app/learn" replace />} />
          <Route path="/games" element={<Navigate to="/app/games" replace />} />
          <Route path="/messages" element={<Navigate to="/app/messages" replace />} />
          <Route path="/ai-assistant" element={<Navigate to="/app/ai-assistant" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
