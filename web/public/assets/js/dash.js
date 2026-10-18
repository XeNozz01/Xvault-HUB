/* ==========================================================================
   Xvault HUB — dash.js  (Dasbor Player)
  but
   Butuh sesi login (token di localStorage). Data dari /api/me/profile.
   ========================================================================== */
(function (w, d) {
  'use strict';
  const { el, $, $$, F, api, toast, modal, copy, icon, ico, statusBadge, live } = w.XV;
  const CH = w.XVChart;
  let P = null;        // profil
  let META = {};       // data tambahan (factions, live)
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('xvault_prefs') || '{}'); } catch { return {}; } },
    set(v) { localStorage.setItem('xvault_prefs', JSON.stringify(v)); },
  };
  const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  /* ---------- guard ---------- */
  async function guard() {
    if (!api.token) { location.href = '/login?next=' + encodeURIComponent(location.pathname); return false; }
    try { await api.get('/api/auth/me'); return true; }
    catch { api.token = ''; toast('Sesi berakhir — login lagi ya.', 'warn'); setTimeout(() => (location.href = '/login'), 800); return false; }
  }

  /* ---------- router view ---------- */
  const TITLES = {
    ringkasan: ['Ringkasan', 'Kondisi karaktermu, aktivitas, dan yang perlu kamu lakukan hari ini'],
    statistik: ['Statistik', 'Analitik jam main, performa, dan posisi kamu di leaderboard'],
    profil: ['Profil & Keamanan', 'Data akun, riwayat login, dan sanksi'],
    inventaris: ['Inventaris', 'Barang bawaan karakter — 36 slot, berat terbatas'],
    aset: ['Kendaraan & Aset', 'Garasi, properti, dan bisnis yang kamu pegang'],
    dompet: ['Dompet & Top-up', 'Saldo RC, uang in-game, dan riwayat transaksi'],
    whitelist: ['Whitelist & Faction', 'Status lamaran karakter dan rekrutmen faction'],
    tiket: ['Tiket & Banding', 'Hubungi staff, pantau progres, dan ajukan banding'],
    pengaturan: ['Pengaturan', 'Preferensi notifikasi, tautan akun, dan data'],
  };
  function showView(key, push = true) {
    key = TITLES[key] ? key : 'ringkasan';
    $$('#side-nav a[data-view]').forEach((a) => a.classList.toggle('on', a.dataset.view === key));
    $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.viewPanel === key));
    const [t, s] = TITLES[key];
    $('#view-title').textContent = t;
    $('#view-sub').textContent = s;
    if (push) history.replaceState(null, '', '#' + key);
    d.body.classList.remove('side-open');
    // render chart saat terlihat (ukuran 0 saat hidden)
    requestAnimationFrame(() => drawCharts(key));
  }

  /* ---------- komponen kecil ---------- */
  const kpi = (label, value, note, opts = {}) => el('div', { class: 'kpi' + (opts.accent ? ' accent-' + opts.accent : '') },
    el('div', { class: 'lb' }, opts.icon ? icon(opts.icon, 'sm') : null, label),
    el('div', { class: 'v', text: value }),
    note ? el('div', { class: 'd' }, el('span', { class: opts.trend > 0 ? 'up' : opts.trend < 0 ? 'down' : '', html: (opts.trend > 0 ? '▲ ' : opts.trend < 0 ? '▼ ' : '') + F.esc(note) })) : null,
    opts.spark ? (() => { const s = el('div', { class: 'spark' }); requestAnimationFrame(() => CH.spark(s, opts.spark, opts.sparkColor || '#9b6bf2', 38)); return s; })() : null);

  const row = (label, value, cls = '') => el('div', { class: 'metric' }, el('span', { text: label }), el('b', { class: cls, text: value }));

  /* ---------- render: ringkasan ---------- */
  function renderHead() {
    const host = $('#prof-head-slot');
    const need = P.level * 140;
    const prog = Math.min(100, Math.round((P.hours / need) * 100));
    const head = el('div', { class: 'prof-head' },
      el('div', { class: 'lvl-ring' }, (() => { const g = el('div', { style: { position: 'relative', width: '78px', height: '78px' } }); requestAnimationFrame(() => CH.gauge(g, { size: 78, stroke: 8, value: prog, text: 'L' + P.level, sub: '' })); return g; })()),
      el('div', {},
        el('h2', { style: { margin: '0 0 4px', fontSize: '1.45rem' }, text: P.name }),
        el('div', { class: 'pill-row' },
          el('span', { class: 'badge violet', text: P.factionName }),
          el('span', { class: 'badge', text: P.rank }),
          P.vip ? el('span', { class: 'badge yellow', text: P.vip }) : null,
          el('span', { class: 'badge green', html: `<span class="dot" style="background:currentColor"></span> ${P.status === 'online' ? 'online' : 'offline'}` }),
          P.wanted ? el('span', { class: 'badge red', text: 'wanted lvl ' + P.wanted }) : null),
        el('div', { class: 'tiny muted', style: { marginTop: '8px' }, text: `${P.city}, ${P.country} · ${F.n(P.hours)} jam main · bergabung ${F.date(P.registeredAt)} · peringkat global #${F.n(META.leaderboardPos || 0)}` })),
      el('div', { class: 'row wrap-row', style: { gap: '8px' } },
        el('button', { class: 'btn sm primary', html: ico('copy', 'sm') + ' Salin IP RP', onclick: () => copy('play.xvaulthub.id:7777') }),
        el('button', { class: 'btn sm', html: ico('wallet', 'sm') + ' Top-up', onclick: () => showView('dompet') }),
        el('button', { class: 'btn sm ghost', html: ico('ticket', 'sm') + ' Tiket', onclick: () => showView('tiket') })));
    host.replaceChildren(head);
  }

  function renderKpis() {
    $('#kpi-slot').replaceChildren(
      kpi('Level karakter', P.level, `+1 dalam ${Math.max(1, Math.round(P.level * 140 - P.hours))} jam`, { icon: 'zap', spark: P.playtime7d, accent: 'blue' }),
      kpi('Jam main', F.n(P.hours), '+' + P.statsExtra.playtimeWeek + ' jam minggu ini', { icon: 'clock', trend: 1 }),
      kpi('Skor', F.n(P.score), 'naik ' + Math.round(P.score * 0.012) + ' hari ini', { icon: 'chart', trend: 1, spark: P.playtime7d.map((v) => v * 11 + 20), sparkColor: '#4cc9f0' }),
      kpi('Uang tunai', F.money(P.money), 'di dompet karakter', { icon: 'coins' }),
      kpi('Tabungan', F.money(P.bank), P.wallet.loans ? 'utang ' + F.money(P.wallet.loans) : 'tanpa utang', { icon: 'wallet', accent: P.wallet.loans ? 'yellow' : 'green' }),
      kpi('K/D', P.kdr.toFixed(2), `${F.n(P.kills)} kill · ${F.n(P.deaths)} mati`, { icon: 'target' }),
      kpi('Peringkat', '#' + F.n(META.leaderboardPos || '—'), 'dari ' + F.n(219) + ' pemain aktif', { icon: 'trophy', accent: 'yellow' }),
      kpi('RC tersedia', F.n(P.wallet.balanceRC) + ' RC', P.voteRewardClaimable ? 'klaim hadiah vote!' : 'vote untuk RC gratis', { icon: 'gift', accent: P.voteRewardClaimable ? 'green' : '' }));
  }

  function renderServers() {
    const host = $('#srv-slot');
    if (!host) return;
    const paint = (rows) => host.replaceChildren(...rows.map((s) => el('div', { class: 'lrow' },
      el('div', {}, el('b', { text: s.name.replace('Xvault HUB — ', '') }), el('div', { class: 'tiny muted', text: s.mode })),
      el('div', { class: 'bar' + (s.fill > 90 ? ' red' : s.fill > 70 ? ' yellow' : ' green') }, el('i', { style: { width: (s.fill || Math.round((s.online / (s.playersMax || s.maxPlayers)) * 100)) + '%' } })),
      el('span', { class: 'on mono tiny', text: `${F.n(s.online)}/${F.n(s.playersMax || s.maxPlayers)}` }),
      el('button', { class: 'btn xs', html: ico('copy', 'sm'), title: 'Salin IP', onclick: () => copy(`${s.host || 'play.xvaulthub.id'}:${s.port}`) }))));
    api.get('/api/servers').then(paint).catch(() => { });
    live.on((data) => { if (data.servers) paint(data.servers.map((s) => ({ ...s, name: 'Xvault HUB — ' + s.id.toUpperCase(), mode: '', playersMax: s.playersMax }))); });
  }

  function renderBadges() {
    const codes = new Set((P.achievements || []).concat((P.badges || []).filter((b) => b.unlocked).map((b) => b.code)));
    const all = [
      ['FIRST_BLOOD', 'Kill Pertama', '⚔'], ['DRIFT_KING', 'Drift King', '🏎'], ['TYCOON', 'Tycoon', '🏢'], ['LAWYER', 'Sidang Kilat', '⚖'],
      ['MEDIC_X', 'Nyawa Penyelamat', '✚'], ['MARATHON', 'Maraton', '⏱'], ['TURF_WAR', 'Turf Veteran', '🚩'], ['LEGEND', 'Legenda', '👑'],
    ];
    $('#badge-count').textContent = codes.size + '/' + all.length;
    $('#badge-slot').replaceChildren(...all.map(([c, n, i]) => el('span', { class: 'badge-ach' + (codes.has(c) ? '' : ' lock'), title: codes.has(c) ? 'Terbuka' : 'Terkunci' }, el('b', { text: i }), n)));
    const news = $('#news-slot');
    api.get('/api/news').then((r) => news.replaceChildren(...r.rows.slice(0, 4).map((n) => el('a', { class: 'list-row', href: '/news#' + n.id },
      el('span', { class: 'badge ' + (n.hot ? 'violet' : ''), text: n.cat }), el('span', { class: 'grow tiny', text: F.truncate(n.title, 44) }), el('span', { class: 'tiny muted nowrap', text: F.ago(n.date) }))))).catch(() => { });
  }

  /* ---------- render: statistik ---------- */
  function renderStats() {
    $('#stat-kpis').replaceChildren(
      kpi('Report dibuat', F.n(P.reports), 'laporan in-game ke staff', { icon: 'megaphone' }),
      kpi('Arrest', F.n(P.statsExtra.arrests), 'penangkapan sah', { icon: 'gavel' }),
      kpi('Revive', F.n(P.statsExtra.revives), 'nyawa diselamatkan', { icon: 'heart' }),
      kpi('Pajak dibayar', F.money(P.statsExtra.taxes), '3% dari arus kas', { icon: 'coins' }),
      kpi('Chat ditulis', F.n(P.messages), 'pesan di all/radio/faction', { icon: 'message' }),
      kpi('Ping rata-rata', P.ping + ' ms', P.ping < 30 ? 'sangat baik' : 'cukup', { icon: 'wifi', accent: P.ping < 30 ? 'green' : 'yellow' }));
    const max = Math.max(...P.playtime7d) || 1;
    CH.heat($('#heat-slot'), { matrix: P.session24 ? Array.from({ length: 7 }, (_, di) => Array.from({ length: 24 }, (_, hi) => (P.session24[hi] || 0) * (P.playtime7d[di] / max) * 3)) : [], unit: ' jam' });
    const avg = { level: 44, hours: 320, kills: 940, kdr: 1.4, races: 42, arrests: 60 };
    CH.hbars($('#cmp-slot'), {
      fmt: (v) => Math.round(v * 100) + '%',
      data: [
        { label: 'Level', value: P.level / avg.level, color: '#9b6bf2' },
        { label: 'Jam main', value: P.hours / avg.hours, color: '#4cc9f0' },
        { label: 'Kill', value: P.kills / avg.kills, color: '#31d99a' },
        { label: 'K/D', value: P.kdr / avg.kdr, color: '#ffc857' },
        { label: 'Race', value: P.races / avg.races, color: '#d47fe8' },
        { label: 'Arrest', value: P.arrests / avg.arrests, color: '#ff9147' },
      ].map((x) => ({ ...x, value: Math.min(2.4, x.value) })),
    });
    $('#lvl-note').textContent = `Progres ${P.hours}/${P.level * 140} jam`;
    const mates = (META.factionMates || []).slice(0, 10);
    $('#mates-slot').replaceChildren(...(mates.length ? mates : [{ name: P.name, level: P.level, status: P.status }]).map((m) => el('div', { class: 'mini-row' },
      el('span', { class: 'avatar sm', text: m.name.slice(0, 2) }), el('span', { class: 'mono tiny grow', text: m.name }),
      el('span', { class: 'tiny muted', text: 'Lv ' + m.level }), statusBadge(m.status))));
    $('#friends-slot').replaceChildren(...(META.friends || []).map((f) => el('div', { class: 'mini-row' },
      el('span', { class: 'avatar sm', text: f.name.slice(0, 2) }), el('div', { class: 'grow' }, el('span', { class: 'mono tiny', text: f.name }),
        el('div', { class: 'tiny muted', text: f.server })), statusBadge(f.status))));
  }

  /* ---------- render: profil ---------- */
  function renderProfile() {
    const rows = [
      ['Username', P.name], ['Email tertaut', P.email], ['Discord', P.discord], ['Server utama', 'Xvault HUB — Roleplay'],
      ['Faction', `${P.factionName} (${P.rank})`], ['Lisensi', `SIM ${P.license.sim}${P.license.weapon ? ' · Senjata ✔' : ' · Senjata ✘'}`],
      ['Terdaftar', F.date(P.registeredAt)], ['IP terakhir', P.lastIp], ['HWID', P.hwid], ['Peringatan', P.warnings + ' / 4 sebelum sanksi'],
    ];
    $('#profile-rows').replaceChildren(...rows.map(([k, v]) => el('div', { class: 'card flat', style: { padding: '11px 13px' } },
      el('div', { class: 'tiny muted', text: k }), el('b', { class: 'mono', style: { fontSize: '.86rem' }, text: v }))));
    $('#security-slot').replaceChildren(
      el('label', { class: 'sw' }, el('input', { type: 'checkbox', id: 'sw-2fa', ...(P.security.twoFA ? { checked: true } : {}) }), el('i'),
        el('span', { text: 'Autentikasi 2 faktor (TOTP)' })),
      el('div', { class: 'list-row' }, el('span', { class: 'tile-ico' }, icon('discord', 'sm')),
        el('div', { class: 'grow' }, el('b', { text: 'Discord tertaut' }), el('div', { class: 'tiny muted', text: P.discord })),
        el('span', { class: 'badge green', text: 'sinkron' })),
      el('div', { class: 'list-row' }, el('span', { class: 'tile-ico' }, icon('key', 'sm')),
        el('div', { class: 'grow' }, el('b', { text: 'Password' }), el('div', { class: 'tiny muted', text: 'diganti 41 hari lalu' })),
        el('button', { class: 'btn xs', text: 'Ubah', onclick: changePass })),
      el('div', { class: 'note', html: `HWID kamu dikunci ke <b>${F.esc(P.hwid)}</b>. Ganti perangkat? Ajukan tiket “Permintaan Data” agar HWID di-reset (1× per 30 hari).` }));
    $('#login-history').replaceChildren(...P.security.loginHistory.map((l) => el('div', { class: 'list-row' },
      el('span', { class: 'badge ' + (l.ok ? 'green' : 'red'), text: l.ok ? 'sukses' : 'gagal' }),
      el('div', { class: 'grow' }, el('b', { class: 'tiny', text: l.device }), el('div', { class: 'tiny muted mono', text: l.ip })),
      el('span', { class: 'tiny muted nowrap', text: F.ago(l.at) }))));
    $('#devices-slot').replaceChildren(...P.security.activeSessions.map((s) => el('div', { class: 'list-row' },
      el('span', { class: 'tile-ico' }, icon(s.current ? 'gamepad' : 'globe', 'sm')),
      el('div', { class: 'grow' }, el('b', { text: s.device }), el('div', { class: 'tiny muted', text: s.at })),
      s.current ? el('span', { class: 'badge violet', text: 'sesi ini' }) : el('button', { class: 'btn xs danger', text: 'Cabut', onclick: (e) => { e.target.closest('.list-row').remove(); toast('Sesi dicabut (demo).', 'ok'); } }))));
    const sanc = P.banned ? [{ at: P.lastSeen, reason: P.banReason, by: 'XGuard 3.4', type: 'BAN' }] : [{ at: new Date(Date.now() - 120 * 864e5).toISOString(), reason: 'Teguran lisan: lupa /me saat digeledah', by: 'Zen (Helper)', type: 'WARN' }];
    $('#sanction-body').replaceChildren(...sanc.map((s) => el('tr', el('td', { class: 'tiny', text: F.date(s.at) }), el('td', {}, el('span', { class: 'badge yellow', text: s.type })),
      el('td', { class: 'tiny', text: s.reason }), el('td', { class: 'tiny muted', text: s.by }))));
  }

  /* ---------- render: inventaris ---------- */
  const ITEM_EMO = { 'Senjata': '🔫', 'Perlengkapan': '🦺', 'Medis': '💉', 'Konsumsi': '🍔', 'Ilegal': '🌿', 'Elektronik': '📟', 'Profesi': '🔧' };
  let invSel = null;
  function renderInv() {
    const items = P.inventory;
    const weight = items.reduce((a, i) => a + i.q * 1.4, 0);
    $('#inv-kpis').replaceChildren(
      kpi('Item', items.length + ' / 36 slot', 'sisa ' + (36 - items.length) + ' slot', { icon: 'box' }),
      kpi('Berat', weight.toFixed(1) + ' kg', 'maks 60 kg', { icon: 'hard', accent: weight > 45 ? 'red' : 'green' }),
      kpi('Nilai barang', F.money(items.length * 7400), 'estimasi pasar', { icon: 'coins' }),
      kpi('Kunci slot', 36, 'VIP+ menambah 6 slot', { icon: 'lock' }));
    $('#inv-weight').textContent = weight.toFixed(1) + ' / 60 kg';
    const grid = [];
    items.forEach((it, i) => {
      grid.push(el('div', { class: 'slot', onclick: () => selectInv(i), style: i === invSel ? { borderColor: 'var(--violet)' } : {} },
        el('span', { class: 'q', text: '×' + it.q }), el('span', { class: 'em', text: ITEM_EMO[it.slot] || '📦' }),
        el('b', { text: it.n }), el('div', { class: 'tiny muted', text: it.slot })));
    });
    for (let i = items.length; i < 36; i++) grid.push(el('div', { class: 'slot empty' }, el('span', { class: 'q', text: i + 1 })));
    $('#inv-slot').replaceChildren(...grid);
    const it = items[invSel] || items[0];
    if (it) $('#inv-detail').replaceChildren(
      el('div', { class: 'row', style: { gap: '12px' } }, el('span', { class: 'avatar lg', text: ITEM_EMO[it.slot] || '📦' }),
        el('div', {}, el('h3', { style: 'margin:0' }, it.n), el('div', { class: 'tiny muted', text: `${it.slot} · ID ${it.id} · kondisi ${it.cond}%` }))),
      el('div', { class: 'metric' }, el('span', { text: 'Jumlah' }), el('b', { text: it.q })),
      el('div', { class: 'metric' }, el('span', { text: 'Berat total' }), el('b', { text: (it.q * 1.4).toFixed(1) + ' kg' })),
      el('div', { class: 'metric' }, el('span', { text: 'Bound' }), el('b', { text: it.slot === 'Ilegal' ? 'tidak (rawan sita)' : 'ya' })),
      el('div', { class: 'bar' + (it.cond > 70 ? ' green' : it.cond > 40 ? ' yellow' : ' red') }, el('i', { style: { width: it.cond + '%' } })),
      el('div', { class: 'row wrap-row' },
        el('button', { class: 'btn sm', text: 'Gunakan', onclick: () => toast(`/use ${it.n.toLowerCase()} — berhasil (demo).`, 'ok') }),
        el('button', { class: 'btn sm', text: ' jatuhkan', onclick: () => toast(`Item dijatuhkan: /drop ${it.q}.`, 'warn') }),
        el('button', { class: 'btn sm ghost', text: 'Taruh di rumah', onclick: () => toast('Butuh akses rumah: /house open', 'info') })),
      el('p', { class: 'tiny muted', style: 'margin:0', text: 'Aksi di atas hanya simulasi client-side; di produksi memanggil perintah admin/gamemode lewat RPC.' }));
  }
  function selectInv(i) { invSel = i; renderInv(); }

  /* ---------- render: aset ---------- */
  function barRow(label, val, tone) {
    const bar = el('div', { class: 'bar' + (tone || '') });
    bar.appendChild(el('i', { style: { width: Math.max(2, val) + '%' } }));
    const wrap = el('div', { style: { flex: '1 1 110px', minWidth: '110px' } });
    wrap.appendChild(el('div', { class: 'tiny muted', text: label + ' ' + val + '%' }));
    wrap.appendChild(bar);
    return wrap;
  }
  function renderAssets() {
    const totalAsset = P.vehicles.length * 185000 + P.houses.reduce((a, h) => a + (h.price || 0), 0);
    $('#asset-kpis').replaceChildren(
      kpi('Kendaraan', P.vehicles.length + ' unit', 'slot tambahan VIP: +3', { icon: 'car' }),
      kpi('Properti', P.houses.length + ' unit', P.houses.length ? 'pajak tiap 12 jam' : 'belum punya rumah', { icon: 'home', accent: P.houses.length ? 'green' : 'yellow' }),
      kpi('Bisnis', P.businesses.length + ' unit', P.businesses.length ? 'karyawan aktif' : 'belum ada', { icon: 'cart' }),
      kpi('Nilai aset', F.money(totalAsset), 'estimasi beli kembali', { icon: 'coins' }));

    const vehRows = P.vehicles.map((v) => {
      const info = el('div', {});
      info.appendChild(el('b', { text: v.model }));
      info.appendChild(el('div', { class: 'stats mono', text: `${v.plate} · ${F.n(v.km)} km · ${v.garasi}` }));
      const bars = el('div', { class: 'row wrap-row', style: { gap: '10px', marginTop: '7px' } });
      bars.append(barRow('Engine', v.engine, v.engine > 70 ? ' green' : v.engine > 40 ? ' yellow' : ' red'),
        barRow('Body', v.body, v.body > 70 ? ' green' : v.body > 40 ? ' yellow' : ' red'));
      info.appendChild(bars);
      const acts = el('div', { class: 'col', style: { gap: '5px' } });
      acts.appendChild(el('button', { class: 'btn xs', text: 'Buka', onclick: () => toast(`/veh unlock ${v.id} — terkirim ke server (demo).`, 'ok') }));
      acts.appendChild(el('button', { class: 'btn xs ghost', text: v.lock ? 'Kunci' : 'Buka kunci', onclick: () => toast('Status kunci kendaraan diganti (demo).', 'info') }));
      const card = el('div', { class: 'veh' });
      card.append(el('span', { class: 'em', text: '\u{1F3CE}' }), info, acts);
      return card;
    });
    $('#veh-slot').replaceChildren(...vehRows);

    const houses = P.houses.length ? P.houses : [{ id: '—', address: 'Belum punya rumah', price: 0, taxDue: 0, locked: false, vault: 0, items: 0 }];
    $('#house-slot').replaceChildren(...houses.map((h) => {
      const info = el('div', {});
      info.appendChild(el('b', { text: h.address }));
      info.appendChild(el('div', { class: 'stats mono', text: `${h.id} · vault ${F.money(h.vault || 0)} · ${h.items || 0} perabot` }));
      if (h.taxDue) info.appendChild(el('div', { class: 'tiny', style: { color: 'var(--yellow)', marginTop: '4px' }, text: 'Pajak jatuh tempo: ' + F.money(h.taxDue) }));
      const card = el('div', { class: 'veh' },
        el('span', { class: 'em', text: '🏠' }), info,
        el('button', { class: 'btn xs' + (h.taxDue ? ' warn' : ''), text: h.taxDue ? 'Bayar' : 'Menu', onclick: () => toast(h.taxDue ? `Pajak ${F.money(h.taxDue)} dibayar (demo).` : '/house menu dibuka (demo).', 'ok') }));
      return card;
    }));

    const biz = P.businesses.length ? P.businesses : [{ id: '—', name: 'Belum ada bisnis', revenue: 0, staff: 0, stock: 0, rating: 0 }];
    $('#biz-slot').replaceChildren(...biz.map((b) => {
      const info = el('div', {});
      info.appendChild(el('b', { text: b.name }));
      info.appendChild(el('div', { class: 'stats mono', text: `${b.id} · ${b.staff} karyawan · stok ${b.stock} · ★ ${b.rating}` }));
      info.appendChild(el('div', { class: 'tiny muted', style: { marginTop: '3px' }, text: 'Omzet 12 jam: ' + F.money(b.revenue) }));
      return el('div', { class: 'veh' }, el('span', { class: 'em', text: '🏪' }), info,
        el('button', { class: 'btn xs', text: 'Laporan', onclick: () => toast('Laporan laba/rugi dikirim ke email tertaut (demo).', 'ok') }));
    }));
  }

  /* ---------- render: dompet ---------- */
  function renderWallet() {
    $('#wallet-kpis').replaceChildren(
      kpi('Saldo RC', F.n(P.wallet.balanceRC) + ' RC', '≈ Rp ' + F.n(P.wallet.balanceRC * 100), { icon: 'gift', accent: 'green' }),
      kpi('Uang tunai', F.money(P.money), 'dompet karakter', { icon: 'coins' }),
      kpi('Tabungan', F.money(P.bank), 'bunga 0,3%/hari', { icon: 'wallet' }),
      kpi('Utang bank', P.wallet.loans ? F.money(P.wallet.loans) : '—', P.wallet.loans ? 'cicil /loan pay' : 'bebas utang', { icon: 'coins', accent: P.wallet.loans ? 'red' : '' }));
    $('#tx-body').replaceChildren(...P.wallet.history.map((t) => el('tr',
      el('td', { class: 'mono tiny', text: t.id }), el('td', { text: t.type }),
      el('td', { class: 'r mono', style: { color: t.amount >= 0 ? 'var(--green)' : 'var(--red)' }, text: (t.amount >= 0 ? '+' : '−') + F.money(Math.abs(t.amount)) }),
      el('td', { class: 'tiny muted', text: F.ago(t.at) }), el('td', { class: 'c', html: statusBadge(t.status) }))));
    $('#topup-slot').replaceChildren(...[600, 1500, 4000].map((rc) => el('button', {
      class: 'btn block', style: { justifyContent: 'space-between' },
      onclick: () => topup(rc),
      html: `<span>Isi ${F.n(rc)} RC</span><span class="badge violet">Rp ${F.n(rc * 100)}</span>` })));
  }
  async function topup(rc) {
    try {
      const r = await api.post('/api/me/topup', { rc });
      const M = modal({
        title: 'Invoice ' + r.invoice,
        body: el('div', { class: 'col center' },
          (() => { // QR decoy: grid deterministik
            const g = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(21,9px)', gap: '1px', padding: '10px', background: '#fff', borderRadius: '12px' } });
            let seed = r.qr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            for (let i = 0; i < 441; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const cell = el('div', { style: { width: '9px', height: '9px' } }); cell.style.background = (seed % 3 === 0 || i % 67 < 12) ? '#111' : '#fff'; g.appendChild(cell); }
            return g; })(),
          el('div', { class: 'kv', style: { width: '100%' } },
            el('span', { text: 'Jumlah' }), el('b', { text: F.n(rc) + ' RC' }),
            el('span', { text: 'Tagihan' }), el('b', { text: 'Rp ' + F.n(rc * 100) }),
            el('span', { text: 'Status' }), el('b', { text: r.status }),
            el('span', { text: 'Metode' }), el('b', { text: r.methods.join(' · ') })),
          el('div', { class: 'note', style: { width: '100%' }, text: 'Jangan bayar — invoice ini fiktif. Pembayaran otomatis dianggap “sukses” 6 detik lagi untuk demo.' })),
        foot: [el('button', { class: 'btn ghost', text: 'Salin kode VA', onclick: () => copy('8800' + r.invoice.replace(/\D/g, '').padEnd(10, '7')) }),
        el('button', { class: 'btn primary', text: 'Tutup', onclick: () => M.close() })],
      });
      setTimeout(() => { P.wallet.balanceRC += rc; P.wallet.history.unshift({ id: r.id, type: 'Deposit RC', amount: rc, at: new Date().toISOString(), status: 'success' }); renderWallet(); renderKpis(); toast(`+${F.n(rc)} RC masuk (demo).`, 'ok'); }, 6000);
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- render: whitelist ---------- */
  function renderWhitelist() {
    const apps = P.applications || [];
    $('#app-slot').replaceChildren(...apps.map((a) => el('div', { class: 'list-row', style: { alignItems: 'flex-start' } },
      el('span', { class: 'tile-ico' }, icon('shield', 'sm')),
      el('div', { class: 'grow' }, el('b', { text: a.type }), el('div', { class: 'tiny muted', text: `${a.id} · dikirim ${F.ago(a.at)} · ${a.note}` })),
      statusBadge(a.status),
      a.status === 'draft' ? el('button', { class: 'btn xs primary', text: 'Lanjutkan', onclick: () => { location.href = '/aturan#whitelist'; } }) : null)));
    const w = P.whitelistApp || META.wl;
    if (w) {
      $('#wl-score').textContent = `skor ${w.score}/100 · reviewer ${w.reviewer || 'menunggu'}`;
      CH.hbars($('#wl-radar'), {
        fmt: (v) => Math.round(v) + '',
        data: Object.entries(w.aspects).map(([k, v], i) => ({ label: k.replace('_', ' '), value: v, color: ['#9b6bf2', '#4cc9f0', '#31d99a', '#ffc857', '#d47fe8'][i] })),
      });
      $('#wl-radar').appendChild(el('p', { class: 'tiny muted', style: 'margin:6px 0 0', text: 'Catatan: ' + w.note }));
    }
    api.get('/api/factions').then((fs) => {
      $('#recruit-slot').replaceChildren(...fs.filter((f) => f.ratio < 96).slice(0, 8).map((f) => el('div', { class: 'card flat' },
        el('div', { class: 'card-top' }, el('span', { class: 'avatar sm', style: { background: f.color, color: '#0b0a10' }, text: f.short }),
          el('span', { class: 'badge ' + (f.ratio > 88 ? 'yellow' : 'green'), text: f.slots - f.member + ' slot' })),
        el('b', { text: f.name }), el('div', { class: 'tiny muted', style: { marginBottom: '8px' }, text: f.type + ' · rank ' + f.rank[0] + ' → ' + f.rank[f.rank.length - 1] }),
        el('div', { class: 'bar' + (f.ratio > 88 ? ' yellow' : ' green') }, el('i', { style: { width: f.ratio + '%' } })),
        el('button', { class: 'btn sm block', style: { marginTop: '10px' }, text: 'Lamar ' + f.short, onclick: () => toast(`Lamaran ${f.short} dibuat (demo) — isi form di /aturan#whitelist.`, 'ok') }))));
    });
  }

  /* ---------- render: tiket ---------- */
  let activeTicket = null;
  function renderTickets() {
    const list = P.tickets || [];
    $('#tiket-count').textContent = list.length + ' tiket';
    $('#cnt-tiket').textContent = list.filter((t) => t.status === 'open').length;
    $('#tk-type').replaceChildren(...['Banding Ban', 'Lapor Bug', 'Lapor Pemain', 'Pertanyaan RP', 'Masalah Pembayaran', 'Permintaan Data', 'Lamaran Staff'].map((t) => el('option', { text: t })));
    $('#tk-server').replaceChildren(...['Roleplay', 'Gangwar', 'Cops n Robbers', 'Beginner'].map((t) => el('option', { text: 'Xvault HUB — ' + t })));
    const paint = () => $('#tiket-list').replaceChildren(...list.map((t) => el('button', {
      class: 'list-row' + (activeTicket === t.id ? ' on' : ''), style: { width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: activeTicket === t.id ? 'var(--violet)' : '' },
      onclick: () => { activeTicket = t.id; paint(); paintThread(t); },
    },
      el('span', { class: 'avatar sm', text: (t.type || '?').slice(0, 2) }),
      el('span', { class: 'grow' }, el('b', { class: 'tiny', text: F.truncate(t.subject, 52) }),
        el('div', { class: 'tiny muted', text: `${t.id} · ${t.server} · ${F.ago(t.updatedAt)}` })),
      statusBadge(t.status), statusBadge(t.priority)))
    );
    function paintThread(t) {
      $('#tiket-active').textContent = t.id + ' · ' + t.subject;
      const th = $('#tiket-thread');
      th.replaceChildren(
        el('div', { class: 'msg me' }, el('div', { class: 'who' }, 'Kamu · ' + F.dt(t.createdAt)), el('div', { text: t.lastMessage.startsWith('Terima kasih') ? 'Halo, aku ingin bertanya soal sanksi yang kuterima kemarin. Terima kasih.' : t.lastMessage })),
        el('div', { class: 'msg' }, el('div', { class: 'who' }, (t.assignee || 'Staff') + ' · ' + F.dt(t.updatedAt)), el('div', { text: t.lastMessage })));
      $('#tiket-reply-text').disabled = false; $('#btn-tiket-reply').disabled = false;
    }
    paint();
    if (list[0]) { activeTicket = list[0].id; paint(); paintThread(list[0]); }
  }
  async function sendReply() {
    const txt = $('#tiket-reply-text').value.trim();
    if (!txt) return toast('Tulis balasannya dulu.', 'warn');
    const t = (P.tickets || []).find((x) => x.id === activeTicket);
    if (t) { t.lastMessage = txt; t.replies++; t.updatedAt = new Date().toISOString(); }
    $('#tiket-reply-text').value = '';
    renderTickets(); toast('Balasan terkirim ke staff.', 'ok');
    setTimeout(() => toast('Staff sedang membaca tiketmu…', 'info', 2400), 2600);
  }

  /* ---------- pengaturan ---------- */
  function renderPrefs() {
    const pf = store.get();
    const items = [
      ['notifTiket', 'Notifikasi balasan tiket', 'Kirim ke Discord & browser saat staff membalas', true],
      ['notifEvent', 'Pengingat event', '15 menit sebelum event dimulai di server', true],
      ['notifBan', 'Laporan sanksi saya', 'Kabari bila sanksi saya berubah status', true],
      ['syncDiscord', 'Sinkron chat Discord', '/dc aktif — chat in-game ↔ Discord', false],
      ['publicProfile', 'Profil publik', 'Profil & statistik muncul di /ranking', true],
      ['lagSync', 'Lagsync compensation', 'Naikkan kalau sering “teleport” — matikan bila ping rendah', false],
      ['fpsLimit', 'Saran fps_limit 50', 'Tampilkan tips optimasi saat ping > 40 ms', true],
    ];
    $('#prefs-slot').replaceChildren(...items.map(([k, title, sub, def]) => el('div', { class: 'list-row', style: { justifyContent: 'space-between' } },
      el('span', { class: 'grow' }, el('b', { class: 'tiny', text: title }), el('div', { class: 'tiny muted', text: sub })),
      el('label', { class: 'sw' }, el('input', { type: 'checkbox', ...(pf[k] === undefined ? (def ? { checked: true } : {}) : (pf[k] ? { checked: true } : {})), onchange: (e) => { const v = store.get(); v[k] = e.target.checked; store.set(v); toast(`${title}: ${e.target.checked ? 'aktif' : 'nonaktif'}`, 'ok', 1600); } }), el('i')))));
  }
  function changePass() {
    const M = modal({
      title: 'Ganti password',
      body: el('div', {},
        el('label', { class: 'field' }, el('span', { text: 'Password lama' }), el('input', { class: 'input', type: 'password', id: 'old' })),
        el('label', { class: 'field' }, el('span', { text: 'Password baru (min. 8)' }), el('input', { class: 'input', type: 'password', id: 'nw' })),
        el('div', { class: 'note', text: 'Demo: tidak ada perubahan nyata. Untuk produksi gunakan hash argon2id + sesi revoke.' })),
      foot: [el('button', { class: 'btn ghost', text: 'Batal', onclick: () => M.close() }),
      el('button', { class: 'btn primary', text: 'Simpan', onclick: () => { const v = $('#nw').value; if (v.length < 8) return toast('Minimal 8 karakter.', 'err'); M.close(); toast('Password diperbarui (demo).', 'ok'); } })],
    });
  }

  /* ---------- charts (dipanggil saat view aktif) ---------- */
  let range = '7';
  function drawCharts(key) {
    if (!P) return;
    if (key === 'ringkasan') {
      const weekly = range === '7' ? P.playtime7d : P.playtime7d.flatMap((v) => [v * .8, v * 1.1, v * .6, v * .95]);
      CH.area($('#ch-weekly'), {
        h: 210,
        series: [{ name: 'Jam', color: '#9b6bf2', data: weekly.map((v, i) => ({ x: range === '7' ? DAYS[i] : 'H' + (i + 1), y: +v.toFixed(1) })) }],
      });
      CH.bars($('#ch-hourly'), { h: 150, data: P.session24.map((v, i) => ({ label: i % 4 === 0 ? String(i).padStart(2, '0') : '', value: v })), color: '#4cc9f0' });
      CH.bars($('#ch-level'), { h: 130, data: [{ label: 'Level ' + P.level, value: P.hours }, { label: 'Target ' + (P.level + 1), value: P.level * 140 }], color: '#31d99a', yFmt: (v) => Math.round(v) + 'j' });
    }
    if (key === 'statistik') renderStats();
    if (key === 'inventaris') renderInv();
  }

  /* ---------- boot ---------- */
  async function init() {
    if (!(await guard())) return;
    try {
      const [prof, fac] = await Promise.all([api.get('/api/me/profile'), api.get('/api/factions')]);
      P = prof.profile;
      META = { leaderboardPos: prof.leaderboardPos, friends: prof.friends, whitelist: prof.whitelist, wl: prof.whitelist, factionMates: (await api.get('/api/leaderboard?per=8&sort=level&faction=' + (P.faction || ''))).rows };
      P.tickets = prof.tickets || [];
      P.whitelistApp = prof.whitelist;
      P.voteRewardClaimable = prof.voteRewardClaimable;
      P.session24 = prof.hourly || P.session24;
      P.weekly = prof.weekly || P.playtime7d;
      $('#side-user').replaceChildren(
        el('span', { class: 'avatar', text: P.name.slice(0, 2).toUpperCase() }),
        el('span', { class: 'grow' }, el('b', { text: P.name }), el('span', { text: `Level ${P.level} · ${P.vip || 'Free player'}` })),
        (() => { const b = el('button', { class: 'btn xs ghost', title: 'Keluar', onclick: () => { api.token = ''; location.href = '/'; } }); b.appendChild(icon('logout', 'sm')); return b; })());
      $('#view-sub').textContent = 'Karakter ' + P.name + ' · ' + P.factionName;
      renderHead(); renderKpis(); renderServers(); renderBadges(); renderProfile(); renderInv(); renderAssets(); renderWallet(); renderWhitelist(); renderTickets(); renderPrefs();
      const hash = location.hash.slice(1) || (w.XV.qs('tab') || '');
      const alias = { dompet: 'dompet', tiket: 'tiket', stat: 'statistik' };
      showView(alias[hash] || hash || 'ringkasan');
      $$('#side-nav a[data-view]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showView(a.dataset.view); }));
      $('#side-open').addEventListener('click', () => d.body.classList.toggle('side-open'));
      $('#btn-copy-ip').addEventListener('click', () => copy('play.xvaulthub.id:7777'));
      $('#btn-join').addEventListener('click', () => { copy('play.xvaulthub.id:7777', null, 'IP disalin — buka SA-MP Launcher lalu Connect.'); setTimeout(() => location.href = '/connect', 700); });
      $('#btn-sort-inv').addEventListener('click', () => { P.inventory.sort((a, b) => a.slot.localeCompare(b.slot)); renderInv(); toast('Inventaris diurutkan per kategori.', 'ok', 1800); });
      $('#btn-veh-refresh').addEventListener('click', () => toast('Data garasi disinkronkan dari server (demo).', 'ok', 2000));
      $('#btn-export-tx').addEventListener('click', () => {
        const csv = 'id,tipe,jumlah,waktu,status\n' + P.wallet.history.map((t) => `${t.id},"${t.type}",${t.amount},${t.at},${t.status}`).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = el('a', { href: url, download: 'xvault-transaksi.csv' }); document.body.appendChild(a); a.click(); a.remove(); toast('CSV diunduh.', 'ok');
      });
      $('#btn-redeem').addEventListener('click', () => {
        const c = $('#redeem-code').value.trim().toUpperCase();
        if (!c) return toast('Masukkan kode dulu.', 'warn');
        if (c.startsWith('XVAULT')) { P.wallet.balanceRC += 500; renderWallet(); renderKpis(); toast('Kode aktif: +500 RC (demo).', 'ok'); }
        else toast('Kode tidak dikenal.', 'err');
      });
      $('#btn-change-pass').addEventListener('click', changePass);
      $('#btn-link-discord').addEventListener('click', () => toast('OAuth Discord — demo, tidak ada redirect nyata.', 'info'));
      $('#btn-export').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' }));
        const a = el('a', { href: url, download: `karakter-${P.name}.json` }); document.body.appendChild(a); a.click(); a.remove(); toast('Data karakter diekspor (JSON).', 'ok');
      });
      $('#btn-logout').addEventListener('click', () => { api.token = ''; location.href = '/'; });
      $('#btn-edit-profil').addEventListener('click', () => toast('Form edit profil (demo) — data nama diubah di server RP lewat /changeprofile.', 'info'));
      $$('[data-range]').forEach((b) => b.addEventListener('click', () => { $$('[data-range]').forEach((x) => x.classList.toggle('on', x === b)); range = b.dataset.range; drawCharts('ringkasan'); }));
      $('#tiket-reply').addEventListener('submit', (e) => { e.preventDefault(); sendReply(); });
      $('#tiket-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const t = await api.post('/api/me/tickets', {
            subject: $('#tk-subject').value, type: $('#tk-type').value, server: $('#tk-server').value,
            message: $('#tk-msg').value + ($('#tk-urgent').checked ? '\n[prioritas tinggi]' : ''),
          });
          P.tickets.unshift(t); renderTickets(); $('#tiket-form').reset();
          toast(`Tiket ${t.id} dibuat. Staff akan balas di sini.`, 'ok', 4500);
        } catch (err) { toast(err.message, 'err'); }
      });
      live.on((data) => { $('#top-online').textContent = F.n(data.online) + ' online'; });
      w.XV.countUp(d);
    } catch (e) {
      $('#view-sub').textContent = 'Gagal memuat: ' + e.message;
      toast(e.message, 'err', 6000);
    }
    $$('[data-icon]').forEach((n) => { if (!n.dataset.painted) { n.dataset.painted = '1'; n.insertAdjacentHTML('afterbegin', w.XV.ico(n.dataset.icon, n.dataset.size || '')); } });
  }
  (d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', init) : init());
})(window, document);
