'use strict';
/**
 * mailService.js — Service d'envoi d'emails via Resend
 */
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dev_key'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const MAIL_FROM = process.env.MAIL_FROM || 'pharmasecours@croix-rouge.fr';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

async function alertePeremption({ articleNom, datePeremption, localisation, destinataires }) {
  const dateFormatee = new Date(datePeremption).toLocaleDateString('fr-FR');
  await send({
    to: destinataires,
    subject: `Péremption proche — ${articleNom}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Alerte Péremption</h2>
        <p style="margin:4px 0 0">RedStock — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>L'article <strong>${escapeHtml(articleNom)}</strong> expire le <strong>${dateFormatee}</strong>.</p>
        <p>Localisation : ${escapeHtml(localisation)}</p>
        <p style="color:#6b7280;font-size:14px">Pensez à remplacer cet article dès que possible.</p>
      </div>
    </div>`,
  });
}

async function alerteStockBas({ articleNom, quantiteActuelle, quantiteMin, localisation, destinataires }) {
  await send({
    to: destinataires,
    subject: `Stock bas — ${articleNom}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Alerte Stock bas</h2>
        <p style="margin:4px 0 0">RedStock — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>L'article <strong>${escapeHtml(articleNom)}</strong> est en stock insuffisant.</p>
        <p>Quantité actuelle : <strong>${quantiteActuelle}</strong> (minimum requis : ${quantiteMin})</p>
        <p>Localisation : ${escapeHtml(localisation)}</p>
      </div>
    </div>`,
  });
}

// ─── UNIFORMES ────────────────────────────────────────────────────────────────

async function notifPretUniforme({ uniformeNom, taille, beneficiaire, qualification, dateRetourPrevue, destinataires }) {
  const dateFormatee = new Date(dateRetourPrevue).toLocaleDateString('fr-FR');
  await send({
    to: destinataires,
    subject: `Prêt uniforme — ${uniformeNom} (${taille}) à ${beneficiaire}`,
    html: `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Prêt d'uniforme</h2>
        <p style="margin:4px 0 0">RedStock — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>Un uniforme a été <strong>prêté</strong> :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Uniforme</td><td style="padding:8px;font-weight:600">${escapeHtml(uniformeNom)} — ${escapeHtml(taille)}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Bénéficiaire</td><td style="padding:8px;font-weight:600">${escapeHtml(beneficiaire)} (${escapeHtml(qualification)})</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Retour prévu le</td><td style="padding:8px;font-weight:600">${dateFormatee}</td></tr>
        </table>
      </div>
    </div>`,
  });
}

async function notifRetourUniforme({ uniformeNom, taille, beneficiaire, enRetard, remarques, destinataires }) {
  const retardTag = enRetard ? ' <span style="color:#E30613;font-weight:700">(en retard)</span>' : '';
  await send({
    to: destinataires,
    subject: `Retour uniforme — ${uniformeNom} (${taille}) par ${beneficiaire}`,
    html: `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto">
      <div style="background:#16a34a;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Retour d'uniforme</h2>
        <p style="margin:4px 0 0">RedStock — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>Un uniforme a été <strong>retourné</strong>${retardTag} :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Uniforme</td><td style="padding:8px;font-weight:600">${escapeHtml(uniformeNom)} — ${escapeHtml(taille)}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Bénéficiaire</td><td style="padding:8px;font-weight:600">${escapeHtml(beneficiaire)}</td></tr>
          ${remarques ? `<tr><td style="padding:8px;color:#6b7280">Remarques</td><td style="padding:8px">${escapeHtml(remarques)}</td></tr>` : ''}
        </table>
      </div>
    </div>`,
  });
}

