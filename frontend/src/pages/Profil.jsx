import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function Profil() {
  const { user, refreshUser } = useAuth();

  // ── Formulaire infos personnelles ──
  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // ── Formulaire mot de passe ──
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handlePwChange = (e) => {
    setPwForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setPwError('');
    setPwSuccess('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.prenom.trim()) {
      setError('Le prénom est requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.put('/auth/profile', {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
      });
      await refreshUser();
      setSuccess('Informations mises à jour');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwError('Tous les champs sont requis');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas');
      return;
    }
    setPwSaving(true);
    setPwError('');
    try {
      await apiClient.patch('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess('Mot de passe mis à jour');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setPwSaving(false);
    }
  };

  const initiale = user?.prenom?.[0]?.toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-crf-texte">Mon profil</h1>

      {/* ── Avatar + rôle ── */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-crf-rouge flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initiale}
        </div>
        <div>
          <p className="font-semibold text-crf-texte">
            {user?.prenom} {user?.nom || ''}
          </p>
          <p className="text-sm text-gray-500">
            {user?.qualification} · {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Admin' : 'Contributeur'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Identifiant : {user?.login}</p>
        </div>
      </div>

      {/* ── Informations personnelles ── */}
      <form onSubmit={handleSaveProfile} className="card p-6 space-y-4">
        <h2 className="font-semibold text-crf-texte">Informations personnelles</h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg">{success}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom *</label>
            <input
              type="text"
              name="prenom"
              className="input"
              value={form.prenom}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="label">Nom</label>
            <input
              type="text"
              name="nom"
              className="input"
              value={form.nom}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="label">Adresse email</label>
          <input
            type="email"
            name="email"
            className="input"
            value={form.email}
            onChange={handleChange}
            placeholder="exemple@email.com"
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* ── Mot de passe ── */}
      <form onSubmit={handleSavePassword} className="card p-6 space-y-4">
        <h2 className="font-semibold text-crf-texte">Changer le mot de passe</h2>

        {pwError && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="bg-green-50 text-green-600 text-sm px-4 py-2 rounded-lg">{pwSuccess}</div>
        )}

        <div>
          <label className="label">Mot de passe actuel</label>
          <input
            type="password"
            name="currentPassword"
            className="input"
            value={pwForm.currentPassword}
            onChange={handlePwChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              name="newPassword"
              className="input"
              value={pwForm.newPassword}
              onChange={handlePwChange}
              minLength={8}
            />
          </div>
          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              type="password"
              name="confirmPassword"
              className="input"
              value={pwForm.confirmPassword}
              onChange={handlePwChange}
              minLength={8}
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">Minimum 8 caractères</p>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={pwSaving}>
            {pwSaving ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </div>
      </form>
    </div>
  );
}
