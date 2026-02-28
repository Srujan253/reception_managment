import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import AppLayout from './components/layout/AppLayout';
import PublicRegistration from './pages/PublicRegistration';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Sessions from './pages/Sessions';
import Participants from './pages/Participants';
import Events from './pages/Events';
import Admin from './pages/Admin';

function ProtectedRoute({ children, adminOnly = false, managerOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#F9FAFB]">
      <div className="text-center">
        <div className="w-8 h-8 border border-[#CBD5E1] border-t-[#64748B] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[#6B7280] text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  if (managerOnly && !['admin', 'manager'].includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={<PublicRegistration />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="scanner" element={<Scanner />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="participants" element={<Participants />} />
        <Route path="events" element={<ProtectedRoute managerOnly><Events /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#F9FAFB',
                border: '1px solid #CBD5E1',
                boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.08)',
                borderRadius: '4px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                color: '#111827',
              },
              success: { iconTheme: { primary: '#16A34A', secondary: '#F9FAFB' } },
              error: { iconTheme: { primary: '#DC2626', secondary: '#F9FAFB' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
