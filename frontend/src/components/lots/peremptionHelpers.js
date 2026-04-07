/**
 * Helpers de péremption spécifiques aux lots de pochettes.
 * Réutilise la logique centralisée de PeremptionBadge.
 */

/**
 * Statut péremption d'une seule date.
 * @returns {'perime'|'j7'|'j30'|null}
 */
export function getLotPeremptionStatut(date_peremption) {
  if (!date_peremption) return null;
  const diff = (new Date(date_peremption) - new Date()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'perime';
  if (diff <= 7) return 'j7';
  if (diff <= 30) return 'j30';
  return null;
}

/**
 * Pire statut péremption parmi un tableau de lots { date_peremption }.
 * @returns {'perime'|'j7'|'j30'|null}
 */
export function getWorstPeremptionStatut(lots) {
  if (!lots || lots.length === 0) return null;
  const now = new Date();
  let worst = null;
  for (const lot of lots) {
    if (!lot.date_peremption) continue;
    const diff = (new Date(lot.date_peremption) - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'perime';
    if (diff <= 7 && worst !== 'perime') worst = 'j7';
    else if (diff <= 30 && !worst) worst = 'j30';
  }
  return worst;
}

/** Styles et labels associés aux statuts. */
export const PEREMPTION_STYLES = {
  perime: { bg: 'bg-red-100 text-red-700', row: 'bg-red-50', date: 'text-red-600 font-semibold', dot: 'bg-red-500', label: 'Perime' },
  j7:     { bg: 'bg-orange-100 text-orange-700', row: 'bg-orange-50', date: 'text-orange-600 font-semibold', dot: 'bg-orange-400', label: '< 7j' },
  j30:    { bg: 'bg-yellow-100 text-yellow-700', row: 'bg-yellow-50', date: 'text-yellow-700 font-medium', dot: 'bg-yellow-400', label: '< 30j' },
};