async function notifRetardUniforme({ uniformeNom, taille, beneficiaire, qualification, dateRetourPrevue, joursRetard, destinataires }) {
  const dateFormatee = new Date(dateRetourPrevue).toLocaleDateString('fr-FR');
  await send({
    to: destinataires,
    subject: `Retard retour uniforme — ${uniformeNom} (${taille}) — ${beneficiaire} (+${joursRetard}j)`,
    html: `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Retard de retour d'uniforme</h2>
        <p style="margin:4px 0 0">RedStock — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p style="color:#E30613;font-weight:600;font-size:16px">Un uniforme n'a pas été rendu à la date prévue.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Uniforme</td><td style="padding:8px;font-weight:600">${escapeHtml(uniformeNom)} — ${escapeHtml(taille)}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Bénéficiaire</td><td style="padding:8px;font-weight:600">${escapeHtml(beneficiaire)} (${escapeHtml(qualification)})</td></tr>
          <tr><td style="padding:8px;color:#6b7280">Retour prévu le</td><td style="padding:8px;font-weight:600;color:#E30613">${dateFormatee}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Retard</td><td style="padding:8px;font-weight:700;color:#E30613">${joursRetard} jour${joursRetard > 1 ? 's' : ''}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px">Veuillez contacter le bénéficiaire pour organiser le retour.</p>
      </div>
    </div>`,
  });
}

// ─── RAPPEL CONTRÔLE ─────────────────────────────────────────────────────────

async function rappelControle({ uniteLocaleNom, items, destinataires }) {
  const rows = items.map((item, i) => {
    const bg = i % 2 === 1 ? 'background:#f9fafb' : '';
    const typeBadge = item.type === 'LOT'
      ? '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:12px">Lot</span>'
      : '<span style="background:#ffedd5;color:#9a3412;padding:2px 8px;border-radius:12px;font-size:12px">Tiroir</span>';
    const dernier = item.dernierControle
      ? new Date(item.dernierControle).toLocaleDateString('fr-FR')
      : '<span style="color:#E30613;font-weight:600">Jamais</span>';
    return `<tr style="${bg}">
      <td style="padding:8px;font-weight:600">${escapeHtml(item.nom)}</td>
      <td style="padding:8px;text-align:center">${typeBadge}</td>
      <td style="padding:8px;text-align:center">${dernier}</td>
    </tr>`;
  }).join('');

  await send({
    to: destinataires,
    subject: `Rappel contrôle — ${items.length} élément${items.length > 1 ? 's' : ''} à contrôler`,
    html: `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Rappel de contrôle</h2>
        <p style="margin:4px 0 0">RedStock — ${escapeHtml(uniteLocaleNom)}</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>Les éléments suivants n'ont pas été contrôlés dans les délais prévus :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="padding:8px;text-align:left;color:#6b7280;font-size:13px">Élément</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-size:13px">Type</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-size:13px">Dernier contrôle</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">
          Merci de procéder aux contrôles dès que possible.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">
          Cet email est généré automatiquement par RedStock.
        </p>
      </div>
    </div>`,
  });
}

// ─── BIENVENUE ───────────────────────────────────────────────────────────────

async function bienvenueUtilisateur({ to, prenom, login }) {
  await send({
    to,
    subject: `Bienvenue sur RedStock, ${prenom} !`,
    html: `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Bienvenue sur RedStock</h2>
        <p style="margin:4px 0 0">Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
        <p>Votre compte a été créé avec succès. Vous pouvez dès maintenant vous connecter à RedStock.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#6b7280">Identifiant</td><td style="padding:8px;font-weight:600">${escapeHtml(login)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px">Votre mot de passe vous a été communiqué par votre administrateur. Pensez à le changer dès votre première connexion.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">
          Cet email est généré automatiquement par RedStock.
        </p>
      </div>
    </div>`,
  });
}

// ─── RÉINITIALISATION MOT DE PASSE ──────────────────────────────────────────

async function resetPassword({ to, prenom, resetLink }) {
  await send({
    to,
    subject: `Réinitialisation de votre mot de passe — RedStock`,
    html: `<div style="font-family:Poppins,sans-serif;max-width:600px;margin:auto">
      <div style="background:#E30613;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Réinitialisation du mot de passe</h2>
        <p style="margin:4px 0 0">RedStock — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${escapeHtml(resetLink)}" style="background:#E30613;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color:#6b7280;font-size:14px">Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px">
          Cet email est généré automatiquement par RedStock.
        </p>
      </div>
    </div>`,
  });
}

module.exports = { alertePeremption, alerteStockBas, notifPretUniforme, notifRetourUniforme, notifRetardUniforme, rappelControle, bienvenueUtilisateur, resetPassword };
