import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import LogoCRF from '../components/LogoCRF';

// ─── Helpers ────────────────────────────────────────────────────────────────

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isSoonExpired(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  return d >= new Date() && d <= in30;
}

function fmtDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// ─── Flatten articles from pochettes ───────────────────────────────────────

function flattenItems(pochettes) {
  const items = [];
  for (const pochette of pochettes) {
    for (const stock of pochette.stocks || []) {
      items.push({
        id: `${pochette.id}-${stock.id}`,
        pochette_nom: pochette.nom,
        article_nom: stock.article.nom,
        categorie: stock.article.categorie,
        qty_attendue: stock.quantite_actuelle,
        lots: stock.lots || [],
      });
    }
  }
  return items;
}

// ─── Composant principal ────────────────────────────────────────────────────

export default function ControleLot() {
  const { token } = useParams();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // step: 'intro' | 'checklist' | 'submit' | 'done'
  const [step, setStep] = useState('intro');

  // checklist state: { [itemId]: { qty_reelle: number, ok: bool } }
  const [checks, setChecks] = useState({});

  const [prenom, setPrenom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get(`/lots/public/${token}`)
      .then(({ data }) => setLot(data))
      .catch(err => setError(err.response?.data?.error || 'Lot introuvable'))
      .finally(() => setLoading(false));
  }, [token]);

  const items = useMemo(() => lot ? flattenItems(lot.pochettes || []) : [], [lot]);

  // Init checks when entering checklist
  const startChecklist = useCallback(() => {
    const initial = {};
    for (const item of items) {
      initial[item.id] = { qty_reelle: item.qty_attendue };
    }
    setChecks(initial);
    setStep('checklist');
  }, [items]);

  const setQty = (id, val) => {
    setChecks(c => ({ ...c, [id]: { ...c[id], qty_reelle: Math.max(0, parseInt(val) || 0) } }));
  };

  // Compute issues
  const issues = useMemo(() => {
    return items.filter(item => {
      const check = checks[item.id];
      if (!check) return false;
      const qtyIssue = check.qty_reelle < item.qty_attendue;
      const expiredLot = item.lots.some(l => isExpired(l.date_peremption));
      return qtyIssue || expiredLot;
    });
  }, [items, checks]);

  const statut = useMemo(() => {
    if (issues.length === 0) return 'CONFORME';
    if (issues.length < items.length / 2) return 'PARTIEL';
    return 'NON_CONFORME';
  }, [issues, items]);

  const remarquesAuto = useMemo(() => {
    if (issues.length === 0) return '';
    return issues.map(item => {
      const check = checks[item.id];
      const parts = [];
      if (check && check.qty_reelle < item.qty_attendue) {
        parts.push(`manquant: ${check.qty_reelle}/${item.qty_attendue}`);
      }
      const expiredLots = item.lots.filter(l => isExpired(l.date_peremption));
      if (expiredLots.length > 0) {
        parts.push(`périmé le ${fmtDate(expiredLots[0].date_peremption)}`);
      }
      return `${item.article_nom} (${item.pochette_nom}) — ${parts.join(', ')}`;
    }).join('\n');
  }, [issues, checks]);

  const handleSubmit = async () => {
    if (!prenom.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/controles/public', {
        lot_token: token,
        controleur_prenom: prenom.trim(),
        controleur_qualification: 'PSE2',
        statut,
        remarques: remarquesAuto || null,
      });
      setStep('done');
    } catch {
      alert('Erreur lors de l\'enregistrement. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-crf-rouge border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-6 max-w-sm w-full text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <h1 className="font-semibold text-gray-800 mb-2">Lot introuvable</h1>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  );

  // ── Done ──────────────────────────────────────────────────────────────────

  if (step === 'done') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="font-bold text-xl text-gray-800 mb-2">Contrôle enregistré</h1>
        <p className="text-sm text-gray-500">
          Merci {prenom}. Le contrôle du lot <strong>{lot.nom}</strong> a été enregistré.
        </p>
        {issues.length === 0 ? (
          <p className="mt-3 text-sm text-green-700 font-medium">✓ Tout est conforme</p>
        ) : (
          <p className="mt-3 text-sm text-orange-700 font-medium">⚠ {issues.length} anomalie{issues.length > 1 ? 's' : ''} signalée{issues.length > 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  );

  // ── Intro ─────────────────────────────────────────────────────────────────

  if (step === 'intro') return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="mb-4">
            <LogoCRF height={44} />
          </div>
          <h1 className="font-bold text-xl text-gray-800">{lot.nom}</h1>
          <p className="text-sm text-gray-400 mt-1">Contrôle de matériel</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-sm text-gray-600 mb-3 font-medium">Contenu du lot :</p>
          {(lot.pochettes || []).map(p => (
            <div key={p.id} className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{p.nom}</p>
              <div className="space-y-1">
                {(p.stocks || []).map(s => (
                  <div key={s.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                    <span className="text-gray-700">{s.article.nom}</span>
                    <span className="font-semibold text-gray-800">×{s.quantite_actuelle}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          className="w-full bg-crf-rouge text-white font-semibold py-3.5 rounded-xl text-base"
          onClick={startChecklist}
        >
          Commencer le contrôle →
        </button>
      </div>
    </div>
  );

  // ── Checklist ─────────────────────────────────────────────────────────────

  if (step === 'checklist') {
    // Group by pochette
    const byPochette = {};
    for (const item of items) {
      if (!byPochette[item.pochette_nom]) byPochette[item.pochette_nom] = [];
      byPochette[item.pochette_nom].push(item);
    }

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3">
          <h1 className="font-bold text-gray-800">{lot.nom}</h1>
          <p className="text-xs text-gray-400">Vérifiez chaque article et ajustez les quantités si besoin</p>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {Object.entries(byPochette).map(([pNom, pItems]) => (
            <div key={pNom} className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{pNom}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {pItems.map(item => {
                  const check = checks[item.id] || { qty_reelle: item.qty_attendue };
                  const qtyIssue = check.qty_reelle < item.qty_attendue;
                  const expiredLots = item.lots.filter(l => isExpired(l.date_peremption));
                  const soonLots = item.lots.filter(l => isSoonExpired(l.date_peremption));
                  const hasIssue = qtyIssue || expiredLots.length > 0;

                  return (
                    <div key={item.id} className={`px-4 py-3 ${hasIssue ? 'bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{item.article_nom}</p>
                          <p className="text-xs text-gray-400">{item.categorie}</p>

                          {/* Lots périmés */}
                          {expiredLots.map((l, i) => (
                            <p key={i} className="text-xs text-red-600 mt-0.5 font-medium">
                              ⚠ Périmé le {fmtDate(l.date_peremption)}
                            </p>
                          ))}
                          {soonLots.filter(l => !isExpired(l.date_peremption)).map((l, i) => (
                            <p key={i} className="text-xs text-orange-500 mt-0.5">
                              ⏱ Expire le {fmtDate(l.date_peremption)}
                            </p>
                          ))}
                        </div>

                        {/* Quantité */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <p className="text-xs text-gray-400">attendu : {item.qty_attendue}</p>
                          <div className="flex items-center gap-2">
                            <button
                              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center"
                              onClick={() => setQty(item.id, (check.qty_reelle || 0) - 1)}
                            >−</button>
                            <span className={`w-8 text-center font-bold text-base ${qtyIssue ? 'text-red-600' : 'text-green-600'}`}>
                              {check.qty_reelle}
                            </span>
                            <button
                              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center"
                              onClick={() => setQty(item.id, (check.qty_reelle || 0) + 1)}
                            >+</button>
                          </div>
                          {qtyIssue && (
                            <p className="text-xs text-red-500 font-medium">
                              manque {item.qty_attendue - check.qty_reelle}
                            </p>
                          )}
                          {!qtyIssue && !hasIssue && (
                            <p className="text-xs text-green-500">✓ OK</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Barre de validation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="text-sm">
              {issues.length === 0
                ? <span className="text-green-600 font-medium">✓ Tout est OK</span>
                : <span className="text-red-600 font-medium">⚠ {issues.length} anomalie{issues.length > 1 ? 's' : ''}</span>
              }
            </div>
            <button
              className="bg-crf-rouge text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
              onClick={() => setStep('submit')}
            >
              Terminer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Résumé */}
        <div className={`rounded-2xl shadow p-5 ${
          statut === 'CONFORME' ? 'bg-green-50' :
          statut === 'PARTIEL' ? 'bg-orange-50' : 'bg-red-50'
        }`}>
          <h2 className="font-bold text-lg text-gray-800 mb-1">
            {statut === 'CONFORME' ? '✓ Matériel conforme' :
             statut === 'PARTIEL' ? '⚠ Partiellement conforme' : '✗ Non conforme'}
          </h2>
          <p className="text-sm text-gray-600">
            {issues.length === 0
              ? 'Tout le matériel est présent et en bon état.'
              : `${issues.length} anomalie${issues.length > 1 ? 's' : ''} détectée${issues.length > 1 ? 's' : ''} :`}
          </p>
          {issues.length > 0 && (
            <ul className="mt-2 space-y-1">
              {issues.map(item => {
                const check = checks[item.id];
                return (
                  <li key={item.id} className="text-sm text-gray-700">
                    • <strong>{item.article_nom}</strong>
                    {check && check.qty_reelle < item.qty_attendue &&
                      ` — manque ${item.qty_attendue - check.qty_reelle} unité${item.qty_attendue - check.qty_reelle > 1 ? 's' : ''}`}
                    {item.lots.some(l => isExpired(l.date_peremption)) && ' — périmé'}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Prénom */}
        <div className="bg-white rounded-2xl shadow p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Votre prénom *
          </label>
          <input
            type="text"
            className="input text-base"
            placeholder="ex : Jean"
            value={prenom}
            onChange={e => setPrenom(e.target.value)}
            disabled={submitting}
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-xl"
            onClick={() => setStep('checklist')}
            disabled={submitting}
          >
            ← Modifier
          </button>
          <button
            className="flex-2 flex-1 bg-crf-rouge text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting || !prenom.trim()}
          >
            {submitting ? 'Envoi…' : 'Valider le contrôle'}
          </button>
        </div>
      </div>
    </div>
  );
}
