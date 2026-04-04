import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guard ADMIN — redirige vers /dashboard si l'utilisateur n'est pas ADMIN ou SUPER_ADMIN.
 * Doit être imbriqué dans RequireAuth.
 */
export default function RequireAdmin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * Guard SUPER_ADMIN — redirige vers /admin si l'utilisateur n'est pas SUPER_ADMIN.
 */
export function RequireSuperAdmin() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
