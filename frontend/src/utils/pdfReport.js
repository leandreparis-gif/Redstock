import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const CRF_ROUGE = [227, 6, 19]; // #E30613
const GRIS_TEXTE = [55, 65, 81];
const GRIS_CLAIR = [156, 163, 175];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Entête CRF commune ──────────────────────────────────────────────────────

function drawHeader(doc, title, subtitle) {
  // Bande rouge
  doc.setFillColor(...CRF_ROUGE);
  doc.rect(0, 0, 210, 32, 'F');

  // Croix blanche (logo simplifié)
  doc.setFillColor(255, 255, 255);
  doc.rect(14, 8, 4, 16, 'F'); // vertical
  doc.rect(8, 12, 16, 4, 'F'); // horizontal

  // Texte entête
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 30, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle || 'Croix-Rouge francaise — RedStock', 30, 24);

  return 40; // y position après l'entête
}

function drawFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS_CLAIR);
    doc.text(
      `RedStock — Document genere automatiquement le ${fmtDateTime(new Date())}`,
      105, 287, { align: 'center' },
    );
    doc.text(`Page ${i}/${pageCount}`, 195, 287, { align: 'right' });
  }
}

// ─── Rapport de contrôle ─────────────────────────────────────────────────────

export function generateRapportControle({
  type,           // 'LOT' | 'TIROIR'
  nomElement,     // nom du lot ou "Armoire > Tiroir"
  date,           // date du contrôle
  controleur,     // prénom
  qualification,  // PSE2 etc.
  statut,         // CONFORME | NON_CONFORME | PARTIEL
  items,          // [{ article_nom, pochette_nom?, qty_attendue, qty_reelle, expired, issues }]
  anomalies,      // texte des remarques
}) {
  const doc = new jsPDF();
  let y = drawHeader(doc, 'Rapport de controle', `Croix-Rouge francaise — RedStock`);

  // Infos générales
  doc.setFontSize(10);
  doc.setTextColor(...GRIS_TEXTE);
  doc.setFont('helvetica', 'normal');

  const infos = [
    ['Type de controle', type === 'LOT' ? 'Lot' : 'Tiroir'],
    ['Element controle', nomElement],
    ['Date', fmtDateTime(date || new Date())],
    ['Controleur', `${controleur}${qualification ? ` (${qualification})` : ''}`],
  ];

  for (const [label, value] of infos) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} :`, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 6;
  }

  y += 4;

  // Statut
  const statutLabels = {
    CONFORME: { text: 'CONFORME', color: [22, 163, 74] },
    PARTIEL: { text: 'PARTIELLEMENT CONFORME', color: [234, 179, 8] },
    NON_CONFORME: { text: 'NON CONFORME', color: [220, 38, 38] },
  };
  const s = statutLabels[statut] || statutLabels.CONFORME;

  doc.setFillColor(...s.color);
  doc.roundedRect(15, y, 180, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(s.text, 105, y + 7, { align: 'center' });

  y += 18;

  // Tableau des articles
  doc.setTextColor(...GRIS_TEXTE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detail du controle', 15, y);
  y += 4;

  const tableBody = items.map(item => {
    let statutItem = 'OK';
    if (item.expired) statutItem = 'Perime';
    else if (item.qty_reelle < item.qty_attendue) statutItem = 'Manquant';

    return [
      item.article_nom,
      item.pochette_nom || '—',
      String(item.qty_attendue),
      String(item.qty_reelle),
      statutItem,
    ];
  });

  doc.autoTable({
    startY: y,
    head: [['Article', 'Pochette / Tiroir', 'Qte attendue', 'Qte reelle', 'Statut']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: CRF_ROUGE, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'Manquant') data.cell.styles.textColor = [220, 38, 38];
        else if (data.cell.raw === 'Perime') data.cell.styles.textColor = [220, 38, 38];
        else data.cell.styles.textColor = [22, 163, 74];
      }
    },
    margin: { left: 15, right: 15 },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Anomalies
  if (anomalies && anomalies.trim()) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS_TEXTE);
    doc.text('Remarques / Anomalies :', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(anomalies, 175);
    doc.text(lines, 15, y);
    y += lines.length * 4 + 6;
  }

  // Signature
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y + 5, 100, y + 5);
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_CLAIR);
  doc.text(`Controle effectue par ${controleur} le ${fmtDateTime(date || new Date())}`, 15, y + 10);

  drawFooter(doc);

  const fileName = `rapport_controle_${type.toLowerCase()}_${fmtDate(date || new Date()).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}

