import React from 'react';

const STATUT_CONFIG = {
  DISPONIBLE: { label: 'Disponible', className: 'badge-ok' },
  PRETE: { label: 'Prêté', className: 'badge-proche' },
  ATTRIBUE: { label: 'Attribué', className: 'badge-perime' },
};

// Implémentation complète à l'étape 10
export default function UniformeStatut({ statut }) {
  const config = STATUT_CONFIG[statut] || { label: statut, className: 'badge-alerte' };
  return <span className={config.className}>{config.label}</span>;
}
