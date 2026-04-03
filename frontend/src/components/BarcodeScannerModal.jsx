import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useArticles } from '../hooks/useArticles';

// ─── Modal wrapper ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-crf-texte">{title}</h2>
          <button onClick={onClose} className="btn-icon text-lg leading-none">x</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Camera Scanner (html5-qrcode) ──────────────────────────────────────────

function CameraScanner({ onDetected }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted || !containerRef.current) return;

      const scanner = new Html5Qrcode('barcode-camera-reader');
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        },
        (decodedText) => {
          onDetected(decodedText);
        },
        () => {}
      ).catch((err) => {
        console.warn('Camera scanner error:', err);
      });
    });

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div>
      <div id="barcode-camera-reader" ref={containerRef} className="rounded-lg overflow-hidden" />
      <p className="text-xs text-gray-400 text-center mt-2">
        Pointez la camera vers le code-barres de l'article
      </p>
    </div>
  );
}

// ─── Douchette / Saisie manuelle ────────────────────────────────────────────

function ManualInput({ onDetected }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const lastKeyTime = useRef(0);
  const bufferRef = useRef('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Douchette: les caracteres arrivent tres vite (<50ms entre chaque)
  // On detecte un scan quand Enter arrive apres une saisie rapide
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only listen when input is focused
      if (document.activeElement !== inputRef.current) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;

      if (e.key === 'Enter') {
        e.preventDefault();
        const code = bufferRef.current || value;
        if (code.trim()) {
          onDetected(code.trim());
          setValue('');
          bufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff < 80) {
          // Douchette : accumule dans le buffer
          bufferRef.current += e.key;
        } else {
          // Saisie manuelle : reset du buffer
          bufferRef.current = e.key;
        }
        lastKeyTime.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDetected, value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onDetected(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Code-barres</label>
        <input
          ref={inputRef}
          type="text"
          className="input text-center text-lg font-mono tracking-wider"
          placeholder="Scannez ou tapez le code..."
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Utilisez votre douchette USB ou tapez le code manuellement puis appuyez sur Entree
      </p>
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={!value.trim()}
      >
        Rechercher
      </button>
    </form>
  );
}

// ─── Modal principal ────────────────────────────────────────────────────────

export default function BarcodeScannerModal({ onClose, onArticleFound }) {
  const [tab, setTab] = useState('manual'); // 'manual' | 'camera'
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [lastCode, setLastCode] = useState(null);
  const { lookupBarcode } = useArticles();

  const handleDetected = useCallback(async (code) => {
    if (searching || code === lastCode) return;
    setLastCode(code);
    setSearching(true);
    setError(null);

    try {
      const result = await lookupBarcode(code);
      onArticleFound(result);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`Aucun article trouve pour le code "${code}"`);
      } else {
        setError('Erreur de recherche');
      }
      // Reset lastCode pour permettre un nouveau scan du meme code
      setTimeout(() => setLastCode(null), 2000);
    } finally {
      setSearching(false);
    }
  }, [searching, lastCode, lookupBarcode, onArticleFound]);

  return (
    <Modal title="Scanner un code-barres" onClose={onClose}>
      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            tab === 'manual'
              ? 'bg-white text-crf-texte shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('manual')}
        >
          Douchette / Clavier
        </button>
        <button
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            tab === 'camera'
              ? 'bg-white text-crf-texte shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('camera')}
        >
          Camera
        </button>
      </div>

      {/* Contenu */}
      {tab === 'manual' && <ManualInput onDetected={handleDetected} />}
      {tab === 'camera' && <CameraScanner onDetected={handleDetected} />}

      {/* Etat */}
      {searching && (
        <div className="text-center py-3">
          <div className="inline-block w-5 h-5 border-2 border-crf-rouge border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-1">Recherche en cours...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </Modal>
  );
}
