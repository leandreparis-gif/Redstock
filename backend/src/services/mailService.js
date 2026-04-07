'use strict';
/**
 * mailService.js — Service d'envoi d'emails via Resend
 * Design premium RedStock / Croix-Rouge française
 */
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dev_key'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const MAIL_FROM = process.env.MAIL_FROM || 'noreply@redstock.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const LOGO_URL = `${FRONTEND_URL}/logo-crf.svg`;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── TEMPLATE DE BASE ────────────────────────────────────────────────────────

function emailLayout({ title, preheader, accentColor = '#E30613', body }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${escapeHtml(title)}</title>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>` : ''}
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Logo -->
        <tr><td style="padding:0 0 24px;text-align:center">
          <img src="${LOGO_URL}" alt="Croix-Rouge française" height="40" style="height:40px"/>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

            <!-- Accent bar -->
            <tr><td style="height:4px;background:${accentColor};font-size:0;line-height:0">&nbsp;</td></tr>

            <!-- Content -->
            <tr><td style="padding:36px 32px 32px">
              ${body}
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5">
            RedStock · Croix-Rouge française
          </p>
          <p style="margin:4px 0 0;font-size:11px;color:#d4d4d8;line-height:1.5">
            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function badge(text, bgColor, textColor) {
  return `<span style="display:inline-block;background:${bgColor};color:${textColor};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.3px">${text}</span>`;
}

function infoRow(label, value, isAlt = false) {
  return `<tr>
    <td style="padding:10px 14px;color:#71717a;font-size:13px;${isAlt ? 'background:#fafafa;' : ''}">${label}</td>
    <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#18181b;${isAlt ? 'background:#fafafa;' : ''}">${value}</td>
  </tr>`;
}

function infoTable(rows) {
  const html = rows.map((r, i) => infoRow(r[0], r[1], i % 2 === 1)).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;overflow:hidden;margin:20px 0">${html}</table>`;
}

function ctaButton(text, href, color = '#E30613') {
  return `<div style="text-align:center;margin:28px 0 8px">
    <a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.3px">${text}</a>
  </div>`;
}

// ─── ENVOI ────────────────────────────────────────────────────────────────────

