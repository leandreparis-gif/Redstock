import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoCRF from '../components/LogoCRF';

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const from        = location.state?.from?.pathname || '/dashboard';

  const [form, setForm]       = useState({ login: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.login.trim() || !form.password) return;
    setError('');
    setLoading(true);
    try {
      await login(form.login.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-10">
          <LogoCRF height={52} />
        </div>

        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-crf-texte leading-tight tracking-tight">
            Bienvenue dans<br />votre espace{' '}
            <span className="relative inline-block">
              <span className="relative z-10">PharmaSecours</span>
              <span
                className="absolute inset-x-0 bottom-1 h-4 bg-yellow-300 -z-0 -rotate-1 rounded"
                aria-hidden="true"
              />
            </span>
          </h1>
          <p className="text-gray-500 mt-4 text-base">
            Connectez-vous pour accéder à la gestion du stock médical.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Identifiant */}
          <div>
            <label htmlFor="login" className="block text-sm font-semibold text-crf-texte mb-1.5">
              Identifiant
            </label>
            <input
              id="login" name="login" type="text"
              autoComplete="username" autoFocus required
              placeholder="ex : jean.dupont"
              value={form.login} onChange={handleChange} disabled={loading}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5
                         text-sm text-crf-texte placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-crf-rouge/30 focus:border-crf-rouge
                         transition disabled:opacity-50"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-crf-texte mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password" name="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password" required
                placeholder="••••••••"
                value={form.password} onChange={handleChange} disabled={loading}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 pr-12
                           text-sm text-crf-texte placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-crf-rouge/30 focus:border-crf-rouge
                           transition disabled:opacity-50"
              />
              <button
                type="button" tabIndex={-1}
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-crf-rouge transition-colors"
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div role="alert"
              className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading || !form.login || !form.password}
            className="w-full bg-crf-rouge hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-bold py-4 rounded-2xl text-sm tracking-wide
                       transition-all duration-150 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                  fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Connexion…
              </>
            ) : 'Se connecter'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          PharmaSecours · Croix-Rouge française
        </p>
      </div>
    </div>
  );
}
