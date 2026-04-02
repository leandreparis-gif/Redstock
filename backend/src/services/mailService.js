'use strict';
/**
 * mailService.js — Service d'envoi d'emails via Resend
 */
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dev_key'
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const MAIL_FROM = process.env.MAIL_FROM || 'pharmasecours@croix-rouge.fr';

async function send({ to, subject, html }) {
  if (!resend) {
    console.log('[mailService] (dev) Email non envoyé — RESEND_API_KEY non configurée');
    console.log(`[mailService] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: MAIL_FROM, to, subject, html });
    console.log(`[mailService] Email envoyé à ${to} — ${subject}`);
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
        <p style="margin:4px 0 0">PharmaSecours — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>L'article <strong>${articleNom}</strong> expire le <strong>${dateFormatee}</strong>.</p>
        <p>Localisation : ${localisation}</p>
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
        <p style="margin:4px 0 0">PharmaSecours — Croix-Rouge française</p>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
        <p>L'article <strong>${articleNom}</strong> est en stock insuffisant.</p>
        <p>Quantité actuelle : <strong>${quantiteActuelle}</strong> (minimum requis : ${quantiteMin})</p>
        <p>Localisation : ${localisation}</p>
      </div>
    </div>`,
  });
}

module.exports = { alertePeremption, alerteStockBas };
