import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { IconPlus } from '../components/Icons';
import { useCommandes } from '../hooks/useCommandes';
import apiClient from '../api/client';

const STATUT_STYLES = {
  EN_ATTENTE: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' },
  RECUE:      { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Recue' },
  ANNULEE:    { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Annulee' },
};

const STATUT_OPTIONS = [
  { value: '',          label: 'Tous les statuts' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'RECUE',     label: 'Recue' },
  { value: 'ANNULEE',   label: 'Annulee' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Modal creation commande manuelle ────────────────────────────────────────

function CommandeModal({ onSave, onClose, saving }) {
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState({ article_id: '', quantite_demandee: 1, remarques: '' });

  useEffect(() => {
    apiClient.get('/articles').then(r => setArticles(r.data)).catch(() => {});
  }, []);

  const handleSubmit = () => {
    if (!form.article_id || form.quantite_demandee < 1) return;
    onSave(form);
  };

  return (
    <Modal title="Nouvelle commande" onClose={onClose}>
      <div>
        <label className="label">Article *</label>
        <select className="input" value={form.article_id}
          onChange={e => setForm(f => ({ ...f, article_id: e.target.value }))}>
          <option value="">Choisir un article...</option>
          {articles.map(a => (
            <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Quantite *</label>
        <input type="number" className="input" min={1} value={form.quantite_demandee}
          onChange={e => setForm(f => ({ ...f, quantite_demandee: parseInt(e.target.value) || 1 }))} />
      </div>
      <div>
        <label className="label">Remarques</label>
        <textarea className="input resize-none" rows={2} value={form.remarques}
          onChange={e => setForm(f => ({ ...f, remarques: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving || !form.article_id}>
          {saving ? 'Creation...' : 'Creer la commande'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Onglet Previsionnel ─────────────────────────────────────────────────────

function TabPrevisionnel({ previsionnel, loadingPrev, onCommander }) {
  const [selected, setSelected] = useState({});
  const [quantities, setQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Init quantities suggerees
  useEffect(() => {
    const q = {};
    previsionnel.forEach(item => { q[item.article_id] = item.quantite_suggeree; });
    setQuantities(q);
  }, [previsionnel]);

  const toggleSelect = (articleId) => {
    setSelected(prev => ({ ...prev, [articleId]: !prev[articleId] }));
  };

  const toggleAll = () => {
    const available = previsionnel.filter(i => !i.commande_existante);
    const allSelected = available.every(i => selected[i.article_id]);
    const next = {};
    available.forEach(i => { next[i.article_id] = !allSelected; });
    setSelected(next);
  };

  const selectedItems = previsionnel.filter(i => selected[i.article_id] && !i.commande_existante);

  const handleCommander = async () => {
    if (selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      const items = selectedItems.map(i => ({
        article_id: i.article_id,
        quantite_demandee: quantities[i.article_id] || i.quantite_suggeree,
      }));
      await onCommander(items);
      setSelected({});
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const available = previsionnel.filter(i => !i.commande_existante);
  const allSelected = available.length > 0 && available.every(i => selected[i.article_id]);

  if (loadingPrev) {
    return <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement...</p></div>;
  }

  return (
    <div className="space-y-4">
      {/* Resume */}
      <div className="card border-l-4 border-orange-400 inline-block">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Articles en rupture</p>
        <p className="text-2xl font-bold mt-1 text-orange-600">{previsionnel.length}</p>
      </div>

      {previsionnel.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">Aucun article en rupture de stock.</p>
        </div>
      ) : (
        <>
          {/* Action bar */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-3 bg-crf-rouge/5 border border-crf-rouge/20 rounded-xl px-4 py-3">
              <span className="text-sm font-medium text-crf-texte">
                {selectedItems.length} article{selectedItems.length > 1 ? 's' : ''} selectionne{selectedItems.length > 1 ? 's' : ''}
              </span>
              <button className="btn-primary text-sm ml-auto" onClick={handleCommander} disabled={submitting}>
                {submitting ? 'Creation...' : 'Commander les articles selectionnes'}
              </button>
            </div>
          )}

          {/* Mobile cards */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {previsionnel.map(item => {
              const disabled = item.commande_existante;
              return (
                <div key={item.article_id} className={`p-3 space-y-1.5 ${disabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" disabled={disabled}
                      checked={!!selected[item.article_id]}
                      onChange={() => toggleSelect(item.article_id)}
                      className="rounded border-gray-300 text-crf-rouge focus:ring-crf-rouge" />
                    <span className="text-sm font-medium text-crf-texte flex-1">{item.article_nom}</span>
                    {disabled && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Commande en cours</span>}
                  </div>
                  <div className="text-xs text-gray-500 pl-6">
                    <span>{item.categorie}</span>
                    <span className="mx-2">|</span>
                    <span className="text-red-600 font-medium">Stock: {item.stock_actuel}/{item.stock_minimum}</span>
                  </div>
                  {!disabled && (
                    <div className="pl-6 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Qte:</span>
                      <input type="number" min={1} className="input text-sm py-0.5 w-20"
                        value={quantities[item.article_id] || item.quantite_suggeree}
                        onChange={e => setQuantities(q => ({ ...q, [item.article_id]: parseInt(e.target.value) || 1 }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto card p-0">
            <table className="table-auto">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="rounded border-gray-300 text-crf-rouge focus:ring-crf-rouge" />
                  </th>
                  <th>Article</th>
                  <th>Categorie</th>
                  <th>Stock actuel</th>
                  <th>Minimum</th>
                  <th>Qte a commander</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {previsionnel.map(item => {
                  const disabled = item.commande_existante;
                  return (
                    <tr key={item.article_id} className={disabled ? 'opacity-50' : ''}>
                      <td>
                        <input type="checkbox" disabled={disabled}
                          checked={!!selected[item.article_id]}
                          onChange={() => toggleSelect(item.article_id)}
                          className="rounded border-gray-300 text-crf-rouge focus:ring-crf-rouge" />
                      </td>
                      <td className="text-sm font-medium text-crf-texte">{item.article_nom}</td>
                      <td className="text-sm text-gray-600">{item.categorie}</td>
                      <td className="text-sm font-semibold text-red-600">{item.stock_actuel}</td>
                      <td className="text-sm text-gray-600">{item.stock_minimum}</td>
                      <td>
                        {disabled ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          <input type="number" min={1} className="input text-sm py-0.5 w-20"
                            value={quantities[item.article_id] || item.quantite_suggeree}
                            onChange={e => setQuantities(q => ({ ...q, [item.article_id]: parseInt(e.target.value) || 1 }))} />
                        )}
                      </td>
                      <td>
                        {disabled && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Commande en cours</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Onglet Commandes ────────────────────────────────────────────────────────

function TabCommandes({ commandes, summary, total, loading, filters, updateFilters, setPage, recevoir, annuler, onCreate }) {
  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Summary + action */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="card border-l-4 border-yellow-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En attente</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{summary.enAttente}</p>
        </div>
        <div className="card border-l-4 border-green-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Recues ce mois</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{summary.recuesMois}</p>
        </div>
        <div className="ml-auto flex gap-2 self-end">
          <button className="btn-primary text-sm flex items-center gap-1.5" onClick={onCreate}>
            <IconPlus size={16} /> Nouvelle commande
          </button>
        </div>
      </div>

      {/* Filter */}
      <div>
        <select className="select text-sm py-1.5" value={filters.statut}
          onChange={e => updateFilters({ statut: e.target.value })}>
          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement...</p></div>
      ) : commandes.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">Aucune commande.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {commandes.map(cmd => {
              const style = STATUT_STYLES[cmd.statut] || STATUT_STYLES.EN_ATTENTE;
              return (
                <div key={cmd.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-crf-texte">{cmd.article?.nom}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Qte: {cmd.quantite_demandee} | Par: {cmd.created_by?.prenom} | {formatDate(cmd.date_creation)}
                  </div>
                  {cmd.remarques && <p className="text-xs text-gray-400">{cmd.remarques}</p>}
                  <div className="flex gap-2">
                    {cmd.statut === 'EN_ATTENTE' && (
                      <>
                        <button className="btn-primary text-xs py-1 px-2" onClick={() => recevoir(cmd.id)}>Marquer recue</button>
                        <button className="btn-secondary text-xs py-1 px-2" onClick={() => annuler(cmd.id)}>Annuler</button>
                      </>
                    )}
                    {cmd.statut === 'RECUE' && <span className="text-xs text-green-600">Recue le {formatDate(cmd.date_reception)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto card p-0">
            <table className="table-auto">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Qte</th>
                  <th>Statut</th>
                  <th>Demandeur</th>
                  <th>Date</th>
                  <th>Remarques</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {commandes.map(cmd => {
                  const style = STATUT_STYLES[cmd.statut] || STATUT_STYLES.EN_ATTENTE;
                  return (
                    <tr key={cmd.id}>
                      <td className="text-sm font-medium text-crf-texte">{cmd.article?.nom}</td>
                      <td className="text-sm text-gray-600">{cmd.quantite_demandee}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{cmd.created_by?.prenom || '—'}</td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(cmd.date_creation)}</td>
                      <td className="text-sm text-gray-500 max-w-xs truncate">{cmd.remarques || '—'}</td>
                      <td>
                        <div className="flex gap-1.5">
                          {cmd.statut === 'EN_ATTENTE' && (
                            <>
                              <button className="btn-primary text-xs py-0.5 px-2" onClick={() => recevoir(cmd.id)}>Recue</button>
                              <button className="text-xs text-red-500 hover:underline" onClick={() => annuler(cmd.id)}>Annuler</button>
                            </>
                          )}
                          {cmd.statut === 'RECUE' && <span className="text-xs text-green-600">{formatDate(cmd.date_reception)}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary text-sm py-1" disabled={filters.page === 1}
            onClick={() => setPage(filters.page - 1)}>Precedent</button>
          <span className="text-sm text-gray-500">Page {filters.page} / {totalPages}</span>
          <button className="btn-secondary text-sm py-1" disabled={filters.page === totalPages}
            onClick={() => setPage(filters.page + 1)}>Suivant</button>
        </div>
      )}
    </div>
  );
}

// ─── Page principale avec onglets ────────────────────────────────────────────

export default function Commandes() {
  const {
    commandes, summary, total, loading, filters,
    previsionnel, loadingPrev,
    updateFilters, setPage,
    create, createFromPrevisionnel, recevoir, annuler,
  } = useCommandes();

  const [tab, setTab] = useState('previsionnel');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await create(form);
      setShowModal(false);
      setTab('commandes');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCommanderPrev = async (items) => {
    const result = await createFromPrevisionnel(items);
    setTab('commandes');
    return result;
  };

  const tabs = [
    { id: 'previsionnel', label: 'Previsionnel', count: previsionnel.length },
    { id: 'commandes',    label: 'Commandes',    count: summary.enAttente },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Commandes" subtitle="Previsionnel et reapprovisionnement" />

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${tab === t.id
                ? 'bg-white text-crf-texte shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold
                ${tab === t.id ? 'bg-crf-rouge text-white' : 'bg-gray-200 text-gray-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      {tab === 'previsionnel' && (
        <TabPrevisionnel
          previsionnel={previsionnel}
          loadingPrev={loadingPrev}
          onCommander={handleCommanderPrev}
        />
      )}

      {tab === 'commandes' && (
        <TabCommandes
          commandes={commandes}
          summary={summary}
          total={total}
          loading={loading}
          filters={filters}
          updateFilters={updateFilters}
          setPage={setPage}
          recevoir={recevoir}
          annuler={annuler}
          onCreate={() => setShowModal(true)}
        />
      )}

      {/* Modal creation */}
      {showModal && (
        <CommandeModal onSave={handleCreate} onClose={() => setShowModal(false)} saving={saving} />
      )}
    </div>
  );
}
