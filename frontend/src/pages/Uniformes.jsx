import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useUniformes } from '../hooks/useUniformes';

import Modal from '../components/Modal';

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
  { label: 'Scratch CDPE', taille: false },
  { label: 'Scratch stagiaire', taille: false },
  { label: 'Scratch formateur', taille: false },
  { label: 'Scratch Direction locale', taille: false },
];

function UniformeModal({ initial, onSave, onClose, loading }) {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
    beneficiaire_email: '',
    beneficiaire_qualification: 'PSE2',
    date_retour_prevue: '',
    remarques: '',
  });

  const typeLabels = {
    PRET: 'Enregistrer un prêt',
    ATTRIBUTION: 'Enregistrer une attribution',
    RETOUR: 'Enregistrer un retour',
  };

  const mouvement = uniforme?.mouvements?.[0];

  return (
    <Modal title={typeLabels[type]} onClose={onClose}>
      {type === 'RETOUR' ? (
        <>
          {/* Récap bénéficiaire */}
          {mouvement && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Retour de</p>
              <p className="text-sm font-semibold text-crf-texte">
                {mouvement.beneficiaire_prenom}
                <span className="text-gray-400 font-normal ml-1">({mouvement.beneficiaire_qualification})</span>
              </p>
              <p className="text-xs text-gray-500">
                {uniforme.statut === 'ATTRIBUE' ? 'Attribution définitive' : 'Prêt temporaire'}
                {mouvement.date_retour_prevue && (
                  <span> · retour prévu le {new Date(mouvement.date_retour_prevue).toLocaleDateString('fr-FR')}</span>
                )}
              </p>
            </div>
          )}
          <div>
            <label className="label">Remarques (optionnel)</label>
            <textarea className="input resize-none" rows={2}
              placeholder="État à la restitution, remarques…"
              value={form.remarques}
              onChange={e => setForm(f => ({ ...f, remarques: e.target.value }))} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="label">Prénom du bénéficiaire *</label>
            <input className="input" value={form.beneficiaire_prenom}
              onChange={e => setForm(f => ({ ...f, beneficiaire_prenom: e.target.value }))}
              placeholder="ex : Jean" />
          </div>

          <div>
            <label className="label">Email du bénéficiaire</label>
            <input type="email" className="input" value={form.beneficiaire_email}
              onChange={e => setForm(f => ({ ...f, beneficiaire_email: e.target.value }))}
              placeholder="ex : jean@croix-rouge.fr" />
            <p className="text-xs text-gray-400 mt-1">Un email de confirmation sera envoyé si renseigné</p>
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
          (type !== 'RETOUR' && (!form.beneficiaire_prenom || (type === 'PRET' && !form.date_retour_prevue))) || loading
        }
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement…' : type === 'PRET' ? 'Confirmer le prêt' : type === 'ATTRIBUTION' ? 'Confirmer l\'attribution' : 'Confirmer le retour'}
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

        {(uniforme.statut === 'PRETE' || uniforme.statut === 'ATTRIBUE') && (
          <button onClick={() => onRetour(uniforme)}
            className="flex-1 text-xs px-2 py-1.5 rounded bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
            ↩ Retour
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

// ─── Sections repliables ─────────────────────────────────────────────────────

function CollapsibleSections({ stockParType, pretés, attribués, uniformes, isAdmin, setModal, handleDeleteUniforme }) {
  const [openStock, setOpenStock] = useState(true);
  const [openPrets, setOpenPrets] = useState(true);
  const [openAttrib, setOpenAttrib] = useState(true);
  const [openTypes, setOpenTypes] = useState({});

  const toggleType = (label) =>
    setOpenTypes(o => ({ ...o, [label]: o[label] === undefined ? false : !o[label] }));

  const cardProps = (u) => ({
    key: u.id,
    uniforme: u,
    isAdmin,
    onEdit: (u) => setModal({ type: 'uniforme', data: u }),
    onDelete: handleDeleteUniforme,
    onPret: (u) => setModal({ type: 'mouvement', data: u, mouvementType: 'PRET' }),
    onAttribution: (u) => setModal({ type: 'mouvement', data: u, mouvementType: 'ATTRIBUTION' }),
    onRetour: (u) => setModal({ type: 'mouvement', data: u, mouvementType: 'RETOUR' }),
  });

  return (
    <div className="space-y-6">

      {/* ── Stock disponible ── */}
      <div className="card p-0 overflow-hidden">
        <button onClick={() => setOpenStock(o => !o)}
          className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-100 hover:bg-gray-50/60 transition-colors text-left">
          {openStock ? <IconChevronDown size={18} className="text-gray-400" /> : <IconChevronRight size={18} className="text-gray-400" />}
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-crf-texte">Stock disponible</h2>
          <span className="text-gray-400 font-normal text-sm">({uniformes.filter(u => u.statut === 'DISPONIBLE').length})</span>
        </button>

        {openStock && (
          <div className="p-4 space-y-3 bg-gray-50/40">
            {stockParType.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun uniforme disponible.</p>
            ) : (
              stockParType.map(({ label, items }) => {
                const isOpen = openTypes[label] !== false;
                return (
                  <div key={label} className="border border-gray-200 rounded-card overflow-hidden">
                    <button onClick={() => toggleType(label)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors text-left">
                      {isOpen ? <IconChevronDown size={14} className="text-gray-400" /> : <IconChevronRight size={14} className="text-gray-400" />}
                      <span className="text-sm font-semibold text-crf-texte">{label}</span>
                      <span className="text-xs text-gray-400">({items.length})</span>
                    </button>
                    {isOpen && (
                      <div className="p-3 border-t border-gray-100 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {items.map(u => <UniformeCard {...cardProps(u)} />)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Prêtés ── */}
      {pretés.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <button onClick={() => setOpenPrets(o => !o)}
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-100 hover:bg-gray-50/60 transition-colors text-left">
            {openPrets ? <IconChevronDown size={18} className="text-gray-400" /> : <IconChevronRight size={18} className="text-gray-400" />}
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
            <h2 className="text-base font-semibold text-crf-texte">Prêtés</h2>
            <span className="text-gray-400 font-normal text-sm">({pretés.length})</span>
          </button>
          {openPrets && (
            <div className="p-4 bg-gray-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pretés.map(u => <UniformeCard {...cardProps(u)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Attribués ── */}
      {attribués.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <button onClick={() => setOpenAttrib(o => !o)}
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-100 hover:bg-gray-50/60 transition-colors text-left">
            {openAttrib ? <IconChevronDown size={18} className="text-gray-400" /> : <IconChevronRight size={18} className="text-gray-400" />}
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" />
            <h2 className="text-base font-semibold text-crf-texte">Attribués</h2>
            <span className="text-gray-400 font-normal text-sm">({attribués.length})</span>
          </button>
          {openAttrib && (
            <div className="p-4 bg-gray-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attribués.map(u => <UniformeCard {...cardProps(u)} />)}
              </div>
            </div>
          )}
        </div>
      )}

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
      else if (type === 'RETOUR')      await createRetour(modal.data.id, { remarques: form.remarques || undefined });
      showToast(`${type === 'PRET' ? 'Prêt' : type === 'ATTRIBUTION' ? 'Attribution' : 'Retour'} enregistré`);
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  // Grouper par type, triés par taille — uniquement les DISPONIBLES
  const tailleOrder = ['XS','S','M','L','XL','XXL','TU'];
  const sortByTaille = arr => [...arr].sort((a, b) => tailleOrder.indexOf(a.taille) - tailleOrder.indexOf(b.taille));
  const typeOrder = TYPES_UNIFORMES.map(t => t.label);
  const sortByType = arr => [...arr].sort((a, b) => typeOrder.indexOf(a.nom) - typeOrder.indexOf(b.nom));

  const stockParType = TYPES_UNIFORMES
    .map(t => ({
      label: t.label,
      items: sortByTaille(uniformes.filter(u => u.nom === t.label && u.statut === 'DISPONIBLE')),
    }))
    .filter(g => g.items.length > 0);

  const pretés    = sortByType(uniformes.filter(u => u.statut === 'PRETE'));
  const attribués = sortByType(uniformes.filter(u => u.statut === 'ATTRIBUE'));

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
        <CollapsibleSections
          stockParType={stockParType}
          pretés={pretés}
          attribués={attribués}
          uniformes={uniformes}
          isAdmin={isAdmin}
          setModal={setModal}
          handleDeleteUniforme={handleDeleteUniforme}
        />
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
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
