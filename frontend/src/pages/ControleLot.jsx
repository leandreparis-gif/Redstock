import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import LogoCRF from '../components/LogoCRF';
import { IconChevronDown, IconChevronRight, IconArrowLeft } from '../components/Icons';

export default function ControleLot() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPochette, setExpandedPochette] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    controleur_prenom: '',
    controleur_qualification: 'PSE2',
    statut: 'CONFORME',
    remarques: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchLot = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/lots/public/${token}`);
        setLot(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Lot introuvable');
      } finally {
        setLoading(false);
      }
    };
    fetchLot();
  }, [token]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSubmitControle = async (e) => {
    e.preventDefault();
    if (!form.controleur_prenom.trim()) {
      showToast('Veuillez entrer votre prénom', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/controles/public', {
        lot_token: token,
        controleur_prenom: form.controleur_prenom.trim(),
        controleur_qualification: form.controleur_qualification,
        statut: form.statut,
        remarques: form.remarques || null,
      });
      showToast('Contrôle enregistré avec succès ✓');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-crf-fond flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-crf-rouge border-t-transparent
                          rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-crf-fond flex items-center justify-center p-4">
        <div className="bg-white rounded-card shadow-card p-6 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="font-semibold text-crf-texte mb-2">Lot introuvable</h1>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!lot) return null;

  return (
    <div className="min-h-screen bg-crf-fond">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-icon"
          >
            <IconArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-semibold text-crf-texte">{lot.nom}</h1>
            <p className="text-xs text-gray-400">Contrôle de lot</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-8">
        {/* Logo CRF */}
        <div className="bg-white rounded-card shadow-card p-6 text-center">
          <div className="inline-block mb-3">
            <LogoCRF height={48} />
          </div>
          <h2 className="font-semibold text-crf-texte text-sm">
            Gestion de stock secouriste
          </h2>
          <p className="text-xs text-gray-400 mt-1">Contrôle du lot {lot.nom}</p>
        </div>

        {/* Pochettes */}
        <div className="space-y-2">
          {lot.pochettes?.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-6 text-center">
              <p className="text-sm text-gray-400">Aucune pochette dans ce lot.</p>
            </div>
          ) : (
            lot.pochettes.map(pochette => (
              <div key={pochette.id} className="bg-white rounded-card shadow-card overflow-hidden">
                {/* Header pochette */}
                <button
                  onClick={() => setExpandedPochette(
                    expandedPochette === pochette.id ? null : pochette.id
                  )}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50
                             transition-colors text-left"
                >
                  {expandedPochette === pochette.id
                    ? <IconChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    : <IconChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-crf-texte">{pochette.nom}</p>
                    <p className="text-xs text-gray-400">
                      {pochette.stocks?.length || 0} article{pochette.stocks?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>

                {/* Articles détaillés */}
                {expandedPochette === pochette.id && pochette.stocks?.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                    {pochette.stocks.map(stock => (
                      <div key={stock.id} className="bg-white rounded p-3 text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-crf-texte">{stock.article.nom}</p>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                            ×{stock.quantite_actuelle}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          {stock.article.categorie}
                        </p>

                        {/* Lots détaillés */}
                        {stock.lots?.length > 0 && (
                          <div className="space-y-1 pt-2 border-t border-gray-100">
                            {stock.lots.map((lot, idx) => (
                              <div key={idx} className="flex justify-between text-xs py-1">
                                <span className="text-gray-600 font-mono">{lot.label}</span>
                                <span className="text-gray-500">×{lot.quantite}</span>
                                {lot.date_peremption && (
                                  <span className="text-gray-400">
                                    {new Date(lot.date_peremption).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        {!showForm ? (
          <div className="bg-white rounded-card shadow-card p-4 space-y-2">
            <button
              className="w-full btn-primary"
              onClick={() => setShowForm(true)}
            >
              Démarrer le contrôle
            </button>
            <button
              className="w-full btn-secondary"
              onClick={() => navigate('/')}
            >
              Retour
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-card shadow-card p-4">
            <h2 className="font-semibold text-crf-texte mb-4">Formulaire de contrôle</h2>
            <form onSubmit={handleSubmitControle} className="space-y-3">
              {/* Prénom */}
              <div>
                <label className="label">Prénom du contrôleur *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ex : Jean"
                  value={form.controleur_prenom}
                  onChange={e => setForm(f => ({ ...f, controleur_prenom: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              {/* Qualification */}
              <div>
                <label className="label">Qualification</label>
                <select
                  className="select"
                  value={form.controleur_qualification}
                  onChange={e => setForm(f => ({ ...f, controleur_qualification: e.target.value }))}
                  disabled={submitting}
                >
                  <option value="PSE1">PSE1</option>
                  <option value="PSE2">PSE2</option>
                  <option value="CI">Certificat d'Instructeur</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="label">Statut du contrôle *</label>
                <div className="space-y-2">
                  {[
                    { value: 'CONFORME', label: '✓ Conforme', color: 'bg-green-50 border-green-200' },
                    { value: 'PARTIEL', label: '⚠ Partiellement conforme', color: 'bg-yellow-50 border-yellow-200' },
                    { value: 'NON_CONFORME', label: '✗ Non conforme', color: 'bg-red-50 border-red-200' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-3 border rounded cursor-pointer
                        ${form.statut === option.value ? option.color : 'bg-white border-gray-200'}`}
                    >
                      <input
                        type="radio"
                        name="statut"
                        value={option.value}
                        checked={form.statut === option.value}
                        onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                        disabled={submitting}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Remarques */}
              <div>
                <label className="label">Remarques (optionnel)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Observations, détails importants…"
                  value={form.remarques}
                  onChange={e => setForm(f => ({ ...f, remarques: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="flex-1 btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={submitting || !form.controleur_prenom.trim()}
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer le contrôle'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
