import React, { useState } from 'react';
import Modal from '../Modal';
import ColorPicker from './ColorPicker';

export default function PochetteModal({ initial, lotNom, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '', couleur: initial?.couleur || null });

  return (
    <Modal title={initial ? 'Modifier la pochette' : `Nouvelle pochette — ${lotNom}`} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <ColorPicker value={form.couleur} onChange={c => setForm(f => ({ ...f, couleur: c }))} />
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.nom || loading}
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}
