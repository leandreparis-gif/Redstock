import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPrint } from '../components/Icons';
import apiClient from '../api/client';

function StatRow({ label, value, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{label}</span>
          <span className="font-semibold">{value}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: pct + '%' }} />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function Reporting() {
  const [stats, setStats] = useState(null);
  const [controles, setControles] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, controlesRes, alertesRes] = await Promise.all([
        apiClient.get('/controles/stats'),
        apiClient.get('/controles?limit=50'),
        apiClient.get('/alertes?statut=ACTIVE'),
      ]);
      setStats(statsRes.data);
      setControles(controlesRes.data.controles || []);
      setAlertes(alertesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => window.print();

  const statutLabel = {
    CONFORME: { label: 'Conforme', badge: 'badge-ok' },
    NON_CONFORME: { label: 'Non conforme', badge: 'badge-perime' },
    PARTIEL: { label: 'Partiel', badge: 'badge-proche' },
  };

  const typeLabel = { TIROIR: 'Tiroir', LOT: 'Lot' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        subtitle="Statistiques de conformité et suivi des alertes"
        actions={
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
            <IconPrint size={16} />
            Imprimer
          </button>
        }
      />

      {loading ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-crf-rouge border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Chargement…</p>
        </div>
      ) : (
        <>
          {/* ── Résumé conformité ───────────────────────────────── */}
          <div className="card">
            <h2 className="section-label mb-4">Conformité des contrôles</h2>
            {!stats || stats.total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun contrôle enregistré.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-4xl font-bold text-green-600">{stats.tauxConformite}%</p>
                  <p className="text-sm text-gray-500">{stats.total} contrôle{stats.total !== 1 ? 's' : ''} total</p>
                </div>
                <StatRow
                  label="Conformes" value={stats.conforme}
                  pct={stats.total > 0 ? Math.round((stats.conforme / stats.total) * 100) : 0}
                  color="bg-green-500"
                />
                <StatRow
                  label="Non conformes" value={stats.nonConforme}
                  pct={stats.total > 0 ? Math.round((stats.nonConforme / stats.total) * 100) : 0}
                  color="bg-red-500"
                />
                <StatRow
                  label="Partiels" value={stats.partiel}
                  pct={stats.total > 0 ? Math.round((stats.partiel / stats.total) * 100) : 0}
                  color="bg-yellow-500"
                />
              </div>
            )}
          </div>

          {/* ── Alertes actives ─────────────────────────────────── */}
          <div className="card">
            <h2 className="section-label mb-4">
              Alertes actives ({alertes.length})
            </h2>
            {alertes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune alerte active.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Article</th>
                      <th>Message</th>
                      <th>Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertes.map(alerte => (
                      <tr key={alerte.id}>
                        <td>
                          <span className={alerte.type === 'PEREMPTION' ? 'badge-perime' : 'badge-alerte'}>
                            {alerte.type === 'PEREMPTION' ? 'Péremption' : 'Stock bas'}
                          </span>
                        </td>
                        <td className="font-medium">{alerte.article?.nom || '—'}</td>
                        <td className="text-gray-600 max-w-xs truncate">{alerte.message}</td>
                        <td>
                          {alerte.date_echeance
                            ? new Date(alerte.date_echeance).toLocaleDateString('fr-FR')
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Historique contrôles ─────────────────────────────── */}
          <div className="card">
            <h2 className="section-label mb-4">Historique des contrôles ({controles.length})</h2>
            {controles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun contrôle enregistré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Contrôleur</th>
                      <th>Qualification</th>
                      <th>Statut</th>
                      <th>Remarques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controles.map(c => {
                      const st = statutLabel[c.statut] || { label: c.statut, badge: '' };
                      return (
                        <tr key={c.id}>
                          <td className="whitespace-nowrap">
                            {new Date(c.date_controle).toLocaleDateString('fr-FR')}
                          </td>
                          <td>{typeLabel[c.type] || c.type}</td>
                          <td>{c.controleur_prenom}</td>
                          <td>{c.controleur_qualification}</td>
                          <td><span className={st.badge}>{st.label}</span></td>
                          <td className="max-w-xs truncate text-gray-500">{c.remarques || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
