import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { useAlertes } from '../hooks/useAlertes';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = { CONFORME: '#22c55e', NON_CONFORME: '#ef4444', PARTIEL: '#f59e0b' };

// Carte colorée style capture
function KpiCard({ label, value, sub, bgClass, icon }) {
  return (
    <div className={`${bgClass} rounded-card p-5`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-3xl font-bold text-crf-texte">{value}</p>
      <p className="text-sm font-medium text-crf-texte mt-1">{label}</p>
      {sub && <p className="text-xs text-crf-texte-soft mt-0.5">{sub}</p>}
    </div>
  );
}

function AlerteRow({ alerte, onResoudre, isAdmin }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${
      alerte.type === 'PEREMPTION' ? 'border-red-100 bg-crf-card-rose' : 'border-yellow-100 bg-crf-card-jaune'
    }`}>
      <span className="text-lg flex-shrink-0">{alerte.type === 'PEREMPTION' ? '⚠️' : '📦'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-crf-texte">{alerte.article?.nom}</p>
        <p className="text-xs text-crf-texte-soft mt-0.5">{alerte.message}</p>
        {alerte.date_echeance && (
          <p className="text-xs text-gray-400 mt-0.5">
            Échéance : {new Date(alerte.date_echeance).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
      {isAdmin && (
        <button
          onClick={() => onResoudre(alerte.id)}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200
                     hover:border-green-400 hover:text-green-600 font-medium transition-colors"
        >
          Résoudre
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { alertesActives, countPeremption, countStockBas, loading: loadingAlertes, fetch: fetchAlertes } = useAlertes();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await apiClient.get('/controles/stats');
      setStats(data);
    } catch { setStats(null); }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleResoudre = async (id) => {
    try { await apiClient.patch('/alertes/' + id + '/resoudre'); fetchAlertes(); }
    catch (err) { console.error(err); }
  };

  const pieData = stats ? [
    { name: 'Conforme', value: stats.conforme, color: COLORS.CONFORME },
    { name: 'Non conforme', value: stats.nonConforme, color: COLORS.NON_CONFORME },
    { name: 'Partiel', value: stats.partiel, color: COLORS.PARTIEL },
  ].filter(d => d.value > 0) : [];

  const barData = stats ? [
    { name: 'Conformes', value: stats.conforme, fill: COLORS.CONFORME },
    { name: 'Non conf.', value: stats.nonConforme, fill: COLORS.NON_CONFORME },
    { name: 'Partiels', value: stats.partiel, fill: COLORS.PARTIEL },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble du stock et des contrôles" />

      {/* KPI Cards colorées */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon="🔔"
          label="Alertes actives"
          value={loadingAlertes ? '…' : alertesActives.length}
          sub="en cours"
          bgClass="bg-crf-card-rose"
        />
        <KpiCard
          icon="⚠️"
          label="Péremptions"
          value={loadingAlertes ? '…' : countPeremption}
          sub="articles proches"
          bgClass="bg-crf-card-jaune"
        />
        <KpiCard
          icon="📦"
          label="Stocks bas"
          value={loadingAlertes ? '…' : countStockBas}
          sub="sous le minimum"
          bgClass="bg-crf-card-bleu"
        />
        <KpiCard
          icon="✅"
          label="Taux conformité"
          value={loadingStats || !stats ? '…' : stats.tauxConformite + '%'}
          sub={stats ? stats.total + ' contrôle' + (stats.total !== 1 ? 's' : '') : '—'}
          bgClass="bg-crf-card-vert"
        />
      </div>

      {/* Graphiques */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-crf-texte mb-4">Répartition des contrôles</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-crf-texte-soft">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-crf-texte mb-4">Contrôles par statut</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Contrôles" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alertes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-crf-texte">
            Alertes actives
            {alertesActives.length > 0 && (
              <span className="ml-2 bg-crf-rouge text-white px-2 py-0.5 rounded-full text-xs">{alertesActives.length}</span>
            )}
          </h2>
        </div>
        {loadingAlertes ? (
          <div className="text-center py-6 text-gray-400">
            <div className="inline-block w-5 h-5 border-2 border-crf-rouge border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : alertesActives.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">Aucune alerte active. Tout est conforme !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertesActives.map(alerte => (
              <AlerteRow key={alerte.id} alerte={alerte} isAdmin={isAdmin} onResoudre={handleResoudre} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