async function send({ to, subject, html }) {
  if (!resend) {
    console.log('[mailService] (dev) Email non envoyé — RESEND_API_KEY non configurée');
    console.log(`[mailService] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const { data, error } = await resend.emails.send({ from: MAIL_FROM, to, subject, html });
    if (error) {
      console.error(`[mailService] Erreur Resend:`, JSON.stringify(error));
      return;
    }
    console.log(`[mailService] Email envoyé à ${to} — ${subject} (id: ${data?.id})`);
  } catch (err) {
    console.error('[mailService] Erreur envoi email:', err.message);
  }
}

// ─── BIENVENUE ───────────────────────────────────────────────────────────────

async function bienvenueUtilisateur({ to, prenom, login }) {
  await send({
    to,
    subject: `Bienvenue sur RedStock, ${prenom} !`,
    html: emailLayout({
      title: 'Bienvenue sur RedStock',
      preheader: `${prenom}, votre compte RedStock est prêt.`,
      body: `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Bienvenue, ${escapeHtml(prenom)} !</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6">
          Votre compte a été créé avec succès. Vous pouvez dès maintenant accéder à RedStock pour gérer le stock médical de votre unité.
        </p>
        ${infoTable([
          ['Identifiant', escapeHtml(login)],
          ['Mot de passe', 'Communiqué par votre administrateur'],
        ])}
        ${ctaButton('Accéder à RedStock', FRONTEND_URL)}
        <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.5">
          Pensez à modifier votre mot de passe dès votre première connexion.
        </p>`,
    }),
  });
}

// ─── RÉINITIALISATION MOT DE PASSE ──────────────────────────────────────────

async function resetPassword({ to, prenom, resetLink }) {
  await send({
    to,
    subject: `Réinitialisation de votre mot de passe`,
    html: emailLayout({
      title: 'Réinitialisation du mot de passe',
      preheader: `${prenom}, réinitialisez votre mot de passe RedStock.`,
      body: `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Mot de passe oublié ?</h1>
        <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.6">
          Bonjour <strong>${escapeHtml(prenom)}</strong>,
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </p>
        ${ctaButton('Choisir un nouveau mot de passe', resetLink)}
        <div style="background:#fafafa;border-radius:10px;padding:14px 16px;margin:24px 0 0">
          <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5">
            Ce lien expire dans <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
          </p>
        </div>`,
    }),
  });
}

// ─── ALERTES STOCK ───────────────────────────────────────────────────────────

async function alertePeremption({ articleNom, datePeremption, localisation, destinataires }) {
  const dateFormatee = new Date(datePeremption).toLocaleDateString('fr-FR');
  await send({
    to: destinataires,
    subject: `Péremption proche — ${articleNom}`,
    html: emailLayout({
      title: 'Alerte péremption',
      preheader: `${articleNom} expire le ${dateFormatee}.`,
      accentColor: '#dc2626',
      body: `
        <div style="margin:0 0 20px">${badge('PÉREMPTION', '#fef2f2', '#dc2626')}</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Article bientôt périmé</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6">
          Un article de votre stock arrive à date de péremption. Pensez à le remplacer.
        </p>
        ${infoTable([
          ['Article', `<strong>${escapeHtml(articleNom)}</strong>`],
          ['Date de péremption', `<span style="color:#dc2626;font-weight:700">${dateFormatee}</span>`],
          ['Localisation', escapeHtml(localisation)],
        ])}
        ${ctaButton('Voir le stock', FRONTEND_URL + '/armoires')}`,
    }),
  });
}

async function alerteStockBas({ articleNom, quantiteActuelle, quantiteMin, localisation, destinataires }) {
  await send({
    to: destinataires,
    subject: `Stock bas — ${articleNom}`,
    html: emailLayout({
      title: 'Alerte stock bas',
      preheader: `${articleNom} est en stock insuffisant.`,
      accentColor: '#f59e0b',
      body: `
        <div style="margin:0 0 20px">${badge('STOCK BAS', '#fffbeb', '#b45309')}</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Stock insuffisant</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6">
          Un article est en dessous du seuil minimum. Pensez à le réapprovisionner.
        </p>
        ${infoTable([
          ['Article', `<strong>${escapeHtml(articleNom)}</strong>`],
          ['Quantité actuelle', `<span style="color:#dc2626;font-weight:700">${quantiteActuelle}</span>`],
          ['Minimum requis', `${quantiteMin}`],
          ['Localisation', escapeHtml(localisation)],
        ])}
        ${ctaButton('Voir le stock', FRONTEND_URL + '/armoires')}`,
    }),
  });
}

// ─── UNIFORMES ───────────────────────────────────────────────────────────────

async function notifPretUniforme({ uniformeNom, taille, beneficiaire, qualification, dateRetourPrevue, destinataires }) {
  const dateFormatee = new Date(dateRetourPrevue).toLocaleDateString('fr-FR');
  await send({
    to: destinataires,
    subject: `Prêt d'uniforme — ${uniformeNom} (${taille})`,
    html: emailLayout({
      title: 'Prêt d\'uniforme',
      preheader: `${beneficiaire}, un uniforme vous a été prêté.`,
      accentColor: '#2563eb',
      body: `
        <div style="margin:0 0 20px">${badge('PRÊT', '#eff6ff', '#2563eb')}</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Un uniforme vous a été prêté</h1>
        <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.6">
          Bonjour <strong>${escapeHtml(beneficiaire)}</strong>,
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6">
          Un uniforme vous a été prêté. Merci de le retourner en bon état à la date prévue.
        </p>
        ${infoTable([
          ['Uniforme', `<strong>${escapeHtml(uniformeNom)}</strong> — ${escapeHtml(taille)}`],
          ['Date de retour', `<strong style="color:#2563eb">${dateFormatee}</strong>`],
        ])}
        <div style="background:#eff6ff;border-radius:10px;padding:14px 16px;margin:20px 0 0">
          <p style="margin:0;font-size:12px;color:#1e40af;line-height:1.5">
            Pensez à retourner l'uniforme avant le <strong>${dateFormatee}</strong>. En cas d'empêchement, contactez votre responsable.
          </p>
        </div>`,
    }),
  });
}

async function notifRetourUniforme({ uniformeNom, taille, beneficiaire, enRetard, remarques, destinataires }) {
  const retardText = enRetard ? ` ${badge('EN RETARD', '#fef2f2', '#dc2626')}` : '';
  await send({
    to: destinataires,
    subject: `Retour uniforme — ${uniformeNom} (${taille}) par ${beneficiaire}`,
    html: emailLayout({
      title: 'Retour d\'uniforme',
      preheader: `${uniformeNom} retourné par ${beneficiaire}.`,
      accentColor: '#16a34a',
      body: `
        <div style="margin:0 0 20px">${badge('RETOUR', '#f0fdf4', '#16a34a')} ${retardText}</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Uniforme retourné</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6">
          Un uniforme a été retourné avec succès.
        </p>
        ${infoTable([
          ['Uniforme', `<strong>${escapeHtml(uniformeNom)}</strong> — ${escapeHtml(taille)}`],
          ['Bénéficiaire', escapeHtml(beneficiaire)],
          ...(remarques ? [['Remarques', escapeHtml(remarques)]] : []),
        ])}
        ${ctaButton('Gérer les uniformes', FRONTEND_URL + '/uniformes', '#16a34a')}`,
    }),
  });
}

