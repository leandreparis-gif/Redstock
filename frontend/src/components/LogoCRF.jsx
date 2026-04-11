import React from 'react';

/**
 * Logo RedStock horizontal (icône + texte) — Variante A.
 * @param {string} className - classes Tailwind supplémentaires
 * @param {number} height    - hauteur en px
 */
export default function LogoCRF({ className = '', height = 48 }) {
  return (
    <img
      src="/logo-redstock.svg"
      alt="RedStock"
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={className}
      draggable={false}
    />
  );
}

/**
 * Logo RedStock empilé (icône au-dessus du texte) — Variante C.
 */
export function LogoStacked({ className = '', height = 120 }) {
  return (
    <img
      src="/logo-redstock-stacked.svg"
      alt="RedStock"
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={className}
      draggable={false}
    />
  );
}

/**
 * Icône RedStock seule (croix stylisée) — usage : favicon, badge, profil.
 */
export function CroixCRF({ size = 40, className = '' }) {
  return (
    <img
      src="/favicon.svg"
      alt="RedStock"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
