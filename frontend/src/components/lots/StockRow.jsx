import React, { useState } from 'react';
import { IconEdit, IconTrash } from '../Icons';
import { getLotPeremptionStatut, getWorstPeremptionStatut, PEREMPTION_STYLES } from './peremptionHelpers';

function PeremptionBadge({ lots }) {
  const statut = getWorstPeremptionStatut(lots);
  if (!statut) return null;
  const style = PEREMPTION_STYLES[statut];
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.bg}`}>
      {style.label}
    </span>
  );
}

export default function StockRow({ stock, pochetteId, isAdmin, highlighted, onEdit, onDelete, onUpdateMinimum }) {
  const [min, setMin] = useState(stock.quantite_minimum ?? 0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveMin = async (val) => {
    const newVal = Math.max(0, parseInt(val) || 0);
    setMin(newVal);
    setEditing(false);
    setSaving(true);
    try {
      await onUpdateMinimum(pochetteId, stock.article_id, newVal);
    } catch {
      setMin(stock.quantite_minimum ?? 0);
    } finally {
      setSaving(false);
    }
  };

  const isBelowMin = stock.quantite_actuelle < min && min > 0;
  const isNearMin = !isBelowMin && min > 0 && stock.quantite_actuelle <= Math.max(min + 2, Math.ceil(min * 1.2));
  const lots = stock.lots || [];

  const hasUsefulLots = lots.length > 1 || (lots.length === 1 && (lots[0].date_peremption || lots[0].label));

  return (
    <div className={`bg-white rounded-lg border ${highlighted ? 'border-crf-rouge ring-2 ring-crf-rouge/20' : 'border-gray-200'} ${hasUsefulLots ? 'p-3 space-y-2.5' : 'px-3 py-2'}`}>
      {/* En-tete article */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{stock.article.nom}</span>
          <PeremptionBadge lots={stock.lots} />
          {isBelowMin && <span className="text-xs text-red-500 font-medium">Sous le min.</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2 py-1">
            <span className="text-xs text-gray-500">Qte</span>
            <span className={`text-sm font-bold ${
              isBelowMin ? 'text-red-600' : isNearMin ? 'text-yellow-600' : 'text-gray-800'
            }`}>{stock.quantite_actuelle}</span>
            {min > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-400">min.</span>
                {isAdmin && !editing ? (
                  <button onClick={() => setEditing(true)}
                    aria-label={`Modifier le minimum (actuellement ${min})`}
                    className={`text-xs font-semibold text-gray-600 hover:text-crf-rouge ${saving ? 'opacity-50' : ''}`}>
                    {min}
                  </button>
                ) : isAdmin && editing ? (
                  <input type="number" min="0" autoFocus
                    aria-label="Nouveau minimum"
                    className="w-10 text-xs border border-crf-rouge rounded px-1 py-0.5 text-center"
                    defaultValue={min}
                    onBlur={e => saveMin(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveMin(e.target.value)}
                  />
                ) : (
                  <span className="text-xs text-gray-500">{min}</span>
                )}
              </>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-0.5">
              <button onClick={() => onEdit(stock)} className="btn-icon p-1" aria-label={`Modifier ${stock.article.nom}`}>
                <IconEdit size={13} />
              </button>
              <button onClick={() => onDelete(stock)} className="btn-icon p-1 hover:text-red-500" aria-label={`Supprimer ${stock.article.nom}`}>
                <IconTrash size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail des lots */}
      {hasUsefulLots && (
        <div className="rounded-md overflow-hidden border border-gray-100">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            <span>Reference</span>
            <span className="text-right w-10">Qte</span>
            <span className="text-right w-24">Peremption</span>
          </div>
          {lots.map((lot, i) => {
            const statut = getLotPeremptionStatut(lot.date_peremption);
            const s = statut ? PEREMPTION_STYLES[statut] : null;
            const rowBg = s ? s.row : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50');
            const dateColor = s ? s.date : 'text-gray-500';
            return (
              <div key={i} className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 ${rowBg} border-t border-gray-100`}>
                <span className="text-xs text-gray-700 font-mono truncate">
                  {lot.label || <span className="italic text-gray-400">Lot {i + 1}</span>}
                </span>
                <span className="text-xs text-gray-600 font-medium text-right w-10">{lot.quantite}</span>
                <span className={`text-xs text-right w-24 flex items-center justify-end gap-1.5 ${dateColor}`}>
                  {lot.date_peremption ? (
                    <>
                      {s?.dot && <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                      {new Date(lot.date_peremption).toLocaleDateString('fr-FR')}
                    </>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
