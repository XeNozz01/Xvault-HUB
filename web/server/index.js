/**
 * Xvault HUB — Website SA-MP (server + API)
 * ---------------------------------------------------------------
 * Jalankan:  npm start        (default port 3000)
 *            PORT=8080 npm start
 *
 * Rute:
 *   /*              → situs publik (multi-page)
 *   /dashboard      → dasbor player
 *   /admin          → dasbor admin
 *   /api/*          → JSON API + SSE live status
 *
 * Catatan: tidak ada DB. State disimpan di memori dan berubah
 * selama proses berjalan (ban/kick/tiket/broadcast tersimpan di memori).
 */

'use strict';

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');

const D = require('./data');

const PUB = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT ? +process.env.PORT : 3000;
const HOST = '0.0.0.0';
const SECRET = process.env.SECRET || 'xvault-demo-secret-change-me';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '120kb' }));

/* ---------------------------------------------------------------- *
 * Auth mini (HMAC token) — cukup untuk demo, bukan untuk produksi.
 * ---------------------------------------------------------------- */
const b64 = (s, enc = 'base64url') => Buffer.from(s).toString(enc);
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function makeToken(payload) {
  const body = b64(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 12 * 3600 * 1000 }));
  return `${body}.${sign(body)}`;
}
function readToken(tok) {
  if (!tok || typeof tok !== 'string' || !tok.includes('.')) return null;
  const [body, sig] = tok.split('.');
  if (sign(body) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const tok = hdr.startsWith('Bearer ') ? hdr.slice(7) : req.query.token;
  const data = readToken(tok);
  if (!data) return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
  req.user = data;
  return next();
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Akses khusus staff/admin.' });
  return next();
}

/* ---------------------------------------------------------------- *
 * Live runtime state (di memori)
 * ---------------------------------------------------------------- */
const t0 = Date.now();
const runtime = {
  bootedAt: t0,
  bans: 0,
  kicks: 0,
  mutes: 0,
  whitelistApproved: 0,
  whitelistRejected: 0,
  ticketsResolved: 0,
  broadcastCount: 0,
  playerOverrides: new Map(), // id -> patch
  extraTickets: [],
  extraLogs: [],
  restarts: {},
};

function applyOverrides(p) {
  const o = runtime.playerOverrides.get(p.id);
  return o ? { ...p, ...o } : p;
}
const allPlayers = () => D.state.players.map(applyOverrides);

const consoleLines = [];
const CONSOLE_MAX = 220;
const CONSOLE_TPL = [
  ['info', '[chat] {p}: /give {p2} 12000'],
  ['info', '[chat] {p}: "ada yang mau kerja trucker nggak?"'],
  ['game', '[faction] {p} bergabung ke LSPD (rank Cadet)'],
  ['game', '[turf] Zona 17 dikuasai oleh {f} — hold 42 menit'],
  ['econ', '[bank] ATM 0x12 transfer {n} → {p} sebesar ${amt}'],
  ['warn', '[xguard] flag 0.{n2} pada {p} (aim pattern) — awaiting review'],
  ['game', '[house] {p} membayar pajak properti ${amt}'],
  ['info', '[http] /players -> 200 OK ({n}ms)'],
  ['game', '[admin] {s} melakukan /akick {p} (alasan: RDM)'],
  ['info', '[net] player count: {online}/{slots} — ping {ping}ms'],
  ['err', '[anticheat] blokir mod texture tak dikenal dari {p2}'],
  ['game', '[vehicle] {p} membeli {v} (${amt}) di [24] x [7]'],
  ['info', '[voice] SAMVoice rooms: {n}, active speakers: {n2}'],
  ['game', '[ems] {p} revive {p2} di [132.4, -1704.2, 8.9]'],
];

function fakeConsoleLine() {
  const r = D.rng(Math.floor(Date.now() / 1000) + consoleLines.length * 31);
  const [lvl, tpl] = CONSOLE_TPL[Math.floor(r() * CONSOLE_TPL.length)];
  const ps = D.state.players;
  const a = ps[Math.floor(r() * ps.length)].name;
  const b = ps[Math.floor(r() * ps.length)].name;
  const line = tpl
    .replace('{p2}', b)
    .replace(/\{p\}/g, a)
    .replace('{s}', D.SESSIONS[Math.floor(r() * D.SESSIONS.length)].staff)
    .replace('{f}', D.FACTION_DEFS[Math.floor(r() * D.FACTION_DEFS.length)].short)
    .replace('{v}', ['Sultan RS', 'Elegy RH8', 'Buffalo ST', 'Cheetah', 'Patriot', 'Bravura'][Math.floor(r() * 6)])
    .replace('{amt}', (Math.floor(r() * 900) * 100).toLocaleString('id-ID'))
    .replace('{n2}', String(Math.floor(r() * 900) + 5))
    .replace('{online}', String(D.totals().online))
    .replace('{slots}', String(D.state.stats.totalSlots))
    .replace('{ping}', String(Math.floor(r() * 30) + 10))
    .replace('{n}', String(Math.floor(r() * 900) + 3));
  return { ts: new Date().toISOString(), level: lvl, text: line };
}
function pushConsole() {
  consoleLines.push(fakeConsoleLine());
  if (consoleLines.length > CONSOLE_MAX) consoleLines.shift();
}
for (let i = 0; i < 40; i++) pushConsole();

/* ---------------------------------------------------------------- *
 * SSE hub
 * ---------------------------------------------------------------- */
const sseClients = new Set();
function sseSend(event, data) {
  const buf = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(buf); } catch { /* ignore */ }
  }
}
setInterval(() => {
  pushConsole();
  const live = D.liveCounts();
  const payload = {
    at: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - t0) / 1000),
    servers: live,
    online: live.reduce((a, s) => a + s.online, 0),
    console: consoleLines.slice(-1),
    runtime: {
      bans: runtime.bans, kicks: runtime.kicks, mutes: runtime.mutes,
      whitelistApproved: runtime.whitelistApproved, whitelistRejected: runtime.whitelistRejected,
      ticketsResolved: runtime.ticketsResolved, broadcasts: runtime.broadcastCount,
    },
  };
  D.state.stats.totalOnline = payload.online;
  sseSend('tick', payload);
}, 3000);

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */
const ok = (res, data) => res.json({ ok: true, data });
const bad = (res, code, msg) => res.status(code).json({ ok: false, error: msg });
const logAdmin = (entry) => {
  runtime.extraLogs.unshift({ id: Date.now(), ts: new Date().toISOString(), result: 'sukses', ...entry });
};

