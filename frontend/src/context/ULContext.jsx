import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const ULContext = createContext(null);

export function ULProvider({ children }) {
  const { isSuperAdmin } = useAuth();
  const [unites, setUnites] = useState([]);
  const [selectedUL, setSelectedUL] = useState(() => localStorage.getItem('pharma_selected_ul'));
  const [loading, setLoading] = useState(false);

  // Charger la liste des UL pour le super admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);
    apiClient.get('/unite-locale')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [data];
        setUnites(list);
        if (list.length > 0 && !selectedUL) {
          // Par défaut, sélectionner "Versailles Grand Parc Ouest" si elle existe
          const versailles = list.find(ul => ul.nom.toLowerCase().includes('versailles'));
          const defaultUL = versailles || list[0];
          setSelectedUL(defaultUL.id);
          localStorage.setItem('pharma_selected_ul', defaultUL.id);
        }
      })
      .catch(() => setUnites([]))
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  const selectUL = useCallback((id) => {
    setSelectedUL(id);
    localStorage.setItem('pharma_selected_ul', id);
  }, []);

  return (
    <ULContext.Provider value={{ unites, selectedUL, selectUL, loading, isSuperAdmin }}>
      {children}
    </ULContext.Provider>
  );
}

export function useUL() {
  const ctx = useContext(ULContext);
  if (!ctx) throw new Error('useUL doit etre utilise dans <ULProvider>');
  return ctx;
}

/**
 * Hook pour construire les query params d'UL pour les appels API.
 * Les admins/contributeurs n'envoient rien (le backend utilise leur token).
 * Le super admin envoie ?unite_locale_id=xxx.
 */
export function useULParams() {
  const { selectedUL, isSuperAdmin } = useUL();
  if (!isSuperAdmin) return '';
  return selectedUL ? `?unite_locale_id=${selectedUL}` : '';
}
