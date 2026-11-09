'use strict';
const { html, raw } = require('../../html');
const { authPage } = require('../layout');
const { csrfField, icon } = require('../components');
const { countries } = require('../../data/catalog');

function shell(ctx, { title, sub, form, aside = true }) {
  const t = ctx.t;
  return authPage(ctx, {
    title, description: sub,
    body: html`
<div class="auth-wrap">
  <section class="auth-card glass-light reveal">
    <h1>${title}</h1>
    <p class="muted">${sub}</p>
    ${form}
  </section>
  ${aside ? html`<aside class="auth-aside reveal">
    <p class="eyebrow">${t('Why investors choose us', 'Pourquoi nous choisir')}</p>
    <ul class="ticks">
      <li>${icon('check', 16)} ${t('Weekly income credited to your balance', 'Revenus crédités chaque semaine')}</li>
      <li>${icon('check', 16)} ${t('From 100 USD, in crypto or cash', 'Dès 100 USD, en crypto ou en cash')}</li>
      <li>${icon('check', 16)} ${t('Five checks on every project', 'Cinq contrôles sur chaque projet')}</li>
      <li>${icon('check', 16)} ${t('One company (SPV) per project', 'Une société (SPV) par projet')}</li>
    </ul>
    <div class="auth-ticker"><span>${t('Live demo payout', 'Versement démo en direct')}</span><b class="num" data-ticker data-rate="0.0003">$0.0000</b></div>
  </aside>` : ''}
</div>`,
  });
}

const err = (e) => (e ? html`<p class="error show" role="alert">${e}</p>` : '');
const pw = (ctx, id, name, label, ac) => html`<div class="field"><label for="${id}">${label}</label><div class="pw-wrap"><input id="${id}" name="${name}" type="password" required autocomplete="${ac}" minlength="${name === 'password' && ac === 'current-password' ? 1 : 10}" maxlength="200"><button type="button" class="pw-toggle" data-pw-toggle aria-label="${ctx.t('Show password', 'Afficher le mot de passe')}">👁</button></div></div>`;

function login(ctx, { error, email = '', next = '', showDemo = false }) {
  const t = ctx.t;
  return shell(ctx, {
    title: t('Welcome back', 'Bon retour'),
    sub: t('Log in to see your portfolio, payouts and reservations.', 'Connectez-vous pour voir votre portefeuille, vos versements et réservations.'),
    form: html`<form method="post" action="${ctx.u('/login')}" class="stack" data-validate novalidate>
      ${csrfField(ctx)}<input type="hidden" name="next" value="${next}">
      ${err(error)}
      <div class="field"><label for="l-email">Email</label><input id="l-email" name="email" type="email" required autocomplete="email" value="${email}" maxlength="160"></div>
      ${pw(ctx, 'l-pw', 'password', t('Password', 'Mot de passe'), 'current-password')}
      <div class="row-between"><a class="link" href="${ctx.u('/forgot-password')}">${t('Forgot password?', 'Mot de passe oublié ?')}</a></div>
      <button class="btn btn-gold btn-block btn-lg" type="submit">${t('Log in', 'Se connecter')}</button>
      <p class="muted center">${t('New here?', 'Nouveau ?')} <a class="link" href="${ctx.u('/register')}${next ? '?next=' + encodeURIComponent(next) : ''}">${t('Open a free account', 'Ouvrir un compte gratuit')}</a></p>
      ${showDemo ? html`<details class="demo-box"><summary>${t('Demo accounts', 'Comptes de démo')}</summary>
        <p><b>${t('Investor', 'Investisseur')}:</b> demo@investnreturns.com / Demo!2026invest</p>
        <p class="muted">${t('Admin credentials are set by the server operator (see README).', "Les identifiants admin sont définis par l'opérateur (voir README).")}</p>
      </details>` : ''}
    </form>`,
  });
}

