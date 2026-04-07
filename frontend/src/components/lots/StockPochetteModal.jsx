import React, { useState, useMemo } from 'react';
import Modal from '../Modal';

export default function StockPochetteModal({ pochetteNom, articles, initial, onSave, onClose, loading }) {
  const [articleId, setArticleId] = useState(initial?.article?.id || '');
  const [search, setSearch] = useState('');
  const [quantiteMinimum, setQuantiteMinimum] = useState(initial?.quantite_minimum ?? 0);
  const [lots, setLots] = useState(
    initial?.lots?.length
      ? initial.lots.map(l => ({
          label: l.label || '',
          date_peremption: l.date_peremption ? String(l.date_peremption).slice(0, 10) : '',
          quantite: l.quantite ?? 0,
        }))
      : [{ label: '', date_peremption: '', quantite: 1 }]
  );

  const article = articles.find(a => a.id === articleId);

  // U7: articles filtrés par recherche
  const filteredArticles = useMemo(() => {
    if (!search.trim()) return articles;
    const q = search.toLowerCase();
    return articles.filter(a =>
      a.nom.toLowerCase().includes(q) || a.categorie?.toLowerCase().includes(q)
    );
  }, [articles, search]);

  const addLot    = () => setLots(l => [...l, { label: '', date_peremption: '', quantite: 1 }]);
  const removeLot = (i) => setLots(l => l.filter((_, j) => j !== i));
  const updateLot = (i, field, val) =>
    setLots(l => l.map((lot, j) => j === i ? { ...lot, [field]: val } : lot));
  const totalLots = lots.reduce((s, l) => s + (parseInt(l.quantite) || 0), 0);

  const handleSave = () => {
    const lotsClean = lots
      .map(l => ({
        label: (l.label || '').trim(),
        date_peremption: l.date_peremption || null,
        quantite: parseInt(l.quantite) || 0,
      }))
      .filter(l => l.label || l.date_peremption || l.quantite > 0);
    // B4 fix: envoie aussi quantite_minimum
    onSave({
      articleId,
      quantite_actuelle: totalLots,
      quantite_minimum: parseInt(quantiteMinimum) || 0,
      lots: lotsClean,
    });
  };

  return (
    <Modal title={`${initial ? 'Modifier' : 'Ajouter'} un article — ${pochetteNom}`} onClose={onClose}>
      <div>
        <label className="label">Article *</label>
        {initial ? (
          <div className="input bg-gray-100 text-sm text-gray-600">{article?.nom} ({article?.categorie})</div>
        ) : (
          <>
            <input
              className="input text-sm"
              placeholder="Rechercher un article par nom ou catégorie..."
              value={search}
              onChange={e => { setSearch(e.target.value); setArticleId(''); }}
            />
            {search.trim() ? (
              <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
                {filteredArticles.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">Aucun article trouvé</p>
                ) : (
                  filteredArticles.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => { setArticleId(a.id); setSearch(a.nom); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${
                        articleId === a.id ? 'bg-crf-rouge/5 text-crf-rouge font-medium' : 'text-gray-700'
                      }`}>
                      {a.nom} <span className="text-xs text-gray-400">({a.categorie})</span>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
                {articles.map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setArticleId(a.id); setSearch(a.nom); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${
                      articleId === a.id ? 'bg-crf-rouge/5 text-crf-rouge font-medium' : 'text-gray-700'
                    }`}>
                    {a.nom} <span className="text-xs text-gray-400">({a.categorie})</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {articleId && (
        <>
          {/* B4 fix: champ minimum requis */}
          <div>
            <label className="label">Quantite minimum requise</label>
            <input
              type="number"
              min="0"
              className="input w-24"
              value={quantiteMinimum}
              onChange={e => setQuantiteMinimum(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label mb-0">
                Lots
                {article?.est_perimable && <span className="ml-2 text-xs text-orange-500 font-normal">— article perimable</span>}
              </p>
              <button type="button" onClick={addLot} className="text-xs text-crf-rouge hover:underline font-medium">
                + Ajouter un lot
              </button>
            </div>
            <div className="space-y-2">
              {lots.map((lot, i) => (
                <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-md p-2">
                  <div className="flex-1 space-y-1">
                    <input className="input text-xs py-1" placeholder="Reference lot (optionnel)"
                      value={lot.label} onChange={e => updateLot(i, 'label', e.target.value)} />
                    <div className="flex gap-2">
                      {article?.est_perimable && (
                        <input type="date" className="input text-xs py-1 flex-1"
                          value={lot.date_peremption || ''} onChange={e => updateLot(i, 'date_peremption', e.target.value)} />
                      )}
                      <input type="number" min="0" className="input text-xs py-1 w-20"
                        placeholder="Qte" value={lot.quantite} onChange={e => updateLot(i, 'quantite', e.target.value)} />
                    </div>
                  </div>
                  {lots.length > 1 && (
                    <button onClick={() => removeLot(i)} className="text-gray-300 hover:text-red-500 mt-1" aria-label={`Retirer le lot ${i + 1}`}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Quantite totale : <strong>{totalLots}</strong></p>
          </div>
        </>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" disabled={!articleId || totalLots < 0 || loading} onClick={handleSave}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}
