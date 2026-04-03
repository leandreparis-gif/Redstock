import { useState, useCallback } from 'react';
import apiClient from '../api/client';

export function useArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/articles');
      setArticles(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createArticle = useCallback(async (payload) => {
    const { data } = await apiClient.post('/articles', payload);
    await fetch();
    return data;
  }, [fetch]);

  const updateArticle = useCallback(async (id, payload) => {
    const { data } = await apiClient.put(`/articles/${id}`, payload);
    await fetch();
    return data;
  }, [fetch]);

  const deleteArticle = useCallback(async (id) => {
    await apiClient.delete(`/articles/${id}`);
    await fetch();
  }, [fetch]);

  const lookupBarcode = useCallback(async (code) => {
    const { data } = await apiClient.get(`/articles/barcode/${encodeURIComponent(code)}`);
    return data;
  }, []);

  return { articles, loading, fetch, createArticle, updateArticle, deleteArticle, lookupBarcode };
}
