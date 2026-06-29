import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useToast, setToastFn } from './hooks/useToast';

import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Leads      from './pages/Leads';
import { Followups, Calls, WhatsApp, Reports, Agents, Import, Settings } from './pages/OtherPages';

/* ── Toast renderer ─────────────────────────────────────── */
function ToastHost() {
  const { toasts, show } = useToast();
  // FIX: register the show fn once on mount
  useEffect(() => { setToastFn(show); }, [show]);
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
    </div>
  );
}

/* ── Auth guard ─────────────────────────────────────────────
   FIX: reads user synchronously from localStorage context —
   no flicker, no race with async token verification.
────────────────────────────────────────────────────────── */
function Guard({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastHost />
        <Routes>
          <Route path="/login"     element={<Login />} />
          <Route path="/"          element={<Guard><Dashboard /></Guard>} />
          <Route path="/leads"     element={<Guard><Leads /></Guard>} />
          <Route path="/followups" element={<Guard><Followups /></Guard>} />
          <Route path="/calls"     element={<Guard><Calls /></Guard>} />
          <Route path="/whatsapp"  element={<Guard><WhatsApp /></Guard>} />
          <Route path="/reports"   element={<Guard><Reports /></Guard>} />
          <Route path="/agents"    element={<Guard><Agents /></Guard>} />
          <Route path="/import"    element={<Guard><Import /></Guard>} />
          <Route path="/settings"  element={<Guard><Settings /></Guard>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
