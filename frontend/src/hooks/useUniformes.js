import { useState, useCallback } from 'react';
import apiClient from '../api/client';

export function useUniformes() {
  const [uniformes, setUniformes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/uniformes');
      setUniformes(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── UNIFORMES ──────────────────────────────────────────────────────
  const createUniforme = useCallback(async (payload) => {
    const { data } = await apiClient.post('/uniformes', payload);
    await fetch();
    return data;
  }, [fetch]);

  const updateUniforme = useCallback(async (id, payload) => {
    const { data } = await apiClient.put(`/uniformes/${id}`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const deleteUniforme = useCallback(async (id) => {
    await apiClient.delete(`/uniformes/${id}`);
    await fetch();
  }, [fetch]);

  // ── MOUVEMENTS ─────────────────────────────────────────────────────
  const createPret = useCallback(async (id, payload) => {
    const { data } = await apiClient.post(`/uniformes/${id}/pret`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const createAttribution = useCallback(async (id, payload) => {
    const { data } = await apiClient.post(`/uniformes/${id}/attribution`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const createRetour = useCallback(async (id, payload) => {
    const { data } = await apiClient.post(`/uniformes/${id}/retour`, payload);
    await fetch();
    return data;
  }, [fetch]);

  return {
    uniformes, loading, error, fetch,
    createUniforme, updateUniforme, deleteUniforme,
    createPret, createAttribution, createRetour,
  };
}
