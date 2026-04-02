import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight, IconCopy } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useLots } from '../hooks/useLots';
import { useArticles } from '../hooks/useArticles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
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

// ─── Modal Lot ────────────────────────────────────────────────────────────────

function LotModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '' });

  return (
    <Modal title={initial ? 'Modifier le lot' : 'Nouveau lot'} onClose={onClose}>
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

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR — ${lot.nom}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        img { display: block; margin: 0 auto 16px; }
        h2 { font-size: 20px; margin-bottom: 4px; }
        p { font-size: 13px; color: #666; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <img src="${dataUrl}" width="220" />
        <h2>${lot.nom}</h2>
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

// ─── Pochette Card ────────────────────────────────────────────────────────────

function PochetteCard({ pochette, lotNom, isAdmin, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const stockCount = pochette.stocks?.length || 0;

  return (
    <div className="border border-gray-100 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50
                   transition-colors text-left"
      >
        {open
          ? <IconChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          : <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        }
        <span className="flex-1 text-sm font-medium text-crf-texte">{pochette.nom}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">{stockCount} article{stockCount !== 1 ? 's' : ''}</span>

        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button className="btn-icon p-1" onClick={() => onEdit(pochette)}>
              <IconEdit size={13} />
            </button>
            <button className="btn-icon p-1 hover:text-red-500" onClick={() => onDelete(pochette)}>
              <IconTrash size={13} />
            </button>
          </div>
        )}
      </button>

      {open && pochette.stocks?.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs space-y-1">
          {pochette.stocks.map(stock => (
            <div key={stock.id} className="flex justify-between">
              <span>{stock.article.nom}</span>
              <span className="text-gray-500">×{stock.quantite_actuelle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lot Card ─────────────────────────────────────────────────────────────────

function LotCard({ lot, isAdmin, onEditLot, onDeleteLot, onAddPochette, onEditPochette, onDeletePochette, onShowQR }) {
  const [open, setOpen] = useState(true);
  const pochetteCount = lot.pochettes?.length || 0;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100
                      cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open
          ? <IconChevronDown size={18} className="text-gray-400" />
          : <IconChevronRight size={18} className="text-gray-400" />
        }
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-crf-texte">{lot.nom}</h2>
        </div>
        <span className="text-sm text-gray-400 flex-shrink-0">
          {pochetteCount} pochette{pochetteCount !== 1 ? 's' : ''}
        </span>

        <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                       bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
            onClick={() => onShowQR(lot)}
          >
            📱 QR Code
          </button>
          {isAdmin && (
            <>
              <button
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                           bg-crf-rouge/10 text-crf-rouge hover:bg-crf-rouge/20 transition-colors"
                onClick={() => onAddPochette(lot)}
              >
                <IconPlus size={13} />
                Pochette
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
  const { lots, loading, error, fetch, createLot, updateLot, deleteLot, createPochette, updatePochette, deletePochette } = useLots();
  const { articles } = useArticles();

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch(); }, [fetch]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const closeModal = () => setModal(null);

  const handleSaveLot = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updateLot(modal.data.id, form);
      else            await createLot(form);
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