function pag(arr, q) {
  const page = Math.max(1, +(q.page || 1));
  const per = clampNum(+(q.per || 25), 5, 100);
  const total = arr.length;
  return {
    page,
    per,
    total,
    pages: Math.max(1, Math.ceil(total / per)),
    rows: arr.slice((page - 1) * per, page * per),
  };
}
const clampNum = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));

/* ---------------------------------------------------------------- *
 * API — publik
 * ---------------------------------------------------------------- */

app.get('/api/health', (req, res) =>
  ok(res, {
    status: 'up',
    version: D.BRAND.version,
    node: process.version,
    uptimeSec: Math.floor((Date.now() - t0) / 1000),
    time: new Date().toISOString(),
  })
);

app.get('/api/config', (req, res) =>
  ok(res, {
    brand: D.BRAND,
    accounts: D.ACCOUNTS.map(({ password, ...a }) => a),
    hours: D.HOUR_SHAPE,
  })
);

app.get('/api/overview', (req, res) => {
  const live = D.liveCounts();
  const players = allPlayers();
  const online = live.reduce((a, s) => a + s.online, 0);
  const basePeak = D.SERVERS.reduce((a, x) => a + x.baseOnline, 0);
  const perHour = D.HOUR_SHAPE.map((w, i) => ({
    hour: String(i).padStart(2, '0') + ':00',
    value: Math.round(basePeak * (0.55 + w * 0.85)),
  }));
  ok(res, {
    stats: {
      ...D.state.stats,
      totalOnline: online,
      registered: D.state.stats.registered + Math.floor((Date.now() - t0) / 60000),
      bans30d: D.state.stats.bans30d + runtime.bans,
    },
    servers: D.SERVERS.map((s, i) => ({ ...s, ...live[i], fill: Math.round((live[i].online / s.maxPlayers) * 100) })),
    players: players.length,
    factions: D.FACTION_DEFS.map((f) => ({ ...f, members: f.member + Math.floor(f.slots * 0.05) })),
    chart24: perHour,
    live30d: D.LIVE_30D,
    news: D.NEWS.slice(0, 6),
    staffOnline: D.SESSIONS.filter((s) => s.role),
    console: consoleLines.slice(-14).reverse(),
    runtime: { bans: runtime.bans, kicks: runtime.kicks, mutes: runtime.mutes, restarts: runtime.restarts },
  });
});