// ─── Main courante ───────────────────────────────────────────────────────────

export function generateMainCourante({
  uniteLocaleNom,
  controles,       // [{ date_controle, type, controleur_prenom, controleur_qualification, statut, remarques }]
  dateDebut,
  dateFin,
  stats,           // { total, conforme, nonConforme, partiel, tauxConformite }
}) {
  const doc = new jsPDF();
  let y = drawHeader(doc, 'Main courante', `${uniteLocaleNom} — Croix-Rouge francaise`);

  // Période
  doc.setFontSize(10);
  doc.setTextColor(...GRIS_TEXTE);
  doc.setFont('helvetica', 'normal');
  const periodeText = dateDebut && dateFin
    ? `Periode : du ${fmtDate(dateDebut)} au ${fmtDate(dateFin)}`
    : 'Tous les controles';
  doc.text(periodeText, 15, y);
  y += 8;

  // Résumé
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resume', 15, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const resumeData = [
    ['Total controles', String(stats?.total || controles.length)],
    ['Taux de conformite', `${stats?.tauxConformite || 0} %`],
    ['Conformes', String(stats?.conforme || 0)],
    ['Non conformes', String(stats?.nonConforme || 0)],
    ['Partiels', String(stats?.partiel || 0)],
  ];

  doc.autoTable({
    startY: y,
    body: resumeData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 30 },
    },
    margin: { left: 15, right: 15 },
    tableWidth: 80,
  });

  y = doc.lastAutoTable.finalY + 10;

  // Tableau principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GRIS_TEXTE);
  doc.text('Historique des controles', 15, y);
  y += 4;

  const statutLabel = { CONFORME: 'Conforme', NON_CONFORME: 'Non conforme', PARTIEL: 'Partiel' };

  const tableBody = controles.map(c => [
    fmtDateTime(c.date_controle),
    c.type === 'LOT' ? 'Lot' : 'Tiroir',
    c.controleur_prenom,
    c.controleur_qualification || '—',
    statutLabel[c.statut] || c.statut,
    (c.remarques || '—').substring(0, 60) + (c.remarques?.length > 60 ? '...' : ''),
  ]);

  doc.autoTable({
    startY: y,
    head: [['Date', 'Type', 'Controleur', 'Qualif.', 'Statut', 'Remarques']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: CRF_ROUGE, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 'auto' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'Non conforme') data.cell.styles.textColor = [220, 38, 38];
        else if (data.cell.raw === 'Partiel') data.cell.styles.textColor = [234, 179, 8];
        else data.cell.styles.textColor = [22, 163, 74];
      }
    },
    margin: { left: 15, right: 15 },
  });

  drawFooter(doc);

  const dateSuffix = fmtDate(new Date()).replace(/\//g, '-');
  doc.save(`main_courante_${dateSuffix}.pdf`);
}

// ─── Export PDF du tableau de bord ──────────────────────────────────────────

