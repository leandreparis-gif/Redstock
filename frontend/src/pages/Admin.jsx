import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconPlus, IconEdit, IconTrash, IconPrint, IconBarcode, IconSearch } from '../components/Icons';
import apiClient from '../api/client';
import { useArticles } from '../hooks/useArticles';
import { useAuth } from '../context/AuthContext';
import { uploadArticlePhoto, deleteArticlePhoto } from '../lib/supabase';
import JsBarcode from 'jsbarcode';

import Modal from '../components/Modal';

// ─── Section Articles ─────────────────────────────────────────────────────────

function ArticleModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    nom: initial?.nom || '',
    description: initial?.description || '',
    categorie: initial?.categorie || '',
    quantite_min: initial?.quantite_min || 1,
    est_perimable: initial?.est_perimable ?? true,
    code_barre: initial?.code_barre || '',
    photo_url: initial?.photo_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // ID temporaire pour les nouveaux articles — sera écrasé à la sauvegarde
      const id = initial?.id || `temp_${Date.now()}`;
      const url = await uploadArticlePhoto(file, id);
      setForm(f => ({ ...f, photo_url: url }));
    } catch (err) {
      console.error('Erreur upload photo :', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (initial?.id) {
      try { await deleteArticlePhoto(initial.id); } catch { /* ignore */ }
    }
    setForm(f => ({ ...f, photo_url: '' }));
  };

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

      {/* Photo article */}
      <div>
        <label className="label">Photo</label>
        <div className="flex items-center gap-3">
          {form.photo_url ? (
            <div className="relative group">
              <img
                src={form.photo_url}
                alt={form.nom || 'Article'}
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                           text-xs flex items-center justify-center opacity-0 group-hover:opacity-100
                           transition-opacity shadow"
                title="Supprimer la photo"
              >×</button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300
                            flex items-center justify-center text-gray-400 text-xs">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-crf-rouge border-t-transparent rounded-full animate-spin" />
              ) : 'Photo'}
            </div>
          )}
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="article-photo-input"
            />
            <label
              htmlFor="article-photo-input"
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md
                         border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
                         ${uploading ? 'opacity-50 pointer-events-none' : 'text-gray-600'}`}
            >
              {uploading ? 'Compression…' : form.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
            </label>
            <p className="text-[11px] text-gray-400 mt-1">JPEG/PNG, compressee automatiquement (~80 Ko max)</p>
          </div>
        </div>
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
        <button className="btn-primary" disabled={!form.nom || !form.categorie || loading || uploading}
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

  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const handlePrint = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Code-barres — ${esc(article.nom)}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 30px; }
        h2 { font-size: 18px; margin-bottom: 4px; }
        p { font-size: 12px; color: #666; margin: 2px 0; }
        .barcode { margin: 20px auto; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h2>${esc(article.nom)}</h2>
        <p>${esc(article.categorie)}</p>
        <div class="barcode">${svgData}</div>
        <p style="font-size:10px;color:#aaa;margin-top:12px">RedStock — Croix-Rouge francaise</p>
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
  const [search, setSearch] = useState('');

  useEffect(() => { fetch(); }, [fetch]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a =>
      (a.nom || '').toLowerCase().includes(q) ||
      (a.categorie || '').toLowerCase().includes(q) ||
      (a.code_barre || '').toLowerCase().includes(q)
    );
  }, [articles, search]);

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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="input text-sm pl-9 w-full"
            placeholder="Rechercher un article par nom, catégorie ou code-barres…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary flex items-center gap-2 sm:ml-auto" onClick={() => setModal({ type: 'article' })}>
          <IconPlus size={16} /> Nouvel article
        </button>
      </div>
      {!loading && search.trim() && (
        <p className="text-xs text-gray-500 mb-2">
          {filteredArticles.length} résultat{filteredArticles.length !== 1 ? 's' : ''} sur {articles.length}
        </p>
      )}
      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement…</p></div>
      ) : filteredArticles.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">
            {search.trim() ? `Aucun article ne correspond à « ${search.trim()} ».` : 'Aucun article.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {filteredArticles.map(a => (
              <div key={a.id} className="p-3 flex items-start justify-between gap-3">
                {a.photo_url ? (
                  <img src={a.photo_url} alt="" loading="lazy"
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-xs">
                    ◻
                  </div>
                )}
                <div className="min-w-0 flex-1">
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
              <thead><tr><th></th><th>Nom</th><th>Categorie</th><th>Code-barres</th><th>Qte min.</th><th>Perimable</th><th></th></tr></thead>
              <tbody>
                {filteredArticles.map(a => (
                  <tr key={a.id}>
                    <td className="w-10">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt="" loading="lazy"
                          className="w-8 h-8 rounded object-cover bg-gray-100" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-300 text-[10px]">◻</div>
                      )}
                    </td>
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
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
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

  const roleLabel = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', CONTRIBUTEUR: 'Contributeur' };

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
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Section Logs ─────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  LOGIN:             { label: 'Connexion',           color: 'bg-blue-100 text-blue-700' },
  CONTROLE:          { label: 'Controle',            color: 'bg-green-100 text-green-700' },
  CONTROLE_QR:       { label: 'Controle QR',         color: 'bg-teal-100 text-teal-700' },
  USER_CREATE:       { label: 'Compte cree',         color: 'bg-purple-100 text-purple-700' },
  USER_DELETE:       { label: 'Compte supprime',     color: 'bg-red-100 text-red-700' },
  STOCK_UPDATE:      { label: 'Stock mis a jour',    color: 'bg-orange-100 text-orange-700' },
  STOCK_TRANSFER:    { label: 'Transfert stock',     color: 'bg-blue-100 text-blue-700' },
  STOCK_DELETE:      { label: 'Stock supprime',      color: 'bg-red-100 text-red-700' },
  PLANNING_CREATE:   { label: 'Planning cree',       color: 'bg-indigo-100 text-indigo-700' },
  PLANNING_UPDATE:   { label: 'Planning modifie',    color: 'bg-indigo-100 text-indigo-700' },
  PLANNING_DELETE:   { label: 'Planning supprime',   color: 'bg-red-100 text-red-700' },
  ARTICLE_CREATE:    { label: 'Article cree',        color: 'bg-emerald-100 text-emerald-700' },
  ARTICLE_DELETE:    { label: 'Article supprime',     color: 'bg-red-100 text-red-700' },
  UNIFORME_PRET:     { label: 'Uniforme prete',      color: 'bg-cyan-100 text-cyan-700' },
  UNIFORME_RETOUR:   { label: 'Uniforme retour',     color: 'bg-cyan-100 text-cyan-700' },
  COMMANDE_CREATE:   { label: 'Commande creee',      color: 'bg-amber-100 text-amber-700' },
  COMMANDE_VALIDER:  { label: 'Commande validee',    color: 'bg-blue-100 text-blue-700' },
  COMMANDE_RECEVOIR: { label: 'Commande recue',      color: 'bg-green-100 text-green-700' },
  COMMANDE_ANNULER:  { label: 'Commande annulee',    color: 'bg-red-100 text-red-700' },
};

function AdminLogs() {
  const [logs, setLogs]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const limit = 50;

  // Filtres avances
  const [selectedActions, setSelectedActions] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef(null);

  // Charger les utilisateurs distincts
  useEffect(() => {
    apiClient.get('/logs/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  // Fermer le dropdown actions au clic exterieur
  useEffect(() => {
    const handler = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setShowActionMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit, page };
      if (selectedActions.length > 0) params.actions = selectedActions.join(',');
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (userFilter) params.user = userFilter;
      if (searchText) params.search = searchText;
      const { data } = await apiClient.get('/logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [page, selectedActions, dateFrom, dateTo, userFilter, searchText]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fmt = (iso) => new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const allActions = Object.keys(ACTION_LABELS);
  const totalPages = Math.ceil(total / limit);

  const toggleAction = (action) => {
    setSelectedActions(prev =>
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    );
    setPage(1);
  };

  const exportCSV = async () => {
    try {
      const params = {};
      if (selectedActions.length > 0) params.actions = selectedActions.join(',');
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (userFilter) params.user = userFilter;
      if (searchText) params.search = searchText;
      const response = await apiClient.get('/logs/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'journal_activite.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error', err);
    }
  };

  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div>
      {/* Barre de filtres */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {/* Multi-select actions */}
        <div className="relative" ref={actionMenuRef}>
          <label className="label text-xs mb-1 block">Actions</label>
          <button className="select text-sm py-1.5 min-w-[160px] text-left"
            onClick={() => setShowActionMenu(v => !v)}>
            {selectedActions.length === 0 ? 'Toutes' : `${selectedActions.length} filtre${selectedActions.length > 1 ? 's' : ''}`}
          </button>
          {showActionMenu && (
            <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-56 max-h-64 overflow-y-auto">
              <button className="text-xs text-crf-rouge mb-1 px-2 hover:underline"
                onClick={() => { setSelectedActions([]); setPage(1); }}>
                Tout effacer
              </button>
              {allActions.map(a => (
                <label key={a} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedActions.includes(a)}
                    onChange={() => toggleAction(a)}
                    className="rounded border-gray-300 text-crf-rouge focus:ring-crf-rouge" />
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${ACTION_LABELS[a].color}`}>
                    {ACTION_LABELS[a].label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div>
          <label className="label text-xs mb-1 block">Du</label>
          <input type="date" className="input text-sm py-1.5" value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label text-xs mb-1 block">Au</label>
          <input type="date" className="input text-sm py-1.5" value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        {/* User filter */}
        <div>
          <label className="label text-xs mb-1 block">Utilisateur</label>
          <select className="select text-sm py-1.5" value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(1); }}>
            <option value="">Tous</option>
            {users.map(u => (
              <option key={u.user_login} value={u.user_login}>
                {u.user_prenom} ({u.user_login})
              </option>
            ))}
          </select>
        </div>

        {/* Search text */}
        <div>
          <label className="label text-xs mb-1 block">Recherche</label>
          <input type="text" className="input text-sm py-1.5" placeholder="Rechercher dans details..."
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setPage(1); }} />
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto self-end">
          <button className="btn-secondary text-sm py-1.5" onClick={exportCSV}>Export CSV</button>
          <button className="btn-secondary text-sm py-1.5" onClick={fetchLogs}>Actualiser</button>
        </div>
      </div>

      {/* Info resultat */}
      <p className="text-sm text-gray-500 mb-3">
        {total === 0 ? 'Aucun resultat' : `Affichage ${rangeStart}-${rangeEnd} sur ${total} resultat${total !== 1 ? 's' : ''}`}
      </p>

      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement...</p></div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">Aucun log correspondant aux filtres.</p>
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
                  <th>Details</th>
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
            onClick={() => setPage(p => p - 1)}>Precedent</button>
          <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button className="btn-secondary text-sm py-1" disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}>Suivant</button>
        </div>
      )}
    </div>
  );
}