app.get('/api/servers', (req, res) => {
  const live = D.liveCounts();
  ok(res, D.SERVERS.map((s, i) => ({ ...s, ...live[i], fill: Math.round((live[i].online / s.maxPlayers) * 100) })));
});

app.get('/api/live', (req, res) => ok(res, { at: new Date().toISOString(), servers: D.liveCounts(), onlineNames: D.onlineNames().slice(0, 40) }));

app.get('/api/quality', (req, res) => {
  const r = D.rng(Math.floor(Date.now() / 36e5));
  ok(res, {
    ...D.QUALITY,
    uptime30: +(D.QUALITY.uptime30 - r() * 0.02).toFixed(2),
    avgPing: Math.max(9, D.QUALITY.avgPing + Math.round(r() * 6 - 3)),
    series30: D.LIVE_30D.map((d) => ({ label: d.label, uptime: d.uptime, ping: d.avgPing, incidents: d.incidents, restarts: d.restarts })),
    hourSeries: D.HOUR_SHAPE.map((w, i) => ({ hour: i, ping: Math.round(14 + w * 13), loss: +(0.01 + w * 0.09).toFixed(2) })),
    comparison: [
      { metric: 'Uptime 30 hari', xvault: 99.94, avg: 98.1 },
      { metric: 'Ping rata-rata (ms)', xvault: 21, avg: 54 },
      { metric: 'Waktu restart (menit)', xvault: 0.8, avg: 3.4 },
      { metric: 'Respon tiket (menit)', xvault: 7.2, avg: 68 },
      { metric: 'Cheat terdeteksi / minggu', xvault: 31, avg: 6 },
    ],
  });
});

app.get('/api/systems', (req, res) => ok(res, D.SYSTEM_CATEGORIES));

app.get('/api/rules', (req, res) => ok(res, { rules: D.RULES, faq: D.FAQ }));

app.get('/api/news', (req, res) => {
  const q = req.query;
  let rows = D.NEWS.slice();
  if (q.cat) rows = rows.filter((n) => n.cat === q.cat);
  if (q.q) rows = rows.filter((n) => (n.title + n.desc).toLowerCase().includes(String(q.q).toLowerCase()));
  ok(res, { cats: [...new Set(D.NEWS.map((n) => n.cat))], rows, total: rows.length });
});

app.get('/api/factions', (req, res) => ok(res, D.FACTION_DEFS.map((f) => ({ ...f, ratio: Math.round((f.member / f.slots) * 100) }))));

app.get('/api/store', (req, res) => ok(res, { ...D.STORE, news: D.NEWS.filter((n) => n.cat === 'Event') }));

app.get('/api/vote', (req, res) => ok(res, { sites: D.VOTE_SITES, todayVotes: 1240 + Math.floor(Math.random() * 60), claimed: 3 }));

app.get('/api/staff', (req, res) => ok(res, { team: D.STAFF_TEAM, sessions: D.SESSIONS, contact: { discord: D.BRAND.discord, email: D.BRAND.email } }));

app.get('/api/leaderboard', (req, res) => {
  const q = req.query;
  const sortMap = {
    level: (a, b) => b.level - a.level,
    hours: (a, b) => b.hours - a.hours,
    score: (a, b) => b.score - a.score,
    kills: (a, b) => b.kills - a.kills,
    kdr: (a, b) => b.kdr - a.kdr,
    drift: (a, b) => b.driftScore - a.driftScore,
    race: (a, b) => b.races - a.races,
    turf: (a, b) => b.turfWins - a.turfWins,
    money: (a, b) => b.bank + b.money - (a.bank + a.money),
    arrests: (a, b) => b.arrests - a.arrests,
  };
  let rows = allPlayers().filter((p) => !p.banned);
  if (q.q) rows = rows.filter((p) => p.name.toLowerCase().includes(String(q.q).toLowerCase()));
  if (q.faction) rows = rows.filter((p) => p.faction === q.faction);
  if (q.mode === 'online') rows = rows.filter((p) => p.status === 'online');
  rows.sort(sortMap[q.sort] || sortMap.score);
  const page = pag(rows.map((p, i) => ({ rank: i + 1, ...p })), q);
  ok(res, page);
});

