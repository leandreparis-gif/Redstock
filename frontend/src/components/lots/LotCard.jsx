import React, { useState } from 'react';
import { IconPlus, IconEdit, IconTrash, IconChevronDown, IconChevronRight } from '../Icons';
import PochetteCard from './PochetteCard';

export default function LotCard({ lot, isAdmin, defaultOpen = false, highlightArticleId, onEditLot, onDeleteLot, onAddPochette, onEditPochette, onDeletePochette, onShowQR, onAddStock, onEditStock, onDeleteStock, onUpdateMinimum }) {
  const [open, setOpen] = useState(defaultOpen);
  const pochetteCount = lot.pochettes?.length || 0;

  return (
    <div className="card p-0 overflow-hidden" style={lot.couleur ? { backgroundColor: lot.couleur } : {}}>
      <button
        type="button"
        aria-expanded={open}
        className={`w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-5 py-4
                    border-b border-gray-100/60 cursor-pointer transition-colors text-left
                    ${lot.couleur ? 'hover:brightness-95' : 'hover:bg-gray-50/60'}`}
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

        {/* Actions */}
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
              aria-label={`QR Code du lot ${lot.nom}`}
            >
              <span className="hidden sm:inline">QR Code</span>
              <span className="sm:hidden">QR</span>
            </button>
            {isAdmin && (
              <>
                <button
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded
                             bg-crf-rouge/10 text-crf-rouge hover:bg-crf-rouge/20 transition-colors"
                  onClick={() => onAddPochette(lot)}
                  aria-label={`Ajouter une pochette au lot ${lot.nom}`}
                >
                  <IconPlus size={13} />
                  <span className="hidden sm:inline">Pochette</span>
                </button>
                <button className="btn-icon" onClick={() => onEditLot(lot)} aria-label={`Modifier le lot ${lot.nom}`}>
                  <IconEdit size={15} />
                </button>
                <button className="btn-icon hover:text-red-500" onClick={() => onDeleteLot(lot)} aria-label={`Supprimer le lot ${lot.nom}`}>
                  <IconTrash size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </button>

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
                isAdmin={isAdmin}
                highlightArticleId={highlightArticleId}
                onEdit={() => onEditPochette(pochette, lot)}
                onDelete={() => onDeletePochette(pochette, lot)}
                onAddStock={onAddStock}
                onEditStock={onEditStock}
                onDeleteStock={onDeleteStock}
                onUpdateMinimum={onUpdateMinimum}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
