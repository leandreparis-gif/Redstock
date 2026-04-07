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
    await fetch();
    return data;
  }, [fetch]);

  const updateLot = useCallback(async (id, payload) => {
    const { data } = await apiClient.put(`/lots/${id}`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const deleteLot = useCallback(async (id) => {
    await apiClient.delete(`/lots/${id}`);
    await fetch();
  }, [fetch]);

  // ── POCHETTES ──────────────────────────────────────────────────────
  const createPochette = useCallback(async (lotId, payload) => {
    const { data } = await apiClient.post(`/lots/${lotId}/pochettes`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const updatePochette = useCallback(async (lotId, id, payload) => {
    const { data } = await apiClient.put(`/lots/${lotId}/pochettes/${id}`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const deletePochette = useCallback(async (lotId, id) => {
    await apiClient.delete(`/lots/${lotId}/pochettes/${id}`);
    await fetch();
  }, [fetch]);

  // ── STOCK POCHETTE ────────────────────────────────────────────────
  const upsertStockPochette = useCallback(async (pochetteId, articleId, payload) => {
    const { data } = await apiClient.put(
      `/lots/pochettes/${pochetteId}/stock/${articleId}`,
      payload
    );
    await fetch();
    return data;
  }, [fetch]);

  const deleteStockPochette = useCallback(async (pochetteId, articleId) => {
    await apiClient.delete(`/lots/pochettes/${pochetteId}/stock/${articleId}`);
    await fetch();
  }, [fetch]);

  // BE2: PATCH minimum requis — centralise dans le hook
  const updateStockMinimum = useCallback(async (pochetteId, articleId, quantiteMinimum) => {
    const { data } = await apiClient.patch(
      `/lots/pochettes/${pochetteId}/stock/${articleId}/minimum`,
      { quantite_minimum: quantiteMinimum }
    );
    return data;
  }, []);

  return {
    lots, loading, error, fetch,
    createLot, updateLot, deleteLot,
    createPochette, updatePochette, deletePochette,
    upsertStockPochette, deleteStockPochette, updateStockMinimum,
  };
}