function register(ctx, { error, values = {}, next = '' }) {
  const t = ctx.t;
  const sel = (a, b) => (a === b ? raw('selected') : '');
  return shell(ctx, {
    title: t('Open your free account', 'Ouvrez votre compte gratuit'),
    sub: t('Two minutes. No fee. You can verify your identity afterwards.', 'Deux minutes. Sans frais. Vous vérifierez votre identité ensuite.'),
    form: html`<form method="post" action="${ctx.u('/register')}" class="stack" data-validate novalidate>
      ${csrfField(ctx)}<input type="hidden" name="next" value="${next}">
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      ${err(error)}
      <div class="field"><label for="r-name">${t('Full name', 'Nom complet')}</label><input id="r-name" name="name" required autocomplete="name" maxlength="100" value="${values.name || ''}"></div>
      <div class="field"><label for="r-email">Email</label><input id="r-email" name="email" type="email" required autocomplete="email" maxlength="160" value="${values.email || ''}"></div>
      <div class="grid-2">
        <div class="field"><label for="r-phone">${t('WhatsApp / phone', 'WhatsApp / téléphone')}</label><input id="r-phone" name="phone" type="tel" autocomplete="tel" maxlength="40" value="${values.phone || ''}"></div>
        <div class="field"><label for="r-country">${t('Country of residence', 'Pays de résidence')}</label><select id="r-country" name="country" required><option value="">—</option>
          ${Object.entries(countries).map(([code, n]) => html`<option value="${code}" ${sel(values.country, code)}>${t.o(n)}</option>`)}<option value="OT" ${sel(values.country, 'OT')}>${t('Other', 'Autre')}</option></select></div>
      </div>
      ${pw(ctx, 'r-pw', 'password', t('Password (10+ characters, letters and numbers)', 'Mot de passe (10+ caractères, lettres et chiffres)'), 'new-password')}
      <div class="pw-meter" aria-hidden="true"><i data-pw-meter></i></div>
      <label class="consent"><input type="checkbox" name="consent" value="1" required> <span>${t('I accept the', "J'accepte les")} <a class="link" href="${ctx.u('/legal/terms')}" target="_blank" rel="noopener">${t('terms', 'conditions')}</a> ${t('and understand that returns are not guaranteed and I may lose capital.', 'et je comprends que les rendements ne sont pas garantis et que je peux perdre du capital.')}</span></label>
      <button class="btn btn-gold btn-block btn-lg" type="submit">${t('Create my account', 'Créer mon compte')}</button>
      <p class="muted center">${t('Already registered?', 'Déjà inscrit ?')} <a class="link" href="${ctx.u('/login')}${next ? '?next=' + encodeURIComponent(next) : ''}">${t('Log in', 'Se connecter')}</a></p>
    </form>`,
  });
}

function forgot(ctx, { sent, error }) {
  const t = ctx.t;
  return shell(ctx, {
    title: t('Reset your password', 'Réinitialiser le mot de passe'),
    sub: t('Enter your email and we will send you a reset link valid for one hour.', 'Saisissez votre email, nous vous enverrons un lien valable une heure.'),
    aside: false,
    form: sent
      ? html`<div class="result show">${t('If an account exists for this email, a reset link is on its way.', 'Si un compte existe pour cet email, un lien de réinitialisation est en route.')}</div><p class="center"><a class="link" href="${ctx.u('/login')}">${t('Back to login', 'Retour à la connexion')}</a></p>`
      : html`<form method="post" action="${ctx.u('/forgot-password')}" class="stack" data-validate novalidate>${csrfField(ctx)}${err(error)}
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" required autocomplete="email" maxlength="160"></div>
        <button class="btn btn-gold btn-block" type="submit">${t('Send reset link', 'Envoyer le lien')}</button>
        <p class="center"><a class="link" href="${ctx.u('/login')}">${t('Back to login', 'Retour à la connexion')}</a></p></form>`,
  });
}

function reset(ctx, { token, error, invalid }) {
  const t = ctx.t;
  return shell(ctx, {
    title: t('Choose a new password', 'Choisissez un nouveau mot de passe'),
    sub: t('All your other sessions will be signed out.', 'Toutes vos autres sessions seront déconnectées.'),
    aside: false,
    form: invalid
      ? html`<p class="error show">${t('This link is invalid or has expired.', 'Ce lien est invalide ou a expiré.')}</p><a class="btn btn-ghost btn-block" href="${ctx.u('/forgot-password')}">${t('Request a new link', 'Demander un nouveau lien')}</a>`
      : html`<form method="post" action="${ctx.u('/reset-password')}" class="stack" data-validate novalidate>${csrfField(ctx)}<input type="hidden" name="token" value="${token}">${err(error)}
        ${pw(ctx, 'n-pw', 'password', t('New password', 'Nouveau mot de passe'), 'new-password')}
        <div class="pw-meter" aria-hidden="true"><i data-pw-meter></i></div>
        <button class="btn btn-gold btn-block" type="submit">${t('Save password', 'Enregistrer')}</button></form>`,
  });
}

module.exports = { login, register, forgot, reset };
