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
    await fetch();
    return data;
  }, [fetch]);

  const updateArmoire = useCallback(async (id, payload) => {
    const { data } = await apiClient.put(`/armoires/${id}`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const deleteArmoire = useCallback(async (id) => {
    await apiClient.delete(`/armoires/${id}`);
    await fetch();
  }, [fetch]);

  // ── TIROIRS ───────────────────────────────────────────────────────────
  const createTiroir = useCallback(async (armoireId, payload) => {
    const { data } = await apiClient.post(`/armoires/${armoireId}/tiroirs`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const updateTiroir = useCallback(async (armoireId, id, payload) => {
    const { data } = await apiClient.put(`/armoires/${armoireId}/tiroirs/${id}`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const deleteTiroir = useCallback(async (armoireId, id) => {
    await apiClient.delete(`/armoires/${armoireId}/tiroirs/${id}`);
    await fetch();
  }, [fetch]);

  // ── STOCK ─────────────────────────────────────────────────────────────
  const upsertStock = useCallback(async (tiroirId, articleId, payload) => {
    const { data } = await apiClient.put(
      `/armoires/tiroirs/${tiroirId}/stock/${articleId}`,
      payload
    );
    await fetch();
    return data;
  }, [fetch]);

  const deleteStock = useCallback(async (tiroirId, articleId) => {
    await apiClient.delete(`/armoires/tiroirs/${tiroirId}/stock/${articleId}`);
    await fetch();
  }, [fetch]);

  return {
    armoires, loading, error, fetch,
    createArmoire, updateArmoire, deleteArmoire,
    createTiroir, updateTiroir, deleteTiroir,
    upsertStock, deleteStock,
  };
}
