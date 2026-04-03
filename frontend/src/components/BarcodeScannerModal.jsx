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

// ─── Camera Scanner ─────────────────────────────────────────────────────────
// Utilise BarcodeDetector natif (rapide, hardware) si disponible,
// sinon fallback sur html5-qrcode.

function NativeCameraScanner({ onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    let mounted = true;
    let animId = null;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });

        const scan = async () => {
          if (!mounted) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0 && onDetectedRef.current) {
              onDetectedRef.current(barcodes[0].rawValue);
              return; // Stop apres detection
            }
          } catch {}
          animId = requestAnimationFrame(scan);
        };
        animId = requestAnimationFrame(scan);
      } catch (err) {
        if (mounted) setCameraError('Impossible d\'acceder a la camera');
      }
    }

    start();

    return () => {
      mounted = false;
      if (animId) cancelAnimationFrame(animId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  if (cameraError) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">{cameraError}</p>
        <p className="text-xs text-gray-400 mt-1">Verifiez les permissions camera du navigateur</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full rounded-lg bg-black"
        playsInline
        muted
        style={{ maxHeight: 300 }}
      />
      {/* Guide visuel */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-20 border-2 border-crf-rouge/60 rounded-lg" />
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">
        Pointez la camera vers le code-barres
      </p>
    </div>
  );
}

function FallbackCameraScanner({ onDetected }) {
  const onDetectedRef = useRef(onDetected);
  const scannerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    let mounted = true;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return;

      const scanner = new Html5Qrcode('barcode-camera-reader');
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 280, height: 120 } },
        (decodedText) => {
          if (onDetectedRef.current) onDetectedRef.current(decodedText);
        },
        () => {}
      ).catch(() => {
        if (mounted) setCameraError('Impossible d\'acceder a la camera');
      });
    });

    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => { try { s.clear(); } catch {} })
          .catch(() => { try { s.clear(); } catch {} });
        scannerRef.current = null;
      }
    };
  }, []);

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
        Pointez la camera vers le code-barres
      </p>
    </div>
  );
}

function CameraScanner({ onDetected }) {
  const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  return hasNative
    ? <NativeCameraScanner onDetected={onDetected} />
    : <FallbackCameraScanner onDetected={onDetected} />;
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
