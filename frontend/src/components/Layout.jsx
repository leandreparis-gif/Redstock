import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { IconMenu, IconAlerte, IconBarcode } from './Icons';
import { useAlertes } from '../hooks/useAlertes';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import BarcodeScannerModal from './BarcodeScannerModal';
import BarcodeActionModal from './BarcodeActionModal';

// ─── Barre de recherche globale ───────────────────────────────────────────────

function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const wrapperRef              = useRef(null);
  const debounceRef             = useRef(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const go = (e, path) => {
    e.preventDefault();
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(path);
  };

  const total = results
    ? (results.articles?.length || 0) + (results.lots?.length || 0) + (results.uniformes?.length || 0)
    : 0;

  const statutBadge = {
    DISPONIBLE: 'bg-green-100 text-green-700',
    PRETE:      'bg-blue-100 text-blue-700',
    ATTRIBUE:   'bg-purple-100 text-purple-700',
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-md">
      {/* Input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results && setOpen(true)}
          placeholder="Rechercher un article, lot, uniforme…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200
                     rounded-xl focus:outline-none focus:border-crf-rouge focus:bg-white
                     transition-colors placeholder:text-gray-400"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-pulse">…</span>
        )}
      </div>

      {/* Dropdown résultats */}
      {open && results && (
        <div className="absolute top-11 left-0 right-0 z-50 bg-white rounded-xl shadow-xl
                        border border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto">

          {total === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <>
              {/* Articles */}
              {results.articles?.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    💊 Articles pharmacie
                  </p>
                  {results.articles.map(a => (
                    <button key={a.id} onMouseDown={(e) => go(e, `/armoires?article=${a.id}`)}
                      className="w-full text-left px-4 py-2.5 hover:bg-crf-rouge/5 transition-colors group">
                      <p className="text-sm font-medium text-crf-texte group-hover:text-crf-rouge">{a.nom}</p>
                      <p className="text-xs text-gray-400">{a.categorie} · Pharmacie →</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Lots */}
              {results.lots?.length > 0 && (
                <div className="border-t border-gray-50">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    🎒 Lots & Sacs
                  </p>
                  {results.lots.map(l => (
                    <button key={l.id} onMouseDown={(e) => go(e, '/lots')}
                      className="w-full text-left px-4 py-2.5 hover:bg-crf-rouge/5 transition-colors group">
                      <p className="text-sm font-medium text-crf-texte group-hover:text-crf-rouge">{l.nom}</p>
                      <p className="text-xs text-gray-400">Lots & Sacs →</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Uniformes */}
              {results.uniformes?.length > 0 && (
                <div className="border-t border-gray-50">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    👕 Uniformes
                  </p>
                  {results.uniformes.map(u => (
                    <button key={u.id} onMouseDown={(e) => go(e, '/uniformes')}
                      className="w-full text-left px-4 py-2.5 hover:bg-crf-rouge/5 transition-colors group">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-crf-texte group-hover:text-crf-rouge">{u.nom}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${statutBadge[u.statut] || 'bg-gray-100 text-gray-600'}`}>
                          {u.statut === 'DISPONIBLE' ? 'Dispo' : u.statut === 'PRETE' ? 'Prêté' : 'Attribué'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Taille {u.taille}
                        {u.mouvements?.[0]?.beneficiaire_prenom && ` · ${u.mouvements[0].beneficiaire_prenom}`}
                        {' '}· Uniformes →
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panneau alertes ──────────────────────────────────────────────────────────

function AlertesPanel({ alertes, onClose }) {
  const navigate = useNavigate();
  const stockBas   = alertes.filter(a => a.type === 'STOCK_BAS');
  const peremption = alertes.filter(a => a.type === 'PEREMPTION');

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const goToDashboard = () => { onClose(); navigate('/dashboard'); };
  const goToArticle   = (articleId) => { onClose(); navigate(`/armoires?article=${articleId}`); };

  return (
    <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-xl shadow-xl
                    border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-crf-texte">
          {alertes.length} alerte{alertes.length !== 1 ? 's' : ''} active{alertes.length !== 1 ? 's' : ''}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {alertes.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-sm">Aucune alerte active</p>
          </div>
        ) : (
          <>
            {stockBas.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  📦 Stocks bas ({stockBas.length})
                </p>
                {stockBas.map(a => (
                  <button key={a.id} onClick={() => goToArticle(a.article_id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors group">
                    <p className="text-sm font-medium text-crf-texte group-hover:text-crf-rouge">{a.article?.nom}</p>
                    <p className="text-xs text-gray-400">{a.article?.categorie} · voir dans la pharmacie →</p>
                  </button>
                ))}
              </div>
            )}
            {peremption.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                  📅 Péremptions ({peremption.length})
                </p>
                {peremption.map(a => (
                  <button key={a.id} onClick={() => goToArticle(a.article_id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors group">
                    <p className="text-sm font-medium text-crf-texte group-hover:text-crf-rouge">{a.article?.nom}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">{a.article?.categorie}</p>
                      {a.date_echeance && (
                        <span className="text-xs text-orange-600 font-medium">exp. {fmt(a.date_echeance)}</span>
                      )}
                      <span className="text-xs text-gray-400">· voir →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-gray-100">
        <button onClick={goToDashboard}
          className="w-full text-sm text-crf-rouge font-medium py-3 hover:bg-crf-rouge/5 transition-colors">
          Voir tout sur le tableau de bord →
        </button>
      </div>
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────────

export default function Layout() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [alertesOpen, setAlertesOpen]   = useState(false);
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [barcodeData, setBarcodeData]   = useState(null);
  const { alertesActives }              = useAlertes();
  const { user }                        = useAuth();
  const totalAlertes                    = alertesActives.length;
  const initiale                        = user?.prenom?.[0]?.toUpperCase() || '?';
  const panelRef                        = useRef(null);

  const handleArticleFound = useCallback((data) => {
    setScannerOpen(false);
    setBarcodeData(data);
  }, []);

  const handleBarcodeDone = useCallback(() => {
    setBarcodeData(null);
  }, []);

  useEffect(() => {
    if (!alertesOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setAlertesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [alertesOpen]);

  return (
    <div className="flex h-screen bg-crf-fond overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3
                           bg-white border-b border-gray-100 flex-shrink-0">
          {/* Burger mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-crf-rouge transition-colors flex-shrink-0"
            aria-label="Menu"
          >
            <IconMenu size={22} />
          </button>

          {/* Barre de recherche — centrée */}
          <div className="flex-1 flex justify-center">
            <SearchBar />
          </div>

          {/* Bouton scanner */}
          <button
            onClick={() => setScannerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-400 hover:text-crf-rouge transition-colors flex-shrink-0"
            aria-label="Scanner un code-barres"
            title="Scanner un code-barres"
          >
            <IconBarcode size={20} />
          </button>

          {/* Cloche alertes + compte — à droite */}
          <div className="relative flex-shrink-0" ref={panelRef}>
            <button
              onClick={() => setAlertesOpen(o => !o)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors
                ${alertesOpen
                  ? 'bg-crf-rouge/10 text-crf-rouge'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-crf-rouge'
                }`}
              aria-label="Alertes"
            >
              <IconAlerte size={20} />
            </button>
            {totalAlertes > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crf-rouge rounded-full
                               text-white text-[9px] font-bold flex items-center justify-center
                               pointer-events-none">
                {totalAlertes > 9 ? '9+' : totalAlertes}
              </span>
            )}
            {alertesOpen && (
              <AlertesPanel alertes={alertesActives} onClose={() => setAlertesOpen(false)} />
            )}
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-crf-rouge flex items-center justify-center
                          text-white text-sm font-bold flex-shrink-0 cursor-pointer">
            {initiale}
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modals scanner code-barres */}
      {scannerOpen && (
        <BarcodeScannerModal
          onClose={() => setScannerOpen(false)}
          onArticleFound={handleArticleFound}
        />
      )}
      {barcodeData && (
        <BarcodeActionModal
          data={barcodeData}
          onClose={() => setBarcodeData(null)}
          onDone={handleBarcodeDone}
        />
      )}
    </div>
  );
}
