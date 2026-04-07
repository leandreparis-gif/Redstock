import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPlus } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useLots } from '../hooks/useLots';
import { uploadLotPhoto } from '../lib/supabase';
import { useArticles } from '../hooks/useArticles';

// Composants lots extraits
import LotCard from '../components/lots/LotCard';
import LotModal from '../components/lots/LotModal';
import PochetteModal from '../components/lots/PochetteModal';
import QRCodeModal from '../components/lots/QRCodeModal';
import StockPochetteModal from '../components/lots/StockPochetteModal';
import ConfirmModal from '../components/lots/ConfirmModal';

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Lots() {
  const { isAdmin } = useAuth();
  const {
    lots, loading, error, fetch,
    createLot, updateLot, deleteLot,
    createPochette, updatePochette, deletePochette,
    upsertStockPochette, deleteStockPochette, updateStockMinimum,
  } = useLots();
  const { articles, fetch: fetchArticles } = useArticles();
  const [articlesFetched, setArticlesFetched] = useState(false);

  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetch(); }, [fetch]);

  // P2: lazy-load articles seulement quand on ouvre la modale stock
  const ensureArticles = useCallback(() => {
    if (!articlesFetched) {
      fetchArticles();
      setArticlesFetched(true);
    }
  }, [articlesFetched, fetchArticles]);

  // U1: filtrage des lots par recherche
  const filteredLots = useMemo(() => {
    if (!search.trim()) return lots;
    const q = search.toLowerCase();
    return lots.filter(lot =>
      lot.nom.toLowerCase().includes(q) ||
      lot.pochettes?.some(p =>
        p.nom.toLowerCase().includes(q) ||
        p.stocks?.some(s => s.article?.nom?.toLowerCase().includes(q))
      )
    );
  }, [lots, search]);

  // U2: compteurs globaux
  const stats = useMemo(() => {
    const pochetteCount = lots.reduce((s, l) => s + (l.pochettes?.length || 0), 0);
    const articleCount = lots.reduce((s, l) =>
      s + (l.pochettes || []).reduce((s2, p) => s2 + (p.stocks?.length || 0), 0)
    , 0);
    return { lotCount: lots.length, pochetteCount, articleCount };
  }, [lots]);

  // U3: toast ameliore
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const closeModal = () => setModal(null);

  // ── Handlers Lot ──────────────────────────────────────────────────────────────

  const handleSaveLot = async ({ _pendingPhoto, ...form }) => {
    setSaving(true);
    try {
      if (modal.data) {
        await updateLot(modal.data.id, form);
      } else {
        const newLot = await createLot(form);
        if (_pendingPhoto && newLot?.id) {
          try {
            const photo_url = await uploadLotPhoto(_pendingPhoto, newLot.id);
            await updateLot(newLot.id, { nom: form.nom, photo_url });
          } catch (err) {
            showToast('Lot cree mais erreur upload photo', 'error');
          }
        }
      }
      showToast(modal.data ? 'Lot modifie' : 'Lot cree');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  // B3: remplacement de confirm() par ConfirmModal
  const handleDeleteLot = (lot) => {
    setModal({
      type: 'confirm',
      data: {
        title: 'Supprimer le lot',
        message: `Supprimer le lot "${lot.nom}" et toutes ses pochettes ? Cette action est irreversible.`,
        onConfirm: async () => {
          closeModal();
          try {
            await deleteLot(lot.id);
            showToast('Lot supprime');
          } catch (e) {
            showToast(e.response?.data?.error || 'Erreur', 'error');
          }
        },
      },
    });
  };

  // ── Handlers Pochette ─────────────────────────────────────────────────────────

  const handleSavePochette = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updatePochette(modal.context.lotId, modal.data.id, form);
      else            await createPochette(modal.context.lotId, form);
      showToast(modal.data ? 'Pochette modifiee' : 'Pochette creee');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeletePochette = (pochette, lot) => {
    setModal({
      type: 'confirm',
      data: {
        title: 'Supprimer la pochette',
        message: `Supprimer la pochette "${pochette.nom}" et tout son contenu ?`,
        onConfirm: async () => {
          closeModal();
          try {
            await deletePochette(lot.id, pochette.id);
            showToast('Pochette supprimee');
          } catch (e) {
            showToast(e.response?.data?.error || 'Erreur', 'error');
          }
        },
      },
    });
  };

  // ── Handlers Stock ────────────────────────────────────────────────────────────

  const handleSaveStock = async ({ articleId, quantite_actuelle, quantite_minimum, lots: lotsData }) => {
    setSaving(true);
    try {
      await upsertStockPochette(modal.context.pochetteId, articleId, {
        quantite_actuelle,
        quantite_minimum,
        lots: lotsData,
      });
      showToast('Stock mis a jour');
      closeModal();
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDeleteStock = (stock) => {
    const pochette = lots.flatMap(l => l.pochettes || []).find(p =>
      (p.stocks || []).some(s => s.id === stock.id)
    );
    if (!pochette) return;

    setModal({
      type: 'confirm',
      data: {
        title: 'Retirer l\'article',
        message: `Retirer "${stock.article.nom}" de la pochette ?`,
        onConfirm: async () => {
          closeModal();
          try {
            await deleteStockPochette(pochette.id, stock.article_id);
            showToast('Article retire');
          } catch (e) {
            showToast(e.response?.data?.error || 'Erreur', 'error');
          }
        },
      },
    });
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

      {/* U2: compteurs globaux + U1: barre de recherche */}
      {!loading && !error && lots.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex gap-3 text-xs text-gray-500">
            <span>{stats.lotCount} lot{stats.lotCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-300">|</span>
            <span>{stats.pochetteCount} pochette{stats.pochetteCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-300">|</span>
            <span>{stats.articleCount} article{stats.articleCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 sm:max-w-xs">
            <input
              type="search"
              className="input text-sm py-1.5"
              placeholder="Rechercher un lot, pochette ou article..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-crf-rouge border-t-transparent
                          rounded-full animate-spin mb-3" />
          <p className="text-sm">Chargement...</p>
        </div>
      )}

      {error && (
        <div className="card border border-red-200 bg-red-50 text-red-700 text-sm py-4 text-center">
          {error}
          <button onClick={fetch} className="ml-2 underline">Reessayer</button>
        </div>
      )}

      {!loading && !error && lots.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-4xl mb-3" aria-hidden="true">🎒</div>
          <p className="text-sm">Aucun lot pour le moment.</p>
          {isAdmin && (
            <button className="btn-primary mt-4" onClick={() => setModal({ type: 'lot' })}>
              Creer le premier lot
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredLots.length === 0 && lots.length > 0 && (
        <div className="card text-center py-8 text-gray-400">
          <p className="text-sm">Aucun resultat pour "{search}"</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {/* P4: lots collapsed par defaut quand il y en a beaucoup */}
          {filteredLots.map((lot, i) => (
            <LotCard
              key={lot.id}
              lot={lot}
              isAdmin={isAdmin}
              defaultOpen={filteredLots.length <= 3 || i === 0}
              onEditLot={(l) => setModal({ type: 'lot', data: l })}
              onDeleteLot={handleDeleteLot}
              onAddPochette={(l) => setModal({ type: 'pochette', context: { lotId: l.id, lotNom: l.nom } })}
              onEditPochette={(p, l) => setModal({ type: 'pochette', data: p, context: { lotId: l.id, lotNom: l.nom } })}
              onDeletePochette={handleDeletePochette}
              onShowQR={(l) => setModal({ type: 'qrcode', data: l })}
              onAddStock={(p) => { ensureArticles(); setModal({ type: 'stock', context: { pochetteId: p.id, pochetteNom: p.nom } }); }}
              onEditStock={(s) => {
                ensureArticles();
                const p = lots.flatMap(l => l.pochettes || []).find(po => (po.stocks || []).some(st => st.id === s.id));
                setModal({ type: 'stock', data: s, context: { pochetteId: p?.id, pochetteNom: p?.nom } });
              }}
              onDeleteStock={handleDeleteStock}
              onUpdateMinimum={updateStockMinimum}
            />
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {modal?.type === 'lot' && (
        <LotModal initial={modal.data} onSave={handleSaveLot} onClose={closeModal} loading={saving} />
      )}

      {modal?.type === 'pochette' && (
        <PochetteModal
          initial={modal.data} lotNom={modal.context?.lotNom}
          onSave={handleSavePochette} onClose={closeModal} loading={saving}
        />
      )}

      {modal?.type === 'qrcode' && (
        <QRCodeModal lot={modal.data} onClose={closeModal} />
      )}

      {modal?.type === 'stock' && (
        <StockPochetteModal
          pochetteNom={modal.context?.pochetteNom} articles={articles}
          initial={modal.data} onSave={handleSaveStock} onClose={closeModal} loading={saving}
        />
      )}

      {modal?.type === 'confirm' && (
        <ConfirmModal
          title={modal.data.title} message={modal.data.message}
          onConfirm={modal.data.onConfirm} onClose={closeModal}
        />
      )}

      {/* U3: Toast ameliore avec fermeture manuelle et role correct */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium flex items-center gap-3
            ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}
        >
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white text-lg leading-none"
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
