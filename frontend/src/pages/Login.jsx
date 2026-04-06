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
    <div className="min-h-screen flex">

      {/* ── Panneau gauche (grands écrans) ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-crf-rouge flex-col justify-between p-12 relative overflow-hidden">

        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="bg-white rounded-2xl px-5 py-3 inline-flex">
            <LogoCRF height={44} />
          </div>
        </div>

        {/* Contenu central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-white text-4xl font-black leading-tight tracking-tight mb-4">
            Gérez votre stock<br />médical secouriste<br />
            <span className="relative inline-block mt-1">
              <span className="relative z-10">en toute simplicité.</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-white/20 -z-0 rounded" aria-hidden="true" />
            </span>
          </h1>
          <p className="text-red-100 text-base max-w-xs leading-relaxed">
            RedStock centralise votre pharmacie, vos lots de secours et vos uniformes en un seul outil.
          </p>

          {/* Fonctionnalités */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              { icon: '🗄️', label: 'Pharmacie', desc: 'Armoires & tiroirs' },
              { icon: '🎒', label: 'Lots & Sacs', desc: 'QR code de contrôle' },
              { icon: '👕', label: 'Uniformes', desc: 'Prêts & attributions' },
              { icon: '📊', label: 'Reporting', desc: 'Historique & alertes' },
            ].map(({ icon, label, desc }) => (
              <div key={label}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <span className="text-2xl mb-2 block">{icon}</span>
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-red-200 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-red-200 text-xs">
          Croix-Rouge française · Versailles Grand Parc Ouest
        </p>
      </div>

      {/* ── Panneau droit — Formulaire ────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8 inline-flex bg-gray-50 rounded-2xl px-4 py-2.5">
            <LogoCRF height={40} />
          </div>

          {/* Titre */}
          <div className="mb-8">
            <h2 className="text-4xl font-black text-crf-texte leading-tight tracking-tight">
              Bienvenue<br />dans votre{' '}
              <span className="relative inline-block">
                <span className="relative z-10">espace</span>
                <span className="absolute inset-x-0 bottom-0.5 h-3.5 bg-yellow-300 -z-0 -rotate-1 rounded" aria-hidden="true" />
              </span>
            </h2>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              Connectez-vous pour accéder à la gestion du stock médical.
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

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
                           focus:outline-none focus:ring-2 focus:ring-crf-rouge/25 focus:border-crf-rouge
                           transition disabled:opacity-50"
              />
            </div>

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
                             focus:outline-none focus:ring-2 focus:ring-crf-rouge/25 focus:border-crf-rouge
                             transition disabled:opacity-50"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-crf-rouge transition-colors"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}>
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

            {error && (
              <div role="alert"
                className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit"
              disabled={loading || !form.login || !form.password}
              className="w-full bg-crf-rouge hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-bold py-4 rounded-2xl text-sm tracking-wide
                         transition-all flex items-center justify-center gap-2 mt-2 shadow-sm">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Connexion…
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-10">
            RedStock · Croix-Rouge française
          </p>
        </div>
      </div>

    </div>
  );
}
