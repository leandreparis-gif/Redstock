import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash, IconPrint, IconBarcode } from '../components/Icons';
import apiClient from '../api/client';
import { useArticles } from '../hooks/useArticles';
import JsBarcode from 'jsbarcode';

// ─── Modal générique ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-crf-texte">{title}</h2>
          <button onClick={onClose} className="btn-icon text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Section Articles ─────────────────────────────────────────────────────────

function ArticleModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    nom: initial?.nom || '',
    description: initial?.description || '',
    categorie: initial?.categorie || '',
    quantite_min: initial?.quantite_min || 1,
    est_perimable: initial?.est_perimable ?? true,
    code_barre: initial?.code_barre || '',
  });

  return (
    <Modal title={initial ? 'Modifier l\'article' : 'Nouvel article'} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div>
        <label className="label">Categorie *</label>
        <input className="input" value={form.categorie} placeholder="ex: Airway, Circulation…"
          onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} />
      </div>
      <div>
        <label className="label">Code-barres</label>
        <input className="input font-mono tracking-wider" value={form.code_barre}
          placeholder={initial ? 'Scannez ou tapez...' : 'Laissez vide = auto-genere (EAN-13)'}
          onChange={e => setForm(f => ({ ...f, code_barre: e.target.value }))} />
        <p className="text-xs text-gray-400 mt-1">
          {initial ? 'Douchette USB ou saisie manuelle' : 'Si vide, un code EAN-13 sera genere automatiquement'}
        </p>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Quantite minimale *</label>
          <input type="number" min="0" className="input" value={form.quantite_min}
            onChange={e => setForm(f => ({ ...f, quantite_min: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.est_perimable}
              onChange={e => setForm(f => ({ ...f, est_perimable: e.target.checked }))} />
            <span className="text-sm text-gray-700">Article perimable</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.nom || !form.categorie || loading}
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal impression code-barres ────────────────────────────────────────────

function BarcodeModal({ article, onClose }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && article.code_barre) {
      try {
        JsBarcode(svgRef.current, article.code_barre, {
          format: 'EAN13',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10,
        });
      } catch {
        // Fallback si le format n'est pas EAN-13
        JsBarcode(svgRef.current, article.code_barre, {
          format: 'CODE128',
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10,
        });
      }
    }
  }, [article.code_barre]);

  const handlePrint = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Code-barres — ${article.nom}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 30px; }
        h2 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 12px; color: #666; margin: 2px 0; }
        .barcode { margin: 20px auto; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h2>${article.nom}</h2>
        <p>${article.categorie}</p>
        <div class="barcode">${svgData}</div>
        <p style="font-size:10px;color:#aaa;margin-top:12px">PharmaSecours — Croix-Rouge francaise</p>
        <br/><button onclick="window.print()">Imprimer</button>
        <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  if (!article.code_barre) {
    return (
      <Modal title={`Code-barres — ${article.nom}`} onClose={onClose}>
        <p className="text-sm text-gray-500 text-center py-4">
          Cet article n'a pas de code-barres. Modifiez-le pour en ajouter un.
        </p>
        <div className="flex justify-end">
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Code-barres — ${article.nom}`} onClose={onClose}>
      <div className="text-center">
        <svg ref={svgRef} className="mx-auto" />
        <p className="text-xs text-gray-400 mt-2 font-mono">{article.code_barre}</p>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Fermer</button>
        <button className="btn-primary flex items-center gap-2" onClick={handlePrint}>
          <IconPrint size={15} />
          Imprimer
        </button>
      </div>
    </Modal>
  );
}

function AdminArticles() {
  const { articles, loading, fetch, createArticle, updateArticle, deleteArticle } = useArticles();
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch(); }, [fetch]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await updateArticle(modal.data.id, form);
      else            await createArticle(form);
      showToast(modal.data ? 'Article modifié' : 'Article créé');
      setModal(null);
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (article) => {
    if (!confirm(`Supprimer "${article.nom}" ?`)) return;
    try { await deleteArticle(article.id); showToast('Article supprimé'); }
    catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ type: 'article' })}>
          <IconPlus size={16} /> Nouvel article
        </button>
      </div>
      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement…</p></div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {articles.map(a => (
              <div key={a.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-crf-texte">{a.nom}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.categorie}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">Qte min : {a.quantite_min}</span>
                    {a.est_perimable && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">perimable</span>
                    )}
                    {a.code_barre && (
                      <span className="text-xs font-mono text-gray-400">{a.code_barre}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                  {a.code_barre && <button className="btn-icon p-1" title="Imprimer code-barres" onClick={() => setModal({ type: 'barcode', data: a })}><IconBarcode size={13} /></button>}
                  <button className="btn-icon p-1" onClick={() => setModal({ type: 'article', data: a })}><IconEdit size={13} /></button>
                  <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(a)}><IconTrash size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto card p-0">
            <table className="table-auto">
              <thead><tr><th>Nom</th><th>Categorie</th><th>Code-barres</th><th>Qte min.</th><th>Perimable</th><th></th></tr></thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.nom}</td>
                    <td>{a.categorie}</td>
                    <td className="font-mono text-xs text-gray-500">{a.code_barre || '—'}</td>
                    <td>{a.quantite_min}</td>
                    <td>{a.est_perimable ? '✓' : '—'}</td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        {a.code_barre && <button className="btn-icon p-1" title="Imprimer code-barres" onClick={() => setModal({ type: 'barcode', data: a })}><IconBarcode size={13} /></button>}
                        <button className="btn-icon p-1" onClick={() => setModal({ type: 'article', data: a })}><IconEdit size={13} /></button>
                        <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(a)}><IconTrash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {modal?.type === 'article' && <ArticleModal initial={modal.data} onSave={handleSave} onClose={() => setModal(null)} loading={saving} />}
      {modal?.type === 'barcode' && <BarcodeModal article={modal.data} onClose={() => setModal(null)} />}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Section Utilisateurs ─────────────────────────────────────────────────────

function UserModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    prenom: initial?.prenom || '',
    qualification: initial?.qualification || 'PSE2',
    role: initial?.role || 'CONTRIBUTEUR',
    login: initial?.login || '',
    password: '',
  });

  return (
    <Modal title={initial ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Prénom *</label>
          <input className="input" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
        </div>
        <div>
          <label className="label">Login *</label>
          <input className="input" value={form.login} disabled={!!initial}
            onChange={e => setForm(f => ({ ...f, login: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Qualification</label>
          <select className="select" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}>
            <option value="PSE1">PSE1</option>
            <option value="PSE2">PSE2</option>
            <option value="CI">CI</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
        <div>
          <label className="label">Rôle</label>
          <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="CONTRIBUTEUR">Contributeur</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">{initial ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}</label>
        <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.prenom || !form.login || (!initial && !form.password) || loading}
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

function AdminUtilisateurs() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/users'); setUsers(data); }
    catch { setUsers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.data) {
        await apiClient.put(`/users/${modal.data.id}`, { prenom: form.prenom, qualification: form.qualification, role: form.role });
        if (form.password) await apiClient.patch(`/users/${modal.data.id}/password`, { password: form.password });
      } else {
        await apiClient.post('/users', form);
      }
      await fetchUsers();
      showToast(modal.data ? 'Utilisateur modifié' : 'Utilisateur créé');
      setModal(null);
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Supprimer l'utilisateur "${user.prenom}" (${user.login}) ?`)) return;
    try { await apiClient.delete(`/users/${user.id}`); await fetchUsers(); showToast('Utilisateur supprimé'); }
    catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const roleLabel = { ADMIN: '🔑 Admin', CONTRIBUTEUR: 'Contributeur' };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ type: 'user' })}>
          <IconPlus size={16} /> Nouvel utilisateur
        </button>
      </div>
      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement…</p></div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {users.map(u => (
              <div key={u.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-crf-texte">{u.prenom}</p>
                  <p className="font-mono text-xs text-gray-500">{u.login}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">{u.qualification}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{roleLabel[u.role] || u.role}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                  <button className="btn-icon p-1" onClick={() => setModal({ type: 'user', data: u })}><IconEdit size={13} /></button>
                  <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(u)}><IconTrash size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto card p-0">
            <table className="table-auto">
              <thead><tr><th>Prénom</th><th>Login</th><th>Qualification</th><th>Rôle</th><th></th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.prenom}</td>
                    <td className="font-mono text-sm">{u.login}</td>
                    <td>{u.qualification}</td>
                    <td>{roleLabel[u.role] || u.role}</td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button className="btn-icon p-1" onClick={() => setModal({ type: 'user', data: u })}><IconEdit size={13} /></button>
                        <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(u)}><IconTrash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {modal?.type === 'user' && <UserModal initial={modal.data} onSave={handleSave} onClose={() => setModal(null)} loading={saving} />}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Section Logs ─────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  LOGIN:        { label: 'Connexion',      color: 'bg-blue-100 text-blue-700' },
  CONTROLE:     { label: 'Contrôle',       color: 'bg-green-100 text-green-700' },
  CONTROLE_QR:  { label: 'Contrôle QR',   color: 'bg-teal-100 text-teal-700' },
  USER_CREATE:  { label: 'Compte créé',   color: 'bg-purple-100 text-purple-700' },
  USER_DELETE:  { label: 'Compte supprimé', color: 'bg-red-100 text-red-700' },
  STOCK_UPDATE: { label: 'Stock mis à jour', color: 'bg-orange-100 text-orange-700' },
};

