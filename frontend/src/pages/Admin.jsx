import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash } from '../components/Icons';
import apiClient from '../api/client';
import { useArticles } from '../hooks/useArticles';

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
  });

  return (
    <Modal title={initial ? 'Modifier l\'article' : 'Nouvel article'} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div>
        <label className="label">Catégorie *</label>
        <input className="input" value={form.categorie} placeholder="ex: Airway, Circulation…"
          onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Quantité minimale *</label>
          <input type="number" min="0" className="input" value={form.quantite_min}
            onChange={e => setForm(f => ({ ...f, quantite_min: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.est_perimable}
              onChange={e => setForm(f => ({ ...f, est_perimable: e.target.checked }))} />
            <span className="text-sm text-gray-700">Article périmable</span>
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
        <div className="overflow-x-auto card p-0">
          <table className="table-auto">
            <thead><tr><th>Nom</th><th>Catégorie</th><th>Qté min.</th><th>Périmable</th><th></th></tr></thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id}>
                  <td className="font-medium">{a.nom}</td>
                  <td>{a.categorie}</td>
                  <td>{a.quantite_min}</td>
                  <td>{a.est_perimable ? '✓' : '—'}</td>
                  <td className="text-right">
                    <div className="flex gap-1 justify-end">
                      <button className="btn-icon p-1" onClick={() => setModal({ type: 'article', data: a })}><IconEdit size={13} /></button>
                      <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(a)}><IconTrash size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal?.type === 'article' && <ArticleModal initial={modal.data} onSave={handleSave} onClose={() => setModal(null)} loading={saving} />}
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
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3">
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
        <div className="overflow-x-auto card p-0">
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

// ─── Navigation Admin ─────────────────────────────────────────────────────────

function AdminNav() {
  const links = [
    { to: '/admin/articles',     label: 'Articles' },
    { to: '/admin/utilisateurs', label: 'Utilisateurs' },
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
      </Routes>
    </div>
  );
}
