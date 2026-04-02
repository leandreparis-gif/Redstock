import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

// Clés localStorage
const TOKEN_KEY = 'pharma_token';
const USER_KEY  = 'pharma_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Chargement initial : vérifier que le token stocké est encore valide
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !user) return;

    apiClient.get('/auth/me').then(({ data }) => {
      // Rafraîchit les données utilisateur si elles ont changé
      localStorage.setItem(USER_KEY, JSON.stringify(data));
      setUser(data);
    }).catch(() => {
      // Token expiré ou révoqué → déconnexion silencieuse
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    });
    // Intentionnellement sans dépendances : ne tourne qu'au montage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (loginValue, password) => {
    const { data } = await apiClient.post('/auth/login', {
      login: loginValue,
      password,
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const isAdmin        = user?.role === 'ADMIN';
  const isContributeur = user?.role === 'CONTRIBUTEUR';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isContributeur }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