function AdminLogs() {
  const [logs, setLogs]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [filter, setFilter] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, page });
      if (filter) params.set('action', filter);
      const { data } = await apiClient.get(`/logs?${params}`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fmt = (iso) => new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const actions = Object.keys(ACTION_LABELS);
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">{total} entrée{total !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <select className="select text-sm py-1.5" value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}>
            <option value="">Toutes les actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
            ))}
          </select>
          <button className="btn-secondary text-sm py-1.5" onClick={fetchLogs}>↻ Actualiser</button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement…</p></div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">Aucun log pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {logs.map(log => {
              const badge = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={log.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    <span className="text-xs text-gray-400">{fmt(log.created_at)}</span>
                  </div>
                  {log.user_prenom && (
                    <p className="text-sm text-crf-texte">{log.user_prenom} <span className="text-gray-400 text-xs">({log.user_login})</span></p>
                  )}
                  {log.details && <p className="text-xs text-gray-500 break-words">{log.details}</p>}
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto card p-0">
            <table className="table-auto">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Utilisateur</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const badge = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={log.id}>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{fmt(log.created_at)}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="text-sm">
                        {log.user_prenom
                          ? <span>{log.user_prenom} <span className="text-gray-400 text-xs">({log.user_login})</span></span>
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                      <td className="text-sm text-gray-600 max-w-xs truncate">{log.details || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button className="btn-secondary text-sm py-1" disabled={page === 1}
            onClick={() => setPage(p => p - 1)}>← Précédent</button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button className="btn-secondary text-sm py-1" disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}>Suivant →</button>
        </div>
      )}
    </div>
  );
}

// ─── Navigation Admin ─────────────────────────────────────────────────────────

function AdminNav() {
  const links = [
    { to: '/admin/articles',     label: 'Articles' },
    { to: '/admin/utilisateurs', label: 'Utilisateurs' },
    { to: '/admin/logs',         label: '📋 Logs' },
  ];
  return (
    <nav className="flex gap-1 mb-6 flex-wrap">
      {links.map(({ to, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive ? 'bg-crf-rouge text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-crf-rouge hover:text-crf-rouge'
          }`
        }>{label}</NavLink>
      ))}
    </nav>
  );
}

export default function Admin() {
  return (
    <div>
      <PageHeader title="Administration" subtitle="Gestion complète du catalogue et des utilisateurs" />
      <AdminNav />
      <Routes>
        <Route index element={
          <div className="card text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">⚙️</p>
            <p className="text-sm">Sélectionnez une section dans le menu.</p>
          </div>
        } />
        <Route path="articles"     element={<AdminArticles />} />
        <Route path="utilisateurs" element={<AdminUtilisateurs />} />
        <Route path="logs"         element={<AdminLogs />} />
      </Routes>
    </div>
  );
}
