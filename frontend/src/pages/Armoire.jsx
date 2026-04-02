import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import PeremptionBadge, { getPeremptionStatut } from '../components/PeremptionBadge';
import {
  IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useArmoires } from '../hooks/useArmoires';
import { useArticles } from '../hooks/useArticles';
import apiClient from '../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

/** Retourne le pire statut de péremption d'un stock (pour le badge de l'article) */
function pireStatutStock(lots, estPerimable) {
  if (!estPerimable || !lots?.length) return 'ok';
  const ordre = ['perime', 'critique', 'proche', 'ok', 'non_perimable'];
  return lots.reduce((pire, l) => {
    const s = getPeremptionStatut(l.date_peremption);
    return ordre.indexOf(s) < ordre.indexOf(pire) ? s : pire;
  }, 'ok');
}

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

// ─── Modal Armoire ────────────────────────────────────────────────────────────

function ArmoireModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '', description: initial?.description || '' });

  return (
    <Modal title={initial ? 'Modifier l\'armoire' : 'Nouvelle armoire'} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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

// ─── Modal Tiroir ─────────────────────────────────────────────────────────────

function TiroirModal({ initial, armoireNom, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '', description: initial?.description || '' });

  return (
    <Modal title={initial ? 'Modifier le tiroir' : `Nouveau tiroir — ${armoireNom}`} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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

// ─── Modal Stock (articles + lots) ────────────────────────────────────────────

function StockModal({ tiroirNom, articles, initial, onSave, onClose, loading }) {
  const [articleId, setArticleId] = useState(initial?.article?.id || '');
  const [qte, setQte]             = useState(initial?.quantite_actuelle ?? 0);
  const [lots, setLots]           = useState(
    initial?.lots?.length ? initial.lots
      : [{ label: '', date_peremption: '', quantite: 1 }]
  );

  const article = articles.find(a => a.id === articleId);

  const addLot = () => setLots(l => [...l, { label: '', date_peremption: '', quantite: 1 }]);
  const removeLot = (i) => setLots(l => l.filter((_, j) => j !== i));
  const updateLot = (i, field, val) =>
    setLots(l => l.map((lot, j) => j === i ? { ...lot, [field]: val } : lot));

  const totalLots = lots.reduce((s, l) => s + (parseInt(l.quantite) || 0), 0);

  const handleSave = () => {
    const lotsClean = lots
      .filter(l => l.label.trim())
      .map(l => ({
        label: l.label.trim(),
        date_peremption: l.date_peremption || null,
        quantite: parseInt(l.quantite) || 0,
      }));
    onSave({ articleId, quantite_actuelle: totalLots, lots: lotsClean });
  };

  return (
    <Modal title={`${initial ? 'Modifier' : 'Ajouter'} un article — ${tiroirNom}`} onClose={onClose}>
      {/* Article */}
      <div>
        <label className="label">Article *</label>
        <select className="select" value={articleId}
          onChange={e => setArticleId(e.target.value)} disabled={!!initial}>
          <option value="">Choisir un article…</option>
          {articles.map(a => (
            <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>
          ))}
        </select>
      </div>

      {/* Lots */}
      {articleId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="label mb-0">
              Lots
              {article?.est_perimable && (
                <span className="ml-2 text-xs text-orange-500 font-normal">— article périmable</span>
              )}
            </p>
            <button type="button" onClick={addLot}
              className="text-xs text-crf-rouge hover:underline font-medium">
              + Ajouter un lot
            </button>
          </div>

          <div className="space-y-2">
            {lots.map((lot, i) => (
              <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-md p-2">
                <div className="flex-1 space-y-1">
                  <input className="input text-xs py-1" placeholder="Référence lot *"
                    value={lot.label} onChange={e => updateLot(i, 'label', e.target.value)} />
                  <div className="flex gap-2">
                    {article?.est_perimable && (
                      <input type="date" className="input text-xs py-1 flex-1"
                        value={lot.date_peremption}
                        onChange={e => updateLot(i, 'date_peremption', e.target.value)} />
                    )}
                    <input type="number" min="0" className="input text-xs py-1 w-20"
                      placeholder="Qté" value={lot.quantite}
                      onChange={e => updateLot(i, 'quantite', e.target.value)} />
                  </div>
                </div>
                {lots.length > 1 && (
                  <button onClick={() => removeLot(i)} className="text-gray-300 hover:text-red-500 mt-1">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Quantité totale calculée : <strong>{totalLots}</strong>
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary"
          disabled={!articleId || totalLots < 0 || loading}
          onClick={handleSave}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Composant lot individuel ─────────────────────────────────────────────────

function LotRow({ lot }) {
  const statut = getPeremptionStatut(lot.date_peremption);
  const rowCls = (statut === 'perime' || statut === 'critique')
    ? 'bg-red-50' : statut === 'proche' ? 'bg-orange-50' : '';

  return (
    <div className={`flex items-center gap-3 text-xs px-3 py-1.5 rounded ${rowCls}`}>
      <span className="font-mono text-gray-500 truncate min-w-0 flex-1">{lot.label}</span>
      <span className="text-gray-600 flex-shrink-0">×{lot.quantite}</span>
      {lot.date_peremption
        ? <PeremptionBadge date={lot.date_peremption} />
        : <span className="text-gray-400">—</span>
      }
    </div>
  );
}

// ─── Ligne article dans un tiroir ─────────────────────────────────────────────

function ArticleRow({ stock, isAdmin, tiroirNom, articles, armoireId, tiroirId, onEdit, onDelete }) {
  const { article, quantite_actuelle, lots } = stock;
  const sousMin = quantite_actuelle < article.quantite_min;
  const pire    = pireStatutStock(lots, article.est_perimable);
  const urgent  = pire === 'perime' || pire === 'critique';
  const [open, setOpen] = useState(urgent); // déplie automatiquement si problème

  return (
    <div className={`border rounded-md overflow-hidden ${urgent ? 'border-red-200' : 'border-gray-100'}`}>
      {/* En-tête article */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50
                   transition-colors text-left"
      >
        {open
          ? <IconChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          : <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        }

        <span className="flex-1 text-sm font-medium text-crf-texte truncate">
          {article.nom}
        </span>

        {/* Quantité vs min */}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
          sousMin
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {quantite_actuelle} / {article.quantite_min} min
        </span>

        {/* Badge pire péremption */}
        {article.est_perimable && <PeremptionBadge date={
          lots?.reduce((worst, l) => {
            if (!worst) return l.date_peremption;
            const s = getPeremptionStatut(l.date_peremption);
            const w = getPeremptionStatut(worst);
            const ord = ['perime','critique','proche','ok'];
            return ord.indexOf(s) < ord.indexOf(w) ? l.date_peremption : worst;
          }, null)
        } />}

        {/* Catégorie */}
        <span className="text-[11px] text-gray-400 hidden sm:block flex-shrink-0">
          {article.categorie}
        </span>

        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button className="btn-icon p-1" onClick={() => onEdit(stock)}>
              <IconEdit size={13} />
            </button>
            <button className="btn-icon p-1 hover:text-red-500" onClick={() => onDelete(stock)}>
              <IconTrash size={13} />
            </button>
          </div>
        )}
      </button>

      {/* Lots détaillés */}
      {open && lots?.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-2 py-1.5 space-y-0.5">
          {lots.map((lot, i) => <LotRow key={i} lot={lot} />)}
        </div>
      )}
    </div>
  );
}

// ─── Tiroir ───────────────────────────────────────────────────────────────────

function TiroirSection({ tiroir, armoire, isAdmin, articles,
  onEditTiroir, onDeleteTiroir, onAddStock, onEditStock, onDeleteStock, onControler
}) {
  const [open, setOpen] = useState(true);
  const hasProbleme = tiroir.stocks?.some(s => {
    const p = pireStatutStock(s.lots, s.article.est_perimable);
    return p === 'perime' || p === 'critique'
      || s.quantite_actuelle < s.article.quantite_min;
  });

  return (
    <div className="border border-gray-200 rounded-card overflow-hidden">
      {/* Header tiroir */}
      <div className={`flex items-center gap-2 px-4 py-3 cursor-pointer
        ${hasProbleme ? 'bg-red-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-100'}
        hover:bg-opacity-80 transition-colors`}
        onClick={() => setOpen(o => !o)}
      >
        {open
          ? <IconChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          : <IconChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        }
        <span className="flex-1 font-semibold text-crf-texte text-sm">{tiroir.nom}</span>

        {tiroir.description && (
          <span className="text-xs text-gray-400 hidden md:block truncate max-w-xs">
            {tiroir.description}
          </span>
        )}

        <span className="text-xs text-gray-500 flex-shrink-0">
          {tiroir.stocks?.length || 0} article{tiroir.stocks?.length !== 1 ? 's' : ''}
        </span>

        {hasProbleme && (
          <span className="badge-perime flex-shrink-0">!</span>
        )}

        <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            className="text-xs px-2 py-1 rounded bg-white border border-gray-200
                       text-gray-600 hover:border-crf-rouge hover:text-crf-rouge transition-colors"
            onClick={() => onControler(tiroir)}
          >
            Contrôler
          </button>
          {isAdmin && (
            <>
              <button className="btn-icon p-1" onClick={() => onEditTiroir(tiroir)}>
                <IconEdit size={13} />
              </button>
              <button className="btn-icon p-1 hover:text-red-500" onClick={() => onDeleteTiroir(tiroir)}>
                <IconTrash size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Articles */}
      {open && (
        <div className="p-3 space-y-2 bg-white">
          {tiroir.stocks?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucun article dans ce tiroir.
            </p>
          )}
          {tiroir.stocks?.map(stock => (
            <ArticleRow
              key={stock.id}
              stock={stock}
              isAdmin={isAdmin}
              tiroirNom={tiroir.nom}
              articles={articles}
              armoireId={armoire.id}
              tiroirId={tiroir.id}
              onEdit={onEditStock}
              onDelete={onDeleteStock}
            />
          ))}
          {isAdmin && (
            <button
              onClick={() => onAddStock(tiroir)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md
                         border-2 border-dashed border-gray-200 text-gray-400 text-xs
                         hover:border-crf-rouge hover:text-crf-rouge transition-colors"
            >
              <IconPlus size={14} />
              Ajouter un article
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Armoire card ─────────────────────────────────────────────────────────────

function ArmoireCard({ armoire, isAdmin, articles,
  onEditArmoire, onDeleteArmoire,
  onAddTiroir, onEditTiroir, onDeleteTiroir,
  onAddStock, onEditStock, onDeleteStock,
  onControler
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header armoire */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100
                      cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open
          ? <IconChevronDown size={18} className="text-gray-400" />
          : <IconChevronRight size={18} className="text-gray-400" />
        }
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-crf-texte truncate">{armoire.nom}</h2>
          {armoire.description && (
            <p className="text-xs text-gray-400 truncate">{armoire.description}</p>
          )}
        </div>
        <span className="text-sm text-gray-400 flex-shrink-0">
          {armoire.tiroirs?.length || 0} tiroir{armoire.tiroirs?.length !== 1 ? 's' : ''}
        </span>

        <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {isAdmin && (
            <>
              <button
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                           bg-crf-rouge/10 text-crf-rouge hover:bg-crf-rouge/20 transition-colors"
                onClick={() => onAddTiroir(armoire)}
              >
                <IconPlus size={13} />
                Tiroir
              </button>
              <button className="btn-icon" onClick={() => onEditArmoire(armoire)}>
                <IconEdit size={15} />
              </button>
              <button className="btn-icon hover:text-red-500" onClick={() => onDeleteArmoire(armoire)}>
                <IconTrash size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tiroirs */}
      {open && (
        <div className="p-4 space-y-3 bg-gray-50/40">
          {armoire.tiroirs?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Aucun tiroir dans cette armoire.
            </p>
          )}
          {armoire.tiroirs?.map(tiroir => (
            <TiroirSection
              key={tiroir.id}
              tiroir={tiroir}
              armoire={armoire}
              isAdmin={isAdmin}
              articles={articles}
              onEditTiroir={onEditTiroir}
              onDeleteTiroir={(t) => onDeleteTiroir(armoire.id, t)}
              onAddStock={onAddStock}
              onEditStock={onEditStock}
              onDeleteStock={onDeleteStock}
              onControler={onControler}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal Contrôle Tiroir ────────────────────────────────────────────────────

function ControleModal({ tiroir, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    controleur_prenom: '',
    controleur_qualification: 'PSE2',
    statut: 'CONFORME',
    remarques: '',
  });

  return (
    <Modal title={`Contrôle — ${tiroir?.nom}`} onClose={onClose}>
      <div>
        <label className="label">Prénom du contrôleur *</label>
        <input className="input" placeholder="ex : Jean"
          value={form.controleur_prenom}
          onChange={e => setForm(f => ({ ...f, controleur_prenom: e.target.value }))} />
      </div>

      <div>
        <label className="label">Qualification</label>
        <select className="select" value={form.controleur_qualification}
          onChange={e => setForm(f => ({ ...f, controleur_qualification: e.target.value }))}>
          <option value="PSE1">PSE1</option>
          <option value="PSE2">PSE2</option>
          <option value="CI">Certificat d'Instructeur</option>
          <option value="AUTRE">Autre</option>
        </select>
      </div>

      <div>
        <label className="label">Statut *</label>
        <div className="space-y-2">
          {[
            { value: 'CONFORME',     label: '✓ Conforme',                color: 'bg-green-50 border-green-200' },
            { value: 'PARTIEL',      label: '⚠ Partiellement conforme',  color: 'bg-yellow-50 border-yellow-200' },
            { value: 'NON_CONFORME', label: '✗ Non conforme',            color: 'bg-red-50 border-red-200' },
          ].map(opt => (
            <label key={opt.value}
              className={`flex items-center gap-2 p-3 border rounded cursor-pointer ${
                form.statut === opt.value ? opt.color : 'bg-white border-gray-200'
              }`}>
              <input type="radio" name="statut_controle" value={opt.value}
                checked={form.statut === opt.value}
                onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Remarques (optionnel)</label>
        <textarea className="input resize-none" rows={3}
          placeholder="Observations, anomalies constatées…"
          value={form.remarques}
          onChange={e => setForm(f => ({ ...f, remarques: e.target.value }))} />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Annuler</button>
        <button className="btn-primary"
          disabled={!form.controleur_prenom.trim() || loading}
          onClick={() => onSave({ tiroirId: tiroir.id, ...form })}>
          {loading ? 'Enregistrement…' : 'Enregistrer le contrôle'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Armoire() {
  const { isAdmin } = useAuth();
  const {
    armoires, loading, error, fetch,
    createArmoire, updateArmoire, deleteArmoire,
    createTiroir, updateTiroir, deleteTiroir,
    upsertStock, deleteStock,
  } = useArmoires();
  const { articles, fetch: fetchArticles } = useArticles();

  // Modals
  const [modal, setModal] = useState(null);
  // modal = { type: 'armoire'|'tiroir'|'stock'|'controle', data?, context? }
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);

  useEffect(() => { fetch(); fetchArticles(); }, [fetch, fetchArticles]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const closeModal = () => setModal(null);

  // ── Handlers armoire ────────────────────────────────────────────────────
  const handleSaveArmoire = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updateArmoire(modal.data.id, form);
      else            await createArmoire(form);
      showToast(modal.data ? 'Armoire modifiée' : 'Armoire créée');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteArmoire = async (armoire) => {
    if (!confirm(`Supprimer l'armoire "${armoire.nom}" et tous ses tiroirs ?`)) return;
    try {
      await deleteArmoire(armoire.id);
      showToast('Armoire supprimée');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  // ── Handlers tiroir ─────────────────────────────────────────────────────
  const handleSaveTiroir = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updateTiroir(modal.context.armoireId, modal.data.id, form);
      else            await createTiroir(modal.context.armoireId, form);
      showToast(modal.data ? 'Tiroir modifié' : 'Tiroir créé');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteTiroir = async (armoireId, tiroir) => {
    if (!confirm(`Supprimer le tiroir "${tiroir.nom}" ?`)) return;
    try {
      await deleteTiroir(armoireId, tiroir.id);
      showToast('Tiroir supprimé');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  // ── Handler contrôle ────────────────────────────────────────────────────
  const handleSaveControle = async ({ tiroirId, controleur_prenom, controleur_qualification, statut, remarques }) => {
    setSaving(true);
    try {
      await apiClient.post('/controles', {
        type: 'TIROIR',
        reference_id: tiroirId,
        controleur_prenom: controleur_prenom.trim(),
        controleur_qualification,
        statut,
        remarques: remarques || null,
      });
      showToast('Contrôle enregistré');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  // ── Handlers stock ──────────────────────────────────────────────────────
  const handleSaveStock = async ({ articleId, quantite_actuelle, lots }) => {
    setSaving(true);
    try {
      await upsertStock(modal.context.tiroirId, articleId, { quantite_actuelle, lots });
      showToast('Stock mis à jour');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteStock = async (stock) => {
    const tiroir = armoires.flatMap(a => a.tiroirs).find(t =>
      t.stocks.some(s => s.id === stock.id)
    );
    if (!tiroir) return;
    if (!confirm(`Retirer "${stock.article.nom}" du stock ?`)) return;
    try {
      await deleteStock(tiroir.id, stock.article.id);
      showToast('Stock supprimé');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Armoires & Tiroirs"
        subtitle="Vue arborescence du stock en armoire"
        actions={isAdmin && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setModal({ type: 'armoire' })}
          >
            <IconPlus size={16} />
            Nouvelle armoire
          </button>
        )}
      />

      {/* État chargement / erreur */}
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

      {!loading && !error && armoires.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗄️</p>
          <p className="text-sm">Aucune armoire pour le moment.</p>
          {isAdmin && (
            <button className="btn-primary mt-4" onClick={() => setModal({ type: 'armoire' })}>
              Créer la première armoire
            </button>
          )}
        </div>
      )}

      {/* Liste armoires */}
      {!loading && !error && (
        <div className="space-y-4">
          {armoires.map(armoire => (
            <ArmoireCard
              key={armoire.id}
              armoire={armoire}
              isAdmin={isAdmin}
              articles={articles}
              onEditArmoire={(a) => setModal({ type: 'armoire', data: a })}
              onDeleteArmoire={handleDeleteArmoire}
              onAddTiroir={(a) => setModal({ type: 'tiroir', context: { armoireId: a.id, armoireNom: a.nom } })}
              onEditTiroir={(t) => {
                const a = armoires.find(ar => ar.tiroirs.some(ti => ti.id === t.id));
                setModal({ type: 'tiroir', data: t, context: { armoireId: a?.id, armoireNom: a?.nom } });
              }}
              onDeleteTiroir={handleDeleteTiroir}
              onAddStock={(t) => setModal({ type: 'stock', context: { tiroirId: t.id, tiroirNom: t.nom } })}
              onEditStock={(s) => {
                const t = armoires.flatMap(a => a.tiroirs).find(ti =>
                  ti.stocks.some(st => st.id === s.id)
                );
                setModal({ type: 'stock', data: s, context: { tiroirId: t?.id, tiroirNom: t?.nom } });
              }}
              onDeleteStock={handleDeleteStock}
              onControler={(t) => setModal({ type: 'controle', data: t })}
            />
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {modal?.type === 'armoire' && (
        <ArmoireModal
          initial={modal.data}
          onSave={handleSaveArmoire}
          onClose={closeModal}
          loading={saving}
        />
      )}

      {modal?.type === 'tiroir' && (
        <TiroirModal
          initial={modal.data}
          armoireNom={modal.context?.armoireNom}
          onSave={handleSaveTiroir}
          onClose={closeModal}
          loading={saving}
        />
      )}

      {modal?.type === 'stock' && (
        <StockModal
          tiroirNom={modal.context?.tiroirNom}
          articles={articles}
          initial={modal.data}
          onSave={handleSaveStock}
          onClose={closeModal}
          loading={saving}
        />
      )}

      {modal?.type === 'controle' && (
        <ControleModal
          tiroir={modal.data}
          onClose={closeModal}
          onSave={handleSaveControle}
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
