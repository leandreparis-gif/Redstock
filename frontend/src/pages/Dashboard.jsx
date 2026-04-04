import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useAlertes } from '../hooks/useAlertes';
import apiClient from '../api/client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── Couleurs ────────────────────────────────────────────────────────────────
const PEREMPTION_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16'];
const ACTION_ICONS = {
  LOGIN: '🔑', STOCK_UPDATE: '📦', CONTROLE: '🔍', CONTROLE_QR: '📱',
  USER_CREATE: '👤', USER_DELETE: '🗑️', ALERTE: '🔔',
};

// ── Jauge circulaire SVG ────────────────────────────────────────────────────
function GaugeCirculaire({ value, size = 100 }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-crf-texte">{value}%</span>
      </div>
    </div>
  );
}

// ── KPI Card améliorée ──────────────────────────────────────────────────────
function KpiCard({ label, value, sub, bgClass, icon, urgent }) {
  return (
    <div className={`${bgClass} rounded-card p-5 transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {urgent > 0 && (
          <span className="bg-crf-rouge text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            {urgent} urgent{urgent > 1 ? 'es' : 'e'}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-crf-texte">{value}</p>
      <p className="text-sm font-medium text-crf-texte mt-1">{label}</p>
      {sub && <p className="text-xs text-crf-texte-soft mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Barre de stock par catégorie ────────────────────────────────────────────
function StockBar({ categorie, total, minimum, pourcentage }) {
  const color = pourcentage >= 100 ? 'bg-green-500' : pourcentage >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pourcentage >= 100 ? 'text-green-600' : pourcentage >= 50 ? 'text-amber-600' : 'text-red-600';
  const width = Math.min(pourcentage, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-crf-texte truncate mr-2">{categorie}</span>
        <span className={`font-bold ${textColor} flex-shrink-0`}>{total}/{minimum}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// ── Horodatage relatif ──────────────────────────────────────────────────────
function tempsRelatif(dateStr) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ── Tooltip Recharts personnalisé ───────────────────────────────────────────
function CustomTooltipTendance({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2 text-xs">
      <p className="font-semibold text-crf-texte">{label}</p>
      <p className="text-green-600">Taux : {payload[0].value}%</p>
      {payload[0].payload.total && (
        <p className="text-crf-texte-soft">{payload[0].payload.total} contrôle(s)</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { resoudre } = useAlertes();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const handleResoudre = async (alerteId) => {
    setResolving(alerteId);
    try {
      await resoudre(alerteId);
      await load();
    } catch (err) {
      console.error('[Dashboard] Résolution alerte:', err);
    } finally {
      setResolving(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await apiClient.get('/dashboard/stats');
      setData(d);
    } catch (err) { console.error('[Dashboard]', err); setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble du stock et des contrôles" />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-crf-rouge border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble du stock et des contrôles" />
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">😕</p>
          <p className="text-sm">Impossible de charger les données.</p>
          <button onClick={load} className="btn-primary mt-4 text-sm">Réessayer</button>
        </div>
      </div>
    );
  }

  const { kpis, peremptionTimeline, controlesTendance, articlesCritiques, stockParCategorie, activiteRecente } = data;

  // Nombre d'alertes urgentes (< 7 jours péremption)
  const urgentPeremption = peremptionTimeline.length > 0 ? peremptionTimeline[0].count : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble du stock et des contrôles" />

      {/* ── A. KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="🔔" label="Alertes actives" bgClass="bg-crf-card-rose"
          value={kpis.alertesActives}
          sub={kpis.alertesActives === 0 ? 'tout va bien' : 'à traiter'}
          urgent={kpis.alertesActives > 3 ? kpis.alertesActives : 0}
        />
        <KpiCard
          icon="⚠️" label="Péremptions" bgClass="bg-crf-card-jaune"
          value={kpis.peremptions}
          sub={urgentPeremption > 0 ? `${urgentPeremption} dans < 7 jours` : 'aucune urgente'}
          urgent={urgentPeremption}
        />
        <KpiCard
          icon="📦" label="Stocks bas" bgClass="bg-crf-card-bleu"
          value={kpis.stocksBas}
          sub="sous le minimum"
        />
        {/* Carte conformité avec jauge */}
        <div className="bg-crf-card-vert rounded-card p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <GaugeCirculaire value={kpis.tauxConformite} size={80} />
            <div>
              <p className="text-sm font-medium text-crf-texte">Conformité</p>
              <p className="text-xs text-crf-texte-soft mt-0.5">
                {kpis.totalControles} contrôle{kpis.totalControles !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── B. Tendance conformité + Péremptions ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendance conformité */}
        <div className="card">
          <h2 className="text-sm font-semibold text-crf-texte mb-4">
            Tendance de conformité
          </h2>
          {controlesTendance.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={controlesTendance} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTaux" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }}
                  tickFormatter={d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} />
                {/* Seuil 80% */}
                <CartesianGrid y={80} strokeDasharray="6 3" stroke="#f59e0b" strokeOpacity={0.5} />
                <Tooltip content={<CustomTooltipTendance />} />
                <Area type="monotone" dataKey="taux" stroke="#22c55e" strokeWidth={2.5}
                  fill="url(#gradTaux)" dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
              Pas assez de données pour afficher la tendance
            </div>
          )}
        </div>

        {/* Timeline péremptions */}
        <div className="card">
          <h2 className="text-sm font-semibold text-crf-texte mb-4">
            Échéances de péremption
          </h2>
          {peremptionTimeline.some(p => p.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peremptionTimeline} layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="periode" tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v) => [v + ' article(s)', 'Quantité']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Articles" radius={[0, 6, 6, 0]} barSize={20}>
                  {peremptionTimeline.map((_, i) => (
                    <Cell key={i} fill={PEREMPTION_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
              <div className="text-center">
                <p className="text-3xl mb-2">👍</p>
                <p>Aucune péremption dans les 90 prochains jours</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── C. Articles critiques + Stock par catégorie ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Articles critiques */}
        <div className="card">
          <h2 className="text-sm font-semibold text-crf-texte mb-4">
            Articles critiques
            {articlesCritiques.length > 0 && (
              <span className="ml-2 bg-crf-rouge text-white px-2 py-0.5 rounded-full text-xs">
                {articlesCritiques.length}
              </span>
            )}
          </h2>
          {articlesCritiques.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm">Aucun article critique</p>
            </div>
          ) : (
            <div className="space-y-2">
              {articlesCritiques.map((art, i) => (
                <div key={art.id || i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  art.type === 'PEREMPTION'
                    ? 'border-red-100 bg-red-50/50'
                    : 'border-amber-100 bg-amber-50/50'
                }`}>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                    art.type === 'PEREMPTION' ? 'bg-red-500' : 'bg-amber-500'
                  }`}>
                    {art.type === 'PEREMPTION' ? '⚠' : '📦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-crf-texte truncate">{art.nom}</p>
                    <p className="text-xs text-crf-texte-soft truncate">{art.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      art.type === 'PEREMPTION'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {art.type === 'PEREMPTION' ? 'Péremption' : 'Stock bas'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleResoudre(art.id)}
                        disabled={resolving === art.id}
                        className="text-[10px] font-bold px-2 py-1 rounded-full
                          bg-green-100 text-green-700 hover:bg-green-200
                          disabled:opacity-50 disabled:cursor-wait transition-colors"
                      >
                        {resolving === art.id ? '...' : '✓ Résoudre'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock par catégorie */}
        <div className="card">
          <h2 className="text-sm font-semibold text-crf-texte mb-4">
            Stock par catégorie
          </h2>
          {stockParCategorie.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Aucun stock enregistré</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stockParCategorie.map(cat => (
                <StockBar key={cat.categorie} {...cat} />
              ))}
              {/* Légende */}
              <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-[10px] text-crf-texte-soft">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> OK
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Attention
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Critique
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── D. Activité récente ───────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-crf-texte mb-4">
          Activité récente
        </h2>
        {activiteRecente.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Aucune activité récente</p>
          </div>
        ) : (
          <div className="relative">
            {/* Ligne verticale timeline */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />
            <div className="space-y-0">
              {activiteRecente.map((act, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 pl-1 relative">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border-2 border-gray-200
                    flex items-center justify-center text-xs z-10">
                    {ACTION_ICONS[act.action] || '📋'}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-crf-texte">
                      <span className="font-semibold">{act.user || 'Système'}</span>
                      {' — '}
                      <span className="text-crf-texte-soft">{act.details || act.action}</span>
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-gray-400 pt-0.5">
                    {tempsRelatif(act.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
