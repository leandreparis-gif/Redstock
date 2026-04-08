import { useState, useCallback, useEffect } from 'react';
import apiClient from '../api/client';

export function usePeremptions() {
  const [items, setItems]       = useState([]);
  const [summary, setSummary]   = useState({ total: 0, expired: 0, j7: 0, j30: 0, j60: 0 });
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filters, setFilters]   = useState({
    range: 'all',
    location: 'all',
    search: '',
    page: 1,
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 50, page: filters.page };
      if (filters.range !== 'all') params.range = filters.range;
      if (filters.location !== 'all') params.location = filters.location;
      if (filters.search) params.search = filters.search;
      console.log('[usePeremptions] calling API with params:', params);
      console.log('[usePeremptions] baseURL:', apiClient.defaults.baseURL);
      const response = await apiClient.get('/peremptions', { params });
      console.log('[usePeremptions] response:', response.status, response.data);
      const { data } = response;
      setItems(data.items);
      setSummary(data.summary);
      setTotal(data.total);
    } catch (err) {
      console.error('[usePeremptions] ERROR:', err.response?.status, err.response?.data, err.config?.url, err.config?.params);
      setError(`${err.response?.status || '?'}: ${err.response?.data?.error || err.message} (URL: ${err.config?.baseURL}${err.config?.url})`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateFilters = useCallback((patch) => {
    setFilters(prev => ({ ...prev, page: 1, ...patch }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  return { items, summary, total, loading, error, filters, updateFilters, setPage, refresh: fetch };
}
