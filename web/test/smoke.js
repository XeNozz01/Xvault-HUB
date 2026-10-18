/* Smoke test: jalankan tiap halaman di jsdom + server hidup, kumpulkan error JS.
   Cara pakai: node test/smoke.js  (server harus jalan di :3000) */
'use strict';
const { JSDOM, VirtualConsole } = require('jsdom');

const BASE = process.env.BASE || 'http://localhost:3000';
const PAGES = ['/', '/tentang', '/kualitas', '/sistem', '/connect', '/ranking', '/aturan', '/toko', '/news', '/staff', '/login'];
const CHECKS = {
  '/': [['#home-server-grid', 4], ['#home-top tbody', 6], ['#home-news', 3], ['#home-systems', 3], ['#home-faq', 3]],
  '/connect': [['#connect-grid', 4], ['#connect-live tbody', 4], ['#port-table', 4]],
  '/kualitas': [['#quality-pillars', 6], ['#region-list', 8], ['#incident-list', 3], ['#uptime-strip', 20], ['#hw-list', 5], ['#q-console', 5]],
  '/sistem': [['#sys-list', 1], ['#sys-stats', 4]],
  '/ranking': [['#podium', 3], ['#rank-body', 20], ['#rank-pager', 4], ['#rank-head', 10]],
  '/aturan': [['#rules-list', 4], ['#faq-list', 5], ['#wl-form', 1]],
  '/toko': [['#store-packs', 4], ['#store-items', 8], ['#vote-list', 4], ['#pay-methods', 4]],
  '/news': [['#news-list', 1], ['#news-cats', 4]],
  '/staff': [['#team-grid', 8], ['#staff-sessions', 4], ['#contact-cards', 2]],
  '/tentang': [['#about-factions', 6], ['#about-stats', 6]],
};
const DASH = [
  { path: '/dashboard', checks: [['#kpi-slot', 6], ['#prof-head-slot', 1], ['#srv-slot', 3], ['#badge-slot', 6], ['#inv-slot', 20], ['#tx-body', 6], ['#veh-slot', 1], ['#app-slot', 2], ['#tiket-list', 1], ['#prefs-slot', 5], ['#news-slot', 3]] },
  { path: '/admin', checks: [['#ov-kpis', 6], ['#ov-servers', 3], ['#ov-console', 5], ['#donut-slot', 1], ['#live-servers', 3], ['#live-players', 10], ['#pl-body', 12], ['#flag-list', 4], ['#appeal-list', 2], ['#tk-list', 5], ['#wl-body', 8], ['#ec-top', 8], ['#ec-prices', 6], ['#bc-list', 1], ['#lg-body', 15]] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getToken(user, pass) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }),
  });
  const j = await res.json();
  if (!j.ok) throw new Error('login gagal: ' + JSON.stringify(j));
  return j.data.token;
}