app.get('/api/players/:name', (req, res) => {
  const p = allPlayers().find((x) => x.name.toLowerCase() === String(req.params.name).toLowerCase());
  if (!p) return bad(res, 404, 'Pemain tidak ditemukan.');
  const r = D.rng(p.id);
  ok(res, {
    player: p,
    faction: D.FACTION_DEFS.find((f) => f.id === p.factionId) || null,
    weekly: p.playtime7d,
    heatmap: Array.from({ length: 7 * 6 }, () => +(r() * 5).toFixed(1)),
    kills14: Array.from({ length: 14 }, () => Math.round(r() * 34)),
    badges: p.achievements.map((c) => D.ACHIEVEMENTS.find((a) => a.code === c)).filter(Boolean),
    sanctions: p.banned ? [{ at: p.lastSeen, reason: p.banReason, by: 'XGuard', type: 'BAN', until: 'permanent' }] : [],
  });
});

/* ---------------------------------------------------------------- *
 * API — auth
 * ---------------------------------------------------------------- */

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const acc = D.ACCOUNTS.find((a) => a.username.toLowerCase() === String(username || '').toLowerCase());
  if (!acc || acc.password !== password) return bad(res, 401, 'Username atau password salah.');
  const token = makeToken({ sub: acc.username, role: acc.role, name: acc.name, level: acc.level || 0 });
  const profile = D.buildAccountPlayer(acc.name);
  ok(res, { token, role: acc.role, profile: acc.role === 'admin' ? { name: acc.name, level: acc.level, role: 'Staff' } : profile });
});

app.get('/api/auth/me', auth, (req, res) => ok(res, { user: req.user }));

app.get('/api/me/profile', auth, (req, res) => {
  const p = D.buildAccountPlayer(req.user.name);
  const r = D.rng(p.id + 5);
  ok(res, {
    profile: p,
    live: D.liveCounts(),
    weekly: p.playtime7d,
    hourly: p.session24,
    tickets: [...runtime.extraTickets, ...D.TICKETS].filter((t) => t.playerId === p.id || t.id.startsWith('NEW')).slice(0, 12),
    whitelist: D.WHITELIST_APPS.find((w) => w.player === p.name) || D.WHITELIST_APPS[0],
    leaderboardPos: allPlayers().filter((x) => !x.banned).sort((a, b) => b.score - a.score).findIndex((x) => x.name === p.name) + 1,
    voteRewardClaimable: r() > 0.5,
    friends: allPlayers().slice(0, 8).map((x) => ({ name: x.name, level: x.level, status: x.status, server: D.SERVERS[x.id % 4].name })),
  });
});

app.post('/api/me/tickets', auth, (req, res) => {
  const { subject, type, message, server } = req.body || {};
  if (!subject || !message) return bad(res, 422, 'Judul dan pesan wajib diisi.');
  const t = {
    id: `XV-${String(50000 + runtime.extraTickets.length).padStart(5, '0')}`,
    subject: String(subject).slice(0, 140),
    type: type || 'Pertanyaan RP',
    player: req.user.name,
    playerId: 1000,
    status: 'open',
    priority: 'normal',
    assignee: null,
    server: server || D.SERVERS[0].name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: 0,
    evidence: [],
    lastMessage: String(message).slice(0, 600),
  };
  runtime.extraTickets.unshift(t);
  ok(res, t);
});

app.post('/api/me/topup', auth, (req, res) => {
  const rc = clampNum(+(req.body || {}).rc, 100, 20000);
  const t = { id: `TX-${Math.floor(Math.random() * 90000 + 10000)}`, type: 'Deposit RC', amount: rc, at: new Date().toISOString(), status: 'pending' };
  ok(res, { ...t, invoice: `INV-${Date.now().toString(36).toUpperCase()}`, methods: D.STORE.methods, qr: '000201010212' + Date.now() });
});

/* ---------------------------------------------------------------- *
 * API — admin
 * ---------------------------------------------------------------- */

