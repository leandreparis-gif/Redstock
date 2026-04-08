import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { usePeremptions } from '../hooks/usePeremptions';

const STATUT_STYLES = {
  expired: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Expire' },
  j7:      { bg: 'bg-orange-100', text: 'text-orange-700', label: '< 7j' },
  j30:     { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '< 30j' },
  j60:     { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '< 60j' },
  j90:     { bg: 'bg-gray-100',   text: 'text-gray-600',   label: '< 90j' },
  ok:      { bg: 'bg-green-100',  text: 'text-green-700',  label: 'OK' },
};

const RANGE_OPTIONS = [
  { value: 'all',     label: 'Toutes' },
  { value: 'expired', label: 'Expires' },
  { value: 'j7',      label: '< 7 jours' },
  { value: 'j30',     label: '< 30 jours' },
  { value: 'j60',     label: '< 60 jours' },
  { value: 'j90',     label: '< 90 jours' },
];

const LOCATION_OPTIONS = [
  { value: 'all',     label: 'Tous' },
  { value: 'armoire', label: 'Armoires' },
  { value: 'lot',     label: 'Lots' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Peremptions() {
  const { items, summary, total, loading, error, filters, updateFilters, setPage } = usePeremptions();
  const navigate = useNavigate();

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const summaryCards = [
    { label: 'Total',   count: summary.total,   border: 'border-gray-400',  text: 'text-gray-700' },
    { label: 'Expires', count: summary.expired,  border: 'border-red-500',   text: 'text-red-600' },
    { label: '< 7j',    count: summary.j7,       border: 'border-orange-400', text: 'text-orange-600' },
    { label: '< 30j',   count: summary.j30,      border: 'border-yellow-400', text: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Peremptions" subtitle="Vue consolidee de toutes les dates de peremption" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(card => (
          <div key={card.label} className={`card border-l-4 ${card.border}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label text-xs mb-1 block">Plage</label>
          <select className="select text-sm py-1.5" value={filters.range}
            onChange={e => updateFilters({ range: e.target.value })}>
            {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs mb-1 block">Emplacement</label>
          <select className="select text-sm py-1.5" value={filters.location}
            onChange={e => updateFilters({ location: e.target.value })}>
            {LOCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label text-xs mb-1 block">Recherche article</label>
          <input type="text" className="input text-sm py-1.5 w-full" placeholder="Nom de l'article..."
            value={filters.search}
            onChange={e => updateFilters({ search: e.target.value })} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card border border-red-200 bg-red-50 text-red-700 text-sm p-3">
          Erreur : {error}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement...</p></div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">Aucune peremption correspondante.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {items.map(item => {
              const style = STATUT_STYLES[item.statut] || STATUT_STYLES.ok;
              return (
                <div key={item.id} className="p-3 space-y-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`${item.location_link}?article=${item.article_id}`)}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-crf-texte">{item.article_nom}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.location_name}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Lot: {item.lot_label} | Qte: {item.quantite}</span>
                    <span>{formatDate(item.date_peremption)} ({item.days_remaining}j)</span>
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
                  <th>Emplacement</th>
                  <th>Lot</th>
                  <th>Peremption</th>
                  <th>Jours</th>
                  <th>Qte</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const style = STATUT_STYLES[item.statut] || STATUT_STYLES.ok;
                  const rowBg = item.statut === 'expired' ? 'bg-red-50' :
                    item.statut === 'j7' ? 'bg-orange-50' :
                    item.statut === 'j30' ? 'bg-yellow-50' : '';
                  return (
                    <tr key={item.id} className={`${rowBg} cursor-pointer hover:bg-gray-100 transition-colors`}
                      onClick={() => navigate(`${item.location_link}?article=${item.article_id}`)}>
                      <td className="text-sm font-medium text-crf-texte">{item.article_nom}</td>
                      <td className="text-sm text-gray-600">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${item.location_type === 'armoire' ? 'bg-blue-400' : 'bg-green-400'}`} />
                        {item.location_name}
                      </td>
                      <td className="text-sm text-gray-500">{item.lot_label}</td>
                      <td className="text-sm text-gray-600 whitespace-nowrap">{formatDate(item.date_peremption)}</td>
                      <td className={`text-sm font-semibold ${item.days_remaining < 0 ? 'text-red-600' : item.days_remaining <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {item.days_remaining}j
                      </td>
                      <td className="text-sm text-gray-600">{item.quantite}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
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
