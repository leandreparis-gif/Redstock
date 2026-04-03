import React from 'react';

/**
 * En-tête de page standard PharmaSecours.
 *
 * @param {string}      title     - Titre principal
 * @param {string}      subtitle  - Sous-titre optionnel
 * @param {ReactNode}   actions   - Boutons ou actions à droite
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-crf-texte leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
