import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import { IconPrint } from '../components/Icons';
import apiClient from '../api/client';
import { generateMainCourante } from '../utils/pdfReport';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [controles, setControles] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtres dates
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, controlesRes, alertesRes] = await Promise.all([
        apiClient.get('/controles/stats'),
        apiClient.get('/controles?limit=200'),
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

  // Filtrer les contrôles par date
  const filteredControles = controles.filter(c => {
    if (dateDebut && new Date(c.date_controle) < new Date(dateDebut)) return false;
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59);
      if (new Date(c.date_controle) > fin) return false;
    }
    return true;
  });

  // Stats filtrées
  const filteredStats = {
    total: filteredControles.length,
    conforme: filteredControles.filter(c => c.statut === 'CONFORME').length,
    nonConforme: filteredControles.filter(c => c.statut === 'NON_CONFORME').length,
    partiel: filteredControles.filter(c => c.statut === 'PARTIEL').length,
    tauxConformite: filteredControles.length > 0
      ? Math.round((filteredControles.filter(c => c.statut === 'CONFORME').length / filteredControles.length) * 100)
      : 0,
  };

  const handleExportPDF = () => {
    generateMainCourante({
      uniteLocaleNom: user?.unite_locale_nom || 'Croix-Rouge francaise',
      controles: filteredControles,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      stats: filteredStats,
    });
  };

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
        subtitle="Statistiques de conformite et suivi des alertes"
        actions={
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2"
              disabled={filteredControles.length === 0}>
              Main courante PDF
            </button>
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
              <IconPrint size={16} />
              Imprimer
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-crf-rouge border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Chargement…</p>
        </div>
      ) : (
        <>
          {/* ── Filtres dates ──────────────────────────────────── */}
          <div className="card">
            <h2 className="section-label mb-3">Filtrer par periode</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Date debut</label>
                <input type="date" className="input text-sm" value={dateDebut}
                  onChange={e => setDateDebut(e.target.value)} />
              </div>
              <div>
                <label className="label">Date fin</label>
                <input type="date" className="input text-sm" value={dateFin}
                  onChange={e => setDateFin(e.target.value)} />
              </div>
              {(dateDebut || dateFin) && (
                <button className="btn-secondary text-sm py-2"
                  onClick={() => { setDateDebut(''); setDateFin(''); }}>
                  Effacer
                </button>
              )}
              <p className="text-xs text-gray-400 self-end pb-2">
                {filteredControles.length} controle{filteredControles.length !== 1 ? 's' : ''} sur la periode
              </p>
            </div>
          </div>

          {/* ── Resume conformite ───────────────────────────────── */}
          <div className="card">
            <h2 className="section-label mb-4">Conformite des controles</h2>
            {filteredStats.total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun controle sur cette periode.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-4xl font-bold text-green-600">{filteredStats.tauxConformite}%</p>
                  <p className="text-sm text-gray-500">{filteredStats.total} controle{filteredStats.total !== 1 ? 's' : ''} total</p>
                </div>
                <StatRow
                  label="Conformes" value={filteredStats.conforme}
                  pct={filteredStats.total > 0 ? Math.round((filteredStats.conforme / filteredStats.total) * 100) : 0}
                  color="bg-green-500"
                />
                <StatRow
                  label="Non conformes" value={filteredStats.nonConforme}
                  pct={filteredStats.total > 0 ? Math.round((filteredStats.nonConforme / filteredStats.total) * 100) : 0}
                  color="bg-red-500"
                />
                <StatRow
                  label="Partiels" value={filteredStats.partiel}
                  pct={filteredStats.total > 0 ? Math.round((filteredStats.partiel / filteredStats.total) * 100) : 0}
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
                      <th>Echeance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertes.map(alerte => (
                      <tr key={alerte.id}>
                        <td>
                          <span className={alerte.type === 'PEREMPTION' ? 'badge-perime' : 'badge-alerte'}>
                            {alerte.type === 'PEREMPTION' ? 'Peremption' : 'Stock bas'}
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

          {/* ── Historique controles (main courante) ────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-label">Main courante ({filteredControles.length})</h2>
              {filteredControles.length > 0 && (
                <button onClick={handleExportPDF} className="btn-secondary text-xs py-1.5 px-3">
                  Exporter PDF
                </button>
              )}
            </div>
            {filteredControles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun controle enregistre.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Controleur</th>
                      <th>Qualification</th>
                      <th>Statut</th>
                      <th>Remarques</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredControles.map(c => {
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
