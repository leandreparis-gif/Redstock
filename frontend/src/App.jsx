import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import Armoire     from './pages/Armoire';
import Lots        from './pages/Lots';
import ControleLot from './pages/ControleLot';
import Uniformes   from './pages/Uniformes';
import Reporting   from './pages/Reporting';
import Admin       from './pages/Admin';

import Layout      from './components/Layout';
import RequireAuth  from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Routes publiques ─────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />

        {/* Page de contrôle QR — pas de JWT, UI mobile sans sidebar */}
        <Route path="/controle/lot/:token" element={<ControleLot />} />

        {/* ── Routes protégées (JWT requis) ────────────────────────────── */}
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/armoires"   element={<Armoire />} />
            <Route path="/lots"       element={<Lots />} />
            <Route path="/uniformes"  element={<Uniformes />} />
            <Route path="/reporting"  element={<Reporting />} />

            {/* ── Routes ADMIN uniquement ───────────────────────────────── */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin/*" element={<Admin />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
