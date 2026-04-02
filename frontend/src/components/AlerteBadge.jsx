import React from 'react';
// Implémentation complète à l'étape 11
export default function AlerteBadge({ count }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-crf-rouge rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
}
