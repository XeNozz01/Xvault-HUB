/* ==========================================================================
   Xvault HUB — site.js
   Logika halaman publik: beranda, daftar server/IP, kualitas, sistem,
   ranking, berita, toko, aturan, tim, dan login/registrasi.
   ========================================================================== */
(function (w, d) {
  'use strict';
  const { el, $, $$, F, api, toast, copy, modal, icon, ico, statusBadge } = w.XV;
  const CH = w.XVChart;
  const page = d.body.dataset.page;

  /* ---------- helper umum ---------- */
  function paintIcons(root = d) {
    $$('[data-icon]', root).forEach((n) => {
      if (n.dataset.painted) return;
      n.dataset.painted = '1';
      n.insertAdjacentHTML('afterbegin', w.XV.ico(n.dataset.icon, n.dataset.size || ''));
    });
  }
  const card = (title, sub, bodyKids, extra = {}) => el('div', { class: 'card' + (extra.cls ? ' ' + extra.cls : '') },
    (title ? el('div', { class: 'card-top' }, el('div', {}, el('h3', { text: title }), sub ? el('small', { text: sub }) : null), extra.right || null) : null),
    ...bodyKids);
  const pct = (v) => (v == null ? '—' : Math.round(v) + '%');

  /* ---------- kartu server (dipakai beranda + /connect) ---------- */
  function serverCard(s, opts = {}) {
    const full = s.online / s.maxPlayers > 0.93;
    const c = el('article', { class: 'srv-card' + (full ? ' srv-full' : ''), dataset: { id: s.id } });
    const head = el('div', { class: 'srv-head' },
      el('div', {},
        el('div', { class: 'srv-name', text: s.name.replace('Xvault HUB — ', '') }),
        el('div', { class: 'srv-mode', text: s.mode })),
      el('div', { style: { textAlign: 'right' } },
        el('span', { class: 'badge ' + (full ? 'red' : 'green'), html: `<span class="dot" style="background:currentColor"></span> ${full ? 'Penuh' : 'Online'}` })));
    const ip = el('div', { class: 'srv-ip' },
      el('span', { html: `${s.host}<span style="color:var(--orchid)">:${s.port}</span>` }),
      el('button', { class: 'btn xs', html: ico('copy', 'sm') + ' IP', title: 'Salin IP', onclick: () => copy(`${s.host}:${s.port}`, c) }));
    const fill = el('div', { class: 'fillbar' },
      el('span', { class: 'mono tiny', style: { width: '76px' }, html: `${F.n(s.online)}/${F.n(s.maxPlayers)}` }),
      el('div', { class: 'bar' + (s.fill > 90 ? ' red' : s.fill > 70 ? ' yellow' : ' green') }, el('i', { style: { width: Math.min(100, s.fill) + '%' } })),
      el('span', { class: 'tiny muted', text: pct(s.fill) + ' terisi' }));
    const meta = el('div', { class: 'srv-meta' },
      el('div', {}, el('span', { text: 'Ping' }), el('b', { class: 'mono', text: s.ping + ' ms' })),
      el('div', {}, el('span', { text: 'Tickrate' }), el('b', { class: 'mono', text: s.tickrate + ' Hz' })),
      el('div', {}, el('span', { text: 'Restart' }), el('b', { class: 'mono', text: s.restartEvery })));
    c.append(head, ip, fill, meta);
    if (!opts.compact) {
      c.appendChild(el('p', { class: 'tiny', style: { margin: '2px 0 0', color: 'var(--ink-2)' }, text: s.desc }));
      c.appendChild(el('div', { class: 'pill-row' },
        ...s.tags.map((t) => el('span', { class: 'badge', text: t })),
        el('span', { class: 'badge violet', text: s.version }),
        s.whitelist ? el('span', { class: 'badge yellow', text: 'Whitelist' }) : el('span', { class: 'badge plain', text: 'Free join' })));
      c.appendChild(el('div', { class: 'row', style: { marginTop: '12px' } },
        el('a', { class: 'btn sm primary', href: '/connect#' + s.id, html: ico('play', 'sm') + ' Cara Join' }),
        el('a', { class: 'btn sm', href: '/ranking?server=' + s.id, html: ico('trophy', 'sm') + ' Ranking' }),
        el('span', { class: 'spacer' }),
        el('a', { class: 'btn sm ghost', href: '/dashboard', html: ico('gauge', 'sm') + ' Dasbor' })));
    }
    return c;
  }

  /* ================= BERANDA ================= */
  async function homeInit() {
    $('#hero-copy')?.addEventListener('click', (e) => copy('play.xvaulthub.id:7777', e.target.closest('.ipbox')));
    $('#hero-join')?.addEventListener('click', () => copy('play.xvaulthub.id:7777'));
    let data;
    try { data = await api.get('/api/overview'); } catch { toast('API tidak terjangkau — jalankan `npm start`.', 'err', 6000); return; }

    // grid server
    const grid = $('#home-server-grid');
    if (grid) grid.replaceChildren(...data.servers.map((s) => serverCard(s)));

    // mini baris server di kartu status live
    const mini = $('#home-servers');
    if (mini) {
      const rows = data.servers.map((s) => {
        const bar = el('div', { class: 'bar' + (s.fill > 92 ? ' red' : s.fill > 75 ? ' yellow' : ' green') });
        bar.appendChild(el('i', { style: { width: s.fill + '%' } }));
        const wrap = el('div', { style: { flex: '1 1 90px', minWidth: '90px' } });
        wrap.appendChild(bar);
        wrap.appendChild(el('div', { class: 'tiny muted', style: { marginTop: '3px' }, text: `${F.n(s.online)}/${F.n(s.maxPlayers)} · ${s.fill}%` }));
        const row = el('div', { class: 'lrow', dataset: { srv: s.id } },
          el('div', {}, el('b', { text: s.name.replace('Xvault HUB — ', '') }), el('div', { class: 'tiny muted mono', text: `${s.host}:${s.port}` })),
          wrap,
          el('span', { class: 'mono tiny ' + (s.ping < 25 ? 'on' : s.ping < 50 ? 'hi' : 'crit'), text: s.ping + ' ms' }),
          el('button', { class: 'btn xs', title: 'Salin IP' }));
        row.lastChild.appendChild(icon('copy', 'sm'));
        row.lastChild.addEventListener('click', () => copy(`${s.host}:${s.port}`, row));
        return row;
      });
      mini.replaceChildren(el('div', { class: 'live-srv' }, ...rows));
    }

    // chart 24 jam
    if ($('#chart-24h')) CH.area($('#chart-24h'), {
      h: 112, padT: 8, padB: 16, fill: true, dots: false, maxLabels: 6, yTicks: 2,
      series: [{ name: 'Perkiraan online', color: '#9b6bf2', data: data.chart24.map((c, i) => ({ x: i % 3 === 0 ? c.hour.slice(0, 2) : '', y: c.value })) }],
    });

    // top players
    const tb = $('#home-top tbody');
    if (tb) {
      try {
        const lb = await api.get('/api/leaderboard?sort=score&per=8');
        tb.replaceChildren(...lb.rows.map((p, i) => el('tr', { style: { cursor: 'pointer' }, onclick: () => playerModal(p.name) },
          el('td', { class: `num rank-${i + 1}`, style: { width: '34px' }, text: '#' + (i + 1) }),
          el('td', {}, el('div', { class: 'mono', text: p.name }), el('div', { class: 'tiny muted', text: (p.faction || 'Independen') + ' · Lv ' + p.level })),
          el('td', { class: 'r mono tiny', html: F.hrs(p.hours) }),
          el('td', { class: 'r', html: statusBadge(p.status) }))));
      } catch { }
    }

    // news
    const nHost = $('#home-news');
    if (nHost) nHost.replaceChildren(...data.news.map((n) => el('a', { class: 'list-row', href: '/news#' + n.id },
      el('span', { class: 'badge ' + (n.hot ? 'violet' : ''), text: n.cat }),
      el('span', { class: 'grow', style: { fontSize: '.88rem', fontWeight: 500 }, text: F.truncate(n.title, 58) }),
      el('span', { class: 'tiny muted nowrap', text: F.ago(n.date) }))));

    // systems preview
    const sHost = $('#home-systems');
    if (sHost) {
      const sys = await api.get('/api/systems');
      sHost.replaceChildren(...sys.slice(0, 6).map((c) => el('a', { class: 'card hover', href: '/sistem#' + c.key },
        el('div', { class: 'card-top' }, el('span', { class: 'tile-ico', text: c.icon }),
          el('span', { class: 'badge plain', text: c.items.length + ' sistem' })),
        el('h3', { text: c.name }), el('p', { class: 'tiny muted', style: { margin: 0 }, text: c.desc }),
        el('div', { class: 'bar green', style: { marginTop: '14px' } }, el('i', { style: { width: Math.round(c.items.reduce((a, i2) => a + i2.pct, 0) / c.items.length) + '%' } })))));
    }

    // faq
    const faq = $('#home-faq');
    if (faq) {
      const r = await api.get('/api/rules');
      faq.replaceChildren(...r.faq.slice(0, 5).map((f) => el('details', { class: 'acc' },
        el('summary', { html: `${ico('info', 'sm')} <span>${F.esc(f.q)}</span>` }),
        el('div', { text: f.a }))));
    }
    paintIcons();
  }

  /* ---------- live update untuk kartu server + chip ---------- */
  w.XV.live.on((data) => {
    if (!data || !data.servers) return;
    const total = $('#live-total');
    if (total) total.textContent = F.n(data.online) + ' online';
    const upd = $('#live-updated');
    if (upd) upd.textContent = 'sinkron ' + new Date(data.at).toLocaleTimeString('id-ID') + ' · tiap 3 detik';
    // perbarui angka di kartu server tanpa render ulang (hindari flicker)
    const byId = Object.fromEntries(data.servers.map((s) => [s.id, s]));
    $$('.srv-card').forEach((c) => {
      const s = byId[c.dataset.id];
      if (!s) return;
      const cnt = c.querySelector('.fillbar .mono');
      if (cnt) cnt.textContent = `${F.n(s.online)}/${cnt.textContent.split('/')[1].trim()}`;
      const bar = c.querySelector('.bar > i');
      const max = parseInt((cnt?.textContent.split('/')[1] || '').replace(/\D/g, ''), 10) || s.playersMax || 1;
      const fill = Math.min(100, Math.round((s.online / max) * 100));
      if (bar) bar.style.width = fill + '%';
      const ping = c.querySelector('.srv-meta .mono');
      if (ping) ping.textContent = s.ping + ' ms';
    });
    // tabel live di /connect
    $$('#connect-live tbody tr').forEach((tr, i) => {
      const s = data.servers[i];
      if (!s) return;
      const cells = tr.children;
      if (cells[2]) cells[2].textContent = `${F.n(s.online)}/${F.n(s.playersMax || 0)}`;
      if (cells[3]) cells[3].innerHTML = `<span class="pings ${s.ping < 25 ? 'good' : s.ping < 50 ? 'mid' : 'bad'}">${s.ping} ms</span>`;
    });
  });

  /* ================= /connect ================= */
  async function connectInit() {
    let servers = [];
    try { servers = await api.get('/api/servers'); } catch { }
    const grid = $('#connect-grid');
    if (grid) grid.replaceChildren(...servers.map((s) => serverCard(s)));
    const rows = $('#connect-live tbody');
    if (rows) {
      rows.replaceChildren(...servers.map((s) => el('tr',
        el('td', {}, el('b', { text: s.name.replace('Xvault HUB — ', '') }), el('div', { class: 'tiny muted', text: s.location })),
        el('td', { class: 'mono', html: `${s.host}<span class="port" style="color:var(--orchid)">:${s.port}</span>` }),
        el('td', { class: 'r mono', text: `${s.online}/${s.maxPlayers}` }),
        el('td', { class: 'r mono', html: `<span class="pings ${s.ping < 25 ? 'good' : s.ping < 50 ? 'mid' : 'bad'}">${s.ping} ms</span>` }),
        el('td', { class: 'r' }, el('button', { class: 'btn xs', html: ico('copy', 'sm') + ' Salin', onclick: (e) => copy(`${s.host}:${s.port}`, e.target.closest('tr')) })))));
    }
    const ports = $('#port-table tbody') || $('#port-table');
    if (ports) {
      ports.replaceChildren(...servers.map((s) => el('tr',
        el('td', { class: 'mono', text: s.port }), el('td', { text: s.name }), el('td', { text: 'TCP/UDP · SA-MP 0.3.7' }),
        el('td', {}, el('span', { class: 'badge green', text: s.password ? 'password' : 'tanpa password' })),
        el('td', { class: 'mono tiny t-dim', text: s.gamemode }))));
    }
    paintIcons();
  }

  /* ================= /kualitas ================= */
  async function qualityInit() {
    let q;
    try { q = await api.get('/api/quality'); } catch { return; }
    if ($('#g-score')) CH.gauge($('#g-score'), { value: q.score, max: 100, sub: 'Skel綜合 ' + q.grade, big: '1.85rem' });
    if ($('#g-uptime')) CH.gauge($('#g-uptime'), { value: q.uptime30, text: q.uptime30 + '%', sub: 'uptime 30 hari', colors: ['#31d99a', '#4cc9f0'] });
    if ($('#g-ping')) CH.gauge($('#g-ping'), { value: Math.max(0, 100 - q.avgPing), text: q.avgPing + ' ms', sub: 'ping rata-rata', colors: ['#9370db', '#4cc9f0'] });

    const pil = $('#quality-pillars');
    if (pil) pil.replaceChildren(...q.pillars.map((p) => {
      const c = el('article', { class: 'card hover' });
      c.appendChild(el('div', { class: 'card-top' }, el('h3', { style: { margin: 0 }, text: p.name }), el('b', { class: 'num grad-text', text: p.value.toFixed(1) })));
      c.appendChild(el('div', { class: 'bar', style: { marginTop: '10px' } }, el('i', { style: { width: p.value + '%' } })));
      c.appendChild(el('p', { class: 'tiny muted', style: { margin: '10px 0 0' }, text: p.desc }));
      return c;
    }));

    const reg = $('#region-list');
    if (reg) reg.replaceChildren(...q.regions.map((r) => el('div', { class: 'region-row' },
      el('span', { html: `${ico('pin', 'sm')} ${r.region}` }),
      el('span', { class: 'mono ' + (r.ping < 25 ? 'up' : ''), style: { color: r.ping < 25 ? 'var(--green)' : r.ping < 60 ? 'var(--yellow)' : 'var(--red)' }, text: r.ping + ' ms' }),
      el('span', { class: 'mono tiny muted', text: r.loss + '%' })), { style: { gridTemplateColumns: '1fr 78px 54px' } }));

    if ($('#uptime-strip')) CH.strip($('#uptime-strip'), q.series30.map((s) => ({ label: s.label, value: s.uptime, note: s.incidents ? s.incidents + ' insiden' : 'bersih', bad: s.incidents > 0 })));
    if ($('#chart-ping')) CH.area($('#chart-ping'), {
      h: 170, series: [{ name: 'Ping', color: '#4cc9f0', data: q.hourSeries.map((h) => ({ x: String(h.hour).padStart(2, '0'), y: h.ping })) }],
    });
    if ($('#chart-uptime30')) CH.bars($('#chart-uptime30'), { h: 170, zeroBased: false, yFmt: (v) => v.toFixed(1) + '%', data: q.series30.map((s) => ({ label: s.label, value: s.uptime, color: s.incidents ? '#ffc857' : '#31d99a' })) });
    if ($('#chart-compare')) CH.hbars($('#chart-compare'), {
      data: q.comparison.map((c) => ({ label: c.metric + ' (Xvault)', value: c.xvault, color: '#9b6bf2' })),
      fmt: (v) => (v >= 10 ? Math.round(v) : v.toFixed(1)) + '',
    });
    const cmpTable = $('#compare-table tbody');
    if (cmpTable) cmpTable.replaceChildren(...q.comparison.map((c) => {
      const better = c.metric.includes('Ping') || c.metric.includes('restart') || c.metric.includes('Respon') ? c.xvault < c.avg : c.xvault > c.avg;
      return el('tr', el('td', { text: c.metric }),
        el('td', { class: 'r mono', html: `<b>${c.xvault}</b>` }),
        el('td', { class: 'r mono t-dim', text: c.avg }),
        el('td', { class: 'r' }, el('span', { class: 'badge ' + (better ? 'green' : 'red'), text: better ? 'lebih baik' : 'perlu perbaikan' })));
    }));
    const hw = $('#hw-list');
    if (hw) hw.replaceChildren(...Object.entries(q.hardware).map(([k, v]) => el('div', { class: 'metric' },
      el('span', { class: 'upper', text: k.replace(/([A-Z])/g, ' $1') }), el('b', { class: 'mono', text: v }))));
    const inc = $('#incident-list');
    if (inc) inc.replaceChildren(...q.incidents.map((i) => el('div', { class: 'rule' },
      el('span', { style: { minWidth: '84px' }, html: statusBadge(i.level) }),
      el('div', { class: 'grow' }, el('h4', { text: i.title }), el('p', { text: i.desc }),
        el('div', { class: 'tiny muted', style: { marginTop: '5px' }, text: `${F.date(i.date)} · durasi ${i.durasi}` })))));
    const sch = $('#sched-list');
    if (sch) sch.replaceChildren(...q.schedule.map((s) => el('div', { class: 'list-row' },
      el('span', { class: 'grow', text: s.name }), el('span', { class: 'mono tiny', style: { color: '#c9b7ff' }, text: s.cron }),
      el('span', { class: 'tiny muted', style: { maxWidth: '260px' }, text: s.note }))));

    // live console
    const con = $('#q-console');
    const pushLine = (line) => {
      if (!con) return;
      const row = el('div', { class: 'l' }, el('span', { class: 'ts', text: F.time(line.ts) }),
        el('span', { class: 'lv-' + line.level, text: line.level.toUpperCase() }), el('span', { text: line.text }));
      con.prepend(row);
      while (con.children.length > 60) con.lastElementChild.remove();
    };
    try {
      const ov = await api.get('/api/overview');
      (ov.console || []).slice().reverse().forEach(pushLine);
      if (ov.chart24 && $('#chart-load24')) CH.area($('#chart-load24'), { h: 170, series: [{ name: 'Estimasi online', color: '#d47fe8', data: ov.chart24.map((c) => ({ x: c.hour.slice(0, 2), y: c.value })) }] });
    } catch { }
    w.XV.live.on((data) => data.console && data.console.forEach(pushLine));
    paintIcons();
  }

  /* ================= /sistem ================= */
  async function systemsInit() {
    let cats = [];
    try { cats = await api.get('/api/systems'); } catch { return; }
    const all = cats.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.name, catKey: c.key })));
    const statHost = $('#sys-stats');
    if (statHost) {
      const avg = Math.round(all.reduce((a, i) => a + i.pct, 0) / all.length);
      statHost.replaceChildren(
        el('div', { class: 'hstat' }, el('b', { text: all.length }), el('span', { text: 'Sistem Aktif' })),
        el('div', { class: 'hstat' }, el('b', { text: cats.length }), el('span', { text: 'Kategori' })),
        el('div', { class: 'hstat' }, el('b', { text: avg + '%' }), el('span', { text: 'Kesiapan Rata-rata' })),
        el('div', { class: 'hstat' }, el('b', { text: all.filter((i) => i.status === 'Beta').length }), el('span', { text: 'Mode Beta' })));
    }
    const host = $('#sys-list');
    const render = (filter = 'all', q = '') => {
      const rows = all.filter((i) => (filter === 'all' || i.status === filter) && (!q || (i.name + i.desc + i.cmd).toLowerCase().includes(q.toLowerCase())));
      const wrap = el('div', {});
      cats.forEach((c) => {
        const items = c.items.filter((i) => (filter === 'all' || i.status === filter) && (!q || (i.name + i.desc + i.cmd).toLowerCase().includes(q.toLowerCase())));
        if (!items.length) return;
        const sec = el('section', { class: 'sys-cat open', id: c.key, 'data-acc-wrap': '' },
          el('button', { onclick: (e) => e.currentTarget.parentElement.classList.toggle('open') },
            el('span', { class: 'tile-ico', text: c.icon }),
            el('span', {}, el('b', { class: 'srv-name', text: c.name }), el('div', { class: 'tiny muted', text: c.desc })),
            el('span', { class: 'cnt', text: items.length + ' sistem' }),
            el('span', { class: 'chev', html: ico('chevD', 'sm') })),
          el('div', { class: 'sys-body' }, el('div', {}, ...items.map((i) => {
            const it = el('div', { class: 'sys-item' },
              el('div', {}, el('h4', { html: `${F.esc(i.name)} <code>${F.esc(i.cmd)}</code>` }), el('p', { text: i.desc })),
              el('div', { class: 'r' }, el('span', { class: 'badge ' + (i.status === 'Stabil' ? 'green' : i.status === 'Beta' ? 'yellow' : 'blue'), text: i.status })),
              el('div', { class: 'r' }, el('div', { class: 'fillbar' }, el('div', { class: 'bar' + (i.pct > 95 ? ' green' : i.pct > 80 ? '' : ' yellow') }, el('i', { style: { width: i.pct + '%' } })), el('span', { class: 'mono tiny', text: i.pct + '%' }))));
            return it;
          })))
        );
        wrap.appendChild(sec);
      });
      if (!rows.length) wrap.appendChild(el('p', { class: 'note', text: 'Tidak ada sistem yang cocok dengan filter.' }));
      host && host.replaceChildren(wrap);
    };
    render();
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      $$('[data-filter]').forEach((x) => x.classList.toggle('on', x === b));
      render(b.dataset.filter, ($('#sys-search')?.value || ''));
    }));
    $('#sys-search')?.addEventListener('input', (e) => render(($$('[data-filter].on')[0] || {}).dataset?.filter || 'all', e.target.value));
    if (location.hash) {
      const t = $(location.hash);
      if (t) { t.classList.add('open'); t.scrollIntoView({ block: 'center' }); }
    }
    paintIcons();
  }

  /* ================= /ranking ================= */
  async function playerModal(name) {
    let data;
    try { data = await api.get('/api/players/' + encodeURIComponent(name)); } catch (e) { toast(e.message, 'err'); return; }
    const p = data.player;
    const M = modal({
      title: p.name, wide: true,
      body: (() => {
        const wrap = el('div', { class: 'col' });
        wrap.appendChild(el('div', { class: 'prof-head' },
          el('div', { class: 'avatar lg', text: p.name.slice(0, 2).toUpperCase() }),
          el('div', {},
            el('h3', { style: { margin: '0 0 4px' }, text: `Level ${p.level} · ${p.faction || 'Independen'}` }),
            el('div', { class: 'pill-row' }, statusBadge(p.status), p.vip ? el('span', { class: 'badge yellow', text: p.vip }) : null, p.banned ? el('span', { class: 'badge red', text: 'Banned: ' + p.banReason }) : null),
            el('div', { class: 'tiny muted', style: { marginTop: '8px' }, text: `${p.city}, ${p.country} · bergabung ${F.date(p.joinedAt)} · terakhir terlihat ${F.ago(p.lastSeen)}` })),
          el('div', { class: 'kv', style: { minWidth: '150px' } },
            el('span', { text: 'Score' }), el('b', { text: F.n(p.score) }),
            el('span', { text: 'Jam main' }), el('b', { text: F.n(p.hours) }),
            el('span', { text: 'K/D' }), el('b', { text: p.kdr }))));
        const grid = el('div', { class: 'kpis' },
          ...[['Uang tunai', F.money(p.money)], ['Bank', F.money(p.bank)], ['Kill', F.n(p.kills)], ['Drift', F.n(p.driftScore)], ['Races', p.races], ['Arrest', p.arrests]]
            .map(([lb, v]) => el('div', { class: 'kpi' }, el('span', { class: 'lb', text: lb }), el('div', { class: 'v', style: { fontSize: '1.3rem' }, text: v }))));
        wrap.appendChild(grid);
        const c1 = el('div', { class: 'panel' }, el('div', { class: 'ph' }, el('h3', { text: 'Jam main 7 hari' })));
        const ch = el('div', { class: 'chart', style: { height: '150px' } }); c1.appendChild(ch); wrap.appendChild(c1);
        const c2 = el('div', { class: 'panel' }, el('div', { class: 'ph' }, el('h3', { text: 'Kill 14 hari terakhir' })));
        const ch2 = el('div', { class: 'chart', style: { height: '150px' } }); c2.appendChild(ch2);
        const duo = el('div', { class: 'duo' }, c1, c2); wrap.appendChild(duo);
        if (data.badges.length) wrap.appendChild(el('div', { class: 'badges' }, ...data.badges.map((b) => el('span', { class: 'badge-ach', title: b.desc }, el('span', { text: b.icon }), b.name))));
        requestAnimationFrame(() => {
          CH.area(ch, { h: 150, series: [{ name: 'Jam', color: '#9b6bf2', data: data.weekly.map((v, i) => ({ x: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][i], y: v })) }] });
          CH.bars(ch2, { h: 150, data: data.kills14.map((v, i) => ({ label: 'D' + (i + 1), value: v })), color: '#4cc9f0' });
        });
        return wrap;
      })(),
    });
    return M;
  }

  async function rankingInit() {
    const state = { sort: 'score', q: '', page: 1, per: 25, faction: '', mode: '' };
    const cols = [
      ['rank', '#', ''], ['name', 'Pemain', ''], ['level', 'Lv', 'level'], ['hours', 'Jam', 'hours'],
      ['score', 'Score', 'score'], ['kdr', 'K/D', 'kdr'], ['kills', 'Kill', 'kills'],
      ['driftScore', 'Drift', 'drift'], ['races', 'Race', 'race'], ['turfWins', 'Turf', 'turf'],
      ['money', 'Uang', 'money'], ['status', 'Status', ''],
    ];
    const head = $('#rank-head');
    if (head) head.replaceChildren(...cols.map(([k, l, s]) => el('th', {
      class: s ? 'r sortable' : '', text: l,
      ...(s ? { onclick: () => { state.sort = s; state.page = 1; load(); $$('[data-tab-rank]').forEach((x) => x.classList.toggle('on', x.dataset.tabRank === s)); } } : {}),
    })));
    async function load() {
      const url = `/api/leaderboard?sort=${state.sort}&page=${state.page}&per=${state.per}&q=${encodeURIComponent(state.q)}&faction=${state.faction}&mode=${state.mode}`;
      let data;
      try { data = await api.get(url); } catch (e) { toast(e.message, 'err'); return; }
      const tb = $('#rank-body');
      tb.replaceChildren(...data.rows.map((p) => el('tr', { style: { cursor: 'pointer' }, onclick: () => playerModal(p.name) },
        el('td', { class: `num rank-${p.rank}`, text: p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : '#' + p.rank }),
        el('td', {}, el('div', { class: 'row', style: { gap: '9px' } },
          el('span', { class: 'avatar sm', text: p.name.slice(0, 2).toUpperCase() }),
          el('div', {}, el('b', { class: 'mono', text: p.name }),
            el('div', { class: 'tiny muted', text: `${p.faction || 'Independen'} · ${p.city}${p.vip ? ' · ' + p.vip : ''}` })))),
        el('td', { class: 'r num', text: p.level }),
        el('td', { class: 'r mono', text: F.n(p.hours) }),
        el('td', { class: 'r num', text: F.n(p.score) }),
        el('td', { class: 'r mono', text: p.kdr.toFixed(2) }),
        el('td', { class: 'r mono', text: F.n(p.kills) }),
        el('td', { class: 'r mono t-dim', text: F.n(p.driftScore) }),
        el('td', { class: 'r mono t-dim', text: p.races }),
        el('td', { class: 'r mono t-dim', text: p.turfWins }),
        el('td', { class: 'r mono', text: F.money(p.money + p.bank) }),
        el('td', { class: 'c', html: statusBadge(p.status) }))));
      // podium
      const pod = $('#podium');
      if (pod && state.page === 1 && !state.q) {
        const top3 = data.rows.slice(0, 3);
        pod.replaceChildren(...[1, 0, 2].map((idx) => {
          const p = top3[idx];
          if (!p) return el('div');
          return el('div', { class: 'pod' + (idx === 0 ? ' p1' : ''), onclick: () => playerModal(p.name), style: { cursor: 'pointer' } },
            el('div', { class: 'medal', text: ['🥇', '🥈', '🥉'][p.rank - 1] }),
            el('div', { class: 'avatar lg', text: p.name.slice(0, 2).toUpperCase() }),
            el('b', { class: 'mono', style: { display: 'block' }, text: p.name }),
            el('div', { class: 'tiny muted', text: `Level ${p.level} · ${F.hrs(p.hours)}` }),
            el('div', { class: 'pill-row', style: { justifyContent: 'center', marginTop: '8px' } }, el('span', { class: 'badge violet', text: F.n(p.score) + ' pts' })));
        }));
      }
      const pager = $('#rank-pager');
      if (pager) {
        const mk = (label, pg, dis, on) => el('button', { text: label, disabled: dis, class: on ? 'on' : '', onclick: () => { state.page = pg; load(); } });
        const nums = [];
        for (let i = Math.max(1, data.page - 2); i <= Math.min(data.pages, data.page + 2); i++) nums.push(mk(i, i, false, i === data.page));
        pager.replaceChildren(mk('«', 1, data.page === 1), mk('‹', data.page - 1, data.page === 1), ...nums,
          mk('›', data.page + 1, data.page === data.pages), mk('»', data.pages, data.page === data.pages),
          el('span', { class: 'tiny muted', style: { marginLeft: '10px' }, text: `${data.total} pemain · halaman ${data.page}/${data.pages}` }));
      }
      $('#rank-info') && ($('#rank-info').textContent = `${data.total} pemain masuk kriteria · diurutkan berdasarkan ${state.sort}`);
    }
    $('#rank-search')?.addEventListener('input', w.XV.debounce((e) => { state.q = e.target.value; state.page = 1; load(); }, 240));
    $$('[data-tab-rank]').forEach((b) => b.addEventListener('click', () => {
      $$('[data-tab-rank]').forEach((x) => x.classList.toggle('on', x === b));
      state.sort = b.dataset.tabRank; state.page = 1; load();
    }));
    $('#rank-faction')?.addEventListener('change', (e) => { state.faction = e.target.value; state.page = 1; load(); });
    $('#rank-online')?.addEventListener('change', (e) => { state.mode = e.target.checked ? 'online' : ''; state.page = 1; load(); });
    $('#rank-refresh')?.addEventListener('click', () => { load(); toast('Leaderboard disegarkan.', 'ok', 1800); });
    await load();
    paintIcons();
  }

  /* ================= /news ================= */
  async function newsInit() {
    let data;
    try { data = await api.get('/api/news'); } catch { return; }
    const list = $('#news-list');
    const cats = ['#all', ...data.cats];
    $('#news-cats')?.replaceChildren(...cats.map((c, i) => el('button', {
      class: 'btn sm' + (i === 0 ? ' primary' : ''), text: c === '#all' ? 'Semua' : c,
      onclick: (e) => { $$('#news-cats .btn').forEach((b) => b.className = 'btn sm'); e.currentTarget.className = 'btn sm primary'; render(c === '#all' ? '' : c, $('#news-q').value); },
    })));
    function render(cat = '', q = '') {
      const url = '/api/news?' + new URLSearchParams({ ...(cat ? { cat } : {}), ...(q ? { q } : {}) });
      api.get(url).then((r) => {
        list.replaceChildren(...r.rows.map((n) => el('article', { class: 'news-card', id: n.id },
          el('div', { class: 'news-date' }, el('b', { text: new Date(n.date).getDate() }), el('div', { class: 'tiny muted', text: new Date(n.date).toLocaleDateString('id-ID', { month: 'short' }) })),
          el('div', {},
            el('div', { class: 'pill-row', style: { marginBottom: '6px' } }, el('span', { class: 'badge violet', text: n.cat }), el('span', { class: 'badge', text: n.tag }), n.hot ? el('span', { class: 'badge red', text: 'Hot' }) : null),
            el('h3', { text: n.title }), el('p', { style: { margin: '0 0 8px' }, text: n.desc }),
            el('div', { class: 'tiny muted', html: `oleh <b>${F.esc(n.author)}</b> · ${F.ago(n.date)}` })))));
        if (!r.rows.length) list.replaceChildren(el('p', { class: 'note', text: 'Tidak ada berita untuk filter itu.' }));
      });
    }
    render();
    $('#news-q')?.addEventListener('input', w.XV.debounce((e) => render($('#news-cats .btn.primary')?.textContent === 'Semua' ? '' : $('#news-cats .btn.primary')?.textContent, e.target.value), 240));
    if (location.hash) setTimeout(() => $(location.hash)?.scrollIntoView({ block: 'center' }), 220);
    paintIcons();
  }

  /* ================= /toko ================= */
  async function storeInit() {
    let s, v;
    try { s = await api.get('/api/store'); v = await api.get('/api/vote'); } catch { return; }
    $('#store-packs')?.replaceChildren(...s.packs.map((p) => el('div', { class: 'plan' + (p.popular ? ' hot' : '') },
      p.popular ? el('span', { class: 'flag', text: 'PALING LARIS' }) : null,
      el('h3', { text: p.name }),
      el('div', { class: 'price' }, el('b', { text: 'Rp ' + F.n(p.price) }), p.bonus ? el('span', { class: 'badge green', text: '+' + p.bonus + ' % bonus' }) : null),
      el('p', { class: 'tiny muted', text: 'Konversi: ' + s.rate + '. Aktivasi otomatis setelah pembayaran terverifikasi.' }),
      el('button', { class: 'btn primary block', text: 'Beli ' + p.name, onclick: () => buyModal(p.name, p.price) }))));
    $('#store-items')?.replaceChildren(...s.items.map((i) => el('div', { class: 'plan' + (i.popular ? ' hot' : '') },
      i.popular ? el('span', { class: 'flag', text: 'FAVORIT' }) : null,
      el('div', { class: 'row', style: { gap: '12px' } }, el('span', { class: 'tile-ico', text: i.icon }),
        el('div', {}, el('h3', { style: { margin: 0 }, text: i.name }), el('div', { class: 'tiny muted', text: i.type }))),
      el('div', { class: 'price' }, el('b', { text: 'Rp ' + F.n(i.price) }), i.old ? el('s', { text: 'Rp ' + F.n(i.old) }) : null, i.old ? el('span', { class: 'badge red', text: '-' + Math.round((1 - i.price / i.old) * 100) + '%' }) : null),
      el('ul', {}, ...i.perks.map((p) => el('li', { html: `${ico('check', 'sm')} <span>${F.esc(p)}</span>` }))),
      el('span', { class: 'spacer' }),
      el('button', { class: 'btn block', text: 'Tambah ke keranjang', onclick: () => buyModal(i.name, i.price) }))));
    $('#pay-methods')?.replaceChildren(...s.methods.map((m) => el('span', { class: 'badge plain', html: `${ico('wallet', 'sm')} ${F.esc(m)}` })));
    $('#vote-list')?.replaceChildren(...v.sites.map((site, i) => el('div', { class: 'list-row' },
      el('span', { class: 'avatar sm', text: site.name.slice(0, 2).toUpperCase() }),
      el('div', { class: 'grow' }, el('b', { text: site.name }), el('div', { class: 'tiny muted', text: `Cooldown ${site.cooldown} jam · +${site.reward} RC per vote` })),
      el('span', { class: 'badge ' + (i < 2 ? 'green' : 'yellow'), text: i < 2 ? 'bisa di-vote' : 'menunggu cooldown' }),
      el('button', { class: 'btn sm primary', text: 'Vote + ' + site.reward + ' RC', onclick: () => { toast('Pindah ke ' + site.name + ' (demo) — vote tercatat.', 'ok'); } }))));
    $('#vote-stat') && ($('#vote-stat').innerHTML = `Hari ini: <b class="num">${F.n(v.todayVotes)}</b> vote · hadiah diklaim <b>${v.claimed}x</b> · posisi server kami <b class="grad-text">#2</b> dari 48 di Asia Tenggara`);

    function buyModal(name, price) {
      const M = modal({
        title: 'Konfirmasi pembelian',
        body: el('div', { class: 'col' },
          el('div', { class: 'kv' }, el('span', { text: 'Item' }), el('b', { text: name }),
            el('span', { text: 'Harga' }), el('b', { text: 'Rp ' + F.n(price) }),
            el('span', { text: 'Metode' }), el('b', { text: s.methods.join(' / ') })),
          el('label', { class: 'field' }, el('span', { text: 'Karakter penerima (in-game)' }), el('input', { class: 'input', id: 'buy-char', value: 'Bagas_Wijaya' })),
          el('label', { class: 'check' }, el('input', { type: 'checkbox', checked: true }), el('span', { text: 'Saya paham pembelian bersifat final dan tidak dapat dikembalikan (no refund).' })),
          el('div', { class: 'note', html: 'Ini <b>demo</b> — tidak ada pembayaran asli yang diproses. Order hanya dibuat di memori server.' })),
        foot: [el('button', { class: 'btn ghost', text: 'Batal', onclick: () => M.close() }),
        el('button', { class: 'btn primary', text: 'Bayar sekarang', onclick: () => { M.close(); toast('Order dibuat (demo). Cek menu Dompet di dasbor player.', 'ok', 5000); } })],
      });
    }
    paintIcons();
  }

  /* ================= /aturan ================= */
  async function rulesInit() {
    let r;
    try { r = await api.get('/api/rules'); } catch { return; }
    const host = $('#rules-list');
    if (host) {
      const fields = [...new Set(r.rules.map((x) => x.field))];
      host.replaceChildren(...fields.map((f) => el('section', { style: 'margin-bottom:22px' },
        el('h3', { class: 'upper', style: { color: 'var(--violet)' }, text: f }),
        ...r.rules.filter((x) => x.field === f).map((x) => el('div', { class: 'rule rv' },
          el('span', { class: 'code', text: x.code }),
          el('div', {}, el('h4', { text: x.title }), el('p', { text: x.desc })))))));
    }
    $('#faq-list')?.replaceChildren(...r.faq.map((f) => el('details', { class: 'acc' },
      el('summary', { html: `${ico('info', 'sm')} <span>${F.esc(f.q)}</span>` }), el('div', { text: f.a }))));
    // form whitelist
    const form = $('#wl-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        subject: `Aplikasi Whitelist RP — ${fd.get('character')}`,
        type: 'Pertanyaan RP',
        server: fd.get('server'),
        message: `Karakter: ${fd.get('character')}\nUsia: ${fd.get('age')}\nJam main SA-MP: ${fd.get('hours')}\n\nBackstory:\n${fd.get('story')}\n\nPemahaman aturan:\n${fd.get('rules')}\n\nSkenario:\n${fd.get('scenario')}`,
      };
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Mengirim…';
      try {
        if (!w.XV.api.token) { toast('Simulasi terkirim — login dulu agar lamaran tersimpan di dasbor.', 'warn', 5000); }
        else await api.post('/api/me/tickets', payload);
        form.reset();
        toast('Aplikasi terkirim! Review maksimal 6 jam. Pantau status di dasbor → Whitelist.', 'ok', 6000);
      } catch (err) { toast(err.message, 'err'); }
      btn.disabled = false; btn.textContent = 'Kirim aplikasi';
    });
    paintIcons();
  }

  /* ================= /staff ================= */
  async function staffInit() {
    let s;
    try { s = await api.get('/api/staff'); } catch { return; }
    $('#team-grid')?.replaceChildren(...s.team.map((t) => el('article', { class: 'card hover', style: { textAlign: 'center' } },
      el('div', { class: 'avatar lg', style: { margin: '0 auto 10px', background: `linear-gradient(140deg,${t.avatar},#3a2b5e)` }, text: t.name.slice(0, 2) }),
      el('h3', { style: { margin: '0' }, text: t.name }),
      el('div', { class: 'tiny', style: { color: 'var(--violet)', fontWeight: 600 }, text: t.role }),
      el('p', { class: 'tiny muted', style: { margin: '9px 0 0' }, text: t.focus }),
      el('div', { class: 'pill-row', style: { justifyContent: 'center', marginTop: '10px' } }, el('span', { class: 'badge', text: 'sejak ' + t.since })))));
    $('#staff-sessions')?.replaceChildren(...s.sessions.map((x) => el('div', { class: 'list-row' },
      el('span', { class: 'avatar sm', text: x.staff.slice(0, 2) }),
      el('div', { class: 'grow' }, el('b', { text: x.staff }), el('div', { class: 'tiny muted', text: `${x.role} · level ${x.level} · ${x.server}` })),
      el('span', { class: 'badge green', html: `<span class="dot" style="background:currentColor"></span> on-duty` }),
      el('span', { class: 'tiny muted nowrap', text: `sejak ${F.ago(x.since)}` }))));
    $('#contact-cards')?.replaceChildren(
      el('a', { class: 'card hover row', href: 'https://' + s.contact.discord, target: '_blank', rel: 'noopener', style: { gap: '13px' } },
        el('span', { class: 'tile-ico' }, icon('discord')), el('div', {}, el('h3', { style: { margin: 0 }, text: 'Discord' }), el('p', { class: 'tiny muted', style: { margin: 0 }, text: s.contact.discord + ' — 76 rb member' }))),
      el('a', { class: 'card hover row', href: 'mailto:' + s.contact.email, style: { gap: '13px' } },
        el('span', { class: 'tile-ico' }, icon('mail')), el('div', {}, el('h3', { style: { margin: 0 }, text: 'Email' }), el('p', { class: 'tiny muted', style: { margin: 0 }, text: s.contact.email }))));
    paintIcons();
  }

  /* ================= /tentang ================= */
  async function aboutInit() {
    try {
      const ov = await api.get('/api/overview');
      const f = $('#about-factions');
      if (f) f.replaceChildren(...ov.factions.slice(0, 8).map((x) => el('div', { class: 'list-row' },
        el('span', { class: 'avatar sm', style: { background: x.color, color: '#0b0a10' }, text: x.short.slice(0, 3) }),
        el('div', { class: 'grow' }, el('b', { text: x.name }), el('div', { class: 'tiny muted', text: x.type + ' · ' + x.rank.length + ' rank' })),
        el('div', { style: { width: '96px' } }, el('div', { class: 'bar' + (x.ratio > 95 ? ' red' : ''), title: x.member + '/' + x.slots }, el('i', { style: { width: (x.member / x.slots) * 100 + '%' } })),
          el('div', { class: 'tiny muted', style: { textAlign: 'right' }, text: `${x.member}/${x.slots}` })))));
      const st = $('#about-stats');
      if (st) st.replaceChildren(...[['Terdaftar', F.n(ov.stats.registered)], ['Slot total', F.n(ov.stats.totalSlots)], ['Whitelist disetujui', F.n(ov.stats.whitelistApproved)], ['Tiket selesai', F.n(ov.stats.ticketsSolved)],
      ['Discord member', F.n(ov.stats.discordMembers)], ['Banned 30 hari', F.n(ov.stats.bans30d)]].map(([k, v]) => el('div', { class: 'hstat', style: { background: 'var(--surface-2)' } }, el('b', { text: v }), el('span', { text: k }))));
      if ($('#about-chart') && ov.live30d) CH.area($('#about-chart'), { h: 190, series: [{ name: 'Puncak online', color: '#9b6bf2', data: ov.live30d.map((x) => ({ x: x.label, y: x.peak })) }, { name: 'Rata-rata', color: '#4cc9f0', data: ov.live30d.map((x) => ({ x: x.label, y: x.avg })) }] });
      if ($('#about-new') && ov.live30d) CH.bars($('#about-new'), { h: 190, data: ov.live30d.slice(-14).map((x) => ({ label: x.label, value: x.newPlayers })), color: '#31d99a' });
    } catch { }
    paintIcons();
  }

  /* ================= /login ================= */
  function loginInit() {
    const info = $('#auth-title');
    let mode = w.XV.qs('mode') === 'register' ? 'register' : 'login';
    const tabs = $('#auth-tabs');
    const form = $('#auth-form');
    const setMode = (m) => {
      mode = m;
      $$('#auth-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
      if (info) info.textContent = m === 'login' ? 'Masuk ke dasbor' : 'Buat akun situs';
      form.querySelector('button[type=submit]').textContent = m === 'login' ? 'Masuk' : 'Daftar & masuk';
      $$('.only-register').forEach((n) => (n.hidden = m !== 'register'));
    };
    tabs?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
    setMode(mode);

    // tombol akun demo
    $$('.demo-acc button').forEach((b) => b.addEventListener('click', () => {
      $('#u').value = b.dataset.u; $('#p').value = b.dataset.p;
      form.requestSubmit();
    }));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      const username = $('#u').value.trim(), password = $('#p').value;
      try {
        if (mode === 'register') {
          if (username.length < 4) throw new Error('Username minimal 4 karakter (pakai nama karakter SA-MP-mu).');
          if (password.length < 6) throw new Error('Password minimal 6 karakter.');
          toast('Registrasi demo: akun simulasi dibuat, langsung masuk sebagai ' + username, 'ok', 4200);
          const r = await api.post('/api/auth/login', { username: 'Bagas_Wijaya', password: 'xvault' });
          localStorage.setItem(w.XV.TOKEN_KEY, r.token);
          location.href = '/dashboard';
          return;
        }
        const r = await api.post('/api/auth/login', { username, password });
        localStorage.setItem(w.XV.TOKEN_KEY, r.token);
        toast('Selamat datang kembali, ' + r.profile.name + '!', 'ok', 2600);
        location.href = r.role === 'admin' ? '/admin' : '/dashboard';
      } catch (err) { toast(err.message, 'err'); btn.disabled = false; }
    });
    paintIcons();
  }

  /* ================= router ================= */
  const ROUTES = { home: homeInit, connect: connectInit, quality: qualityInit, systems: systemsInit, ranking: rankingInit, news: newsInit, store: storeInit, rules: rulesInit, staff: staffInit, about: aboutInit, login: loginInit };
  (d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', go) : go());
  function go() { (ROUTES[page] || (() => paintIcons()))(); paintIcons(); }
})(window, document);
