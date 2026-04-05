import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight, IconCopy } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useLots } from '../hooks/useLots';
import { uploadLotPhoto } from '../lib/supabase';
import { useArticles } from '../hooks/useArticles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLotPeremptionStatut(date_peremption) {
  if (!date_peremption) return null;
  const d = new Date(date_peremption);
  const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'perime';
  if (diff <= 7) return 'j7';
  if (diff <= 30) return 'j30';
  return null;
}

function getPeremptionStatut(lots) {
  if (!lots || lots.length === 0) return null;
  const now = new Date();
  let worst = null;
  for (const lot of lots) {
    if (!lot.date_peremption) continue;
    const d = new Date(lot.date_peremption);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'perime';
    if (diff <= 7) { if (worst !== 'perime') worst = 'j7'; }
    else if (diff <= 30) { if (!worst) worst = 'j30'; }
  }
  return worst;
}

function PeremptionBadge({ lots }) {
  const statut = getPeremptionStatut(lots);
  if (!statut) return null;
  const styles = {
    perime: 'bg-red-100 text-red-700',
    j7: 'bg-orange-100 text-orange-700',
    j30: 'bg-yellow-100 text-yellow-700',
  };
  const labels = { perime: 'Périmé', j7: '< 7j', j30: '< 30j' };
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${styles[statut]}`}>
      {labels[statut]}
    </span>
  );
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

import Modal from '../components/Modal';

// ─── Modal Lot ────────────────────────────────────────────────────────────────

function LotModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || null);
  const [uploading, setUploading] = useState(false);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    let photo_url = initial?.photo_url || null;
    if (photoFile && initial?.id) {
      setUploading(true);
      try { photo_url = await uploadLotPhoto(photoFile, initial.id); }
      catch { /* ignore upload error */ }
      finally { setUploading(false); }
    }
    onSave({ ...form, photo_url, _pendingPhoto: photoFile });
  };

  const isBusy = loading || uploading;

  return (
    <Modal title={initial ? 'Modifier le lot' : 'Nouveau lot'} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div>
        <label className="label">Photo du lot</label>
        <div className="flex items-center gap-3">
          {photoPreview && (
            <img src={photoPreview} alt="aperçu" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
          )}
          <label className="btn-secondary cursor-pointer text-sm">
            📷 {photoPreview ? 'Changer' : 'Ajouter une photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
          {photoPreview && (
            <button className="text-xs text-red-500" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
              Supprimer
            </button>
          )}
        </div>
        {!initial && photoFile && (
          <p className="text-xs text-gray-400 mt-1">La photo sera uploadée après la création du lot.</p>
        )}
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.nom || isBusy}
          onClick={handleSave}>
          {isBusy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal Pochette ───────────────────────────────────────────────────────────

function PochetteModal({ initial, lotNom, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '' });

  return (
    <Modal title={initial ? 'Modifier la pochette' : `Nouvelle pochette — ${lotNom}`} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
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

// ─── Modal QR Code ────────────────────────────────────────────────────────────

function QRCodeModal({ lot, onClose }) {
  const qrUrl = `${window.location.origin}/controle/lot/${lot.qr_code_token}`;
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    import('qrcode').then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, qrUrl, { width: 220, margin: 2 });
      }
    });
  }, [qrUrl]);

  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR — ${esc(lot.nom)}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        img { display: block; margin: 0 auto 16px; }
        h2 { font-size: 20px; margin-bottom: 4px; }
        p { font-size: 13px; color: #666; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <img src="${dataUrl}" width="220" />
        <h2>${esc(lot.nom)}</h2>
        <p>Scannez pour contrôler le matériel</p>
        <p style="font-size:10px;color:#aaa;margin-top:8px">${qrUrl}</p>
        <br/><button onclick="window.print()">🖨 Imprimer</button>
        <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <Modal title={`QR Code — ${lot.nom}`} onClose={onClose}>
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">Scannez ce code pour accéder à la page de contrôle sans connexion.</p>
        <canvas ref={canvasRef} className="mx-auto rounded-lg" />
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded text-xs mt-4">
          <input type="text" readOnly value={qrUrl} className="input text-xs py-1 flex-1 bg-white" />
          <button onClick={() => copyToClipboard(qrUrl)} className="btn-icon p-1">
            <IconCopy size={13} />
          </button>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Fermer</button>
        <button className="btn-primary" onClick={handlePrint}>🖨 Imprimer</button>
      </div>
    </Modal>
  );
}

// ─── Modal Stock Pochette ─────────────────────────────────────────────────────

function StockPochetteModal({ pochetteNom, articles, initial, onSave, onClose, loading }) {
  const [articleId, setArticleId] = useState(initial?.article?.id || '');
  const [lots, setLots] = useState(
    initial?.lots?.length
      ? initial.lots.map(l => ({
          label: l.label || '',
          date_peremption: l.date_peremption ? String(l.date_peremption).slice(0, 10) : '',
          quantite: l.quantite ?? 0,
        }))
      : [{ label: '', date_peremption: '', quantite: 1 }]
  );

  const article = articles.find(a => a.id === articleId);
  const addLot    = () => setLots(l => [...l, { label: '', date_peremption: '', quantite: 1 }]);
  const removeLot = (i) => setLots(l => l.filter((_, j) => j !== i));
  const updateLot = (i, field, val) =>
    setLots(l => l.map((lot, j) => j === i ? { ...lot, [field]: val } : lot));
  const totalLots = lots.reduce((s, l) => s + (parseInt(l.quantite) || 0), 0);

  const handleSave = () => {
    const lotsClean = lots
      .filter(l => l.label.trim())
      .map(l => ({ label: l.label.trim(), date_peremption: l.date_peremption || null, quantite: parseInt(l.quantite) || 0 }));
    onSave({ articleId, quantite_actuelle: totalLots, lots: lotsClean });
  };

  return (
    <Modal title={`${initial ? 'Modifier' : 'Ajouter'} un article — ${pochetteNom}`} onClose={onClose}>
      <div>
        <label className="label">Article *</label>
        <select className="select" value={articleId} onChange={e => setArticleId(e.target.value)} disabled={!!initial}>
          <option value="">Choisir un article…</option>
          {articles.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>)}
        </select>
      </div>

      {articleId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="label mb-0">
              Lots
              {article?.est_perimable && <span className="ml-2 text-xs text-orange-500 font-normal">— article périmable</span>}
            </p>
            <button type="button" onClick={addLot} className="text-xs text-crf-rouge hover:underline font-medium">
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
                        value={lot.date_peremption || ''} onChange={e => updateLot(i, 'date_peremption', e.target.value)} />
                    )}
                    <input type="number" min="0" className="input text-xs py-1 w-20"
                      placeholder="Qté" value={lot.quantite} onChange={e => updateLot(i, 'quantite', e.target.value)} />
                  </div>
                </div>
                {lots.length > 1 && (
                  <button onClick={() => removeLot(i)} className="text-gray-300 hover:text-red-500 mt-1">×</button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Quantité totale : <strong>{totalLots}</strong></p>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!articleId || totalLots < 0 || loading} onClick={handleSave}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Pochette Card ────────────────────────────────────────────────────────────

import apiClient from '../api/client';

function StockRow({ stock, pochetteId, isAdmin, onEdit, onDelete }) {
  const [min, setMin] = useState(stock.quantite_minimum ?? 0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveMin = async (val) => {
    const newVal = Math.max(0, parseInt(val) || 0);
    setMin(newVal);
    setEditing(false);
    setSaving(true);
    try {
      await apiClient.patch(`/lots/pochettes/${pochetteId}/stock/${stock.article_id}/minimum`, {
        quantite_minimum: newVal,
      });
    } catch {
      setMin(stock.quantite_minimum ?? 0);
    } finally {
      setSaving(false);
    }
  };

  const isBelowMin = stock.quantite_actuelle < min && min > 0;
  const isNearMin = !isBelowMin && min > 0 && stock.quantite_actuelle <= Math.max(min + 2, Math.ceil(min * 1.2));
  const lots = stock.lots || [];

  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <span className="text-gray-700 font-medium">{stock.article.nom}</span>
          {isBelowMin && <span className="ml-1 text-xs text-red-500 font-medium">⚠ sous le min.</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PeremptionBadge lots={stock.lots} />
          <span className={`font-semibold ${
            isBelowMin ? 'text-red-600' : isNearMin ? 'text-yellow-600' : 'text-gray-800'
          }`}>×{stock.quantite_actuelle}</span>
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">min.</span>
              {editing ? (
                <input type="number" min="0" autoFocus
                  className="w-12 text-xs border border-crf-rouge rounded px-1 py-0.5 text-center"
                  defaultValue={min}
                  onBlur={e => saveMin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveMin(e.target.value)}
                />
              ) : (
                <button onClick={() => setEditing(true)}
                  className={`text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 ${saving ? 'opacity-50' : ''}`}>
                  {min}
                </button>
              )}
              <button onClick={() => onEdit(stock)} className="btn-icon p-0.5 ml-1"><IconEdit size={12} /></button>
              <button onClick={() => onDelete(stock)} className="btn-icon p-0.5 hover:text-red-500"><IconTrash size={12} /></button>
            </div>
          ) : (
            min > 0 && (
              <span className="text-xs text-gray-400">
                min. {min}
              </span>
            )
          )}
        </div>
      </div>
      {lots.length > 0 && (
        <div className="mt-1.5 ml-1 rounded-md overflow-hidden border border-gray-100">
          <table className="w-full text-xs">
            <tbody>
              {lots.map((lot, i) => {
                const statut = getLotPeremptionStatut(lot.date_peremption);
                const rowBg = {
                  perime: 'bg-red-50',
                  j7: 'bg-orange-50',
                  j30: 'bg-yellow-50',
                }[statut] || 'bg-white';
                const dateColor = {
                  perime: 'text-red-600 font-medium',
                  j7: 'text-orange-600 font-medium',
                  j30: 'text-yellow-700',
                }[statut] || 'text-gray-500';
                return (
                  <tr key={i} className={`${rowBg} border-t border-gray-100 first:border-t-0`}>
                    <td className="py-1 px-2 font-mono text-gray-600 truncate max-w-[180px]">{lot.label}</td>
                    <td className="py-1 px-2 text-gray-500 text-right w-12 whitespace-nowrap">×{lot.quantite}</td>
                    <td className={`py-1 px-2 text-right whitespace-nowrap w-24 ${dateColor}`}>
                      {lot.date_peremption
                        ? new Date(lot.date_peremption).toLocaleDateString('fr-FR')
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PochetteCard({ pochette, lotNom, isAdmin, onEdit, onDelete, onAddStock, onEditStock, onDeleteStock }) {
  const [open, setOpen] = useState(true);
  const stockCount = pochette.stocks?.length || 0;

  return (
    <div className="border border-gray-100 rounded-md overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2.5
                   bg-white hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        {/* Ligne nom */}
        <div className="flex items-center gap-2 w-full min-w-0">
          {open
            ? <IconChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            : <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          }
          <span className="flex-1 text-sm font-medium text-crf-texte">{pochette.nom}</span>
          {/* Boutons admin visibles desktop dans la ligne nom */}
          {isAdmin && (
            <div className="hidden sm:flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button className="btn-icon p-1" onClick={() => onEdit(pochette)}><IconEdit size={13} /></button>
              <button className="btn-icon p-1 hover:text-red-500" onClick={() => onDelete(pochette)}><IconTrash size={13} /></button>
            </div>
          )}
        </div>

        {/* Ligne count + boutons admin (mobile uniquement) */}
        <div className="flex items-center gap-2 pl-6 sm:hidden" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-500 flex-1">{stockCount} article{stockCount !== 1 ? 's' : ''}</span>
          {isAdmin && (
            <div className="flex gap-1">
              <button className="btn-icon p-1" onClick={() => onEdit(pochette)}><IconEdit size={13} /></button>
              <button className="btn-icon p-1 hover:text-red-500" onClick={() => onDelete(pochette)}><IconTrash size={13} /></button>
            </div>
          )}
        </div>

        {/* Count desktop */}
        <span className="hidden sm:block text-xs text-gray-500 flex-shrink-0">{stockCount} article{stockCount !== 1 ? 's' : ''}</span>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 divide-y divide-gray-100">
          {pochette.stocks?.length === 0 && !isAdmin && (
            <p className="text-xs text-gray-400 py-2 text-center">Aucun article.</p>
          )}
          {pochette.stocks?.map(stock => (
            <StockRow key={stock.id} stock={stock} pochetteId={pochette.id} isAdmin={isAdmin}
              onEdit={onEditStock} onDelete={onDeleteStock} />
          ))}
          {isAdmin && (
            <button
              onClick={() => onAddStock(pochette)}
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-md
                         border-2 border-dashed border-gray-200 text-gray-400 text-xs
                         hover:border-crf-rouge hover:text-crf-rouge transition-colors"
            >
              <IconPlus size={13} />
              Ajouter un article
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Lot Card ─────────────────────────────────────────────────────────────────

function LotCard({ lot, isAdmin, onEditLot, onDeleteLot, onAddPochette, onEditPochette, onDeletePochette, onShowQR, onAddStock, onEditStock, onDeleteStock }) {
  const [open, setOpen] = useState(true);
  const pochetteCount = lot.pochettes?.length || 0;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-5 py-4
                      border-b border-gray-100 cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Ligne nom */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {open
            ? <IconChevronDown size={18} className="text-gray-400 flex-shrink-0" />
            : <IconChevronRight size={18} className="text-gray-400 flex-shrink-0" />
          }
          {lot.photo_url && (
            <img src={lot.photo_url} alt={lot.nom}
              className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
          )}
          <h2 className="font-semibold text-crf-texte">{lot.nom}</h2>
        </div>

        {/* Ligne actions (sous le nom sur mobile, aligné à droite sur desktop) */}
        <div className="flex items-center gap-2 pl-7 sm:pl-0 flex-shrink-0"
             onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-400 flex-1 sm:flex-none">
            {pochetteCount} pochette{pochetteCount !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-1">
            <button
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                         bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              onClick={() => onShowQR(lot)}
            >
              📱 <span className="hidden sm:inline">QR Code</span>
            </button>
            {isAdmin && (
              <>
                <button
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                             bg-crf-rouge/10 text-crf-rouge hover:bg-crf-rouge/20 transition-colors"
                  onClick={() => onAddPochette(lot)}
                >
                  <IconPlus size={13} />
                  <span className="hidden sm:inline">Pochette</span>
                </button>
                <button className="btn-icon" onClick={() => onEditLot(lot)}>
                  <IconEdit size={15} />
                </button>
                <button className="btn-icon hover:text-red-500" onClick={() => onDeleteLot(lot)}>
                  <IconTrash size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-3 bg-gray-50/40">
          {lot.pochettes?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Aucune pochette dans ce lot.
            </p>
          ) : (
            lot.pochettes.map(pochette => (
              <PochetteCard
                key={pochette.id}
                pochette={pochette}
                lotNom={lot.nom}
                isAdmin={isAdmin}
                onEdit={() => onEditPochette(pochette, lot)}
                onDelete={() => onDeletePochette(pochette, lot)}
                onAddStock={onAddStock}
                onEditStock={onEditStock}
                onDeleteStock={onDeleteStock}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Lots() {
  const { isAdmin } = useAuth();
  const { lots, loading, error, fetch, createLot, updateLot, deleteLot, createPochette, updatePochette, deletePochette, upsertStockPochette, deleteStockPochette } = useLots();
  const { articles, fetch: fetchArticles } = useArticles();

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch(); fetchArticles(); }, [fetch, fetchArticles]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const closeModal = () => setModal(null);

  const handleSaveLot = async ({ _pendingPhoto, ...form }) => {
    setSaving(true);
    try {
      if (modal.data) {
        await updateLot(modal.data.id, form);
      } else {
        // Créer le lot, puis uploader la photo si présente
        const newLot = await createLot(form);
        if (_pendingPhoto && newLot?.id) {
          try {
            const photo_url = await uploadLotPhoto(_pendingPhoto, newLot.id);
            await updateLot(newLot.id, { nom: form.nom, photo_url });
          } catch { /* ignore */ }
        }
      }
      showToast(modal.data ? 'Lot modifié' : 'Lot créé');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteLot = async (lot) => {
    if (!confirm(`Supprimer le lot "${lot.nom}" et toutes ses pochettes ?`)) return;
    try {
      await deleteLot(lot.id);
      showToast('Lot supprimé');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleSavePochette = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updatePochette(modal.context.lotId, modal.data.id, form);
      else            await createPochette(modal.context.lotId, form);
      showToast(modal.data ? 'Pochette modifiée' : 'Pochette créée');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeletePochette = async (pochette, lot) => {
    if (!confirm(`Supprimer la pochette "${pochette.nom}" ?`)) return;
    try {
      await deletePochette(lot.id, pochette.id);
      showToast('Pochette supprimée');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  const handleSaveStock = async ({ articleId, quantite_actuelle, lots: lotsData }) => {
    setSaving(true);
    try {
      await upsertStockPochette(modal.context.pochetteId, articleId, { quantite_actuelle, lots: lotsData });
      showToast('Stock mis à jour');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteStock = async (stock) => {
    const pochette = lots.flatMap(l => l.pochettes || []).find(p =>
      (p.stocks || []).some(s => s.id === stock.id)
    );
    if (!pochette) return;
    if (!confirm(`Retirer "${stock.article.nom}" de la pochette ?`)) return;
    try {
      await deleteStockPochette(pochette.id, stock.article_id);
      showToast('Article retiré');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Lots & Sacs"
        subtitle="Gestion des lots de secours avec QR code"
        actions={
          isAdmin && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setModal({ type: 'lot' })}
            >
              <IconPlus size={16} />
              Nouveau lot
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

      {!loading && !error && lots.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎒</p>
          <p className="text-sm">Aucun lot pour le moment.</p>
          {isAdmin && (
            <button className="btn-primary mt-4" onClick={() => setModal({ type: 'lot' })}>
              Créer le premier lot
            </button>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {lots.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              isAdmin={isAdmin}
              onEditLot={(l) => setModal({ type: 'lot', data: l })}
              onDeleteLot={handleDeleteLot}
              onAddPochette={(l) => setModal({ type: 'pochette', context: { lotId: l.id, lotNom: l.nom } })}
              onEditPochette={(p, l) => setModal({ type: 'pochette', data: p, context: { lotId: l.id, lotNom: l.nom } })}
              onDeletePochette={handleDeletePochette}
              onShowQR={(l) => setModal({ type: 'qrcode', data: l })}
              onAddStock={(p) => setModal({ type: 'stock', context: { pochetteId: p.id, pochetteNom: p.nom } })}
              onEditStock={(s) => {
                const p = lots.flatMap(l => l.pochettes || []).find(po => (po.stocks || []).some(st => st.id === s.id));
                setModal({ type: 'stock', data: s, context: { pochetteId: p?.id, pochetteNom: p?.nom } });
              }}
              onDeleteStock={handleDeleteStock}
            />
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {modal?.type === 'lot' && (
        <LotModal
          initial={modal.data}
          onSave={handleSaveLot}
          onClose={closeModal}
          loading={saving}
        />
      )}

      {modal?.type === 'pochette' && (
        <PochetteModal
          initial={modal.data}
          lotNom={modal.context?.lotNom}
          onSave={handleSavePochette}
          onClose={closeModal}
          loading={saving}
        />
      )}

      {modal?.type === 'qrcode' && (
        <QRCodeModal lot={modal.data} onClose={closeModal} />
      )}

      {modal?.type === 'stock' && (
        <StockPochetteModal
          pochetteNom={modal.context?.pochetteNom}
          articles={articles}
          initial={modal.data}
          onSave={handleSaveStock}
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
