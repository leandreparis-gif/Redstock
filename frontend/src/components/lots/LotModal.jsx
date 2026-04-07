import React, { useState } from 'react';
import Modal from '../Modal';
import ColorPicker from './ColorPicker';
import { uploadLotPhoto } from '../../lib/supabase';

export default function LotModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ nom: initial?.nom || '', couleur: initial?.couleur || null });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setUploadError(null);
  };

  const handleSave = async () => {
    let photo_url = initial?.photo_url || null;

    // Upload photo si on edite un lot existant
    if (photoFile && initial?.id) {
      setUploading(true);
      setUploadError(null);
      try {
        photo_url = await uploadLotPhoto(photoFile, initial.id);
      } catch (err) {
        setUploadError('Erreur lors de l\'upload de la photo');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // Pour une creation, on passe le fichier en attente
    onSave({
      ...form,
      photo_url,
      ...(photoFile && !initial?.id ? { _pendingPhoto: photoFile } : {}),
    });
  };

  // Si l'utilisateur a supprime la photo
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadError(null);
  };

  const isBusy = loading || uploading;

  return (
    <Modal title={initial ? 'Modifier le lot' : 'Nouveau lot'} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>

      <div>
        <label className="label">Photo du lot</label>
        <div className="flex items-center gap-3">
          {photoPreview && (
            <img src={photoPreview} alt="apercu" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
          )}
          <label className="btn-secondary cursor-pointer text-sm">
            {photoPreview ? 'Changer' : 'Ajouter une photo'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
          {photoPreview && (
            <button className="text-xs text-red-500 hover:underline" onClick={handleRemovePhoto}>
              Supprimer
            </button>
          )}
        </div>
        {!initial && photoFile && (
          <p className="text-xs text-gray-400 mt-1">La photo sera uploadee apres la creation du lot.</p>
        )}
        {uploadError && (
          <p className="text-xs text-red-500 mt-1">{uploadError}</p>
        )}
      </div>

      <ColorPicker value={form.couleur} onChange={c => setForm(f => ({ ...f, couleur: c }))} />

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.nom || isBusy} onClick={handleSave}>
          {isBusy ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}
