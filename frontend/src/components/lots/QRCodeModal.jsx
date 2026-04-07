import React, { useRef, useEffect, useState, useCallback } from 'react';
import Modal from '../Modal';
import { IconCopy } from '../Icons';

export default function QRCodeModal({ lot, onClose }) {
  const qrUrl = `${window.location.origin}/controle/lot/${lot.qr_code_token}`;
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    import('qrcode').then(QRCode => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, qrUrl, { width: 220, margin: 2 });
      }
    });
  }, [qrUrl]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [qrUrl]);

  // B6 fix + S1 fix: construction DOM safe au lieu de document.write
  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    const win = window.open('', '_blank');
    if (!win) return;

    const doc = win.document;
    doc.title = `QR — ${lot.nom}`;

    // Style
    const style = doc.createElement('style');
    style.textContent = `
      body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
      img { display: block; margin: 0 auto 16px; }
      h2 { font-size: 20px; margin-bottom: 4px; }
      p { font-size: 13px; color: #666; }
      @media print { button { display: none; } }
    `;
    doc.head.appendChild(style);

    // Image
    const img = doc.createElement('img');
    img.src = dataUrl;
    img.width = 220;
    img.alt = 'QR Code';
    doc.body.appendChild(img);

    // Titre
    const h2 = doc.createElement('h2');
    h2.textContent = lot.nom;
    doc.body.appendChild(h2);

    // Description
    const p1 = doc.createElement('p');
    p1.textContent = 'Scannez pour controler le materiel';
    doc.body.appendChild(p1);

    // URL
    const p2 = doc.createElement('p');
    p2.style.cssText = 'font-size:10px;color:#aaa;margin-top:8px';
    p2.textContent = qrUrl;
    doc.body.appendChild(p2);

    // Bouton imprimer
    const btn = doc.createElement('button');
    btn.textContent = 'Imprimer';
    btn.addEventListener('click', () => win.print());
    doc.body.appendChild(doc.createElement('br'));
    doc.body.appendChild(btn);

    win.onload = () => win.print();
  };

  return (
    <Modal title={`QR Code — ${lot.nom}`} onClose={onClose}>
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">Scannez ce code pour acceder a la page de controle sans connexion.</p>
        <canvas ref={canvasRef} className="mx-auto rounded-lg" />
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded text-xs mt-4">
          <input type="text" readOnly value={qrUrl} className="input text-xs py-1 flex-1 bg-white" />
          <button
            onClick={copyToClipboard}
            className="btn-icon p-1"
            aria-label="Copier le lien"
          >
            {copied ? (
              <span className="text-green-600 text-xs font-medium">Copie !</span>
            ) : (
              <IconCopy size={13} />
            )}
          </button>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Fermer</button>
        <button className="btn-primary" onClick={handlePrint}>Imprimer</button>
      </div>
    </Modal>
  );
}
