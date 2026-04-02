import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Requête : injecte le JWT ──────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pharma_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Réponse : gère expiration JWT et erreurs réseau ───────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide → nettoyage + redirect login
      localStorage.removeItem('pharma_token');
      localStorage.removeItem('pharma_user');
      // Ne pas naviguer si on est déjà sur /login ou /controle (route publique)
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/controle')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
