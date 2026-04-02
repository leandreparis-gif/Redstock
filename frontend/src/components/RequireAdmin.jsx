import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guard ADMIN — redirige vers /dashboard si l'utilisateur n'est pas ADMIN.
 * Doit être imbriqué dans RequireAuth.
 */
export default function RequireAdmin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
