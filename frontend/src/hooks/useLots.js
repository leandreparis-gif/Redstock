import { useState, useCallback, useRef } from 'react';
import apiClient from '../api/client';

export function useLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // C5: compteur de version pour eviter les race conditions
  const versionRef = useRef(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const version = ++versionRef.current;
    try {
      const { data } = await apiClient.get('/lots');
      // Ignore les reponses obsoletes
      if (version === versionRef.current) {
        setLots(data);
      }
    } catch (e) {
      if (version === versionRef.current) {
        setError(e.response?.data?.error || 'Erreur de chargement');
      }
    } finally {
      if (version === versionRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ── LOTS ───────────────────────────────────────────────────────────
  const createLot = useCallback(async (payload) => {
    const { data } = await apiClient.post('/lots', payload);
    setLots(prev => [...prev, { ...data, pochettes: [] }]);
    return data;
  }, []);

  const updateLot = useCallback(async (id, payload) => {
    const { data } = await apiClient.put(`/lots/${id}`, payload);
    setLots(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    return data;
  }, []);

  const deleteLot = useCallback(async (id) => {
    await apiClient.delete(`/lots/${id}`);
    setLots(prev => prev.filter(l => l.id !== id));
  }, []);

  // ── POCHETTES ──────────────────────────────────────────────────────
  const createPochette = useCallback(async (lotId, payload) => {
    const { data } = await apiClient.post(`/lots/${lotId}/pochettes`, payload);
    setLots(prev => prev.map(l =>
      l.id === lotId
        ? { ...l, pochettes: [...(l.pochettes || []), { ...data, stocks: [] }] }
        : l
    ));
    return data;
  }, []);

  const updatePochette = useCallback(async (lotId, id, payload) => {
    const { data } = await apiClient.put(`/lots/${lotId}/pochettes/${id}`, payload);
    setLots(prev => prev.map(l =>
      l.id === lotId
        ? { ...l, pochettes: (l.pochettes || []).map(p => p.id === id ? { ...p, ...data } : p) }
        : l
    ));
    return data;
  }, []);

  const deletePochette = useCallback(async (lotId, id) => {
    await apiClient.delete(`/lots/${lotId}/pochettes/${id}`);
    setLots(prev => prev.map(l =>
      l.id === lotId
        ? { ...l, pochettes: (l.pochettes || []).filter(p => p.id !== id) }
        : l
    ));
  }, []);

  // ── STOCK POCHETTE ────────────────────────────────────────────────
  const upsertStockPochette = useCallback(async (pochetteId, articleId, payload) => {
    const { data } = await apiClient.put(
      `/lots/pochettes/${pochetteId}/stock/${articleId}`,
      payload
    );
    setLots(prev => prev.map(l => ({
      ...l,
      pochettes: (l.pochettes || []).map(p => {
        if (p.id !== pochetteId) return p;
        const existing = (p.stocks || []).find(s => s.article_id === articleId);
        if (existing) {
          return {
            ...p,
            stocks: p.stocks.map(s =>
              s.article_id === articleId
                ? { ...s, ...data, article: s.article }
                : s
            ),
          };
        } else {
          // Nouveau stock — l'article complet n'est pas dans la réponse, refetch
          fetch();
          return p;
        }
      }),
    })));
    return data;
  }, [fetch]);

  const deleteStockPochette = useCallback(async (pochetteId, articleId) => {
    await apiClient.delete(`/lots/pochettes/${pochetteId}/stock/${articleId}`);
    setLots(prev => prev.map(l => ({
      ...l,
      pochettes: (l.pochettes || []).map(p =>
        p.id === pochetteId
          ? { ...p, stocks: (p.stocks || []).filter(s => s.article_id !== articleId) }
          : p
      ),
    })));
  }, []);

  // BE2: PATCH minimum requis — centralise dans le hook
  const updateStockMinimum = useCallback(async (pochetteId, articleId, quantiteMinimum) => {
    const { data } = await apiClient.patch(
      `/lots/pochettes/${pochetteId}/stock/${articleId}/minimum`,
      { quantite_minimum: quantiteMinimum }
    );
    // Mise à jour locale du minimum
    setLots(prev => prev.map(l => ({
      ...l,
      pochettes: (l.pochettes || []).map(p =>
        p.id === pochetteId
          ? {
              ...p,
              stocks: (p.stocks || []).map(s =>
                s.article_id === articleId
                  ? { ...s, quantite_minimum: quantiteMinimum }
                  : s
              ),
            }
          : p
      ),
    })));
    return data;
  }, []);

  return {
    lots, loading, error, fetch,
    createLot, updateLot, deleteLot,
    createPochette, updatePochette, deletePochette,
    upsertStockPochette, deleteStockPochette, updateStockMinimum,
  };
}
