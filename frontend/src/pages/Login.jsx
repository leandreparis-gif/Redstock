import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoCRF from '../components/LogoCRF';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Redirige vers la page demandée avant le login, sinon /dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm]     = useState({ login: '', password: '' });
  const [error, setError]   = useState('');
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
    <div className="min-h-screen bg-crf-fond flex">
      {/* Panneau gauche décoratif */}
      <div className="hidden lg:flex lg:w-1/2 bg-crf-rouge flex-col items-center justify-center p-12">
        <div className="bg-white rounded-2xl p-8 shadow-xl mb-8 max-w-xs w-full">
          <LogoCRF height={60} />
        </div>
        <h1 className="text-white text-3xl font-bold text-center leading-snug">
          PharmaSecours
        </h1>
        <p className="text-red-100 text-center mt-3 text-sm max-w-xs">
          Gestion du stock médical secouriste — Croix-Rouge française, Versailles Grand Parc Ouest
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { icon: '🗄️', label: 'Armoires & Tiroirs' },
            { icon: '🎒', label: 'Lots & Sacs' },
            { icon: '👕', label: 'Uniformes' },
            { icon: '📊', label: 'Reporting' },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-white/15 rounded-xl p-3 text-white text-xs font-medium flex items-center gap-2">
              <span>{icon}</span>{label}
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo mobile */}
        <div className="lg:hidden bg-white rounded-2xl p-6 shadow-card mb-6">
          <LogoCRF height={48} />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-crf-texte">Connexion</h2>
            <p className="text-crf-texte-soft text-sm mt-1">Accédez à votre espace secouriste</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login" className="label">Identifiant</label>
              <input
                id="login" name="login" type="text"
                autoComplete="username" autoFocus required
                className="input" placeholder="ex : jean.dupont"
                value={form.login} onChange={handleChange} disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Mot de passe</label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password" required
                  className="input pr-20" placeholder="••••••••"
                  value={form.password} onChange={handleChange} disabled={loading}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-crf-texte-soft
                             hover:text-crf-rouge transition-colors select-none">
                  {showPwd ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 text-sm text-red-700
                         bg-crf-card-rose border border-red-200 rounded-xl px-3 py-2.5">
                <span className="flex-shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !form.login || !form.password}
              className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            PharmaSecours · Croix-Rouge française
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
