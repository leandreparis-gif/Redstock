import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import LogoCRF from '../components/LogoCRF';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      return setError('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (password !== confirm) {
      return setError('Les mots de passe ne correspondent pas');
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 inline-flex bg-gray-50 rounded-2xl px-4 py-2.5">
            <LogoCRF height={40} />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 text-sm text-red-800">
            <p className="font-semibold mb-1">Lien invalide</p>
            <p>Ce lien de réinitialisation est invalide ou a expiré.</p>
            <Link to="/forgot-password" className="inline-block mt-4 text-crf-rouge font-semibold hover:underline">
              Faire une nouvelle demande
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 inline-flex bg-gray-50 rounded-2xl px-4 py-2.5">
          <LogoCRF height={40} />
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-black text-crf-texte leading-tight tracking-tight">
            Nouveau mot de passe
          </h2>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            Choisissez un nouveau mot de passe (8 caractères minimum).
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 text-sm text-green-800">
            <p className="font-semibold mb-1">Mot de passe modifié</p>
            <p>Votre mot de passe a été réinitialisé avec succès.</p>
            <Link to="/login" className="inline-block mt-4 text-crf-rouge font-semibold hover:underline">
              Se connecter
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-crf-texte mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password" autoFocus required
                  placeholder="••••••••"
                  value={password} onChange={(e) => { setError(''); setPassword(e.target.value); }}
                  disabled={loading}
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

            <div>
              <label htmlFor="confirm" className="block text-sm font-semibold text-crf-texte mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm" name="confirm" type="password"
                autoComplete="new-password" required
                placeholder="••••••••"
                value={confirm} onChange={(e) => { setError(''); setConfirm(e.target.value); }}
                disabled={loading}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5
                           text-sm text-crf-texte placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-crf-rouge/25 focus:border-crf-rouge
                           transition disabled:opacity-50"
              />
            </div>

            {error && (
              <div role="alert"
                className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit"
              disabled={loading || !password || !confirm}
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
                  Réinitialisation…
                </>
              ) : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-10">
          RedStock
        </p>
      </div>
    </div>
  );
}