// ─── Section Planification ───────────────────────────────────────────────────

const CIBLE_LABELS = { ALL: 'Tous', LOT: 'Lots', TIROIR: 'Tiroirs' };
const CIBLE_COLORS = { ALL: 'bg-blue-100 text-blue-700', LOT: 'bg-green-100 text-green-700', TIROIR: 'bg-orange-100 text-orange-700' };
const UNITE_LABELS = { JOURS: 'jour(s)', SEMAINES: 'semaine(s)', MOIS: 'mois' };

function PlanificationModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    type_cible: initial?.type_cible || 'ALL',
    periodicite_valeur: initial?.periodicite_valeur || 3,
    periodicite_unite: initial?.periodicite_unite || 'MOIS',
    destinataires: initial?.destinataires || [],
    actif: initial?.actif ?? true,
  });
  const [emailInput, setEmailInput] = useState('');

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (form.destinataires.includes(email)) return;
    setForm(f => ({ ...f, destinataires: [...f.destinataires, email] }));
    setEmailInput('');
  };

  const removeEmail = (email) => {
    setForm(f => ({ ...f, destinataires: f.destinataires.filter(e => e !== email) }));
  };

  return (
    <Modal title={initial ? 'Modifier le planning' : 'Nouveau planning'} onClose={onClose}>
      <div>
        <label className="label">Type de contrôle</label>
        <select className="select" value={form.type_cible}
          onChange={e => setForm(f => ({ ...f, type_cible: e.target.value }))}>
          <option value="ALL">Tous (lots + tiroirs)</option>
          <option value="LOT">Lots uniquement</option>
          <option value="TIROIR">Tiroirs uniquement</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tous les</label>
          <input type="number" min="1" className="input" value={form.periodicite_valeur}
            onChange={e => setForm(f => ({ ...f, periodicite_valeur: parseInt(e.target.value) || 1 }))} />
        </div>
        <div>
          <label className="label">Unité</label>
          <select className="select" value={form.periodicite_unite}
            onChange={e => setForm(f => ({ ...f, periodicite_unite: e.target.value }))}>
            <option value="JOURS">Jour(s)</option>
            <option value="SEMAINES">Semaine(s)</option>
            <option value="MOIS">Mois</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Destinataires des rappels *</label>
        <div className="flex gap-2">
          <input type="email" className="input flex-1" placeholder="email@exemple.fr" value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} />
          <button type="button" className="btn-secondary text-sm px-3" onClick={addEmail}>Ajouter</button>
        </div>
        {form.destinataires.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.destinataires.map(email => (
              <span key={email} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {email}
                <button type="button" className="text-gray-400 hover:text-red-500 text-sm leading-none"
                  onClick={() => removeEmail(email)}>&times;</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-end pb-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.actif}
            onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
          <span className="text-sm text-gray-700">Planning actif</span>
        </label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary"
          disabled={form.destinataires.length === 0 || form.periodicite_valeur < 1 || loading}
          onClick={() => onSave(form)}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

function AdminPlanification() {
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchPlannings = useCallback(async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/planning-controle'); setPlannings(data); }
    catch { setPlannings([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlannings(); }, [fetchPlannings]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.data) await apiClient.put(`/planning-controle/${modal.data.id}`, form);
      else            await apiClient.post('/planning-controle', form);
      await fetchPlannings();
      showToast(modal.data ? 'Planning modifié' : 'Planning créé');
      setModal(null);
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!confirm('Supprimer ce planning ?')) return;
    try { await apiClient.delete(`/planning-controle/${p.id}`); await fetchPlannings(); showToast('Planning supprimé'); }
    catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const handleToggle = async (p) => {
    try {
      await apiClient.patch(`/planning-controle/${p.id}/toggle`);
      await fetchPlannings();
      showToast(p.actif ? 'Planning désactivé' : 'Planning activé');
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR') : 'Jamais';

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          Configurez la fréquence des contrôles et les destinataires des rappels par email.
        </p>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ type: 'planning' })}>
          <IconPlus size={16} /> Nouveau planning
        </button>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement…</p></div>
      ) : plannings.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">Aucun planning configuré.</p>
          <p className="text-xs mt-1">Créez un planning pour recevoir des rappels de contrôle automatiques.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden card p-0 divide-y divide-gray-100">
            {plannings.map(p => (
              <div key={p.id} className={`p-3 ${!p.actif ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CIBLE_COLORS[p.type_cible]}`}>
                        {CIBLE_LABELS[p.type_cible]}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-crf-texte">
                      Tous les {p.periodicite_valeur} {UNITE_LABELS[p.periodicite_unite]}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.destinataires.length} destinataire{p.destinataires.length > 1 ? 's' : ''} · Dernier rappel : {fmt(p.dernier_rappel)}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    <button className="btn-icon p-1" onClick={() => handleToggle(p)} title={p.actif ? 'Désactiver' : 'Activer'}>
                      {p.actif ? '⏸' : '▶'}
                    </button>
                    <button className="btn-icon p-1" onClick={() => setModal({ type: 'planning', data: p })}><IconEdit size={13} /></button>
                    <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(p)}><IconTrash size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto card p-0">
            <table className="table-auto">
              <thead><tr><th>Cible</th><th>Périodicité</th><th>Destinataires</th><th>Dernier rappel</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {plannings.map(p => (
                  <tr key={p.id} className={!p.actif ? 'opacity-50' : ''}>
                    <td>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CIBLE_COLORS[p.type_cible]}`}>
                        {CIBLE_LABELS[p.type_cible]}
                      </span>
                    </td>
                    <td className="font-medium text-sm">Tous les {p.periodicite_valeur} {UNITE_LABELS[p.periodicite_unite]}</td>
                    <td className="text-sm text-gray-600">{p.destinataires.length} email{p.destinataires.length > 1 ? 's' : ''}</td>
                    <td className="text-sm text-gray-500">{fmt(p.dernier_rappel)}</td>
                    <td>
                      <button onClick={() => handleToggle(p)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer ${p.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button className="btn-icon p-1" onClick={() => setModal({ type: 'planning', data: p })}><IconEdit size={13} /></button>
                        <button className="btn-icon p-1 hover:text-red-500" onClick={() => handleDelete(p)}><IconTrash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modal?.type === 'planning' && (
        <PlanificationModal initial={modal.data} onSave={handleSave} onClose={() => setModal(null)} loading={saving} />
      )}
      {toast && (
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Section Unité Locale ────────────────────────────────────────────────────

function AdminUniteLocale() {
  const [ul, setUl] = useState(null);
  const [form, setForm] = useState({ nom: '', telephone: '', email: '', adresse: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    apiClient.get('/unite-locale')
      .then(({ data }) => {
        setUl(data);
        setForm({
          nom: data.nom || '',
          telephone: data.telephone || '',
          email: data.email || '',
          adresse: data.adresse || '',
        });
      })
      .catch(() => showToast('Erreur chargement', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleSave = async () => {
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const { data } = await apiClient.put('/unite-locale', form);
      setUl(data);
      showToast('Informations mises à jour');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement…</p></div>
  );

  return (
    <div>
      <div className="card p-5 space-y-4 max-w-lg">
        <p className="text-sm text-gray-500">
          Ces informations sont affichées aux personnes qui scannent le QR code de vos lots.
        </p>
        <div>
          <label className="label">Nom de l'unité locale *</label>
          <input className="input" value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" type="tel" placeholder="ex : 01 39 50 12 34" value={form.telephone}
            onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" placeholder="ex : contact@croix-rouge.fr" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Adresse</label>
          <input className="input" placeholder="ex : 12 rue de la Paroisse, 78000 Versailles" value={form.adresse}
            onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
        </div>
        <div className="flex justify-end pt-2">
          <button className="btn-primary" disabled={!form.nom.trim() || saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
      {toast && (
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Section Unités Locales (SUPER_ADMIN) ────────────────────────────────────

function AdminUnitesLocales() {
  const [uls, setUls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchUls = useCallback(async () => {
    setLoading(true);
    try { const { data } = await apiClient.get('/unite-locale'); setUls(Array.isArray(data) ? data : [data]); }
    catch { setUls([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUls(); }, [fetchUls]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.data) {
        await apiClient.put(`/unite-locale/${modal.data.id}`, form);
      } else {
        await apiClient.post('/unite-locale', form);
      }
      await fetchUls();
      showToast(modal.data ? 'UL modifiee' : 'UL creee');
      setModal(null);
    } catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (ul) => {
    if (!confirm(`Supprimer l'unite locale "${ul.nom}" et TOUTES ses donnees ? Cette action est irreversible.`)) return;
    try { await apiClient.delete(`/unite-locale/${ul.id}`); await fetchUls(); showToast('Unite locale supprimee'); }
    catch (e) { showToast(e.response?.data?.error || 'Erreur', 'error'); }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal({ type: 'ul' })}>
          <IconPlus size={16} /> Nouvelle unite locale
        </button>
      </div>
      {loading ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement...</p></div>
      ) : uls.length === 0 ? (
        <div className="card text-center py-8 text-gray-400"><p className="text-sm">Aucune unite locale.</p></div>
      ) : (
        <div className="space-y-3">
          {uls.map(ul => (
            <div key={ul.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-crf-texte">{ul.nom}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {[ul.adresse, ul.telephone, ul.email].filter(Boolean).join(' | ') || 'Aucune info'}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button className="btn-icon p-1.5" onClick={() => setModal({ type: 'ul', data: ul })}><IconEdit size={14} /></button>
                <button className="btn-icon p-1.5 hover:text-red-500" onClick={() => handleDelete(ul)}><IconTrash size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal?.type === 'ul' && (
        <ULModal initial={modal.data} onSave={handleSave} onClose={() => setModal(null)} loading={saving} />
      )}
      {toast && (
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function ULModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    nom: initial?.nom || '',
    telephone: initial?.telephone || '',
    email: initial?.email || '',
    adresse: initial?.adresse || '',
  });

  return (
    <Modal title={initial ? 'Modifier l\'unite locale' : 'Nouvelle unite locale'} onClose={onClose}>
      <div>
        <label className="label">Nom *</label>
        <input className="input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
      </div>
      <div>
        <label className="label">Telephone</label>
        <input className="input" type="tel" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div>
        <label className="label">Adresse</label>
        <input className="input" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!form.nom.trim() || loading} onClick={() => onSave(form)}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Section Alertes Email ──────────────────────────────────────────────────

function AdminAlertes() {
  const [emails, setEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    apiClient.get('/unite-locale')
      .then(({ data }) => {
        const ul = Array.isArray(data) ? data[0] : data;
        setEmails(ul?.destinataires_alertes || []);
      })
      .catch(() => showToast('Erreur chargement', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (emails.includes(email)) return;
    setEmails(prev => [...prev, email]);
    setEmailInput('');
    setDirty(true);
  };

  const removeEmail = (email) => {
    setEmails(prev => prev.filter(e => e !== email));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/unite-locale/alertes', { destinataires_alertes: emails });
      setDirty(false);
      showToast('Destinataires mis à jour');
    } catch (e) {
      showToast(e.response?.data?.error || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="card text-center py-8 text-gray-400"><p className="text-sm">Chargement...</p></div>
  );

  return (
    <div>
      <div className="card p-5 space-y-4 max-w-lg">
        <p className="text-sm text-gray-500">
          Configurez les adresses email qui recevront les alertes de stock bas et de péremption.
        </p>

        <div>
          <label className="label">Ajouter un destinataire</label>
          <div className="flex gap-2">
            <input type="email" className="input flex-1" placeholder="email@exemple.fr" value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} />
            <button type="button" className="btn-secondary text-sm px-3" onClick={addEmail}>Ajouter</button>
          </div>
        </div>

        {emails.length > 0 ? (
          <div>
            <label className="label">Destinataires ({emails.length})</label>
            <div className="flex flex-wrap gap-1.5">
              {emails.map(email => (
                <span key={email} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-full">
                  {email}
                  <button type="button" className="text-gray-400 hover:text-red-500 text-sm leading-none"
                    onClick={() => removeEmail(email)}>&times;</button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700">
              Aucun destinataire. Les alertes de stock et de péremption ne seront pas envoyées par email.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button className="btn-primary" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
      {toast && (
        <div role="alert" aria-live="polite" className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-card shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Navigation Admin ─────────────────────────────────────────────────────────

function AdminNav() {
  const { isSuperAdmin } = useAuth();

  const links = [
    { to: '/admin/articles',       label: 'Articles' },
    { to: '/admin/utilisateurs',  label: 'Utilisateurs' },
    { to: '/admin/planification', label: 'Planification' },
    { to: '/admin/alertes',       label: 'Alertes email' },
    ...(isSuperAdmin ? [{ to: '/admin/unites-locales', label: 'Unites locales' }] : []),
    ...(isSuperAdmin ? [{ to: '/admin/unite-locale',  label: 'Modifier UL' }] : []),
    { to: '/admin/logs',          label: 'Logs' },
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
      <PageHeader title="Administration" subtitle="Gestion complete du catalogue et des utilisateurs" />
      <AdminNav />
      <Routes>
        <Route index element={
          <div className="card text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">&#9881;&#65039;</p>
            <p className="text-sm">Selectionnez une section dans le menu.</p>
          </div>
        } />
        <Route path="articles"        element={<AdminArticles />} />
        <Route path="utilisateurs"   element={<AdminUtilisateurs />} />
        <Route path="planification"  element={<AdminPlanification />} />
        <Route path="alertes"        element={<AdminAlertes />} />
        <Route path="unites-locales" element={<AdminUnitesLocales />} />
        <Route path="unite-locale"   element={<AdminUniteLocale />} />
        <Route path="logs"           element={<AdminLogs />} />
      </Routes>
    </div>
  );
}
