import React from 'react';

/**
 * Calcule le statut d'une date de péremption et retourne le badge coloré.
 * Règles :
 *   - date passée          → rouge  "Périmé"
 *   - dans les 7 prochains jours → rouge "< 7 jours"
 *   - dans les 30 prochains jours → orange "< 30 jours"
 *   - au-delà              → vert   "OK"
 *   - null / non périmable → gris   "—"
 */
export function getPeremptionStatut(dateStr) {
  if (!dateStr) return 'non_perimable';

  const date = new Date(dateStr);
  const now  = new Date();
  const diffMs = date - now;
  const diffJ  = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffJ < 0)  return 'perime';
  if (diffJ <= 7) return 'critique';
  if (diffJ <= 30) return 'proche';
  return 'ok';
}

const CONFIG = {
  perime:        { label: 'Périmé',     className: 'badge-perime' },
  critique:      { label: '< 7 jours',  className: 'badge-perime' },
  proche:        { label: '< 30 jours', className: 'badge-proche' },
  ok:            { label: 'OK',         className: 'badge-ok' },
  non_perimable: { label: '—',          className: 'badge-alerte' },
};

export default function PeremptionBadge({ date }) {
  const statut = getPeremptionStatut(date);
  const { label, className } = CONFIG[statut];
  return <span className={className}>{label}</span>;
}

/** Retourne la couleur Tailwind de bordure selon le statut */
export function peremptionBorderColor(dateStr) {
  const s = getPeremptionStatut(dateStr);
  if (s === 'perime' || s === 'critique') return 'border-red-300 bg-red-50';
  if (s === 'proche') return 'border-orange-300 bg-orange-50';
  return '';
}