app.get('/api/admin/overview', auth, adminOnly, (req, res) => {
  const live = D.liveCounts();
  const players = allPlayers();
  const online = live.reduce((a, s) => a + s.online, 0);
  ok(res, {
    kpi: {
      online,
      slots: D.state.stats.totalSlots,
      queue: Math.max(0, online - Math.round(D.state.stats.totalSlots * 0.92)),
      pingAvg: Math.round(live.reduce((a, s) => a + s.ping, 0) / live.length),
      tick: 4.0,
      memUsed: +(2.6 + Math.random() * 1.2).toFixed(2),
      cpu: Math.round(28 + Math.random() * 34),
      uptimeDays: D.QUALITY.crashFreeDays,
      bansToday: 12 + runtime.bans,
      ticketsOpen: [...runtime.extraTickets, ...D.TICKETS].filter((t) => t.status === 'open').length,
      wlPending: D.WHITELIST_APPS.filter((w) => w.status === 'pending').length,
      economyCirc: players.reduce((a, p) => a + p.money + p.bank, 0),
      newAccounts24: 214,
      cheatFlags: 9,
    },
    servers: D.SERVERS.map((s, i) => ({ ...s, ...live[i], restart: runtime.restarts[s.id] || null })),
    onlineNames: D.onlineNames(),
    console: consoleLines.slice(-60).reverse(),
    charts: {
      hour: D.HOUR_SHAPE.map((w, i) => ({ hour: String(i).padStart(2, '0'), value: Math.round(1250 * (0.5 + w * 0.66)) })),
      ping24: Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2, '0'), value: Math.round(14 + D.HOUR_SHAPE[i] * 16 + Math.random() * 4) })),
      live30: D.LIVE_30D,
      donut: [
        { label: 'Roleplay', value: 42 },
        { label: 'Gangwar', value: 27 },
        { label: 'CnR', value: 19 },
        { label: 'Beginner', value: 12 },
      ],
    },
    sessions: D.SESSIONS,
    runtime: {
      bans: runtime.bans, kicks: runtime.kicks, mutes: runtime.mutes,
      whitelistApproved: runtime.whitelistApproved, whitelistRejected: runtime.whitelistRejected,
      ticketsResolved: runtime.ticketsResolved, broadcasts: runtime.broadcastCount,
    },
  });
});

app.get('/api/admin/players', auth, adminOnly, (req, res) => {
  const q = req.query;
  let rows = allPlayers();
  if (q.q) rows = rows.filter((p) => (p.name + (p.faction || '') + p.city).toLowerCase().includes(String(q.q).toLowerCase()));
  if (q.status === 'online') rows = rows.filter((p) => p.status === 'online');
  if (q.status === 'banned') rows = rows.filter((p) => p.banned);
  if (q.status === 'staff') rows = rows.filter((p) => p.staff);
  if (q.faction) rows = rows.filter((p) => p.faction === q.faction);
  rows = rows.slice().sort((a, b) => b.score - a.score);
  const page = pag(rows, q);
  ok(res, { ...page, factions: [...new Set(allPlayers().map((p) => p.faction).filter(Boolean))] });
});

app.post('/api/admin/players/:id/action', auth, adminOnly, (req, res) => {
  const id = +req.params.id;
  const { action, reason, duration } = req.body || {};
  const p = D.state.players.find((x) => x.id === id);
  if (!p) return bad(res, 404, 'Pemain tidak ditemukan.');
  const allowed = ['kick', 'ban', 'unban', 'mute', 'unmute', 'freeze', 'warn', 'money_set'];
  if (!allowed.includes(action)) return bad(res, 422, 'Aksi tidak dikenal.');
  if (['ban', 'kick', 'mute', 'freeze', 'warn'].includes(action) && (!reason || String(reason).trim().length < 4))
    return bad(res, 422, 'Alasan sanksi wajib diisi (aturan: setiap aksi butuh alasan).');

  const patch = {};
  if (action === 'ban') { patch.banned = true; patch.status = 'banned'; patch.banReason = reason; runtime.bans++; }
  if (action === 'unban') { patch.banned = false; patch.status = 'offline'; patch.banReason = null; }
  if (action === 'kick') { patch.status = 'offline'; runtime.kicks++; }
  if (action === 'mute') { patch.muted = true; runtime.mutes++; }
  if (action === 'unmute') { patch.muted = false; }
  if (action === 'freeze') patch.frozen = true;
  if (action === 'warn') patch.warnings = (p.warnings || 0) + 1;
  if (action === 'money_set') {
    const amt = clampNum(+(req.body.money || 0), 0, 50_000_000);
    patch.money = amt;
  }
  runtime.playerOverrides.set(id, { ...(runtime.playerOverrides.get(id) || {}), ...patch });
  logAdmin({
    action: action.toUpperCase(),
    reason: reason || (action === 'money_set' ? `Koreksi saldo ke ${req.body.money}` : 'tanpa alasan'),
    staff: `${req.user.name} (lvl ${req.user.level})`,
    target: p.name,
    targetId: id,
    server: D.SERVERS[id % 4].name,
    duration: duration || null,
  });
  sseSend('admin-action', { action, target: p.name, by: req.user.name });
  ok(res, { player: applyOverrides(p), counts: { bans: runtime.bans, kicks: runtime.kicks, mutes: runtime.mutes } });
});

