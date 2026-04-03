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
  const onDetectedRef = useRef(onDetected);
  const scannerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);

  // Garder la ref a jour sans relancer le useEffect
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let mounted = true;
    let scanner = null;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return;

      scanner = new Html5Qrcode('barcode-camera-reader');
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' },
        {
          fps: 5,
          qrbox: { width: 280, height: 150 },
        },
        (decodedText) => {
          if (onDetectedRef.current) {
            onDetectedRef.current(decodedText);
          }
        },
        () => {}
      ).catch((err) => {
        console.warn('Camera scanner error:', err);
        if (mounted) setCameraError('Impossible d\'acceder a la camera');
      });
    });

    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => {
          try { s.clear(); } catch {}
        }).catch(() => {
          try { s.clear(); } catch {}
        });
        scannerRef.current = null;
      }
    };
  }, []); // Pas de deps → ne se relance jamais

  if (cameraError) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">{cameraError}</p>
        <p className="text-xs text-gray-400 mt-1">Verifiez les permissions camera du navigateur</p>
      </div>
    );
  }

  return (
    <div>
      <div id="barcode-camera-reader" className="rounded-lg overflow-hidden" />
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = inputRef.current?.value || '';
    if (code.trim()) {
      onDetected(code.trim());
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
  const { lookupBarcode } = useArticles();

  // Refs pour eviter les appels multiples du scanner camera
  const searchingRef = useRef(false);
  const lastCodeRef = useRef(null);

  const handleDetected = useCallback(async (code) => {
    // Protection contre les appels multiples rapides (camera)
    if (searchingRef.current) return;
    if (code === lastCodeRef.current) return;

    lastCodeRef.current = code;
    searchingRef.current = true;
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
      // Reset pour permettre un nouveau scan du meme code
      setTimeout(() => { lastCodeRef.current = null; }, 2000);
    } finally {
      searchingRef.current = false;
      setSearching(false);
    }
  }, [lookupBarcode, onArticleFound]);

  // Sur mobile, ouvrir la camera par defaut
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) setTab('camera');
    }
  }, [initialized]);

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
