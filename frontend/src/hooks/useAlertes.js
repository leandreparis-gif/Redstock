import { useState, useCallback, useEffect } from 'react';
import apiClient from '../api/client';

export function useAlertes() {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (statut = 'ACTIVE') => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/alertes?statut=' + statut);
      setAlertes(data);
    } catch {
      setAlertes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const alertesActives = alertes.filter((a) => a.statut === 'ACTIVE');
  const countPeremption = alertesActives.filter((a) => a.type === 'PEREMPTION').length;
  const countStockBas = alertesActives.filter((a) => a.type === 'STOCK_BAS').length;

  return { alertes, alertesActives, countPeremption, countStockBas, loading, fetch };
}