app.post('/api/admin/players/bulk', auth, adminOnly, (req, res) => {
  const { ids = [], action, reason } = req.body || {};
  let n = 0;
  for (const id of ids) {
    const p = D.state.players.find((x) => x.id === +id);
    if (!p) continue;
    runtime.playerOverrides.set(+id, { banned: action === 'ban', status: action === 'ban' ? 'banned' : 'offline', banReason: action === 'ban' ? reason : null });
    n++;
  }
  if (action === 'ban') runtime.bans += n;
  if (action === 'kick') runtime.kicks += n;
  logAdmin({ action: `BULK_${(action || '').toUpperCase()}`, reason: reason || '-', staff: `${req.user.name} (lvl ${req.user.level})`, target: `${n} pemain`, targetId: 0, server: 'Multi', result: 'sukses' });
  ok(res, { affected: n });
});

app.get('/api/admin/logs', auth, adminOnly, (req, res) => {
  let rows = [...runtime.extraLogs, ...D.ADMIN_LOGS];
  if (req.q) rows = rows.filter((l) => JSON.stringify(l).toLowerCase().includes(String(req.query.q).toLowerCase()));
  if (req.query.action) rows = rows.filter((l) => l.action === req.query.action);
  ok(res, pag(rows.slice(0, 160), req.query));
});

