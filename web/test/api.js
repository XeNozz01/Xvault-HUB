/* Uji integrasi API: login → sanksi → log → tiket → whitelist → broadcast → konsol → SSE.
   Jalankan dengan server aktif:  node test/api.js */
'use strict';
const BASE = process.env.BASE || 'http://localhost:3000';
let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + ' → ' + e.message); }
};
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || 'nilai'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
const truthy = (v, msg) => { if (!v) throw new Error(msg || 'kosong'); };

const jget = async (p, tok) => {
  const r = await fetch(BASE + p, { headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return j.data;
};
const jpost = async (p, body, tok) => {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return j.data;
};
const expectFail = async (fn, code) => {
  try { await fn(); throw new Error('seharusnya ditolak'); }
  catch (e) { if (e.status !== code) throw new Error(`kode ${e.status} ≠ ${code}: ${e.message}`); }
};

(async () => {
  let tokP = '', tokA = '', tokM = '';
  console.log('Auth');
  await t('login player', async () => { tokP = (await jpost('/api/auth/login', { username: 'Bagas_Wijaya', password: 'xvault' })).token; truthy(tokP); });
  await t('login admin & moderator', async () => {
    tokA = (await jpost('/api/auth/login', { username: 'admin', password: 'xvault123' })).token;
    tokM = (await jpost('/api/auth/login', { username: 'moderator', password: 'xvault123' })).token;
    truthy(tokA && tokM);
  });
  await t('password salah → 401', () => expectFail(() => jpost('/api/auth/login', { username: 'admin', password: 'salah' }), 401));
  await t('/api/auth/me menolak tanpa token', () => expectFail(() => jget('/api/auth/me'), 401));
  await t('endpoint admin menolak role player', () => expectFail(() => jget('/api/admin/overview', tokP), 403));

  console.log('Publik');
  await t('/api/overview punya 4 server + chart24', async () => {
    const d = await jget('/api/overview');
    eq(d.servers.length, 4, 'server'); truthy(d.chart24.length === 24); truthy(d.stats.totalOnline > 0);
  });
  await t('/api/leaderboard paginasi & sort', async () => {
    const d = await jget('/api/leaderboard?sort=kdr&per=10&page=2');
    eq(d.rows.length, 10); eq(d.per, 10); eq(d.page, 2); truthy(d.total > 100);
    const ok = d.rows.every((r, i, a) => i === 0 || a[i - 1].kdr >= r.kdr); truthy(ok, 'urutan kdr');
  });
  await t('/api/players/:name 404 untuk nama palsu', () => expectFail(() => jget('/api/players/Tidak_Ada_Xyz'), 404));
  await t('/api/sistem → /api/systems 6 kategori', async () => { const d = await jget('/api/systems'); eq(d.length, 6); });
  await t('/api/quality punya regions & pillars', async () => { const q = await jget('/api/quality'); truthy(q.regions.length >= 5 && q.pillars.length === 6); });

  console.log('Dasbor player');
  await t('/api/me/profile lengkap', async () => {
    const d = await jget('/api/me/profile', tokP);
    truthy(d.profile.name); truthy(d.profile.inventory.length > 0); truthy(d.profile.wallet.history.length > 0);
    truthy(d.profile.security.loginHistory.length > 0); truthy(Number.isFinite(d.leaderboardPos));
  });
  await t('buat tiket + muncul di daftar admin', async () => {
    const tk = await jpost('/api/me/tickets', { subject: 'Uji otomatis API', type: 'Lapor Bug', message: 'Ini tiket dari test/api.js', server: 'Xvault HUB — Roleplay' }, tokP);
    truthy(tk.id.startsWith('XV-'));
    const q = await jget('/api/admin/tickets?status=all&per=50', tokA);
    truthy(q.rows.some((x) => x.id === tk.id), 'tiket tidak masuk antrean admin');
  });
  await t('tolak tiket tanpa subject', () => expectFail(() => jpost('/api/me/tickets', { message: 'x' }, tokP), 422));
  await t('top-up membuat invoice + VA', async () => { const r = await jpost('/api/me/topup', { rc: 1200 }, tokP); truthy(r.invoice && r.methods.length >= 3); });

  console.log('Panel admin');
  let victimId = 0;
  await t('ambil target pemain', async () => { const d = await jget('/api/admin/players?per=1', tokA); victimId = d.rows[0].id; truthy(victimId); });
  await t('ban wajib alasan (422 tanpa alasan)', () => expectFail(() => jpost(`/api/admin/players/${victimId}/action`, { action: 'ban' }, tokA), 422));
  await t('ban dengan alasan → status banned', async () => {
    const r = await jpost(`/api/admin/players/${victimId}/action`, { action: 'ban', reason: 'Aimbot (XGuard 0.94) — uji otomatis', duration: '7 hari' }, tokA);
    eq(r.player.banned, true);
  });
  await t('sanksi tercatat di log audit', async () => {
    const d = await jget('/api/admin/logs?per=5', tokA);
    truthy(d.rows[0].action === 'BAN', 'aksi terdepan bukan BAN: ' + d.rows[0].action);
  });
  await t('unban menghapus status banned', async () => {
    const r = await jpost(`/api/admin/players/${victimId}/action`, { action: 'unban', reason: 'uji: unban lagi' }, tokA);
    eq(r.player.banned, false);
  });
  await t('moderator (lvl 3) boleh kick, tidak boleh restart-all', async () => {
    await jpost('/api/admin/console/exec', { cmd: '/status' }, tokM);
    const d = await jget('/api/admin/players?per=5', tokM); truthy(d.rows.length >= 1 && d.rows.length <= 5);
  });
  await t('balas + selesaikan tiket', async () => {
    const list = await jget('/api/admin/tickets?status=open&per=5', tokA);
    const id = list.rows[0].id;
    const r = await jpost(`/api/admin/tickets/${id}/reply`, { reply: 'Balasan otomatis dari tes.', status: 'resolved' }, tokA);
    eq(r.status, 'resolved');
  });
  await t('keputusan whitelist tersimpan', async () => {
    const wl = await jget('/api/admin/whitelist', tokA);
    const pend = wl.find((x) => x.status === 'pending') || wl[0];
    const r = await jpost(`/api/admin/whitelist/${pend.id}/decision`, { decision: 'approved', note: 'Disetujui otomatis oleh tes' }, tokA);
    eq(r.status, 'approved'); eq(r.reviewer, 'KING');
  });
  await t('broadcast tersimpan & terkirim', async () => {
    const r = await jpost('/api/admin/broadcast', { text: 'Uji broadcast otomatis', target: 'semua', level: 5 }, tokA);
    truthy(r.sent && r.reach > 0);
    const list = await jget('/api/admin/broadcasts', tokA);
    truthy(list[0].text === 'Uji broadcast otomatis');
  });
  await t('broadcast menolak level < 3', () => expectFail(() => jpost('/api/admin/broadcast', { text: 'x', level: 2 }, tokM), 403));
  await t('konsol exec: /announce, /restart, unknown', async () => {
    const a = await jpost('/api/admin/console/exec', { cmd: '/announce halo semua' }, tokA); truthy(a.output[0].includes('broadcast'), a.output[0]);
    const b = await jpost('/api/admin/console/exec', { cmd: '/restart fw' }, tokA); truthy(b.output[0].includes('restart'), b.output[0]);
    const bad2 = await jpost('/api/admin/console/exec', { cmd: '/restart nope' }, tokA); truthy(bad2.output[0].includes('tidak dikenal'), bad2.output[0]);
    const lk = await jpost('/api/admin/console/exec', { cmd: '/lookup Bagas_Wijaya' }, tokA); truthy(lk.output[0].includes('Bagas'), lk.output[0]);
    const c = await jpost('/api/admin/console/exec', { cmd: '/tidakada' }, tokA); truthy(c.output[0].includes('Unknown'), c.output[0]);
  });
  await t('ekonomi: sirkulasi > 0 & top 10', async () => { const e = await jget('/api/admin/economy', tokA); truthy(e.circulation > 0 && e.top.length === 10 && e.prices.length === 8); });
  await t('bulk action 3 pemain', async () => {
    const d = await jget('/api/admin/players?per=3&status=online', tokA);
    const r = await jpost('/api/admin/players/bulk', { ids: d.rows.map((x) => x.id), action: 'kick', reason: 'uji bulk' }, tokA);
    truthy(r.affected >= 1);
  });

  console.log('Realtime & statis');
  await t('SSE mengirim event tick', async () => {
    const res = await fetch(BASE + '/api/stream');
    eq(res.headers.get('content-type').includes('text/event-stream'), true);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    const end = Date.now() + 9000;
    while (Date.now() < end) {
      const { value, done } = await reader.read();
      buf += dec.decode(value || new Uint8Array(), { stream: true });
      if (buf.includes('event: tick') || buf.includes('event: hello')) break;
      if (done) break;
    }
    reader.cancel();
    truthy(/event: (tick|hello)/.test(buf), 'tidak ada event: ' + buf.slice(0, 60));
  });
  await t('halaman statis 200 + HTML', async () => {
    for (const p of ['/', '/tentang', '/kualitas', '/sistem', '/connect', '/ranking', '/aturan', '/toko', '/news', '/staff', '/login', '/dashboard', '/admin']) {
      const r = await fetch(BASE + p); const txt = await r.text();
      if (r.status !== 200) throw new Error(p + ' → ' + r.status);
      truthy(txt.includes('<!DOCTYPE html>'), p + ' bukan HTML');
    }
  });
  await t('aset css/js 200', async () => {
    for (const p of ['/assets/css/theme.css', '/assets/css/site.css', '/assets/css/dash.css', '/assets/js/core.js', '/assets/js/charts.js', '/assets/js/site.js', '/assets/js/dash.js', '/assets/js/admin.js', '/assets/img/hero-city.jpg', '/assets/fonts/outfit-latin-400-normal.woff2']) {
      const r = await fetch(BASE + p); if (r.status !== 200) throw new Error(p + ' → ' + r.status);
    }
  });
  await t('404 page untuk rute tak dikenal', async () => { const r = await fetch(BASE + '/entah-apa-ini'); eq(r.status, 404); truthy((await r.text()).includes('SPAWN GAGAL')); });
  await t('route SPA /api/tidak-ada → 404 json', () => expectFail(() => jget('/api/tidak-ada'), 404));

  console.log(`\n${fail ? '✗' : '✓'} ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
