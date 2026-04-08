import { useState, useCallback, useEffect } from 'react';
import apiClient from '../api/client';

export function useCommandes() {
  const [commandes, setCommandes] = useState([]);
  const [summary, setSummary]     = useState({ enAttente: 0, recuesMois: 0 });
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [filters, setFilters]     = useState({ statut: '', page: 1 });

  // Previsionnel
  const [previsionnel, setPrevisionnel] = useState([]);
  const [loadingPrev, setLoadingPrev]   = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50, page: filters.page };
      if (filters.statut) params.statut = filters.statut;
      const { data } = await apiClient.get('/commandes', { params });
      setCommandes(data.commandes);
      setTotal(data.total);
      setSummary(data.summary);
    } catch (err) {
      console.error('[useCommandes]', err);
      setCommandes([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchPrevisionnel = useCallback(async () => {
    setLoadingPrev(true);
    try {
      const { data } = await apiClient.get('/commandes/previsionnel');
      setPrevisionnel(data);
    } catch (err) {
      console.error('[useCommandes/previsionnel]', err);
      setPrevisionnel([]);
    } finally {
      setLoadingPrev(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { fetchPrevisionnel(); }, [fetchPrevisionnel]);

  const create = useCallback(async (payload) => {
    await apiClient.post('/commandes', payload);
    await fetch();
  }, [fetch]);

  const createFromPrevisionnel = useCallback(async (items) => {
    const { data } = await apiClient.post('/commandes/from-previsionnel', items);
    await fetch();
    await fetchPrevisionnel();
    return data;
  }, [fetch, fetchPrevisionnel]);

  const recevoir = useCallback(async (id) => {
    await apiClient.patch(`/commandes/${id}/recevoir`);
    await fetch();
  }, [fetch]);

  const annuler = useCallback(async (id) => {
    await apiClient.patch(`/commandes/${id}/annuler`);
    await fetch();
    await fetchPrevisionnel();
  }, [fetch, fetchPrevisionnel]);

  const updateFilters = useCallback((patch) => {
    setFilters(prev => ({ ...prev, page: 1, ...patch }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  return {
    commandes, summary, total, loading, filters,
    previsionnel, loadingPrev,
    updateFilters, setPage,
    create, createFromPrevisionnel, recevoir, annuler,
    refresh: fetch, refreshPrev: fetchPrevisionnel,
  };
}
