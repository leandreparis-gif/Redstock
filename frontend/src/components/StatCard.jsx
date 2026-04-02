import React from 'react';

/**
 * Carte de statistique pour le dashboard.
 *
 * @param {string}    label    - Libellé
 * @param {string|number} value - Valeur principale
 * @param {ReactNode} icon     - Icône SVG
 * @param {string}    color    - 'red' | 'orange' | 'green' | 'blue' | 'gray'
 * @param {string}    sub      - Texte secondaire optionnel
 */
export default function StatCard({ label, value, icon, color = 'gray', sub }) {
  const colors = {
    red:    'bg-red-50 text-crf-rouge border-red-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    gray:   'bg-gray-50 text-gray-500 border-gray-100',
  };

  const iconBg = {
    red:    'bg-red-100 text-crf-rouge',
    orange: 'bg-orange-100 text-orange-600',
    green:  'bg-green-100 text-green-600',
    blue:   'bg-blue-100 text-blue-600',
    gray:   'bg-gray-100 text-gray-500',
  };

  return (
    <div className={`card border ${colors[color]} flex items-center gap-4`}>
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg[color]}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-crf-texte leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}
