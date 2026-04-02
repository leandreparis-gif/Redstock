import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useUniformes } from '../hooks/useUniformes';

// ─── Modal générique ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-crf-texte">{title}</h2>
          <button onClick={onClose} className="btn-icon text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Uniforme ──────────────────────────────────────────────────────────

const TYPES_UNIFORMES = [
  { label: 'Polo manche longue', taille: true },
  { label: 'Polo manche courte', taille: true },
  { label: 'Multipoche', taille: true },
  { label: 'Pantalon', taille: true },
  { label: 'Polaire', taille: true },
  { label: 'Parka', taille: true },
  { label: 'Softshell', taille: true },
  { label: 'Bonnet', taille: false },
  { label: 'Tour de cou', taille: false },
  { label: 'Casquette', taille: false },
  { label: 'Scratch secouriste', taille: false },
  { label: 'Scratch équipier secouriste', taille: false },
  { label: 'Scratch CI', taille: false },
];

function UniformeModal({ initial, onSave, onClose, loading }) {
  const typeInitial = TYPES_UNIFORMES.find(t => t.label === initial?.nom) || TYPES_UNIFORMES[0];
  const [form, setForm] = useState({
    nom: initial?.nom || TYPES_UNIFORMES[0].label,
    taille: initial?.taille || 'M',
    etat: initial?.etat || 'NEUF',
  });

  const typeSelectionne = TYPES_UNIFORMES.find(t => t.label === form.nom) || TYPES_UNIFORMES[0];
  const tailles = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'TU'];
  const etats = ['NEUF', 'BON', 'USE'];

  const handleNomChange = (nom) => {
    const type = TYPES_UNIFORMES.find(t => t.label === nom);
    setForm(f => ({ ...f, nom, taille: type?.taille ? f.taille : 'TU' }));
  };

  return (
    <Modal title={initial ? 'Modifier l\'uniforme' : 'Ajouter un uniforme'} onClose={onClose}>
      <div>
        <label className="label">Type *</label>
        <select className="select" value={form.nom} onChange={e => handleNomChange(e.target.value)}>
          {TYPES_UNIFORMES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Taille *</label>
          <select className="select" value={form.taille}
            onChange={e => setForm(f => ({ ...f, taille: e.target.value }))}
            disabled={!typeSelectionne.taille}>
            {tailles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="label">État *</label>
          <select className="select" value={form.etat}
            onChange={e => setForm(f => ({ ...f, etat: e.target.value }))}>
            {etats.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.nom || loading}
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal Mouvement (Prêt / Attribution / Retour) ──────────────────────────

function MouvementModal({ uniforme, type, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    beneficiaire_prenom: '',
    beneficiaire_qualification: 'PSE2',
    date_retour_prevue: '',
  });

  const typeLabels = {
    PRET: 'Enregistrer un prêt',
    ATTRIBUTION: 'Enregistrer une attribution',
    RETOUR: 'Enregistrer un retour',
  };

  return (
    <Modal title={typeLabels[type]} onClose={onClose}>
      {type !== 'RETOUR' && (
        <>
          <div>
            <label className="label">Prénom du bénéficiaire *</label>
            <input className="input" value={form.beneficiaire_prenom}
              onChange={e => setForm(f => ({ ...f, beneficiaire_prenom: e.target.value }))}
              placeholder="ex : Jean" />
          </div>

          <div>
            <label className="label">Qualification</label>
            <select className="select" value={form.beneficiaire_qualification}
              onChange={e => setForm(f => ({ ...f, beneficiaire_qualification: e.target.value }))}>
              <option value="PSE1">PSE1</option>
              <option value="PSE2">PSE2</option>
              <option value="CI">Certificat d'Instructeur</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>

          {type === 'PRET' && (
            <div>
              <label className="label">Date de retour prévue *</label>
              <input type="date" className="input" value={form.date_retour_prevue}
                onChange={e => setForm(f => ({ ...f, date_retour_prevue: e.target.value }))} />
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={
          type !== 'RETOUR' && (!form.beneficiaire_prenom || (type === 'PRET' && !form.date_retour_prevue)) || loading
        }
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement…' : 'Confirmer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Uniforme Card ────────────────────────────────────────────────────────────

function UniformeCard({ uniforme, isAdmin, onEdit, onDelete, onPret, onAttribution, onRetour }) {
  const statutBadge = {
    DISPONIBLE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Disponible' },
    PRETE: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Prêté' },
    ATTRIBUE: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Attribué' },
  };

  const etatBadge = {
    NEUF: 'bg-gray-100 text-gray-700',
    BON: 'bg-green-50 text-green-700',
    USE: 'bg-orange-50 text-orange-700',
  };

  const badge = statutBadge[uniforme.statut] || statutBadge.DISPONIBLE;

  return (
    <div className="bg-white rounded-card shadow-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="font-semibold text-crf-texte">{uniforme.nom}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              Taille {uniforme.taille}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${etatBadge[uniforme.etat]}`}>
              {uniforme.etat}
            </span>
          </div>
        </div>

        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Infos mouvement */}
      {uniforme.mouvements?.[0] && (
        <div className="mb-3 p-3 bg-gray-50 rounded text-xs space-y-1">
          <p className="font-medium">{uniforme.mouvements[0].beneficiaire_prenom} ({uniforme.mouvements[0].beneficiaire_qualification})</p>
          {uniforme.mouvements[0].date_retour_prevue && (
            <p className="text-gray-600">
              Retour prévu : {new Date(uniforme.mouvements[0].date_retour_prevue).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {uniforme.statut === 'DISPONIBLE' && (
          <>
            <button onClick={() => onPret(uniforme)}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors">
              Prêter
            </button>
            <button onClick={() => onAttribution(uniforme)}
              className="flex-1 text-xs px-2 py-1.5 rounded bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors">
              Attribuer
            </button>
          </>
        )}

        {uniforme.statut === 'PRETE' && (
          <button onClick={() => onRetour(uniforme)}
            className="flex-1 text-xs px-2 py-1.5 rounded bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
            Enregistrer le retour
          </button>
        )}

        {isAdmin && (
          <>
            <button onClick={() => onEdit(uniforme)} className="btn-icon p-1">
              <IconEdit size={13} />
            </button>
            <button onClick={() => onDelete(uniforme)} className="btn-icon p-1 hover:text-red-500">
              <IconTrash size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Uniformes() {
  const { isAdmin } = useAuth();
  const { uniformes, loading, error, fetch, createUniforme, updateUniforme, deleteUniforme, createPret, createAttribution, createRetour } = useUniformes();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch(); }, [fetch]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const closeModal = () => setModal(null);

  const handleSaveUniforme = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updateUniforme(modal.data.id, form);
      else            await createUniforme(form);
      showToast(modal.data ? 'Uniforme modifié' : 'Uniforme créé');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteUniforme = async (uniforme) => {
    if (!confirm(`Supprimer l'uniforme "${uniforme.nom}" ?`)) return;
    try {
      await deleteUniforme(uniforme.id);
      showToast('Uniforme supprimé');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleSaveMouvement = async (type, form) => {
    setSaving(true);
    try {
      if (type === 'PRET')        await createPret(modal.data.id, form);
      else if (type === 'ATTRIBUTION') await createAttribution(modal.data.id, form);
      else if (type === 'RETOUR')      await createRetour(modal.data.id, {});
      showToast(`${type === 'PRET' ? 'Prêt' : type === 'ATTRIBUTION' ? 'Attribution' : 'Retour'} enregistré`);
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  // Grouper par statut, triés par type puis taille
  const typeOrder = TYPES_UNIFORMES.map(t => t.label);
  const sortByType = arr => [...arr].sort((a, b) => {
    const ia = typeOrder.indexOf(a.nom);
    const ib = typeOrder.indexOf(b.nom);
    if (ia !== ib) return ia - ib;
    return a.taille.localeCompare(b.taille);
  });
  const uniformesParStatut = {
    DISPONIBLE: sortByType(uniformes.filter(u => u.statut === 'DISPONIBLE')),
    PRETE:      sortByType(uniformes.filter(u => u.statut === 'PRETE')),
    ATTRIBUE:   sortByType(uniformes.filter(u => u.statut === 'ATTRIBUE')),
  };

  return (
    <div>
      <PageHeader
        title="Uniformes"
        subtitle="Gestion des prêts, attributions et retours"
        actions={
          isAdmin && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setModal({ type: 'uniforme' })}
            >
              <IconPlus size={16} />
              Ajouter un uniforme
            </button>
          )
        }
      />

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-crf-rouge border-t-transparent
                          rounded-full animate-spin mb-3" />
          <p className="text-sm">Chargement…</p>
        </div>
      )}

      {error && (
        <div className="card border border-red-200 bg-red-50 text-red-700 text-sm py-4 text-center">
          {error}
          <button onClick={fetch} className="ml-2 underline">Réessayer</button>
        </div>
      )}

      {!loading && !error && uniformes.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👕</p>
          <p className="text-sm">Aucun uniforme pour le moment.</p>
        </div>
      )}

      {!loading && !error && uniformes.length > 0 && (
        <div className="space-y-6">
          {Object.entries(uniformesParStatut).map(([statut, items]) => items.length > 0 && (
            <div key={statut}>
              <h2 className="section-label mb-3">
                {statut === 'DISPONIBLE' ? '✓ Disponibles' : statut === 'PRETE' ? '📤 Prêtés' : '📌 Attribués'}
                <span className="ml-2 text-gray-500">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(uniforme => (
                  <UniformeCard
                    key={uniforme.id}
                    uniforme={uniforme}
                    isAdmin={isAdmin}
                    onEdit={(u) => setModal({ type: 'uniforme', data: u })}
                    onDelete={handleDeleteUniforme}
                    onPret={(u) => setModal({ type: 'mouvement', data: u, mouvementType: 'PRET' })}
                    onAttribution={(u) => setModal({ type: 'mouvement', data: u, mouvementType: 'ATTRIBUTION' })}
                    onRetour={(u) => setModal({ type: 'mouvement', data: u, mouvementType: 'RETOUR' })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {modal?.type === 'uniforme' && (
        <UniformeModal
          initial={modal.data}
          onSave={handleSaveUniforme}
          onClose={closeModal}
          loading={saving}
        />
      )}

      {modal?.type === 'mouvement' && (
        <MouvementModal
          uniforme={modal.data}
          type={modal.mouvementType}
          onSave={(form) => handleSaveMouvement(modal.mouvementType, form)}
          onClose={closeModal}
          loading={saving}
        />
      )}

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
