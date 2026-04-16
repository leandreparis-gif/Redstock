import { useState, useCallback } from 'react';
import apiClient from '../api/client';

export function useArmoires() {
  const [armoires, setArmoires]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/armoires');
      setArmoires(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── ARMOIRES ──────────────────────────────────────────────────────────
  const createArmoire = useCallback(async (payload) => {
    const { data } = await apiClient.post('/armoires', payload);
    setArmoires(prev => [...prev, { ...data, tiroirs: [] }]);
    return data;
  }, []);

  const updateArmoire = useCallback(async (id, payload) => {
    const { data } = await apiClient.put(`/armoires/${id}`, payload);
    setArmoires(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    return data;
  }, []);

  const deleteArmoire = useCallback(async (id) => {
    await apiClient.delete(`/armoires/${id}`);
    setArmoires(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── TIROIRS ───────────────────────────────────────────────────────────
  const createTiroir = useCallback(async (armoireId, payload) => {
    const { data } = await apiClient.post(`/armoires/${armoireId}/tiroirs`, payload);
    setArmoires(prev => prev.map(a =>
      a.id === armoireId
        ? { ...a, tiroirs: [...(a.tiroirs || []), { ...data, stocks: [] }] }
        : a
    ));
    return data;
  }, []);

  const updateTiroir = useCallback(async (armoireId, id, payload) => {
    const { data } = await apiClient.put(`/armoires/${armoireId}/tiroirs/${id}`, payload);
    setArmoires(prev => prev.map(a =>
      a.id === armoireId
        ? { ...a, tiroirs: (a.tiroirs || []).map(t => t.id === id ? { ...t, ...data } : t) }
        : a
    ));
    return data;
  }, []);

  const deleteTiroir = useCallback(async (armoireId, id) => {
    await apiClient.delete(`/armoires/${armoireId}/tiroirs/${id}`);
    setArmoires(prev => prev.map(a =>
      a.id === armoireId
        ? { ...a, tiroirs: (a.tiroirs || []).filter(t => t.id !== id) }
        : a
    ));
  }, []);

  // ── STOCK ─────────────────────────────────────────────────────────────
  const upsertStock = useCallback(async (tiroirId, articleId, payload) => {
    const { data } = await apiClient.put(
      `/armoires/tiroirs/${tiroirId}/stock/${articleId}`,
      payload
    );
    setArmoires(prev => prev.map(a => ({
      ...a,
      tiroirs: (a.tiroirs || []).map(t => {
        if (t.id !== tiroirId) return t;
        const existing = (t.stocks || []).find(s => s.article_id === articleId);
        if (existing) {
          // Mise à jour : conserver l'objet article existant
          return {
            ...t,
            stocks: t.stocks.map(s =>
              s.article_id === articleId
                ? { ...s, ...data, article: s.article }
                : s
            ),
          };
        } else {
          // Nouveau stock — on a besoin de l'article complet.
          // data ne le contient pas, on fait un refetch ciblé.
          fetch();
          return t;
        }
      }),
    })));
    return data;
  }, [fetch]);

  const deleteStock = useCallback(async (tiroirId, articleId) => {
    await apiClient.delete(`/armoires/tiroirs/${tiroirId}/stock/${articleId}`);
    setArmoires(prev => prev.map(a => ({
      ...a,
      tiroirs: (a.tiroirs || []).map(t =>
        t.id === tiroirId
          ? { ...t, stocks: (t.stocks || []).filter(s => s.article_id !== articleId) }
          : t
      ),
    })));
  }, []);

  return {
    armoires, loading, error, fetch,
    createArmoire, updateArmoire, deleteArmoire,
    createTiroir, updateTiroir, deleteTiroir,
    upsertStock, deleteStock,
  };
}
