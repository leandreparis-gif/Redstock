import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import LogoCRF from '../components/LogoCRF';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 inline-flex bg-gray-50 rounded-2xl px-4 py-2.5">
          <LogoCRF height={40} />
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-black text-crf-texte leading-tight tracking-tight">
            Mot de passe oublié
          </h2>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            Entrez votre adresse email. Si un compte y est associé, vous recevrez un lien de réinitialisation.
          </p>
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 text-sm text-green-800">
            <p className="font-semibold mb-1">Email envoyé</p>
            <p>Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation dans quelques instants.</p>
            <Link to="/login" className="inline-block mt-4 text-crf-rouge font-semibold hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-crf-texte mb-1.5">
                Adresse email
              </label>
              <input
                id="email" name="email" type="email"
                autoComplete="email" autoFocus required
                placeholder="votre@email.fr"
                value={email} onChange={(e) => { setError(''); setEmail(e.target.value); }}
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
              disabled={loading || !email.trim()}
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
                  Envoi…
                </>
              ) : 'Envoyer le lien'}
            </button>

            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-gray-500 hover:text-crf-rouge transition-colors">
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-10">
          RedStock · Croix-Rouge française
        </p>
      </div>
    </div>
  );
}
