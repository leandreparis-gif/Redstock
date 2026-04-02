import React from 'react';
// Implémentation complète à l'étape 7
export default function QRCodeViewer({ token, lotNom }) {
  return (
    <div className="card text-center p-6">
      <p className="text-gray-500 text-sm">QR Code — implémentation étape 7</p>
      <p className="text-xs text-gray-400 mt-1">Token: {token}</p>
    </div>
  );
}