async function notifRetardUniforme({ uniformeNom, taille, beneficiaire, qualification, dateRetourPrevue, joursRetard, destinataires }) {
  const dateFormatee = new Date(dateRetourPrevue).toLocaleDateString('fr-FR');
  await send({
    to: destinataires,
    subject: `Rappel — Uniforme ${uniformeNom} à retourner (+${joursRetard}j)`,
    html: emailLayout({
      title: 'Retard de retour d\'uniforme',
      preheader: `${beneficiaire}, votre uniforme est en retard de ${joursRetard} jours.`,
      accentColor: '#dc2626',
      body: `
        <div style="margin:0 0 20px">${badge(`${joursRetard}J DE RETARD`, '#fef2f2', '#dc2626')}</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Uniforme à retourner</h1>
        <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.6">
          Bonjour <strong>${escapeHtml(beneficiaire)}</strong>,
        </p>
        <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6">
          L'uniforme qui vous a été prêté devait être retourné le <strong>${dateFormatee}</strong>. Merci de le rapporter dès que possible.
        </p>
        ${infoTable([
          ['Uniforme', `<strong>${escapeHtml(uniformeNom)}</strong> — ${escapeHtml(taille)}`],
          ['Retour prévu le', `<span style="color:#dc2626;font-weight:700">${dateFormatee}</span>`],
          ['Retard', `<span style="color:#dc2626;font-weight:800">${joursRetard} jour${joursRetard > 1 ? 's' : ''}</span>`],
        ])}
        <div style="background:#fef2f2;border-radius:10px;padding:14px 16px;margin:20px 0 0">
          <p style="margin:0;font-size:12px;color:#991b1b;line-height:1.5">
            Si vous avez déjà retourné cet uniforme, merci d'ignorer ce message. Sinon, contactez votre responsable pour organiser le retour.
          </p>
        </div>`,
    }),
  });
}

// ─── RAPPEL CONTRÔLE ─────────────────────────────────────────────────────────

async function rappelControle({ uniteLocaleNom, items, destinataires }) {
  const rows = items.map((item, i) => {
    const typeBadge = item.type === 'LOT'
      ? badge('Lot', '#f0fdf4', '#166534')
      : badge('Tiroir', '#fff7ed', '#9a3412');
    const dernier = item.dernierControle
      ? new Date(item.dernierControle).toLocaleDateString('fr-FR')
      : `<span style="color:#dc2626;font-weight:600">Jamais</span>`;
    return `<tr${i % 2 === 1 ? ' style="background:#fafafa"' : ''}>
      <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#18181b">${escapeHtml(item.nom)}</td>
      <td style="padding:10px 14px;text-align:center">${typeBadge}</td>
      <td style="padding:10px 14px;text-align:center;font-size:13px;color:#52525b">${dernier}</td>
    </tr>`;
  }).join('');

  await send({
    to: destinataires,
    subject: `Rappel contrôle — ${items.length} élément${items.length > 1 ? 's' : ''} à vérifier`,
    html: emailLayout({
      title: 'Rappel de contrôle',
      preheader: `${items.length} élément(s) à contrôler pour ${uniteLocaleNom}.`,
      accentColor: '#7c3aed',
      body: `
        <div style="margin:0 0 20px">${badge(`${items.length} À CONTRÔLER`, '#f5f3ff', '#7c3aed')}</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#18181b">Contrôles en attente</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6">
          Les éléments suivants de <strong>${escapeHtml(uniteLocaleNom)}</strong> n'ont pas été contrôlés dans les délais prévus.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;overflow:hidden;margin:20px 0">
          <thead>
            <tr style="background:#fafafa;border-bottom:1px solid #f0f0f0">
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px">Élément</th>
              <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px">Type</th>
              <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px">Dernier contrôle</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${ctaButton('Effectuer les contrôles', FRONTEND_URL + '/lots', '#7c3aed')}`,
    }),
  });
}

module.exports = { alertePeremption, alerteStockBas, notifPretUniforme, notifRetourUniforme, notifRetardUniforme, rappelControle, bienvenueUtilisateur, resetPassword };
