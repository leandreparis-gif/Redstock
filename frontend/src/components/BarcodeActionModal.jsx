import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useArmoires } from '../hooks/useArmoires';
import { useLots } from '../hooks/useLots';

// ─── Modal wrapper ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-crf-texte">{title}</h2>
          <button onClick={onClose} className="btn-icon text-lg leading-none">x</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Sous-formulaire : Ajouter a la pharmacie ───────────────────────────────

function AddStockForm({ article, armoires, onSubmit, onBack, loading }) {
  const [tiroirId, setTiroirId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [lotLabel, setLotLabel] = useState('');
  const [datePeremption, setDatePeremption] = useState('');

  const allTiroirs = armoires.flatMap(a =>
    (a.tiroirs || []).map(t => ({ ...t, armoireNom: a.nom }))
  );

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-crf-rouge">
        &larr; Retour
      </button>
      <div>
        <label className="label">Tiroir de destination *</label>
        <select className="select" value={tiroirId} onChange={e => setTiroirId(e.target.value)}>
          <option value="">Choisir un tiroir...</option>
          {allTiroirs.map(t => (
            <option key={t.id} value={t.id}>{t.armoireNom} &gt; {t.nom}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Reference du lot</label>
        <input className="input" placeholder="ex: LOT-2026-04" value={lotLabel}
          onChange={e => setLotLabel(e.target.value)} />
      </div>
      {article.est_perimable && (
        <div>
          <label className="label">Date de peremption</label>
          <input type="date" className="input" value={datePeremption}
            onChange={e => setDatePeremption(e.target.value)} />
        </div>
      )}
      <div>
        <label className="label">Quantite *</label>
        <input type="number" min="1" className="input" value={quantite}
          onChange={e => setQuantite(Math.max(1, parseInt(e.target.value) || 1))} />
      </div>
      <button
        className="btn-primary w-full"
        disabled={!tiroirId || loading}
        onClick={() => onSubmit({ tiroirId, quantite, lotLabel, datePeremption })}
      >
        {loading ? 'Ajout en cours...' : 'Ajouter au stock'}
      </button>
    </div>
  );
}

// ─── Sous-formulaire : Retirer de la pharmacie ──────────────────────────────

function formatLotOption(lot, index) {
  const label = lot.label || `Lot #${index + 1}`;
  const date = lot.date_peremption
    ? ` — exp. ${new Date(lot.date_peremption).toLocaleDateString('fr-FR')}`
    : '';
  return `${label}${date} (x${lot.quantite})`;
}

function RemoveStockForm({ article, stockTiroirs, onSubmit, onBack, loading }) {
  const [stockId, setStockId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [lotIdx, setLotIdx] = useState(0);

  const selectedStock = stockTiroirs.find(s => s.id === stockId);
  const stockLots = (selectedStock?.lots || []).filter(l => (l.quantite || 0) > 0);
  const selectedLot = stockLots[lotIdx];
  const maxQty = selectedLot?.quantite || 0;

  if (stockTiroirs.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-crf-rouge">
          &larr; Retour
        </button>
        <p className="text-sm text-gray-500 text-center py-4">
          Cet article n'est dans aucun tiroir de la pharmacie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-crf-rouge">
        &larr; Retour
      </button>
      <div>
        <label className="label">Tiroir source *</label>
        <select className="select" value={stockId} onChange={e => { setStockId(e.target.value); setLotIdx(0); setQuantite(1); }}>
          <option value="">Choisir...</option>
          {stockTiroirs.map(s => (
            <option key={s.id} value={s.id}>
              {s.tiroir.armoire.nom} &gt; {s.tiroir.nom} (x{s.quantite_actuelle})
            </option>
          ))}
        </select>
      </div>
      {selectedStock && stockLots.length > 0 && (
        <div>
          <label className="label">Lot * <span className="font-normal text-gray-400">({stockLots.length} lot{stockLots.length > 1 ? 's' : ''} disponible{stockLots.length > 1 ? 's' : ''})</span></label>
          {stockLots.length === 1 ? (
            <div className="bg-gray-50 rounded-md p-2 text-sm text-gray-700">
              {formatLotOption(stockLots[0], 0)}
            </div>
          ) : (
            <div className="space-y-1">
              {stockLots.map((l, i) => (
                <button
                  key={i}
                  onClick={() => { setLotIdx(i); setQuantite(1); }}
                  className={`w-full text-left p-2.5 rounded-md text-sm transition-colors ${
                    lotIdx === i
                      ? 'bg-crf-rouge/10 border-2 border-crf-rouge text-crf-texte font-medium'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{l.label || `Lot #${i + 1}`}</span>
                    <span className="font-semibold">x{l.quantite}</span>
                  </div>
                  {l.date_peremption && (
                    <p className="text-xs text-orange-500 mt-0.5">
                      exp. {new Date(l.date_peremption).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedLot && (
        <div>
          <label className="label">Quantite a retirer * <span className="font-normal text-gray-400">(max {maxQty})</span></label>
          <input type="number" min="1" max={maxQty} className="input" value={quantite}
            onChange={e => setQuantite(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))} />
        </div>
      )}
      <button
        className="btn-primary w-full bg-red-600 hover:bg-red-700"
        disabled={!selectedLot || quantite < 1 || loading}
        onClick={() => onSubmit({ stock: selectedStock, lotIdx, quantite })}
      >
        {loading ? 'Retrait en cours...' : 'Retirer du stock'}
      </button>
    </div>
  );
}

// ─── Sous-formulaire : Transferer vers un lot ───────────────────────────────

function TransferForm({ article, stockTiroirs, lotsData, onSubmit, onBack, loading }) {
  const [stockId, setStockId] = useState('');
  const [lotIdx, setLotIdx] = useState(0);
  const [quantite, setQuantite] = useState(1);
  const [destLotId, setDestLotId] = useState('');
  const [destPochetteId, setDestPochetteId] = useState('');

  const selectedStock = stockTiroirs.find(s => s.id === stockId);
  const stockLots = (selectedStock?.lots || []).filter(l => (l.quantite || 0) > 0);
  const selectedLot = stockLots[lotIdx];
  const maxQty = selectedLot?.quantite || 0;
  const destLot = lotsData.find(l => l.id === destLotId);
  const pochettes = destLot?.pochettes || [];

  if (stockTiroirs.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-crf-rouge">
          &larr; Retour
        </button>
        <p className="text-sm text-gray-500 text-center py-4">
          Cet article n'est dans aucun tiroir de la pharmacie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-crf-rouge">
        &larr; Retour
      </button>

      <div>
        <label className="label">Tiroir source *</label>
        <select className="select" value={stockId} onChange={e => { setStockId(e.target.value); setLotIdx(0); setQuantite(1); }}>
          <option value="">Choisir...</option>
          {stockTiroirs.map(s => (
            <option key={s.id} value={s.id}>
              {s.tiroir.armoire.nom} &gt; {s.tiroir.nom} (x{s.quantite_actuelle})
            </option>
          ))}
        </select>
      </div>

      {selectedStock && stockLots.length > 0 && (
        <div>
          <label className="label">Lot source * <span className="font-normal text-gray-400">({stockLots.length} lot{stockLots.length > 1 ? 's' : ''})</span></label>
          {stockLots.length === 1 ? (
            <div className="bg-gray-50 rounded-md p-2 text-sm text-gray-700">
              {formatLotOption(stockLots[0], 0)}
            </div>
          ) : (
            <div className="space-y-1">
              {stockLots.map((l, i) => (
                <button
                  key={i}
                  onClick={() => { setLotIdx(i); setQuantite(1); }}
                  className={`w-full text-left p-2.5 rounded-md text-sm transition-colors ${
                    lotIdx === i
                      ? 'bg-crf-rouge/10 border-2 border-crf-rouge text-crf-texte font-medium'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{l.label || `Lot #${i + 1}`}</span>
                    <span className="font-semibold">x{l.quantite}</span>
                  </div>
                  {l.date_peremption && (
                    <p className="text-xs text-orange-500 mt-0.5">
                      exp. {new Date(l.date_peremption).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedLot && (
        <div>
          <label className="label">Quantite * <span className="font-normal text-gray-400">(max {maxQty})</span></label>
          <input type="number" min="1" max={maxQty} className="input" value={quantite}
            onChange={e => setQuantite(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))} />
        </div>
      )}

      <div>
        <label className="label">Lot destination *</label>
        <select className="select" value={destLotId} onChange={e => { setDestLotId(e.target.value); setDestPochetteId(''); }}>
          <option value="">Choisir un lot...</option>
          {lotsData.map(l => (
            <option key={l.id} value={l.id}>{l.nom}</option>
          ))}
        </select>
      </div>

      {destLotId && (
        <div>
          <label className="label">Pochette *</label>
          <select className="select" value={destPochetteId} onChange={e => setDestPochetteId(e.target.value)}>
            <option value="">Choisir une pochette...</option>
            {pochettes.map(p => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          {pochettes.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Ce lot n'a pas encore de pochettes.</p>
          )}
        </div>
      )}

      <button
        className="btn-primary w-full"
        disabled={!selectedLot || quantite < 1 || !destPochetteId || loading}
        onClick={() => onSubmit({ stock: selectedStock, srcLot: selectedLot, quantite, destPochetteId })}
      >
        {loading ? 'Transfert en cours...' : 'Transferer vers le lot'}
      </button>
    </div>
  );
}

// ─── Modal principal ────────────────────────────────────────────────────────

export default function BarcodeActionModal({ data, onClose, onDone }) {
  const { article, stockTiroirs, stockPochettes } = data;
  const [action, setAction] = useState(null); // null | 'add' | 'remove' | 'transfer'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const { armoires, fetch: fetchArmoires } = useArmoires();
  const { lots: lotsData, fetch: fetchLots } = useLots();

  useEffect(() => {
    fetchArmoires();
    fetchLots();
  }, [fetchArmoires, fetchLots]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Ajouter au stock d'un tiroir ──────────────────────────────────────
  const handleAdd = async ({ tiroirId, quantite, lotLabel, datePeremption }) => {
    setLoading(true);
    try {
      // Trouver le stock existant dans ce tiroir
      const tiroir = armoires.flatMap(a => a.tiroirs || []).find(t => t.id === tiroirId);
      const existingStock = (tiroir?.stocks || []).find(s => s.article?.id === article.id);
      const existingLots = existingStock?.lots || [];

      const newLot = {
        label: lotLabel || `SCAN-${new Date().toISOString().slice(0, 10)}`,
        date_peremption: datePeremption || null,
        quantite,
      };

      // Fusionner si meme label + date
      const existIdx = existingLots.findIndex(
        l => l.label === newLot.label && l.date_peremption === newLot.date_peremption
      );
      let newLots;
      if (existIdx >= 0) {
        newLots = existingLots.map((l, i) =>
          i === existIdx ? { ...l, quantite: (l.quantite || 0) + quantite } : l
        );
      } else {
        newLots = [...existingLots, newLot];
      }
      const newQty = newLots.reduce((s, l) => s + (l.quantite || 0), 0);

      await apiClient.put(`/armoires/tiroirs/${tiroirId}/stock/${article.id}`, {
        quantite_actuelle: newQty,
        lots: newLots,
      });

      showToast(`${quantite}x ${article.nom} ajoute(s)`);
      setTimeout(() => { onDone(); }, 1000);
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Retirer du stock d'un tiroir ──────────────────────────────────────
  const handleRemove = async ({ stock, lotIdx, quantite }) => {
    setLoading(true);
    try {
      const lots = (stock.lots || []).filter(l => (l.quantite || 0) > 0);
      const srcLot = lots[lotIdx];
      const newLots = stock.lots.map(l =>
        l.label === srcLot.label && l.date_peremption === srcLot.date_peremption
          ? { ...l, quantite: l.quantite - quantite }
          : l
      ).filter(l => l.quantite > 0);
      const newQty = newLots.reduce((s, l) => s + (l.quantite || 0), 0);

      await apiClient.put(`/armoires/tiroirs/${stock.tiroir_id}/stock/${article.id}`, {
        quantite_actuelle: newQty,
        lots: newLots,
      });

      showToast(`${quantite}x ${article.nom} retire(s)`);
      setTimeout(() => { onDone(); }, 1000);
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Transferer vers un lot ────────────────────────────────────────────
  const handleTransfer = async ({ stock, srcLot, quantite, destPochetteId }) => {
    setLoading(true);
    try {
      // 1. Reduire le stock tiroir
      const newLots = (stock.lots || []).map(l =>
        l.label === srcLot.label && l.date_peremption === srcLot.date_peremption
          ? { ...l, quantite: l.quantite - quantite }
          : l
      ).filter(l => l.quantite > 0);
      const newQty = newLots.reduce((s, l) => s + (l.quantite || 0), 0);
      await apiClient.put(`/armoires/tiroirs/${stock.tiroir_id}/stock/${article.id}`, {
        quantite_actuelle: newQty,
        lots: newLots,
      });

      // 2. Ajouter au stock pochette
      const pochette = lotsData.flatMap(l => l.pochettes || []).find(p => p.id === destPochetteId);
      const existingStock = (pochette?.stocks || []).find(s => s.article_id === article.id);
      const existingLots = existingStock?.lots || [];
      const existIdx = existingLots.findIndex(
        l => l.label === srcLot.label && l.date_peremption === srcLot.date_peremption
      );
      let newPochetteLots;
      if (existIdx >= 0) {
        newPochetteLots = existingLots.map((l, i) =>
          i === existIdx ? { ...l, quantite: (l.quantite || 0) + quantite } : l
        );
      } else {
        newPochetteLots = [...existingLots, { ...srcLot, quantite }];
      }
      const newPochetteQty = newPochetteLots.reduce((s, l) => s + (l.quantite || 0), 0);
      await apiClient.put(`/lots/pochettes/${destPochetteId}/stock/${article.id}`, {
        quantite_actuelle: newPochetteQty,
        lots: newPochetteLots,
      });

      showToast(`${quantite}x ${article.nom} transfere(s)`);
      setTimeout(() => { onDone(); }, 1000);
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Calcul du stock total ─────────────────────────────────────────────
  const totalPharmacie = stockTiroirs.reduce((s, st) => s + (st.quantite_actuelle || 0), 0);
  const totalLots = stockPochettes.reduce((s, sp) => s + (sp.quantite_actuelle || 0), 0);

  return (
    <Modal title={article.nom} onClose={onClose}>
      {/* Resume article */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{article.categorie}</p>
            {article.code_barre && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{article.code_barre}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm">
              Pharmacie : <span className="font-semibold">{totalPharmacie}</span>
            </p>
            <p className="text-sm">
              Lots : <span className="font-semibold">{totalLots}</span>
            </p>
          </div>
        </div>
        {/* Detail par emplacement avec lots */}
        {stockTiroirs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
            {stockTiroirs.map(s => (
              <div key={s.id}>
                <p className="text-xs font-medium text-gray-600">
                  {s.tiroir.armoire.nom} &gt; {s.tiroir.nom} — <span className="font-semibold">x{s.quantite_actuelle}</span>
                </p>
                {(s.lots || []).filter(l => (l.quantite || 0) > 0).map((lot, i) => (
                  <div key={i} className="flex items-center gap-2 ml-3 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="text-xs text-gray-500">
                      {lot.label || 'Sans ref.'}
                    </span>
                    {lot.date_peremption && (
                      <span className="text-xs text-orange-500">
                        exp. {new Date(lot.date_peremption).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-600">x{lot.quantite}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions ou sous-formulaire */}
      {action === null && (
        <div className="space-y-2">
          <button
            className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-100
                       hover:border-green-300 hover:bg-green-50 transition-colors text-left"
            onClick={() => setAction('add')}
          >
            <span className="text-2xl">+</span>
            <div>
              <p className="font-medium text-gray-800">Ajouter a la pharmacie</p>
              <p className="text-xs text-gray-500">Ajouter des unites dans un tiroir</p>
            </div>
          </button>

          <button
            className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-100
                       hover:border-red-300 hover:bg-red-50 transition-colors text-left"
            onClick={() => setAction('remove')}
          >
            <span className="text-2xl text-red-500">-</span>
            <div>
              <p className="font-medium text-gray-800">Retirer de la pharmacie</p>
              <p className="text-xs text-gray-500">Retirer des unites d'un tiroir</p>
            </div>
          </button>

          <button
            className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-100
                       hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            onClick={() => setAction('transfer')}
          >
            <span className="text-2xl text-blue-500">&rarr;</span>
            <div>
              <p className="font-medium text-gray-800">Transferer vers un lot</p>
              <p className="text-xs text-gray-500">Deplacer des unites vers une pochette de lot</p>
            </div>
          </button>
        </div>
      )}

      {action === 'add' && (
        <AddStockForm
          article={article}
          armoires={armoires}
          onSubmit={handleAdd}
          onBack={() => setAction(null)}
          loading={loading}
        />
      )}

      {action === 'remove' && (
        <RemoveStockForm
          article={article}
          stockTiroirs={stockTiroirs}
          onSubmit={handleRemove}
          onBack={() => setAction(null)}
          loading={loading}
        />
      )}

      {action === 'transfer' && (
        <TransferForm
          article={article}
          stockTiroirs={stockTiroirs}
          lotsData={lotsData}
          onSubmit={handleTransfer}
          onBack={() => setAction(null)}
          loading={loading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] px-4 py-3 rounded-card shadow-lg text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </Modal>
  );
}
