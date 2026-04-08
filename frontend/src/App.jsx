import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

const Login       = React.lazy(() => import('./pages/Login'));
const Dashboard   = React.lazy(() => import('./pages/Dashboard'));
const Armoire     = React.lazy(() => import('./pages/Armoire'));
const Lots        = React.lazy(() => import('./pages/Lots'));
const ControleLot = React.lazy(() => import('./pages/ControleLot'));
const Uniformes   = React.lazy(() => import('./pages/Uniformes'));
const Reporting    = React.lazy(() => import('./pages/Reporting'));
const Peremptions  = React.lazy(() => import('./pages/Peremptions'));
const Commandes    = React.lazy(() => import('./pages/Commandes'));
const Admin       = React.lazy(() => import('./pages/Admin'));
const Profil          = React.lazy(() => import('./pages/Profil'));
const ForgotPassword  = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword   = React.lazy(() => import('./pages/ResetPassword'));

import Layout      from './components/Layout';
import RequireAuth  from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import { ULProvider } from './context/ULContext';

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-3 border-crf-rouge border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ULProvider>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/controle/lot/:token" element={<ControleLot />} />

          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<Dashboard />} />
              <Route path="/armoires"   element={<Armoire />} />
              <Route path="/lots"       element={<Lots />} />
              <Route path="/uniformes"    element={<Uniformes />} />
              <Route path="/peremptions"  element={<Peremptions />} />
              <Route path="/commandes"    element={<Commandes />} />
              <Route path="/reporting"    element={<Reporting />} />
              <Route path="/profil"    element={<Profil />} />

              <Route element={<RequireAdmin />}>
                <Route path="/admin/*" element={<Admin />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      </ULProvider>
    </AuthProvider>
  );
}