app.get('/api/admin/tickets', auth, adminOnly, (req, res) => {
  let rows = [...runtime.extraTickets, ...D.TICKETS];
  const f = req.query.status;
  if (f && f !== 'all') rows = rows.filter((t) => t.status === f);
  ok(res, { ...pag(rows, req.query), statuses: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'], types: D.TICKET_TYPES || [...new Set(D.TICKETS.map((t) => t.type))] });
});

app.post('/api/admin/tickets/:id/reply', auth, adminOnly, (req, res) => {
  const { reply, status } = req.body || {};
  const t = [...runtime.extraTickets, ...D.TICKETS].find((x) => x.id === req.params.id);
  if (!t) return bad(res, 404, 'Tiket tidak ditemukan.');
  t.lastMessage = String(reply || '').slice(0, 600);
  t.replies += 1;
  if (status) {
    if (status === 'resolved') runtime.ticketsResolved++;
    t.status = status;
  } else t.status = 'in_progress';
  t.updatedAt = new Date().toISOString();
  logAdmin({ action: 'TICKET_REPLY', reason: `Tiket ${t.id} → ${t.status}`, staff: `${req.user.name}`, target: t.player, targetId: t.playerId, server: t.server });
  ok(res, t);
});

app.get('/api/admin/whitelist', auth, adminOnly, (req, res) => ok(res, D.WHITELIST_APPS));

app.post('/api/admin/whitelist/:id/decision', auth, adminOnly, (req, res) => {
  const w = D.WHITELIST_APPS.find((x) => x.id === req.params.id);
  if (!w) return bad(res, 404, 'Aplikasi tidak ditemukan.');
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(decision)) return bad(res, 422, 'Keputusan tidak valid.');
  w.status = decision;
  w.note = String(note || w.note).slice(0, 300);
  w.reviewer = req.user.name;
  if (decision === 'approved') runtime.whitelistApproved++;
  if (decision === 'rejected') runtime.whitelistRejected++;
  logAdmin({ action: 'WHITELIST', reason: `${w.id} → ${decision}`, staff: `${req.user.name}`, target: w.character, targetId: w.accountId, server: w.server });
  ok(res, w);
});

app.get('/api/admin/economy', auth, adminOnly, (req, res) => {
  const players = allPlayers();
  const r = D.rng(4242);
  const top = players.slice().sort((a, b) => b.bank + b.money - (a.bank + a.money)).slice(0, 10);
  ok(res, {
    circulation: players.reduce((a, p) => a + p.money + p.bank, 0),
    serverBank: 48_250_000,
    inflation: 2.1,
    daily: { income: 12_480_000, outcome: 9_870_000, net: 2_610_000 },
    flows: [
      { label: 'Gaji kerja', value: 4_120_000 }, { label: 'Pajak properti', value: 1_280_000 },
      { label: 'Penjualan bisnis', value: 3_410_000 }, { label: 'Denda & tilang', value: 420_000 },
      { label: 'Biaya rumah sakit', value: 310_000 }, { label: 'Bahan bakar', value: 640_000 },
    ],
    chart30: D.LIVE_30D.map((d) => ({ label: d.label, value: Math.round(d.peak * (800 + r() * 400)) })),
    top,
    prices: [
      { item: 'Burger Shot Meal', price: 120, chg: 1.2 }, { item: 'SP Fuel /L', price: 8, chg: -0.4 },
      { item: 'Repair Kit', price: 2400, chg: 3.1 }, { item: 'Lockpick', price: 5800, chg: 8.4 },
      { item: 'Body Armor', price: 9800, chg: -2.2 }, { item: 'Weed pack', price: 14500, chg: 5.6 },
      { item: 'Sultan RS (dealer)', price: 185000, chg: 0.8 }, { item: 'Garasi 4-slot', price: 640000, chg: 2.4 },
    ],
  });
});

app.get('/api/admin/console', auth, adminOnly, (req, res) => ok(res, consoleLines.slice(-80).reverse()));

app.post('/api/admin/console/exec', auth, adminOnly, (req, res) => {
  const cmd = String((req.body || {}).cmd || '').trim();
  if (!cmd) return bad(res, 422, 'Perintah kosong.');
  const [rawHead, ...rest] = cmd.split(/\s+/);
  const name = rawHead.replace(/^\//, '').toLowerCase();
  const arg = cmd.replace(/^\S+\s*/, '').trim();
  const out = [];
  switch (name) {
    case 'acmd':
    case 'help':
      out.push('Perintah tersedia: /announce <teks>, /restart <rp|fw|cnr|starter|all>, /status, /lookup <nama>, /serverinfo, /uptime, /flaglist');
      break;
    case 'announce': {
      if (!arg) { out.push('pakai: /announce <teks pengumuman>'); break; }
      out.push(`[broadcast] dijadwalkan: ${arg}`);
      runtime.broadcastCount++;
      D.state.broadcasts.unshift({ id: 'b' + runtime.broadcastCount, text: arg.slice(0, 220), by: req.user.name, at: new Date().toISOString(), active: true, target: 'semua (console)' });
      sseSend('broadcast', { text: arg, by: req.user.name });
      break;
    }
    case 'restart': {
      const id = (rest[0] || 'rp').toLowerCase();
      const hit = D.SERVERS.find((x) => x.id === id || id === 'all');
      if (!hit && id !== 'all') { out.push(`server "${id}" tidak dikenal — pilihan: ${D.SERVERS.map((x) => x.id).join(', ')}, all`); break; }
      runtime.restarts[id] = { at: new Date().toISOString(), by: req.user.name };
      out.push(`[server:${id}] restart dimulai — estimasi ${id === 'all' ? '68' : '42'} detik, save penuh dijalankan lebih dulu`);
      sseSend('restart', { server: id, by: req.user.name });
      break;
    }
    case 'status': out.push(...D.liveCounts().map((l) => `${l.id}: ${l.online}/${l.playersMax} — ping ${l.ping}ms`)); break;
    case 'uptime': out.push(`uptime panel ${Math.floor((Date.now() - t0) / 1000) + " detik"} · crash-free ${D.QUALITY.crashFreeDays} hari · restart terakhir 06:00 WIB`); break;
    case 'lookup': {
      const p = allPlayers().find((x) => x.name.toLowerCase() === String(rest[0] || '').toLowerCase());
      out.push(p ? JSON.stringify({ id: p.id, name: p.name, level: p.level, hours: p.hours, money: p.money, bank: p.bank, faction: p.faction, banned: !!p.banned, warnings: p.warnings || 0 }) : `pemain "${rest[0] || '?'}" tidak ditemukan`);
      break;
    }
    case 'serverinfo': {
      const live = D.liveCounts();
      out.push(`Nama: ${'Xvault HUB'} · versi gamemode ${D.BRAND.version} · ${D.SERVERS.length} node · online ${live.reduce((a, l) => a + l.online, 0)}/${live.reduce((a, l) => a + l.playersMax, 0)} · map ${D.BRAND.map} · bahasa ${D.BRAND.lang.join('/')}`);
      break;
    }
    case 'flaglist': {
      out.push('12 flag aktif — 4 di antaranya skor > 0.85 (siap di-ban otomatis bila tidak di-review dalam 15 menit)');
      break;
    }
    case 'clear': out.push('(log client dibersihkan — log server tetap utuh)'); break;
    default: out.push(`Unknown command: ${cmd}`);
  }
  consoleLines.push({ ts: new Date().toISOString(), level: 'info', text: `[admin:${req.user.name}] ${cmd}` });
  logAdmin({ action: 'CONSOLE', reason: cmd, staff: `${req.user.name} (lvl ${req.user.level})`, target: rest[0] || '-', targetId: 0, server: D.SERVERS[0].name });
  ok(res, { cmd, output: out });
});

app.post('/api/admin/broadcast', auth, adminOnly, (req, res) => {
  const { text, target, level = 2 } = req.body || {};
  if (!text) return bad(res, 422, 'Pesan tidak boleh kosong.');
  if (level < 3) return bad(res, 403, 'Broadcast global butuh admin level 3+.');
  const b = { id: 'b' + (runtime.broadcastCount + 1), text: String(text).slice(0, 220), by: req.user.name, at: new Date().toISOString(), active: true, target: target || 'semua' };
  D.state.broadcasts.unshift(b);
  D.state.broadcasts.splice(6);
  runtime.broadcastCount++;
  logAdmin({ action: 'BROADCAST', reason: b.text, staff: `${req.user.name}`, target: b.target, targetId: 0, server: b.target });
  sseSend('broadcast', b);
  ok(res, { sent: true, broadcast: b, reach: D.totals().online });
});

app.get('/api/admin/broadcasts', auth, adminOnly, (req, res) => ok(res, D.state.broadcasts));

app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.();
  res.write('retry: 4000\n\n');
  sseSend('hello', { at: new Date().toISOString(), servers: D.liveCounts(), console: consoleLines.slice(-10).reverse() });
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

/* ---------------------------------------------------------------- *
 * Static + halaman
 * ---------------------------------------------------------------- */
app.use(express.static(PUB, { extensions: ['html'], maxAge: '5m' }));

const PAGES = {
  '/': 'index.html',
  '/tentang': 'tentang.html',
  '/kualitas': 'kualitas.html',
  '/sistem': 'sistem.html',
  '/connect': 'connect.html',
  '/ranking': 'ranking.html',
  '/aturan': 'aturan.html',
  '/toko': 'toko.html',
  '/news': 'news.html',
  '/staff': 'staff.html',
  '/login': 'login.html',
  '/dashboard': 'dashboard.html',
  '/admin': 'admin.html',
};
for (const [route, file] of Object.entries(PAGES)) {
  app.get(route, (req, res) => res.sendFile(path.join(PUB, file)));
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return bad(res, 404, 'Endpoint tidak ditemukan: ' + req.path);
  res.status(404).sendFile(path.join(PUB, '404.html'));
});

const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  const { online } = D.totals();
  console.log('──────────────────────────────────────────────');
  console.log(`  ⬢ Xvault HUB — Website SA-MP`);
  console.log(`  ⬢ http://localhost:${PORT}  (bind ${HOST})`);
  console.log(`  ⬢ Halaman: /, /tentang, /kualitas, /sistem, /connect,`);
  console.log(`             /ranking, /aturan, /toko, /news, /staff,`);
  console.log(`             /login, /dashboard, /admin`);
  console.log(`  ⬢ Login demo → player: Bagas_Wijaya / xvault`);
  console.log(`                  admin : admin / xvault123`);
  console.log(`  ⬢ Simulasi online: ${online}/${D.state.stats.totalSlots}`);
  console.log('──────────────────────────────────────────────');
});
