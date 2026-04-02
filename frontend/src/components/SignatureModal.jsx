import React from 'react';
// Implémentation complète à l'étape 9
export default function SignatureModal({ onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4">Signature du contrôle</h2>
        <p className="text-gray-500 text-sm">Implémentation à l'étape 9.</p>
        <div className="mt-4 flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={onConfirm} disabled={loading}>Valider</button>
        </div>
      </div>
    </div>
  );
}
