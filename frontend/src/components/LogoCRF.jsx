import React from 'react';

/**
 * Logo officiel Croix-Rouge française (version 2 lignes, RVB).
 * Toujours affiché sur fond blanc — règle charte CRF 2023.
 * @param {string} className - classes Tailwind supplémentaires
 * @param {number} height    - hauteur en px (respect taille minimale : 41px digital)
 */
export default function LogoCRF({ className = '', height = 48 }) {
  return (
    <img
      src="/logo-crf.svg"
      alt="Croix-Rouge française"
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={className}
      draggable={false}
    />
  );
}

/**
 * Croix seule (macaron) — usage : profil, badge, icône.
 * Taille minimale : 140 px (charte CRF 2023).
 */
export function CroixCRF({ size = 40, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      aria-label="Croix-Rouge française"
    >
      <rect width="96" height="96" fill="#FFFFFF" rx="8" />
      <rect x="37" y="15" width="22" height="66" fill="#E30613" rx="3" />
      <rect x="15" y="37" width="66" height="22" fill="#E30613" rx="3" />
    </svg>
  );
}
