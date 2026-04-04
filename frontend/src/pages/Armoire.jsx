import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import PeremptionBadge, { getPeremptionStatut } from '../components/PeremptionBadge';
import {
  IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useArmoires } from '../hooks/useArmoires';
import { useArticles } from '../hooks/useArticles';
import { generateRapportControle } from '../utils/pdfReport';
import { useLots } from '../hooks/useLots';
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

function MinEditor({ article, isAdmin }) {
  const [min, setMin] = useState(article.quantite_min ?? 0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveMin = async (val) => {
    const newVal = Math.max(0, parseInt(val) || 0);
    setMin(newVal);
    setEditing(false);
    setSaving(true);
    try {
      await apiClient.put(`/articles/${article.id}`, { ...article, quantite_min: newVal });
      article.quantite_min = newVal;
    } catch {
      setMin(article.quantite_min ?? 0);
    } finally { setSaving(false); }
  };

  if (!isAdmin) return <span className="text-xs text-gray-400">min. {min}</span>;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400">min.</span>
      {editing ? (
        <input type="number" min="0" autoFocus
          className="w-12 text-xs border border-crf-rouge rounded px-1 py-0.5 text-center"
          defaultValue={min}
          onBlur={e => saveMin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveMin(e.target.value)}
        />
      ) : (
        <button onClick={e => { e.stopPropagation(); setEditing(true); }}
          className={`text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 ${saving ? 'opacity-50' : ''}`}>
          {min}
        </button>
      )}
    </div>
  );
}

