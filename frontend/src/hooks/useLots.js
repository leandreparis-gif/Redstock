import { useState, useCallback } from 'react';
import apiClient from '../api/client';

export function useLots() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/lots');
      setLots(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
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

  return {
    lots, loading, error, fetch,
    createLot, updateLot, deleteLot,
    createPochette, updatePochette, deletePochette,
    upsertStockPochette, deleteStockPochette,
  };
}
