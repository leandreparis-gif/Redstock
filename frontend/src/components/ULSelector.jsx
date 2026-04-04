import React from 'react';
import { useUL } from '../context/ULContext';
import { useAuth } from '../context/AuthContext';

export default function ULSelector() {
  const { isSuperAdmin } = useAuth();
  const { unites, selectedUL, selectUL, loading } = useUL();

  if (!isSuperAdmin) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 hidden sm:inline">UL :</span>
      <select
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-crf-texte font-medium focus:ring-1 focus:ring-crf-rouge focus:border-crf-rouge"
        value={selectedUL || ''}
        onChange={e => selectUL(e.target.value)}
        disabled={loading}
      >
        {unites.map(ul => (
          <option key={ul.id} value={ul.id}>{ul.nom}</option>
        ))}
      </select>
    </div>
  );
}
