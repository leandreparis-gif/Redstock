import React from 'react';
import Modal from '../Modal';

export default function ConfirmModal({ title, message, confirmLabel = 'Supprimer', danger = true, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button
          className={danger ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