function ArticleRow({ stock, isAdmin, tiroirNom, articles, armoireId, tiroirId, onEdit, onDelete, onTransfer, highlighted }) {
  const { article, quantite_actuelle, lots } = stock;
  const qMin = article.quantite_min || 0;
  const sousMin = quantite_actuelle < qMin;
  const procheMin = !sousMin && qMin > 0 && quantite_actuelle <= Math.max(qMin + 2, Math.ceil(qMin * 1.2));
  const pire    = pireStatutStock(lots, article.est_perimable);
  const urgent  = pire === 'perime' || pire === 'critique';
  const [open, setOpen] = useState(urgent || highlighted);
  const rowRef = useRef(null);

  useEffect(() => {
    if (highlighted) {
      setOpen(true);
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlighted]);

  return (
    <div ref={rowRef} className={`border rounded-md overflow-hidden transition-all duration-500
      ${highlighted ? 'border-crf-rouge ring-2 ring-crf-rouge/20' : urgent ? 'border-red-200' : 'border-gray-100'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        {/* Ligne nom */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {open
            ? <IconChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            : <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          }
          <span className="text-sm font-medium text-crf-texte">{article.nom}</span>
          <span className="text-[11px] text-gray-400 hidden sm:block flex-shrink-0">{article.categorie}</span>
        </div>

        {/* Ligne actions */}
        <div className="flex items-center gap-2 pl-6 sm:pl-0 flex-shrink-0"
             onClick={e => e.stopPropagation()}>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            sousMin ? 'bg-red-100 text-red-700' : procheMin ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}>
            {quantite_actuelle}
          </span>

          {article.est_perimable && <PeremptionBadge date={
            lots?.reduce((worst, l) => {
              if (!worst) return l.date_peremption;
              const s = getPeremptionStatut(l.date_peremption);
              const w = getPeremptionStatut(worst);
              const ord = ['perime','critique','proche','ok'];
              return ord.indexOf(s) < ord.indexOf(w) ? l.date_peremption : worst;
            }, null)
          } />}

          {/* MinEditor caché sur mobile — affiché dans la section expansée */}
          <div className="hidden sm:block">
            <MinEditor article={article} isAdmin={isAdmin} />
          </div>

          {isAdmin && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onTransfer(stock, tiroirId)}
                className="text-xs px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                title="Transférer vers un lot"
              >
                <span className="sm:hidden">→</span>
                <span className="hidden sm:inline">→ Lot</span>
              </button>
              <button className="btn-icon p-1" onClick={() => onEdit(stock)}><IconEdit size={13} /></button>
              <button className="btn-icon p-1 hover:text-red-500" onClick={() => onDelete(stock)}><IconTrash size={13} /></button>
            </div>
          )}
        </div>
      </button>

      {open && (
        <div>
          {/* MinEditor visible sur mobile dans la zone expansée */}
          <div className="sm:hidden flex items-center justify-between gap-2 px-3 py-1.5
                          border-t border-gray-100 bg-gray-50/40"
               onClick={e => e.stopPropagation()}>
            <span className="text-xs text-gray-400">Quantité minimale</span>
            <MinEditor article={article} isAdmin={isAdmin} />
          </div>
          {lots?.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-2 py-1.5 space-y-0.5">
              {lots.map((lot, i) => <LotRow key={i} lot={lot} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tiroir ───────────────────────────────────────────────────────────────────

function TiroirSection({ tiroir, armoire, isAdmin, articles,
  onEditTiroir, onDeleteTiroir, onAddStock, onEditStock, onDeleteStock, onControler, onTransferStock,
  highlightArticleId
}) {
  const hasHighlight = highlightArticleId && tiroir.stocks?.some(s => s.article.id === highlightArticleId);
  const [open, setOpen] = useState(true);
  const hasProbleme = tiroir.stocks?.some(s => {
    const p = pireStatutStock(s.lots, s.article.est_perimable);
    return p === 'perime' || p === 'critique'
      || s.quantite_actuelle < s.article.quantite_min;
  });

  return (
    <div className="border border-gray-200 rounded-card overflow-hidden">
      {/* Header tiroir */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-4 py-3 cursor-pointer
        ${hasProbleme ? 'bg-red-50 border-b border-red-100' : 'bg-gray-50 border-b border-gray-100'}
        hover:bg-opacity-80 transition-colors`}
        onClick={() => setOpen(o => !o)}
      >
        {/* Ligne nom */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {open
            ? <IconChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            : <IconChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          }
          <span className="font-semibold text-crf-texte text-sm">{tiroir.nom}</span>
          {tiroir.description && (
            <span className="text-xs text-gray-400 hidden md:block truncate">{tiroir.description}</span>
          )}
        </div>

        {/* Ligne actions */}
        <div className="flex items-center gap-1 pl-6 sm:pl-0 flex-shrink-0"
             onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-500 flex-1 sm:flex-none">
            {tiroir.stocks?.length || 0} article{tiroir.stocks?.length !== 1 ? 's' : ''}
          </span>
          {hasProbleme && <span className="badge-perime">!</span>}
          <button
            className="text-xs px-2 py-1 rounded bg-white border border-gray-200
                       text-gray-600 hover:border-crf-rouge hover:text-crf-rouge transition-colors"
            onClick={() => onControler(tiroir)}
          >
            <span className="sm:hidden">✓</span>
            <span className="hidden sm:inline">Contrôler</span>
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
              onTransfer={onTransferStock}
              highlighted={highlightArticleId === stock.article.id}
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
  onControler, onTransferStock, highlightArticleId
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header armoire */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-5 py-4
                      border-b border-gray-100 cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Ligne nom */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {open
            ? <IconChevronDown size={18} className="text-gray-400 flex-shrink-0" />
            : <IconChevronRight size={18} className="text-gray-400 flex-shrink-0" />
          }
          <div className="min-w-0">
            <h2 className="font-semibold text-crf-texte">{armoire.nom}</h2>
            {armoire.description && (
              <p className="text-xs text-gray-400">{armoire.description}</p>
            )}
          </div>
        </div>

        {/* Ligne actions */}
        <div className="flex items-center gap-2 pl-9 sm:pl-0 flex-shrink-0"
             onClick={e => e.stopPropagation()}>
          <span className="text-sm text-gray-400 flex-1 sm:flex-none">
            {armoire.tiroirs?.length || 0} tiroir{armoire.tiroirs?.length !== 1 ? 's' : ''}
          </span>
          {isAdmin && (
            <div className="flex gap-1">
              <button
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                           bg-crf-rouge/10 text-crf-rouge hover:bg-crf-rouge/20 transition-colors"
                onClick={() => onAddTiroir(armoire)}
              >
                <IconPlus size={13} />
                <span className="hidden sm:inline">Tiroir</span>
              </button>
              <button className="btn-icon" onClick={() => onEditArmoire(armoire)}>
                <IconEdit size={15} />
              </button>
              <button className="btn-icon hover:text-red-500" onClick={() => onDeleteArmoire(armoire)}>
                <IconTrash size={15} />
              </button>
            </div>
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
              onTransferStock={onTransferStock}
              highlightArticleId={highlightArticleId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers péremption ───────────────────────────────────────────────────────

function isExpiredDate(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ─── Modal Contrôle Tiroir — Checklist ────────────────────────────────────────

function ControleModal({ tiroir, onSave, onClose, loading }) {
  const stocks = tiroir?.stocks || [];

  // checks: { [stockId]: qty_reelle }
  const [checks, setChecks] = useState(() => {
    const init = {};
    for (const s of stocks) init[s.id] = s.quantite_actuelle;
    return init;
  });
  const [prenom, setPrenom] = useState('');
  const [step, setStep] = useState('checklist'); // 'checklist' | 'confirm'

  const setQty = (id, val) =>
    setChecks(c => ({ ...c, [id]: Math.max(0, parseInt(val) || 0) }));

  const issues = stocks.filter(s => {
    const seuil = s.article.quantite_min > 0 ? s.article.quantite_min : s.quantite_actuelle;
    const qtyIssue = (checks[s.id] ?? s.quantite_actuelle) < seuil;
    const expiredLot = (s.lots || []).some(l => isExpiredDate(l.date_peremption));
    return qtyIssue || expiredLot;
  });

  const statut = issues.length === 0 ? 'CONFORME'
    : issues.length < stocks.length / 2 ? 'PARTIEL'
    : 'NON_CONFORME';

  const remarquesAuto = issues.map(s => {
    const parts = [];
    const seuil = s.article.quantite_min > 0 ? s.article.quantite_min : s.quantite_actuelle;
    const qty = checks[s.id] ?? s.quantite_actuelle;
    if (qty < seuil) parts.push(`manque ${seuil - qty}`);
    const exp = (s.lots || []).filter(l => isExpiredDate(l.date_peremption));
    if (exp.length) parts.push('périmé');
    return `${s.article.nom} — ${parts.join(', ')}`;
  }).join('\n');

  const handleValider = () => {
    if (!prenom.trim()) return;
    onSave({
      tiroirId: tiroir.id,
      controleur_prenom: prenom.trim(),
      controleur_qualification: 'PSE2',
      statut,
      remarques: remarquesAuto || null,
      items: stocks.map(s => ({ stock_id: s.id, qty_reelle: checks[s.id] ?? s.quantite_actuelle })),
    });
  };

  return (
    <Modal title={`Contrôle — ${tiroir?.nom}`} onClose={onClose}>
      {step === 'checklist' ? (
        <>
          <p className="text-xs text-gray-500">Ajustez les quantités comptées avec +/−</p>
          <div className="space-y-2">
            {stocks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucun article dans ce tiroir.</p>
            )}
            {stocks.map(s => {
              const qty = checks[s.id] ?? s.quantite_actuelle;
              const seuil = s.article.quantite_min > 0 ? s.article.quantite_min : s.quantite_actuelle;
              const qtyIssue = qty < seuil;
              const expiredLot = (s.lots || []).some(l => isExpiredDate(l.date_peremption));
              const hasIssue = qtyIssue || expiredLot;

              return (
                <div key={s.id} className={`rounded-xl p-3 flex items-center gap-3 ${hasIssue ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{s.article.nom}</p>
                    <p className="text-xs text-gray-400">
                      attendu : {s.quantite_actuelle}
                      {s.article.quantite_min > 0 && ` · min. ${s.article.quantite_min}`}
                    </p>
                    {expiredLot && <p className="text-xs text-red-600 font-medium">⚠ Lot périmé</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold flex items-center justify-center"
                      onClick={() => setQty(s.id, qty - 1)}>−</button>
                    <span className={`w-7 text-center font-bold text-sm ${qtyIssue ? 'text-red-600' : 'text-green-600'}`}>{qty}</span>
                    <button className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold flex items-center justify-center"
                      onClick={() => setQty(s.id, qty + 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn-primary" onClick={() => setStep('confirm')} disabled={stocks.length === 0}>
              Terminer →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`rounded-xl p-4 ${statut === 'CONFORME' ? 'bg-green-50' : statut === 'PARTIEL' ? 'bg-orange-50' : 'bg-red-50'}`}>
            <p className="font-semibold text-gray-800">
              {statut === 'CONFORME' ? '✓ Tout est conforme' : statut === 'PARTIEL' ? '⚠ Partiellement conforme' : '✗ Non conforme'}
            </p>
            {issues.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
                {issues.map(s => <li key={s.id}>• {s.article.nom}</li>)}
              </ul>
            )}
          </div>
          <div>
            <label className="label">Votre prénom *</label>
            <input className="input" placeholder="ex : Jean" autoFocus
              value={prenom} onChange={e => setPrenom(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={() => setStep('checklist')} disabled={loading}>← Modifier</button>
            <button className="btn-primary" disabled={!prenom.trim() || loading} onClick={handleValider}>
              {loading ? 'Enregistrement…' : 'Valider le contrôle'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Modal Transfert vers Lot ─────────────────────────────────────────────────

function TransfertModal({ stock, tiroirId, lotsData, onTransfer, onClose, loading }) {
  const sourceLots = (stock.lots || []).filter(l => (l.quantite || 0) > 0);
  const [srcIdx, setSrcIdx]         = useState(0);
  const [qty, setQty]               = useState(1);
  const [destLotId, setDestLotId]   = useState('');
  const [destPochetteId, setDestPochetteId] = useState('');

  const srcLot  = sourceLots[srcIdx];
  const maxQty  = srcLot?.quantite || 0;
  const destLot = lotsData.find(l => l.id === destLotId);
  const pochettes = destLot?.pochettes || [];

  const canSubmit = srcLot && qty > 0 && qty <= maxQty && destPochetteId;

  return (
    <Modal title={`Transférer — ${stock.article.nom}`} onClose={onClose}>
      <p className="text-xs text-gray-500">
        Déplacez des unités de la pharmacie vers une pochette de lot.
      </p>

      {/* Source lot */}
      <div>
        <label className="label">Lot source *</label>
        {sourceLots.length === 0 ? (
          <p className="text-sm text-red-500">Aucun lot disponible dans ce stock.</p>
        ) : (
          <select className="select" value={srcIdx}
            onChange={e => { setSrcIdx(Number(e.target.value)); setQty(1); }}>
            {sourceLots.map((l, i) => (
              <option key={i} value={i}>
                {l.label}{l.date_peremption ? ` — exp. ${new Date(l.date_peremption).toLocaleDateString('fr-FR')}` : ''} (×{l.quantite})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Quantité */}
      {srcLot && (
        <div>
          <label className="label">Quantité à transférer * <span className="font-normal text-gray-400">(max {maxQty})</span></label>
          <input type="number" className="input" min={1} max={maxQty}
            value={qty} onChange={e => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))} />
        </div>
      )}

      {/* Destination */}
      <div>
        <label className="label">Lot destination *</label>
        <select className="select" value={destLotId}
          onChange={e => { setDestLotId(e.target.value); setDestPochetteId(''); }}>
          <option value="">Choisir un lot…</option>
          {lotsData.map(l => (
            <option key={l.id} value={l.id}>{l.nom}</option>
          ))}
        </select>
      </div>

      {destLotId && (
        <div>
          <label className="label">Pochette *</label>
          <select className="select" value={destPochetteId}
            onChange={e => setDestPochetteId(e.target.value)}>
            <option value="">Choisir une pochette…</option>
            {pochettes.map(p => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          {pochettes.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Ce lot n'a pas encore de pochettes.</p>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!canSubmit || loading}
          onClick={() => onTransfer({ stock, tiroirId, srcLot, qty, destPochetteId })}>
          {loading ? 'Transfert…' : '→ Transférer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Armoire() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightArticleId = searchParams.get('article') || null;
  const {
    armoires, loading, error, fetch,
    createArmoire, updateArmoire, deleteArmoire,
    createTiroir, updateTiroir, deleteTiroir,
    upsertStock, deleteStock,
  } = useArmoires();
  const { articles, fetch: fetchArticles } = useArticles();
  const { lots: lotsData, fetch: fetchLots } = useLots();

  // Modals
  const [modal, setModal] = useState(null);
  // modal = { type: 'armoire'|'tiroir'|'stock'|'controle', data?, context? }
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);

  useEffect(() => { fetch(); fetchArticles(); fetchLots(); }, [fetch, fetchArticles, fetchLots]);

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
  const handleSaveControle = async ({ tiroirId, controleur_prenom, controleur_qualification, statut, remarques, items }) => {
    setSaving(true);
    try {
      await apiClient.post('/controles', {
        type: 'TIROIR',
        reference_id: tiroirId,
        controleur_prenom,
        controleur_qualification,
        statut,
        remarques: remarques || null,
        items: items || [],
      });

      // Générer le rapport PDF
      const tiroir = modal?.data;
      const armoire = armoires.find(a => a.tiroirs.some(t => t.id === tiroirId));
      const nomElement = armoire ? `${armoire.nom} > ${tiroir?.nom || ''}` : tiroir?.nom || '';
      generateRapportControle({
        type: 'TIROIR',
        nomElement,
        date: new Date(),
        controleur: controleur_prenom,
        qualification: controleur_qualification || 'PSE2',
        statut,
        items: (tiroir?.stocks || []).map(s => ({
          article_nom: s.article.nom,
          pochette_nom: tiroir?.nom || '',
          qty_attendue: s.quantite_actuelle,
          qty_reelle: items?.find(i => i.stock_id === s.id)?.qty_reelle ?? s.quantite_actuelle,
          expired: (s.lots || []).some(l => isExpiredDate(l.date_peremption)),
        })),
        anomalies: remarques,
      });

      showToast('Contrôle enregistré — rapport PDF téléchargé');
      closeModal();
      fetch();
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

  // ── Handler transfert ───────────────────────────────────────────────────
  const handleTransfer = async ({ stock, tiroirId, srcLot, qty, destPochetteId }) => {
    setSaving(true);
    try {
      // 1. Réduire le stock tiroir
      const newLots = (stock.lots || []).map(l =>
        l.label === srcLot.label && l.date_peremption === srcLot.date_peremption
          ? { ...l, quantite: l.quantite - qty }
          : l
      ).filter(l => l.quantite > 0);
      const newQty = newLots.reduce((s, l) => s + (l.quantite || 0), 0);
      await upsertStock(tiroirId, stock.article.id, { quantite_actuelle: newQty, lots: newLots });

      // 2. Ajouter au stock pochette (fusionner le lot)
      const pochette = lotsData.flatMap(l => l.pochettes || []).find(p => p.id === destPochetteId);
      const existingStock = (pochette?.stocks || []).find(s => s.article_id === stock.article.id);
      const existingLots = existingStock?.lots || [];
      const existingIdx = existingLots.findIndex(
        l => l.label === srcLot.label && l.date_peremption === srcLot.date_peremption
      );
      let newPochetteLots;
      if (existingIdx >= 0) {
        newPochetteLots = existingLots.map((l, i) =>
          i === existingIdx ? { ...l, quantite: (l.quantite || 0) + qty } : l
        );
      } else {
        newPochetteLots = [...existingLots, { ...srcLot, quantite: qty }];
      }
      const newPochetteQty = newPochetteLots.reduce((s, l) => s + (l.quantite || 0), 0);
      await apiClient.put(`/lots/pochettes/${destPochetteId}/stock/${stock.article.id}`, {
        quantite_actuelle: newPochetteQty,
        lots: newPochetteLots,
      });

      showToast('Transfert effectué');
      closeModal();
      fetch();
      fetchLots();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur lors du transfert', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [['Article', 'Catégorie', 'Armoire', 'Tiroir', 'Quantité actuelle', 'Minimum requis', 'Manquant']];
    for (const armoire of armoires) {
      for (const tiroir of armoire.tiroirs || []) {
        for (const stock of tiroir.stocks || []) {
          if (stock.quantite_actuelle < stock.article.quantite_min) {
            rows.push([
              stock.article.nom,
              stock.article.categorie,
              armoire.nom,
              tiroir.nom,
              stock.quantite_actuelle,
              stock.article.quantite_min,
              stock.article.quantite_min - stock.quantite_actuelle,
            ]);
          }
        }
      }
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commande_pharmacie_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Pharmacie"
        subtitle="Vue arborescence du stock en armoire"
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto" onClick={exportCSV}>
              📥 Exporter liste à commander
            </button>
            {isAdmin && (
              <button
                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                onClick={() => setModal({ type: 'armoire' })}
              >
                <IconPlus size={16} />
                Nouvelle armoire
              </button>
            )}
          </div>
        }
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
              onTransferStock={(stock, tiroirId) => setModal({ type: 'transfert', data: stock, context: { tiroirId } })}
              highlightArticleId={highlightArticleId}
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

      {modal?.type === 'transfert' && (
        <TransfertModal
          stock={modal.data}
          tiroirId={modal.context?.tiroirId}
          lotsData={lotsData}
          onTransfer={handleTransfer}
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
