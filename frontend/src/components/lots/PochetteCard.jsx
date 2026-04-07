import React, { useState } from 'react';
import { IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight } from '../Icons';
import StockRow from './StockRow';

export default function PochetteCard({ pochette, isAdmin, onEdit, onDelete, onAddStock, onEditStock, onDeleteStock, onUpdateMinimum }) {
  const [open, setOpen] = useState(true);
  const stockCount = pochette.stocks?.length || 0;

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden"
      style={pochette.couleur ? { backgroundColor: pochette.couleur } : {}}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3 py-2.5
                   transition-colors text-left cursor-pointer ${pochette.couleur ? 'hover:brightness-95' : 'bg-white hover:bg-gray-50'}`}
      >
        {/* Ligne nom */}
        <div className="flex items-center gap-2 w-full min-w-0">
          {open
            ? <IconChevronDown size={14} className="text-gray-400 flex-shrink-0" />
            : <IconChevronRight size={14} className="text-gray-400 flex-shrink-0" />
          }
          <span className="flex-1 text-sm font-medium text-crf-texte">{pochette.nom}</span>
          {/* Boutons admin desktop */}
          {isAdmin && (
            <span className="hidden sm:flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <span role="button" tabIndex={0} className="btn-icon p-1"
                onClick={() => onEdit(pochette)} onKeyDown={e => e.key === 'Enter' && onEdit(pochette)}
                aria-label={`Modifier ${pochette.nom}`}>
                <IconEdit size={13} />
              </span>
              <span role="button" tabIndex={0} className="btn-icon p-1 hover:text-red-500"
                onClick={() => onDelete(pochette)} onKeyDown={e => e.key === 'Enter' && onDelete(pochette)}
                aria-label={`Supprimer ${pochette.nom}`}>
                <IconTrash size={13} />
              </span>
            </span>
          )}
        </div>

        {/* Ligne count + boutons mobile */}
        <div className="flex items-center gap-2 pl-6 sm:hidden" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-500 flex-1">{stockCount} article{stockCount !== 1 ? 's' : ''}</span>
          {isAdmin && (
            <div className="flex gap-1">
              <span role="button" tabIndex={0} className="btn-icon p-1"
                onClick={() => onEdit(pochette)} aria-label={`Modifier ${pochette.nom}`}>
                <IconEdit size={13} />
              </span>
              <span role="button" tabIndex={0} className="btn-icon p-1 hover:text-red-500"
                onClick={() => onDelete(pochette)} aria-label={`Supprimer ${pochette.nom}`}>
                <IconTrash size={13} />
              </span>
            </div>
          )}
        </div>

        {/* Count desktop */}
        <span className="hidden sm:block text-xs text-gray-500 flex-shrink-0">{stockCount} article{stockCount !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3 space-y-2.5">
          {pochette.stocks?.length === 0 && !isAdmin && (
            <p className="text-xs text-gray-400 py-2 text-center">Aucun article.</p>
          )}
          {pochette.stocks?.map(stock => (
            <StockRow key={stock.id} stock={stock} pochetteId={pochette.id} isAdmin={isAdmin}
              onEdit={onEditStock} onDelete={onDeleteStock} onUpdateMinimum={onUpdateMinimum} />
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
