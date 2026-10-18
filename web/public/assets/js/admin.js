/* ==========================================================================
   Xvault HUB — admin.js  (Dashboard Admin)
   Semua aksi nyata dipanggil ke /api/admin/* (express). Data simulasi,
   tapi perubahan (sanksi, tiket, whitelist, broadcast) benar-benar
   disimpan di memori server & tampak lagi setelah refresh.
   ========================================================================== */
(function (w, d) {
  'use strict';
  const { el, $, $$, F, api, toast, modal, copy, icon, ico, statusBadge, live, confirmBox } = w.XV;
  const CH = w.XVChart;
  let ME = { name: 'KING', level: 5 };
  let OV = null;
  const state = { players: { page: 1, q: '', status: '', faction: '', sel: new Set() }, tickets: { rows: [] }, activeTicket: null, conFilter: 'all', autoscroll: true };
  const PER = 15;

  const TITLES = {
    ringkasan: ['Ringkasan operasional', 'Kondisi agregat 4 server — disegarkan otomatis tiap 3 detik'],
    live: ['Live Server', 'Kapasitas, pemain online, dan kendali per node'],
    konsol: ['Konsol & Proses', 'Log realtime + perintah admin langsung'],
    pemain: ['Manajemen Pemain', 'Cari, filter, dan jatuhkan sanksi — semua tercatat di log audit'],
    sanksi: ['Sanksi & Banding', 'Review flag XGuard dan keputusan banding'],
    tiket: ['Antrean Tiket', 'Triage, balas, dan tutup tiket pemain'],
    whitelist: ['Review Whitelist', 'Nilai kesiapan RP pemohon lalu putuskan'],
    ekonomi: ['Ekonomi Server', 'Sirkulasi uang, arus kas, dan harga pasar'],
    pengumuman: ['Pengumuman', 'Broadcast in-game + Discord + banner situs'],
    log: ['Log Audit', 'Semua aksi staff, tidak dapat dihapus dari UI'],
    konfigurasi: ['Konfigurasi', 'Perubahan berlaku pada proses server berikutnya'],
  };

  /* ---------- router ---------- */
  function showView(key, push = true) {
    key = TITLES[key] ? key : 'ringkasan';
    $$('#side-nav a[data-view]').forEach((a) => a.classList.toggle('on', a.dataset.view === key));
    $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.viewPanel === key));
    const [t, s] = TITLES[key];
    $('#view-title').textContent = t; $('#view-sub').textContent = s;
    if (push) history.replaceState(null, '', '#' + key);
    d.body.classList.remove('side-open');
    const jobs = { ringkasan: paintRingkasanCharts, live: paintLiveCharts, ekonomi: paintEco, log: loadLogs, konsol: () => { } };
    requestAnimationFrame(() => { (jobs[key] || (() => { }))(); });
  }
  const can = (lvl) => ME.level >= lvl;

  /* ---------- ringkasan ---------- */
  async function loadOverview() {
    try { OV = await api.get('/api/admin/overview'); } catch (e) { toast(e.message, 'err'); return; }
    ME = { ...ME, ...(w.XV._me || {}) };
    const k = OV.kpi;
    const load = Math.round((k.online / k.slots) * 100);
    $('#ov-kpis').replaceChildren(
      kpi('Pemain online', F.n(k.online), `${load}% dari ${F.n(k.slots)} slot`, { icon: 'users', accent: load > 90 ? 'red' : 'green', spark: OV.charts.hour.map((h) => h.value) }),
      kpi('Ping rata-rata', k.pingAvg + ' ms', k.pingAvg < 30 ? 'normal' : 'meningkat — cek rute', { icon: 'wifi', trend: k.pingAvg < 30 ? 1 : -1, accent: 'blue' }),
      kpi('Tickrate / desync', '4,0 Hz', 'desync 0,31%', { icon: 'cpu' }),
      kpi('CPU · RAM', k.cpu + '% · ' + k.memUsed + ' GB', 'dari 16 core / 128 GB', { icon: 'drive', accent: k.cpu > 70 ? 'yellow' : '' }),
      kpi('Banned hari ini', k.bansToday, 'flag XGuard ' + k.cheatFlags + ' menunggu', { icon: 'ban', accent: 'red' }),
      kpi('Tiket terbuka', k.ticketsOpen, 'SLA 30 menit untuk urgent', { icon: 'ticket', accent: 'yellow' }),
      kpi('Whitelist pending', k.wlPending, 'target review &lt; 6 jam', { icon: 'shield' }),
      kpi('Sirkulasi uang', '$' + F.n(k.economyCirc / 1e6) + ' jt', 'inflasi 2,1%/bulan', { icon: 'coins', accent: 'green' }));
    $('#ov-uptime').textContent = 'crash-free ' + k.uptimeDays + ' hari';
    $('#ov-servers').replaceChildren(...OV.servers.map((s) => serverRow(s, true)));
    $('#ov-staff').replaceChildren(...OV.sessions.map((x) => el('div', { class: 'list-row' },
      el('span', { class: 'avatar sm', text: x.staff.slice(0, 2) }),
      el('div', { class: 'grow' }, el('b', { class: 'tiny', text: x.staff }), el('div', { class: 'tiny muted', text: `${x.role} · ${x.server} · ${x.actions} aksi` })),
      el('span', { class: 'badge green', text: 'lvl ' + x.level }))));
    const con = $('#ov-console');
    con.replaceChildren(...(OV.console || []).map(consoleLine));
    $('#donut-slot').textContent = '';
    CH.donut($('#donut-slot'), { data: OV.charts.donut.map((x, i) => ({ ...x, color: CH.PALETTE[i] })), caption: 'share online' });
    paintRingkasanCharts();
    $('#cnt-ticket').textContent = k.ticketsOpen;
    $('#cnt-wl').textContent = k.wlPending;
  }
  function paintRingkasanCharts() {
    if (!OV) return;
    CH.area($('#ch-load'), {
      h: 220, maxLabels: 8,
      series: [
        { name: 'Online', color: '#9b6bf2', data: OV.charts.hour.map((h) => ({ x: h.hour, y: h.value })) },
        { name: 'Ping', color: '#4cc9f0', dash: '4 4', data: OV.charts.ping24.map((h) => ({ x: h.hour, y: h.value })) },
      ],
    });
  }
  const kpi = (label, value, note, o = {}) => el('div', { class: 'kpi' + (o.accent ? ' accent-' + o.accent : '') },
    el('div', { class: 'lb' }, o.icon ? icon(o.icon, 'sm') : null, label), el('div', { class: 'v', text: value }),
    note ? el('div', { class: 'd' }, el('span', { class: o.trend > 0 ? 'up' : o.trend < 0 ? 'down' : '', html: (o.trend > 0 ? '▲ ' : o.trend < 1 && o.trend === -1 ? '▼ ' : '') + F.esc(note) })) : null,
    o.spark ? (() => { const s = el('div', { class: 'spark' }); requestAnimationFrame(() => CH.spark(s, o.spark, o.sparkColor || '#9b6bf2', 38)); return s; })() : null);
  function consoleLine(l) {
    return el('div', { class: 'l' }, el('span', { class: 'ts', text: F.time(l.ts) }), el('span', { class: 'lv-' + l.level, text: String(l.level).toUpperCase() }), el('span', { text: l.text }));
  }
  function serverRow(s, withCtl) {
    const loadPct = Math.round((s.online / s.maxPlayers) * 100);
    const row = el('div', { class: 'lrow' },
      el('div', {}, el('b', { text: s.name.replace('Xvault HUB — ', '') }),
        el('div', { class: 'tiny muted mono', text: `${s.host || 'play.xvaulthub.id'}:${s.port} · ${s.version || '0.3.7'}` })),
      el('div', {}, el('div', { class: 'bar' + (loadPct > 92 ? ' red' : loadPct > 75 ? ' yellow' : ' green') }, el('i', { style: { width: loadPct + '%' } })),
        el('div', { class: 'tiny muted', style: { marginTop: '4px' }, text: `${F.n(s.online)}/${F.n(s.maxPlayers)} · ${loadPct}%` })),
      el('span', { class: 'mono tiny ' + (s.ping < 25 ? 'on' : s.ping < 50 ? 'hi' : 'crit'), text: s.ping + ' ms' }),
      el('div', { class: 'acts' },
        el('button', { class: 'btn xs', title: 'Salin IP', html: ico('copy', 'sm'), onclick: () => copy(`${s.host || 'play.xvaulthub.id'}:${s.port}`) }),
        withCtl ? el('button', { class: 'btn xs', title: 'Kick semua (demo)', html: ico('userX', 'sm'), onclick: () => toast(`${s.name}: ${s.online} pemain diberi peringatan save (demo).`, 'warn') }) : null,
        withCtl ? el('button', { class: 'btn xs ' + (loadPct > 92 ? 'danger' : 'ghost'), text: 'Restart', onclick: () => restart(s) }) : null));
    row.dataset.srv = s.id;
    return row;
  }
  function restart(s) {
    confirmBox('Restart server', `Yakin me-restart <b>${F.esc(s.name)}</b>? Semua pemain online (${F.n(s.online)}) akan disconnect dan data di-save dulu.`, async () => {
      if (!can(4)) return toast('Butuh admin level 4 untuk me-restart.', 'err');
      try { await api.post('/api/admin/console/exec', { cmd: '/restart ' + s.id }); toast('Perintah restart terkirim — watchdog memantau 60 detik ke depan.', 'ok', 5000); }
      catch (e) { toast(e.message, 'err'); }
    }, 'Restart sekarang');
  }

  /* ---------- live ---------- */
  let liveServers = [], livePlayers = [];
  async function loadLive() {
    try { const [srv, lv] = await Promise.all([api.get('/api/servers'), api.get('/api/live')]); liveServers = srv; livePlayers = lv.onlineNames || []; } catch { }
    paintLive(); paintLiveCharts();
  }
  function paintLive() {
    $('#live-kpis').replaceChildren(
      kpi('Total online', F.n(liveServers.reduce((a, s) => a + s.online, 0)), 'live', { icon: 'users', accent: 'green' }),
      kpi('Antrean tunggu', '0', 'semua node di bawah 95%', { icon: 'clock' }),
      kpi('Ping tertinggi', Math.max(...liveServers.map((s) => s.ping), 0) + ' ms', 'node CnR', { icon: 'wifi', accent: 'yellow' }),
      kpi('Proses gamemode', '4 aktif', 'semua sehat', { icon: 'cpu', accent: 'blue' }),
      kpi('Uptime sesi', F.dur(OV ? OV.kpi.uptimeDays * 86400 : 0), 'sejak restart besar', { icon: 'refresh' }));
    $('#live-servers').replaceChildren(...liveServers.map((s) => serverRow(s, true)));
    paintPlayersLive();
  }
  function paintPlayersLive() {
    const q = ($('#live-search').value || '').toLowerCase();
    const rows = livePlayers.filter((p) => !q || p.name.toLowerCase().includes(q));
    $('#live-players').replaceChildren(...rows.map((p) => el('tr',
      el('td', {}, el('div', { class: 'row', style: { gap: '8px' } }, el('span', { class: 'avatar sm', text: p.name.slice(0, 2) }), el('span', { class: 'mono tiny', text: p.name }))),
      el('td', { class: 'r num', text: p.level }),
      el('td', { class: 'r', html: `<span class="pings ${p.ping < 25 ? 'good' : p.ping < 45 ? 'mid' : 'bad'}">${p.ping} ms</span>` }),
      el('td', { class: 'tiny muted', text: String(p.server || '').replace('Xvault HUB — ', '') }),
      el('td', { class: 'r' }, el('div', { class: 'acts row-actions' },
        el('button', { class: 'btn xs', text: 'Info', onclick: () => playerDrawer(p.name) }),
        el('button', { class: 'btn xs', text: 'Kick', onclick: () => sanctionUI(p.name, 'kick') }),
        el('button', { class: 'btn xs danger', text: 'Ban', onclick: () => sanctionUI(p.name, 'ban') }))))));
  }
  function paintLiveCharts() {
    if (!OV) return;
    CH.area($('#ch-ping'), { h: 200, series: [{ name: 'Ping', color: '#4cc9f0', data: OV.charts.ping24.map((h) => ({ x: h.hour, y: h.value })) }], zeroBased: false });
  }

  /* ---------- konsol ---------- */
  function pushToConsole(line, hosts = ['#con-full', '#ov-console']) {
    hosts.forEach((h) => {
      const host = $(h); if (!host) return;
      if (state.conFilter !== 'all' && line.level !== state.conFilter && !(state.conFilter === 'err' && line.level === 'err')) return;
      host.prepend(consoleLine(line));
      while (host.children.length > 140) host.lastElementChild.remove();
    });
  }
  async function loadConsole() {
    try {
      const rows = await api.get('/api/admin/console');
      $('#con-full').replaceChildren(...rows.slice().reverse().map(consoleLine));
      const c = $('#con-cards');
      if (c) c.replaceChildren(
        infoCard('Proses', [['PID gamemode', '8112 · 4 node'], ['Memory RSS', (2.9 + Math.random()).toFixed(2) + ' GB'], ['Thread', '38'], ['Handle file', '412 / 65535']]),
        infoCard('Watchdog', [['Cek interval', '5 detik'], ['Ambang hang', '3 tick kosong'], ['Restart otomatis', 'aktif'], ['Alarm', '#infra-alert Discord']]),
        infoCard('Antrean', [['Tick rate', '4,0 Hz'], ['Packet/s', F.n(31840)], ['Buffer', 'normal'], ['Lagsync', 'kompensasi aktif']]));
    } catch (e) { toast(e.message, 'err'); }
  }
  const infoCard = (title, rows) => el('div', { class: 'panel' }, el('div', { class: 'ph' }, el('h3', { text: title })),
    ...rows.map(([k, v]) => el('div', { class: 'metric' }, el('span', { text: k }), el('b', { class: 'mono tiny', text: v }))));
  async function execConsole(cmd) {
    try {
      const r = await api.post('/api/admin/console/exec', { cmd });
      (r.output || []).forEach((t) => pushToConsole({ ts: new Date().toISOString(), level: 'info', text: `[exec] ${t}` }));
      toast('Perintah dieksekusi di konsol (demo).', 'ok', 2600);
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- pemain ---------- */
  async function loadPlayers() {
    const q = state.players;
    const url = `/api/admin/players?page=${q.page}&per=${PER}&q=${encodeURIComponent(q.q)}&status=${q.status}&faction=${q.faction}`;
    let data;
    try { data = await api.get(url); } catch (e) { toast(e.message, 'err'); return; }
    if (!q.factionList && data.factions) {
      q.factionList = 1;
      const sel = $('#pl-faction');
      [...new Set(data.factions)].sort().forEach((f) => sel.appendChild(el('option', { text: f })));
    }
    const tb = $('#pl-body');
    tb.replaceChildren(...data.rows.map((p) => {
      const tr = el('tr',
        el('td', {}, el('input', { type: 'checkbox', class: 'box', ...(q.sel.has(p.id) ? { checked: true } : {}), onchange: (e) => { e.target.checked ? q.sel.add(p.id) : q.sel.delete(p.id); paintSelBar(); } })),
        el('td', {}, el('div', { class: 'row', style: { gap: '9px' } }, el('span', { class: 'avatar sm', text: p.name.slice(0, 2) }),
          el('div', {}, el('b', { class: 'mono tiny', text: p.name }), el('div', { class: 'tiny muted', text: `${p.city}${p.vip ? ' · ' + p.vip : ''} · id ${p.id}` })))),
        el('td', { class: 'r num', text: p.level }),
        el('td', { class: 'r mono tiny', text: F.n(p.hours) }),
        el('td', { class: 'r mono tiny', text: p.kdr.toFixed(2) }),
        el('td', { class: 'tiny', text: p.faction || '—' }),
        el('td', { class: 'r mono tiny', text: F.money(p.money + p.bank) }),
        el('td', { class: 'c', html: statusBadge(p.status) }),
        el('td', { class: 'r' }, el('div', { class: 'acts row-actions' },
          el('button', { class: 'btn xs', text: 'Detail', onclick: () => playerDrawer(p.name) }),
          el('button', { class: 'btn xs', text: 'Kick', onclick: () => sanctionUI(p.name, 'kick', p.id) }),
          el('button', { class: 'btn xs', text: 'Mute', onclick: () => sanctionUI(p.name, 'mute', p.id) }),
          p.banned
            ? el('button', { class: 'btn xs', text: 'Unban', onclick: () => doAction(p.id, 'unban', { reason: 'banding diterima — ' + p.name }) })
            : el('button', { class: 'btn xs danger', text: 'Ban', onclick: () => sanctionUI(p.name, 'ban', p.id) }))));
      return tr;
    }));
    paintPager(data);
    paintSelBar();
  }
  function paintPager(data) {
    const mk = (label, pg, dis, on) => el('button', { text: label, disabled: dis || undefined, class: on ? 'on' : '', onclick: () => { state.players.page = pg; loadPlayers(); } });
    const nums = [];
    for (let i = Math.max(1, data.page - 2); i <= Math.min(data.pages, data.page + 2); i++) nums.push(mk(i, i, false, i === data.page));
    $('#pl-pager').replaceChildren(
      el('span', { class: 'tiny muted', style: { marginRight: '8px' }, text: `${F.n(data.total)} pemain` }),
      mk('‹', data.page - 1, data.page === 1), ...nums, mk('›', data.page + 1, data.page === data.pages),
      el('span', { class: 'tiny muted', style: { marginLeft: '8px' }, text: `hal ${data.page}/${data.pages}` }));
  }
  function paintSelBar() {
    const n = state.players.sel.size;
    const bar = $('#pl-selbar');
    if (!n) { bar.hidden = true; bar.textContent = ''; return; }
    bar.hidden = false;
    bar.replaceChildren(
      el('b', { text: n + ' dipilih' }),
      el('button', { class: 'btn xs', text: 'Kick semua', onclick: () => bulk('kick') }),
      el('button', { class: 'btn xs danger', text: 'Ban semua', onclick: () => bulk('ban') }),
      el('button', { class: 'btn xs ghost', text: 'Bersihkan', onclick: () => { state.players.sel.clear(); loadPlayers(); } }),
      el('span', { class: 'spacer' }),
      el('span', { class: 'tiny muted', text: 'aksi massal butuh alasan & level 3+' }));
  }
  async function bulk(action) {
    const ids = [...state.players.sel];
    const reason = await askReason(`${action === 'ban' ? 'Ban' : 'Kick'} ${ids.length} pemain`, 'Alasan massal');
    if (!reason) return;
    try {
      const r = await api.post('/api/admin/players/bulk', { ids, action, reason });
      toast(`${r.affected} pemain dikenai sanksi ${action.toUpperCase()}.`, 'ok', 4200);
      state.players.sel.clear(); loadPlayers(); loadOverview();
    } catch (e) { toast(e.message, 'err'); }
  }
  function playerDrawer(name) {
    api.get('/api/players/' + encodeURIComponent(name)).then((p) => {
      const pl = p.player;
      const M = modal({
        title: 'Kartu pemain — ' + pl.name, wide: true,
        body: el('div', { class: 'col' },
          el('div', { class: 'prof-head' },
            el('div', { class: 'avatar lg', text: pl.name.slice(0, 2).toUpperCase() }),
            el('div', {}, el('h3', { style: 'margin:0', text: `Lv ${pl.level} · ${pl.faction || 'Independen'}` }),
              el('div', { class: 'pill-row', style: { marginTop: '6px' } }, statusBadge(pl.status), pl.vip ? el('span', { class: 'badge yellow', text: pl.vip }) : null,
                pl.staff ? el('span', { class: 'badge violet', text: 'staff: ' + pl.role }) : null, pl.banned ? el('span', { class: 'badge red', text: 'banned' }) : null)),
            el('button', { class: 'btn sm ghost', text: 'Buka halaman publik', onclick: () => { window.open('/ranking', '_blank'); } })),
          el('div', { class: 'grid g4' }, ...[
            ['Jam', F.n(pl.hours)], ['K/D', pl.kdr], ['Uang', F.money(pl.money + pl.bank)], ['Ping', pl.ping + ' ms'],
            ['Reg', F.date(pl.joinedAt)], ['Terakhir', F.ago(pl.lastSeen)], ['Report', pl.reports], ['Tiket', pl.tickets]]
            .map(([k, v]) => el('div', { class: 'card flat', style: { padding: '10px 12px' } }, el('div', { class: 'tiny muted', text: k }), el('b', { class: 'mono', text: v })))),
          el('div', { class: 'row wrap-row', style: { gap: '7px' } },
            ...['kick', 'mute', 'freeze', 'warn'].map((a) => el('button', { class: 'btn sm', text: a.toUpperCase(), onclick: () => sanctionUI(pl.name, a, pl.id) })),
            el('button', { class: 'btn sm warn', text: 'Sita kendaraan', onclick: () => { toast(`2 kendaraan ${pl.name} disita (demo).`, 'ok'); M.close(); } }),
            el('button', { class: 'btn sm danger', text: 'IP Ban', onclick: () => sanctionUI(pl.name, 'ban', pl.id, ' (IP ban)') }),
            pl.banned ? el('button', { class: 'btn sm primary', text: 'Unban', onclick: () => doAction(pl.id, 'unban', { reason: '-review manual' }).then(() => M.close()) }) : el('button', { class: 'btn sm danger', text: 'BAN 7 HARI', onclick: () => sanctionUI(pl.name, 'ban', pl.id) })),
          el('div', { class: 'note', html: `HWID: <b class="mono">${F.esc(pl.hwid || 'HWID-xxxx')}</b> · IP terakhir <span class="mono">182.1.*.*</span> — di produksi tautan ini menarik data dari tabel <code>players</code> + <code>connections</code>.` })),
      });
    }).catch((e) => toast(e.message, 'err'));
  }
  function askReason(title, placeholder) {
    return new Promise((res) => {
      let done = false;
      const input = el('textarea', { class: 'input', placeholder: placeholder || 'Alasan sanksi (wajib, aturan R9)', style: { minHeight: '80px' } });
      const dur = el('input', { class: 'input', value: '7 hari', placeholder: 'durasi' });
      const M = modal({
        title,
        body: el('div', { class: 'col' }, input,
          el('label', { class: 'field', style: { margin: 0 } }, el('span', { text: 'Durasi / catatan' }), dur),
          el('div', { class: 'note', text: 'Alasan akan terlihat oleh pemain di dasbor & tiket banding. Hindari bahasa yang menyinggung.' })),
        foot: [el('button', { class: 'btn ghost', text: 'Batal', onclick: () => { done = true; res(''); M.close(); } }),
        el('button', { class: 'btn danger', text: 'Jatuhkan sanksi', onclick: () => { const v = input.value.trim(); if (v.length < 4) return toast('Alasan minimal 4 karakter.', 'err'); done = true; res(v + (dur.value ? ` (${dur.value})` : '')); M.close(); } })],
        onClose: () => { if (!done) res(''); },
      });
      setTimeout(() => input.focus(), 60);
    });
  }
  async function sanctionUI(name, action, id, suffix = '') {
    if (id == null) { const r = await api.get('/api/leaderboard?q=' + encodeURIComponent(name) + '&per=1'); id = r.rows[0] ? r.rows[0].id : 1000; }
    const labels = { kick: 'Kick', ban: 'Ban', mute: 'Mute', freeze: 'Freeze', warn: 'Peringatan' };
    if (!can(action === 'ban' ? 3 : 2)) return toast(`Aksi ${action.toUpperCase()} butuh admin level ${action === 'ban' ? 3 : 2}.`, 'err');
    const reason = await askReason(`${labels[action]} → ${name}${suffix}`, `Alasan ${labels[action].toLowerCase()} ${name}`);
    if (!reason) return;
    await doAction(id, action, { reason, duration: '7 hari' });
  }
  async function doAction(id, action, body) {
    try {
      const r = await api.post(`/api/admin/players/${id}/action`, { action, ...body });
      toast(`${String(action).toUpperCase()} berhasil ke ${r.player.name}. Tersimpan di log audit.`, 'ok', 4200);
      loadPlayers(); loadOverview(); loadLogs();
      return r;
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- sanksi & banding ---------- */
  function loadSanctions() {
    const flags = [
      { p: 'Viper_Reno', score: .94, kind: 'aim snap', at: '2 menit lalu', evid: '38 klip' },
      { p: 'xX_King_Zaki', score: .88, kind: 'health lock', at: '11 menit lalu', evid: '2 klip' },
      { p: 'Neo_Farhan', score: .79, kind: 'speedhack', at: '24 menit lalu', evid: 'log sync' },
      { p: 'Shadow_Tio', score: .71, kind: 'texture ilegal', at: '40 menit lalu', evid: 'hash mod' },
      { p: 'Cyber_Unu', score: .66, kind: 'auto-clicker?', at: '55 menit lalu', evid: 'statistik' },
    ];
    $('#flag-count').textContent = flags.length + ' flag';
    $('#flag-list').replaceChildren(...flags.map((f) => el('div', { class: 'list-row', style: { alignItems: 'flex-start' } },
      el('span', { class: 'badge ' + (f.score > .85 ? 'red' : 'yellow'), style: { minWidth: '54px', justifyContent: 'center' }, text: (f.score * 100).toFixed(0) }),
      el('div', { class: 'grow' }, el('b', { class: 'mono tiny', text: f.p }),
        el('div', { class: 'tiny muted', text: `${f.kind} · ${f.at} · bukti: ${f.evid}` })),
      el('div', { class: 'acts' },
        el('button', { class: 'btn xs', text: 'Lewati', onclick: (e) => { e.target.closest('.list-row').style.opacity = .35; toast(`${f.p} dilewati — flag ditutup.`, 'info'); } }),
        el('button', { class: 'btn xs danger', text: 'Ban', onclick: () => sanctionUI(f.p, 'ban', null, ' — ' + f.kind) })))));
    api.get('/api/admin/tickets?status=open&per=10').then((t) => {
      const ap = t.rows.filter((x) => x.type === 'Banding Ban').concat(t.rows.filter((x) => x.type !== 'Banding Ban').slice(0, 2));
      $('#appeal-list').replaceChildren(...ap.map((x) => el('div', { class: 'list-row', style: { alignItems: 'flex-start' } },
        el('span', { class: 'avatar sm', text: x.player.slice(0, 2) }),
        el('div', { class: 'grow' }, el('b', { class: 'tiny', text: x.id + ' · ' + x.player }),
          el('div', { class: 'tiny muted', text: F.truncate(x.subject, 62) + ' · ' + F.ago(x.updatedAt) })),
        el('div', { class: 'acts' },
          el('button', { class: 'btn xs', text: 'Terima', onclick: () => decide(x, 'resolved', 'Banding diterima — sanksi dikurangi/dihapus.') }),
          el('button', { class: 'btn xs danger', text: 'Tolak', onclick: () => decide(x, 'closed', 'Banding ditolak — bukti tidak cukup.') })))));
    });
    loadSanctionTable();
  }
  async function decide(t, status, reply) {
    try {
      await api.post(`/api/admin/tickets/${t.id}/reply`, { reply, status });
      toast(`${t.id} → ${status === 'resolved' ? 'banding diterima' : 'banding ditolak'}.`, 'ok');
      loadSanctionTable(); loadTickets(); loadOverview();
    } catch (e) { toast(e.message, 'err'); }
  }
  let sanctionRows = [];
  async function loadSanctionTable() {
    try { sanctionRows = (await api.get('/api/admin/logs?per=40')).rows; } catch { }
    paintSanction();
  }
  function paintSanction() {
    const f = $('#sn-filter').value;
    const rows = sanctionRows.filter((l) => !f || l.action === f);
    $('#sn-body').replaceChildren(...rows.slice(0, 24).map((l) => el('tr',
      el('td', { class: 'tiny mono muted nowrap', text: F.dt(l.ts) }),
      el('td', {}, el('span', { class: 'badge ' + ({ BAN: 'red', KICK: 'yellow', MUTE: '', UNBAN: 'green', FREEZE: 'blue', WHITELIST: 'violet' }[l.action] || ''), text: l.action })),
      el('td', { class: 'mono tiny', text: l.target }),
      el('td', { class: 'tiny', text: F.truncate(l.reason, 54) }),
      el('td', { class: 'tiny muted nowrap', text: l.staff }),
      el('td', { class: 'c', html: statusBadge(l.result) }))));
  }

  /* ---------- tiket ---------- */
  async function loadTickets() {
    let t;
    try { t = await api.get('/api/admin/tickets?status=' + $('#tk-filter').value + '&per=40'); } catch (e) { return toast(e.message, 'err'); }
    state.tickets.rows = t.rows;
    $('#cnt-ticket').textContent = t.rows.filter((x) => x.status === 'open').length;
    const items = t.rows.map((x) => {
      const mid = el('span', { class: 'grow' });
      mid.appendChild(el('b', { class: 'tiny', text: F.truncate(x.subject, 46) }));
      mid.appendChild(el('div', { class: 'tiny muted', text: `${x.id} · ${x.player} · ${x.type}` }));
      const btn = el('button', {
        class: 'list-row', style: { width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: state.activeTicket === x.id ? 'var(--violet)' : '' },
        onclick: () => { state.activeTicket = x.id; loadTickets(); },
      });
      btn.append(
        el('span', { class: 'avatar sm', style: x.priority === 'urgent' ? { background: 'linear-gradient(140deg,#ff5470,#c9184a)' } : {}, text: x.player.slice(0, 2) }),
        mid,
        el('span', { html: statusBadge(x.status) }),
        el('span', { html: statusBadge(x.priority) }));
      return btn;
    });
    $('#tk-list').replaceChildren(...items);
    paintTicket();
  }
  function paintTicket() {
    const t = state.tickets.rows.find((x) => x.id === state.activeTicket) || state.tickets.rows[0];
    const thread = $('#tk-thread');
    if (!t) { thread.replaceChildren(el('p', { class: 'muted tiny', text: 'Antrean kosong.' })); $('#tk-meta').textContent = 'pilih tiket'; return; }
    state.activeTicket = t.id;
    $('#tk-meta').textContent = `${t.id} · ${t.player} · ${t.server}`;
    $('#tk-prio').value = t.priority;
    const parts = [];
    parts.push(el('div', { class: 'msg me' }, el('div', { class: 'who' }, `${t.player} · ${F.dt(t.createdAt)}`), el('div', { text: t.subject + ' — ' + t.lastMessage })));
    if (t.assignee) parts.push(el('div', { class: 'msg' }, el('div', { class: 'who' }, t.assignee + ' · ' + F.dt(t.updatedAt)), el('div', { text: 'Sudah aku cek. Kalau perlu bukti, minta video 30 detik sebelum kejadian sesuai aturan R9.' })));
    if (t.evidence && t.evidence.length) {
      parts.push(el('div', { class: 'list-row' }, el('span', { class: 'tile-ico' }, icon('file', 'sm')),
        el('div', { class: 'grow' }, el('b', { class: 'tiny', text: 'Lampiran' }), el('div', { class: 'tiny muted mono', text: t.evidence.join(' · ') })),
        el('button', { class: 'btn xs', text: 'Unduh', onclick: () => toast('Demo: file bukti tidak tersedia.', 'warn') })));
    }
    thread.replaceChildren(...parts);
  }

  async function ticketReply(status) {
    const t = state.tickets.rows.find((x) => x.id === state.activeTicket);
    if (!t) return toast('Pilih tiket dulu.', 'warn');
    const reply = $('#tk-reply').value.trim() || 'Tiket ditangani sesuai prosedur.';
    try {
      await api.post(`/api/admin/tickets/${t.id}/reply`, { reply, status });
      $('#tk-reply').value = '';
      toast(`Tiket ${t.id} diperbarui.`, 'ok'); loadTickets(); loadOverview();
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- whitelist ---------- */
  async function loadWhitelist() {
    let rows = [];
    try { rows = await api.get('/api/admin/whitelist'); } catch (e) { return toast(e.message, 'err'); }
    $('#wl-queue').textContent = rows.filter((r) => r.status === 'pending').length + ' menunggu';
    $('#wl-body').replaceChildren(...rows.map((w2) => {
      const weakest = Object.entries(w2.aspects).sort((a, b) => a[1] - b[1])[0];
      return el('tr',
        el('td', { class: 'mono tiny', text: w2.id }),
        el('td', {}, el('b', { class: 'mono tiny', text: w2.character }), el('div', { class: 'tiny muted', text: `${F.ago(w2.submittedAt)} · ${w2.hours} jam pengalaman` })),
        el('td', { class: 'mono tiny', text: w2.player }),
        el('td', { class: 'r' }, el('b', { class: 'num', style: { color: w2.score >= 80 ? 'var(--green)' : w2.score >= 62 ? 'var(--yellow)' : 'var(--red)' }, text: w2.score })),
        el('td', { class: 'tiny', text: `${weakest[0].replace('_', ' ')} (${weakest[1]})` }),
        el('td', {}, el('span', { html: statusBadge(w2.status) })),
        el('td', { class: 'r' }, el('div', { class: 'acts' },
          el('button', { class: 'btn xs', text: 'Detail', onclick: () => wlDetail(w2) }),
          el('button', { class: 'btn xs', text: 'Setujui', onclick: () => decideWl(w2.id, 'approved') }),
          el('button', { class: 'btn xs danger', text: 'Tolak', onclick: () => decideWl(w2.id, 'rejected') }))));
    }));
  }
  function wlDetail(w2) {
    const M = modal({
      title: 'Aplikasi ' + w2.id, wide: true,
      body: el('div', { class: 'col' },
        el('div', { class: 'grid g3' }, ...Object.entries(w2.aspects).map(([k, v], i) => el('div', { class: 'card flat', style: { padding: '11px' } },
          el('div', { class: 'tiny muted', text: k.replace('_', ' ') }), el('b', { class: 'num', text: v + '/100' }),
          el('div', { class: 'bar' + (v > 80 ? ' green' : v > 60 ? ' yellow' : ' red'), style: { marginTop: '7px' } }, el('i', { style: { width: v + '%' } }))))),
        el('div', { class: 'card flat' }, el('h3', { style: 'margin:0 0 6px', text: 'Backstory (cuplikan)' }),
          el('p', { class: 'tiny', style: 'margin:0;color:var(--ink-2)', text: `${w2.character} besar di El Corona bersama kakeknya yang sopir taksi. Setelah kakeknya kena rampok di Willow, ia memutuskan masuk LSPD — tapi punya dendam pribadi pada kelompok yang menguasai jalur timur. Ia tidak percaya birokrasi, hanya pada bukti.` })),
        el('div', { class: 'note', html: 'Reviewer sebelumnya: <b>' + F.esc(w2.reviewer || 'belum ada') + '</b> · catatan: ' + F.esc(w2.note) })),
      foot: [el('button', { class: 'btn ghost', text: 'Tutup', onclick: () => M.close() }),
      el('button', { class: 'btn', text: 'Minta revisi', onclick: () => { decideWl(w2.id, 'pending', 'Perlu memperbaiki bagian ' + Object.entries(w2.aspects).sort((a, b) => a[1] - b[1])[0][0]); M.close(); } }),
      el('button', { class: 'btn danger', text: 'Tolak', onclick: () => { decideWl(w2.id, 'rejected', 'Belum memenuhi standar RP.'); M.close(); } }),
      el('button', { class: 'btn primary', text: 'Setujui', onclick: () => { decideWl(w2.id, 'approved', 'Diterima — silakan join server RP.'); M.close(); } })],
    });
  }
  async function decideWl(id, decision, note) {
    if (!can(2)) return toast('Review whitelist butuh level 2+.', 'err');
    try { await api.post(`/api/admin/whitelist/${id}/decision`, { decision, note }); toast(`${id} → ${decision}`, 'ok'); loadWhitelist(); loadOverview(); }
    catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- ekonomi ---------- */
  let ECO = null;
  async function loadEconomy() {
    try { ECO = await api.get('/api/admin/economy'); } catch (e) { return toast(e.message, 'err'); }
    $('#ec-kpis').replaceChildren(
      kpi('Sirkulasi total', '$' + F.n(ECO.circulation / 1e6) + ' jt', ECO.inflation + '% inflasi/bulan', { icon: 'coins', accent: 'green' }),
      kpi('Kas server', '$' + F.n(ECO.serverBank / 1e6) + ' jt', 'dana operasional', { icon: 'database' }),
      kpi('Arus masuk 24j', '$' + F.n(ECO.daily.income / 1000) + ' rb', 'gaji & penjualan', { icon: 'arrowD', trend: 1 }),
      kpi('Arus keluar 24j', '$' + F.n(ECO.daily.outcome / 1000) + ' rb', 'pajak, servis, biaya', { icon: 'arrowU', trend: -1 }),
      kpi('Neto hari ini', '$' + F.n(ECO.daily.net / 1000) + ' rb', 'positif = uang terserap', { icon: 'chart', accent: ECO.daily.net > 0 ? 'green' : 'red' }));
    $('#ec-top').replaceChildren(...ECO.top.map((p, i) => el('tr',
      el('td', { class: 'num rank-' + (i + 1), text: i + 1 }),
      el('td', { class: 'mono tiny', text: p.name }),
      el('td', { class: 'r mono tiny', text: F.money(p.money) }), el('td', { class: 'r mono tiny', text: F.money(p.bank) }),
      el('td', { class: 'r mono', text: F.money(p.money + p.bank) }),
      el('td', { class: 'r' }, el('button', { class: 'btn xs', text: 'Audit', onclick: () => auditMoney(p) })))));
    $('#ec-prices').replaceChildren(...ECO.prices.map((x) => el('div', { class: 'mini-row', style: { justifyContent: 'space-between' } },
      el('span', { class: 'tiny', text: x.item }), el('span', { class: 'mono tiny', text: F.money(x.price) }),
      el('span', { class: 'tiny', style: { color: x.chg > 0 ? 'var(--green)' : 'var(--red)' }, text: (x.chg > 0 ? '▲' : '▼') + ' ' + Math.abs(x.chg) + '%' }))));
    paintEco();
  }
  function paintEco() {
    if (!ECO || !$('#ch-eco').clientWidth) return;
    CH.area($('#ch-eco'), { h: 200, series: [{ name: 'Sirkulasi', color: '#31d99a', data: ECO.chart30.map((c) => ({ x: c.label, y: c.value })) }], yFmt: (v) => Math.round(v / 1e6) + 'jt' });
    CH.hbars($('#ec-flows'), { fmt: (v) => '$' + Math.round(v / 1000) + 'rb', data: ECO.flows.map((f, i) => ({ ...f, color: CH.PALETTE[i] })) });
  }
  async function auditMoney(p) {
    const val = await askReason('Koreksi saldo — ' + p.name, `Alasan koreksi (mis: duplikasi item, kompensasi bug, rollback transaksi). Saldo saat ini ${F.money(p.money + p.bank)}.`);
    if (!val) return;
    const newAmt = Math.max(0, Math.round((p.money + p.bank) * 0.6));
    try {
      await api.post(`/api/admin/players/${p.id}/action`, { action: 'money_set', reason: val, money: newAmt });
      toast(`Saldo ${p.name} dikoreksi ke ${F.money(newAmt)} (demo: 60% dari semula).`, 'ok', 5000); loadEconomy();
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- pengumuman ---------- */
  async function loadBroadcasts() {
    let rows = [];
    try { rows = await api.get('/api/admin/broadcasts'); } catch { }
    $('#bc-list').replaceChildren(...rows.map((b) => el('div', { class: 'list-row', style: { alignItems: 'flex-start' } },
      el('span', { class: 'tile-ico' }, icon('megaphone', 'sm')),
      el('div', { class: 'grow' }, el('b', { class: 'tiny', text: b.text }),
        el('div', { class: 'tiny muted', text: `${b.by} · ${F.ago(b.at)}${b.target ? ' · target: ' + b.target : ''}` })),
      el('span', { class: 'badge ' + (b.active ? 'green' : ''), text: b.active ? 'aktif' : 'riwayat' }))));
  }
  async function sendBroadcast() {
    const text = $('#bc-text').value.trim();
    if (!text) return toast('Tulis pesannya dulu.', 'warn');
    try {
      const r = await api.post('/api/admin/broadcast', { text, target: $('#bc-target').value, level: ME.level });
      toast(`Terkirim ke ${F.n(r.reach)} pemain online${$('#bc-dc').checked ? ' + Discord' : ''}.`, 'ok', 4600);
      $('#bc-text').value = ''; loadBroadcasts();
    } catch (e) { toast(e.message, 'err'); }
  }

  /* ---------- log ---------- */
  let logsCache = null;
  async function loadLogs() {
    try { logsCache = (await api.get('/api/admin/logs?per=60&q=' + encodeURIComponent($('#lg-q').value || ''))).rows; } catch (e) { return; }
    $('#lg-body').replaceChildren(...logsCache.slice(0, 50).map((l) => el('tr',
      el('td', { class: 'tiny mono muted nowrap', text: F.dt(l.ts) }),
      el('td', {}, el('span', { class: 'badge ' + ({ BAN: 'red', KICK: 'yellow', UNBAN: 'green', BROADCAST: 'violet', WHITELIST: 'violet', TICKET_REPLY: 'blue' }[l.action] || ''), text: l.action })),
      el('td', { class: 'mono tiny', text: l.target }),
      el('td', { class: 'tiny', text: F.truncate(l.reason, 62) }),
      el('td', { class: 'tiny muted nowrap', text: l.staff }),
      el('td', { class: 'tiny muted nowrap', text: String(l.server || '').replace('Xvault HUB — ', '') }),
      el('td', { class: 'c', html: statusBadge(l.result) }))));
    $('#lg-pager').replaceChildren(el('span', { class: 'tiny muted', text: `${logsCache.length} entri dimuat · retensi 180 hari · tidak dapat dihapus dari UI` }));
  }

  /* ---------- konfigurasi ---------- */
  function loadCfg() {
    const saved = JSON.parse(localStorage.getItem('xvault_cfg') || 'null');
    if (saved) {
      $('#cfg-slots').value = saved.slots; $('#cfg-tick').value = saved.tick; $('#cfg-restart').value = saved.restart;
      $('#cfg-ac').value = saved.ac; $('#cfg-chars').value = saved.chars; $('#cfg-queue').value = saved.queue;
      $('#cfg-wl').checked = saved.wl; $('#cfg-regen').checked = saved.regen; $('#cfg-voice').checked = saved.voice; $('#cfg-punish').checked = saved.punish;
      $('#cfg-state').textContent = 'memuat dari localStorage';
    }
    $('#bk-last').textContent = new Date(Date.now() - 12 * 60000).toLocaleTimeString('id-ID');
  }
  function saveCfg() {
    const v = {
      slots: +$('#cfg-slots').value, tick: $('#cfg-tick').value, restart: $('#cfg-restart').value,
      ac: +$('#cfg-ac').value, chars: +$('#cfg-chars').value, queue: $('#cfg-queue').value,
      wl: $('#cfg-wl').checked, regen: $('#cfg-regen').checked, voice: $('#cfg-voice').checked, punish: $('#cfg-punish').checked,
    };
    localStorage.setItem('xvault_cfg', JSON.stringify(v));
    $('#cfg-state').textContent = 'disimpan ' + new Date().toLocaleTimeString('id-ID');
    toast('Konfigurasi disimpan ke memori browser + dikirim ke API (demo).', 'ok', 4200);
    execConsole(`/acmd cfg ${JSON.stringify(v).slice(0, 60)}`);
  }

  /* ---------- boot ---------- */
  async function init() {
    if (!api.token) { location.href = '/login?next=/admin'; return; }
    try { const me = await api.get('/api/auth/me'); if (me.user.role !== 'admin') { toast('Akun ini bukan staff — dialihkan ke dasbor player.', 'warn'); setTimeout(() => (location.href = '/dashboard'), 900); return; } ME = me.user; }
    catch { api.token = ''; location.href = '/login'; return; }
    $('#lvl-badge').textContent = ME.level;
    $('#side-user').replaceChildren(
      el('span', { class: 'avatar', style: { background: ME.level >= 4 ? 'linear-gradient(140deg,#f97316,#c9184a)' : 'linear-gradient(140deg,#31d99a,#118ab2)' }, text: ME.name.slice(0, 2) }),
      el('span', { class: 'grow' }, el('b', { text: ME.name }), el('span', { text: 'Admin level ' + ME.level })),
      (() => { const b = el('button', { class: 'btn xs ghost', title: 'Keluar' }); b.appendChild(icon('logout', 'sm')); b.onclick = () => { api.token = ''; location.href = '/'; }; return b; })());
    $('#view-sub').textContent = 'Masuk sebagai ' + ME.name + ' · level ' + ME.level;

    await Promise.all([loadOverview(), loadLive(), loadConsole(), loadPlayers(), loadSanctions(), loadTickets(), loadWhitelist(), loadEconomy(), loadBroadcasts(), loadLogs(), loadCfg()]);

    // live SSE
    live.on((data) => {
      const chip = $('#chip-online span:last-child');
      if (chip) chip.textContent = F.n(data.online) + ' online';
      if (data.servers) {
        data.servers.forEach((s) => {
          const row = $$('[data-srv]').find((r) => r.dataset.srv === s.id);
          if (!row) return;
          const fill = row.querySelector('.bar > i'); const txt = row.querySelectorAll('.tiny.muted')[0];
          const pctv = Math.min(100, Math.round((s.online / (s.playersMax || 1000)) * 100));
          if (fill) fill.style.width = pctv + '%';
          if (txt && txt.textContent.includes('/')) txt.textContent = `${F.n(s.online)}/${F.n(s.playersMax || 1000)} · ${pctv}%`;
        });
      }
      if (data.console && $('#con-autoscroll')?.checked) data.console.forEach((l) => pushToConsole(l));
      if (data.runtime) { $('#cnt-live').textContent = 'live'; }
    });
    d.addEventListener('xv:live', () => { });

    // events
    $$('#side-nav a[data-view]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showView(a.dataset.view); }));
    $$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); showView(a.dataset.goto); }));
    $('#side-open').addEventListener('click', () => d.body.classList.toggle('side-open'));
    $('#btn-refresh').addEventListener('click', () => { loadOverview(); loadLive(); loadPlayers(); loadTickets(); toast('Semua panel disegarkan.', 'ok', 2000); });
    $('#btn-broadcast-quick').addEventListener('click', () => { showView('pengumuman'); $('#bc-text').focus(); });
    $('#btn-restart-all').addEventListener('click', () => confirmBox('Restart semua node', 'Ini akan mendisconnect <b>semua pemain online</b> di 4 server. Lanjutkan?', async () => {
      if (!can(5)) return toast('Hanya level 5 yang bisa me-restart semua node.', 'err');
      await execConsole('/restart all'); toast('Restart global dijadwalkan 30 detik lagi + banner peringatan dikirim.', 'warn', 5000);
    }, 'Restart sekarang'));
    $('#pl-search').addEventListener('input', w.XV.debounce((e) => { state.players.q = e.target.value; state.players.page = 1; loadPlayers(); }, 260));
    $('#pl-status').addEventListener('change', (e) => { state.players.status = e.target.value; state.players.page = 1; loadPlayers(); });
    $('#pl-faction').addEventListener('change', (e) => { state.players.faction = e.target.value; state.players.page = 1; loadPlayers(); });
    $('#pl-reset').addEventListener('click', () => { state.players = { page: 1, q: '', status: '', faction: '', sel: new Set() }; $('#pl-search').value = ''; $('#pl-status').value = ''; $('#pl-faction').value = ''; loadPlayers(); });
    $('#pl-all').addEventListener('change', (e) => { state.players.sel = e.target.checked ? new Set((OV && OV.onlineNames || []).map((p, i) => 1000 + i)) : new Set(); loadPlayers(); });
    $('#live-search').addEventListener('input', () => paintPlayersLive());
    $('#con-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#con-input').value.trim(); if (v) { execConsole(v); $('#con-input').value = ''; } });
    $$('#con-filter button').forEach((b) => b.addEventListener('click', () => { $$('#con-filter button').forEach((x) => x.classList.toggle('on', x === b)); state.conFilter = b.dataset.lvl; loadConsole(); }));
    $('#con-clear').addEventListener('click', () => { $('#con-full').textContent = ''; toast('Konsol dibersihkan (hanya tampilan).', 'info', 1800); });
    $('#con-autoscroll').addEventListener('change', (e) => state.autoscroll = e.target.checked);
    $('#tk-filter').addEventListener('change', () => loadTickets());
    $('#tk-send').addEventListener('click', () => ticketReply('in_progress'));
    $('#tk-resolve').addEventListener('click', () => ticketReply('resolved'));
    $('#tk-assign').addEventListener('click', () => { const t = state.tickets.rows.find((x) => x.id === state.activeTicket); if (!t) return toast('Pilih tiket dulu.', 'warn'); t.assignee = ME.name + ' (Admin)'; paintTicket(); toast('Tiket ditugaskan ke kamu.', 'ok'); });
    $('#sn-filter').addEventListener('change', () => paintSanction());
    $('#wl-approve-all').addEventListener('click', async () => {
      if (!can(3)) return toast('Butuh level 3 untuk persetujuan massal.', 'err');
      const rows = await api.get('/api/admin/whitelist');
      const t = rows.filter((x) => x.score >= 80 && x.status !== 'approved');
      for (const x of t) await api.post(`/api/admin/whitelist/${x.id}/decision`, { decision: 'approved', note: 'Auto-approve skor ≥ 80 oleh ' + ME.name });
      toast(`${t.length} aplikasi disetujui otomatis.`, 'ok'); loadWhitelist();
    });
    $('#bc-text').addEventListener('input', (e) => $('#bc-count').textContent = e.target.value.length + '/220');
    $('#bc-form').addEventListener('submit', (e) => { e.preventDefault(); sendBroadcast(); });
    $('#lg-q').addEventListener('input', w.XV.debounce(() => loadLogs(), 260));
    $('#lg-export').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(logsCache, null, 2)], { type: 'application/json' }));
      const a = el('a', { href: url, download: 'xvault-audit-log.json' }); document.body.appendChild(a); a.click(); a.remove(); toast('Log audit diekspor.', 'ok');
    });
    $('#cfg-save').addEventListener('click', saveCfg);
    $('#cfg-reset').addEventListener('click', () => { localStorage.removeItem('xvault_cfg'); location.reload(); });
    $('#bk-now').addEventListener('click', () => { $('#bk-last').textContent = new Date().toLocaleTimeString('id-ID'); toast('Backup manual selesai — 4,12 GB dalam 22 detik.', 'ok', 4000); });
    $('#bk-verify').addEventListener('click', () => toast('Verifikasi checksum: 3.016 file cocok. Tidak ada korelasi rusak.', 'ok', 4000));
    ['#dz-wipe', '#dz-lock', '#dz-reset'].forEach((sel, i) => $(sel).addEventListener('click', () => confirmBox('Konfirmasi tindakan berbahaya',
      ['Wipe data bisnis yang belum dipakai pemain (7 hari).', 'Menutup pendaftaran karakter baru untuk semua node.', 'Semua sesi staff dicabut, harus login ulang.'][i],
      async () => { await execConsole('/acmd danger ' + i); toast('Perintah dikirim ke API (demo, tidak ada data yang benar-benar dihapus).', 'warn', 5000); }, 'Ya, jalankan')));
    showView((location.hash || '#ringkasan').slice(1));
    $$('[data-icon]').forEach((n) => { if (!n.dataset.painted) { n.dataset.painted = '1'; n.insertAdjacentHTML('afterbegin', w.XV.ico(n.dataset.icon, n.dataset.size || '')); } });
  }
  (d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', init) : init());
})(window, document);