export function generateDashboardPDF({
  kpis,               // { alertesActives, peremptions, stocksBas, tauxConformite, totalControles }
  stockParCategorie,  // [{ categorie, total, minimum, pourcentage }]
  alertes,            // [{ article, type, message }]
  prochainsControles, // [{ nom, dernierControle, dernierStatut, prochainControle, enRetard }]
}) {
  const doc = new jsPDF();
  let y = drawHeader(doc, 'Tableau de bord — Pharmacie', 'Croix-Rouge francaise — RedStock');

  // Date du rapport
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_CLAIR);
  doc.text(`Rapport genere le ${fmtDateTime(new Date())}`, 15, y);
  y += 10;

  // ── KPIs ────────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GRIS_TEXTE);
  doc.text('Indicateurs cles', 15, y);
  y += 6;

  const kpiData = [
    ['Alertes actives', String(kpis.alertesActives)],
    ['Peremptions', String(kpis.peremptions)],
    ['Stocks bas', String(kpis.stocksBas)],
    ['Taux de conformite', `${kpis.tauxConformite} %`],
    ['Controles (30 derniers jours)', String(kpis.totalControles)],
  ];

  doc.autoTable({
    startY: y,
    body: kpiData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 40, halign: 'center' },
    },
    margin: { left: 15, right: 15 },
    tableWidth: 100,
  });

  y = doc.lastAutoTable.finalY + 12;

  // ── Stock par catégorie ──────────────────────────────────────────────────────
  if (stockParCategorie && stockParCategorie.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRIS_TEXTE);
    doc.text('Stock par categorie', 15, y);
    y += 4;

    const stockBody = stockParCategorie.map(cat => {
      let statut = 'OK';
      if (cat.pourcentage < 50) statut = 'Critique';
      else if (cat.pourcentage < 100) statut = 'Attention';
      return [cat.categorie, String(cat.total), String(cat.minimum), `${cat.pourcentage} %`, statut];
    });

    doc.autoTable({
      startY: y,
      head: [['Categorie', 'Stock actuel', 'Minimum', 'Taux', 'Statut']],
      body: stockBody,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: CRF_ROUGE, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Critique') data.cell.styles.textColor = [220, 38, 38];
          else if (data.cell.raw === 'Attention') data.cell.styles.textColor = [234, 179, 8];
          else data.cell.styles.textColor = [22, 163, 74];
        }
      },
      margin: { left: 15, right: 15 },
    });

    y = doc.lastAutoTable.finalY + 12;
  }

  // ── Alertes actives ──────────────────────────────────────────────────────────
  if (alertes && alertes.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRIS_TEXTE);
    doc.text(`Alertes actives (${alertes.length})`, 15, y);
    y += 4;

    const typeLabel = { PEREMPTION: 'Peremption', STOCK_BAS: 'Stock bas' };
    const alerteBody = alertes.map(a => [
      a.article?.nom || 'Inconnu',
      typeLabel[a.type] || a.type,
      (a.message || '').substring(0, 80),
    ]);

    doc.autoTable({
      startY: y,
      head: [['Article', 'Type', 'Detail']],
      body: alerteBody,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: CRF_ROUGE, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'center', cellWidth: 25 },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'Peremption') data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [234, 179, 8];
        }
      },
      margin: { left: 15, right: 15 },
    });

    y = doc.lastAutoTable.finalY + 12;
  }

  // ── Prochains contrôles ──────────────────────────────────────────────────────
  if (prochainsControles && prochainsControles.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRIS_TEXTE);
    doc.text('Prochains controles planifies', 15, y);
    y += 4;

    const controleBody = prochainsControles.map(c => [
      c.nom,
      c.dernierControle ? fmtDate(c.dernierControle) : 'Jamais',
      c.dernierStatut === 'CONFORME' ? 'Conforme' : c.dernierStatut === 'NON_CONFORME' ? 'Non conforme' : c.dernierStatut === 'PARTIEL' ? 'Partiel' : '—',
      fmtDate(c.prochainControle),
      c.enRetard ? 'En retard' : 'OK',
    ]);

    doc.autoTable({
      startY: y,
      head: [['Element', 'Dernier controle', 'Statut', 'Prochain prevu', 'Etat']],
      body: controleBody,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: CRF_ROUGE, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'En retard') data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [22, 163, 74];
        }
      },
      margin: { left: 15, right: 15 },
    });
  }

  drawFooter(doc);

  const dateSuffix = fmtDate(new Date()).replace(/\//g, '-');
  doc.save(`dashboard_pharmacie_${dateSuffix}.pdf`);
}