async function run(path, token, checks) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/Could not parse CSS|Not implemented/.test(e.message)) errors.push('jsdom: ' + (e.detail ? e.detail.message || e.detail : e.message).slice(0, 220)); });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 220)));
  const dom = await JSDOM.fromURL(BASE + path, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      if (token) window.localStorage.setItem('xvault_token', token);
      const of = window.fetch;
      window.fetch = (u, o) => (of || fetch)(String(u).startsWith('http') ? u : BASE + u, o);
      window.Request = window.Request || globalThis.Request;
      window.IntersectionObserver = class { observe() { } unobserve() { } disconnect() { } };
      window.addEventListener('error', (e) => errors.push('window.onerror: ' + (e.error ? e.error.stack.split('\n').slice(0, 3).join(' | ') : e.message)));
      window.addEventListener('unhandledrejection', (e) => errors.push('unhandled: ' + (e.reason && (e.reason.stack || e.reason.message) || String(e.reason)).slice(0, 220)));
    },
  });
  await sleep(token ? 2600 : 1800);
  const doc = dom.window.document;
  // klik setiap tab/sidebar view + beberapa interaksi untuk memancing error render
  const clicks = [...doc.querySelectorAll('#side-nav a[data-view]')];
  for (const c of clicks) { try { c.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); } catch (e) { errors.push('click ' + (c.dataset.view || c.textContent) + ': ' + e.message); } await sleep(320); }
  for (const sel of ['[data-filter=\"Beta\"]', '[data-tab-rank=\"kills\"]', '#rank-body tr', '#news-cats button:nth-child(2)', '#store-packs .btn', '#sys-list .sys-cat > button', '#rules-list .rule', '#faq-list summary']) {
    const n = doc.querySelector(sel);
    if (n) { try { n.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); } catch (e) { errors.push('click ' + sel + ': ' + e.message); } await sleep(260); }
  }
  if (path === '/ranking') { const tr = doc.querySelector('#rank-body tr'); if (tr) { tr.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(900); if (!doc.querySelector('.modal-box')) errors.push('modal pemain tidak muncul di /ranking'); } }
  if (path === '/admin') {
    const info = doc.querySelector('#live-players tr:first-child .acts button'); if (info) { info.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(700); if (!doc.querySelector('.modal-box')) errors.push('kartu pemain tidak muncul di /admin'); const x = doc.querySelector('.modal-head button'); x && x.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(300); }
    const kick = doc.querySelector('#live-players tr:first-child .acts button:nth-child(2)'); if (kick) { kick.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(900); if (!doc.querySelector('.modal-box textarea')) errors.push('modal sanksi tidak muncul di /admin'); }
    const form = doc.querySelector('#con-form'); if (form) { const inp = doc.querySelector('#con-input'); inp.value = '/announce uji smoke'; form.dispatchEvent(new dom.window.Event('submit', { bubbles: true })); await sleep(600); }
  }
  if (path === '/dashboard') {
    const t = doc.querySelector('#tiket-list .list-row'); if (t) { t.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(300); }
    const s2 = doc.querySelector('#inv-slot .slot'); if (s2) { s2.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(300); }
    const tp = doc.querySelector('#topup-slot .btn'); if (tp) { tp.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(700); if (!doc.querySelector('.modal-box')) errors.push('modal topup tidak muncul di /dashboard'); }
  }
  await sleep(500);
  const found = {};
  for (const [sel, min] of checks || []) {
    const q0 = doc.querySelector(sel); const n = (q0 ? Math.max(1, q0.children.length) : 0) + (sel.includes('tbody')||sel.includes('body')?(q0?0:0):0);
    found[sel] = n;
    if (n < min) errors.push(`CHECK ${path} ${sel}: ${n} < ${min}`);
  }
  // nav & footer
  const noLayout = /data-layout="none"/.test(doc.documentElement.innerHTML);
  if (!noLayout && !doc.querySelector('.nav')) errors.push('nav tidak ter-render di ' + path);
  if (!noLayout && !doc.querySelector('.foot')) errors.push('footer tidak ter-render di ' + path);
  dom.window.close();
  return errors;
}

(async () => {
  let all = [];
  for (const p of PAGES) {
    const checks = CHECKS[p];
    const errs = await run(p, null, checks);
    all = all.concat(errs);
    console.log(`${errs.length ? '✗' : '✓'} ${p.padEnd(12)} ${errs.length ? errs.join('\n   ') : 'ok ' + (checks ? checks.map(([s]) => `${s}:${''}`).join(' ') : '')}`);
  }
  let tokP = '', tokA = '';
  try { tokP = await getToken('Bagas_Wijaya', 'xvault'); tokA = await getToken('admin', 'xvault123'); } catch (e) { console.log('login test gagal:', e.message); }
  for (const dsh of DASH) {
    const errs = await run(dsh.path, dsh.path === '/admin' ? tokA : tokP, dsh.checks);
    all = all.concat(errs);
    console.log(`${errs.length ? '✗' : '✓'} ${dsh.path.padEnd(12)} ${errs.length ? errs.join('\n   ') : 'ok'}`);
  }
  // tanpa token → harus redirect ke login (jsdom tidak follow ke /login otomatis, cukup cek tidak error)
  const noAuth = await run('/dashboard', null, null);
  console.log(`${noAuth.length ? '✗' : '✓'} /dashboard (tanpa login)`);
  console.log('\nTOTAL MASALAH:', all.length);
  process.exit(all.length ? 1 : 0);
})();
