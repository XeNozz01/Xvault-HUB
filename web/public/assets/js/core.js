/* ==========================================================================
   Xvault HUB — core.js
   Ikon SVG, layout (nav + footer), API client, helper format, toast, modal,
   reveal-on-scroll, counter, copy IP, dan klien SSE untuk status live.
   ========================================================================== */
(function (w, d) {
  'use strict';

  /* ---------------- 1. ICONS ---------------- */
  const P = {
    home: 'M3 10.2 12 3l9 7.2V21H14.5v-6h-5v6H3z',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8h.01M11 12h1v5h1',
    shield: 'M12 3 5 6v6c0 4.2 2.8 7.6 7 9 4.2-1.4 7-4.8 7-9V6zM9 12l2 2 4-4',
    cpu: 'M6 6h12v12H6zM9.5 9.5h5v5h-5M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 5H5.5A3.5 3.5 0 0 0 9 8.5M16 5h2.5A3.5 3.5 0 0 1 15 8.5M10 13.5V16h4v-2.5M7 20h10M9.5 16h5l.7 4h-6.4z',
    cart: 'M4 5h2l2.2 9.2A2 2 0 0 0 10.1 16H17a2 2 0 0 0 2-1.6L20.5 8H7M10 20h.01M17 20h.01',
    news: 'M4 5h13v14H4zM17 8h3v9a2 2 0 0 1-3 1.9M6.5 8h8M6.5 11h8M6.5 14h5',
    users: 'M8 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 11M2.5 19.5c0-3.3 2.5-5.2 5.5-5.2s5.5 1.9 5.5 5.2M16.5 8.6a2.9 2.9 0 1 0 0-5.8M18 14.5c2.3.4 3.7 2 3.7 5',
    lock: 'M7 11V8.5a5 5 0 0 1 10 0V11M5.5 11h13v9.5h-13z',
    logout: 'M15 5h4.5v14H15M11 12H3.5M7 8.5 3.5 12 7 15.5',
    login: 'M9 5H4.5v14H9M15.5 12H8M12.5 8.5 16 12l-3.5 3.5',
    copy: 'M9 9h10.5v11H9zM5 15.5V4h11',
    check: 'M4.5 12.5 9.5 17.5 19.5 6.5',
    check2: 'M5 12.5 10 17.5 19.5 7',
    x: 'M6 6l12 12M18 6 6 18',
    search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13M15.5 15.5 20 20',
    bell: 'M6 10a6 6 0 1 1 12 0c0 4 1.5 5 1.5 5h-15S6 14 6 10M10 19a2.2 2.2 0 0 0 4 0',
    menu: 'M4 7h16M4 12h16M4 17h16',
    gauge: 'M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16M12 12l4-3M12 20v-2M4 12h2M18 12h2',
    zap: 'M13 3 5.5 13.5H12l-1 7.5L19 10.5h-6.5z',
    server: 'M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h5M11 16h5',
    gamepad: 'M7.5 8h9a4.5 4.5 0 0 1 4.4 5.3l-.5 2.6A2.6 2.6 0 0 1 16 17.4L14.5 15h-5L8 17.4a2.6 2.6 0 0 1-4.4-1.5l-.5-2.6A4.5 4.5 0 0 1 7.5 8M8 11v2.5M6.5 12h3M15.5 12h.01M17.5 13.5h.01',
    wallet: 'M3.5 7.5A2 2 0 0 1 5.5 5.5H17a2 2 0 0 1 2 2v1.5M3.5 7.5V17a2 2 0 0 0 2 2H19a2 2 0 0 0 2-2v-3M19 10.5h3v4h-3a2 2 0 0 1 0-4',
    box: 'M12 3 3.5 7v10L12 21l8.5-4V7zM3.5 7 12 11l8.5-4M12 11v10',
    car: 'M4 15.5h16M5.5 15.5V12l2-4.5h9l2 4.5v3.5M4 15.5v2h2.5v-2M20 15.5v2h-2.5v-2M8 11.5h8',
    ticket: 'M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4zM12 6v12',
    settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4M19.4 12c.4 0 .8 0 1.1-.2l-1.6-2.8a1.6 1.6 0 0 0-.6-.1l-1-1.7.4-1.9a6.6 6.6 0 0 0-1.9-.5l-1.4 1.3h-1.9L10 4.9a6.6 6.6 0 0 0-1.9.5l.4 1.9-1 1.7a1.6 1.6 0 0 0-.6.1L5.3 12l1.6 2.8a1.6 1.6 0 0 0 .6.1l1 1.7-.4 1.9a6.6 6.6 0 0 0 1.9.5l1.5-1.3h1.9l1.4 1.3a6.6 6.6 0 0 0 1.9-.5l-.4-1.9 1-1.7a1.6 1.6 0 0 0 .6-.1l1.6-2.8c-.3-.2-.7-.2-1.1-.2',
    terminal: 'M4 5h16v14H4zM7.5 10 10 12.5 7.5 15M12 15.5h5',
    megaphone: 'M4 10v4h3l7 4.5v-13L7 10zM17.5 8.5a5 5 0 0 1 0 7M20 6a8 8 0 0 1 0 12M4 10h3v4H4z',
    chart: 'M4 20V9M10 20V4M16 20v-7M22 20H2',
    refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5',
    eye: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12M12 14.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4',
    ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M5.6 5.6l12.8 12.8',
    gavel: 'M14 4.5 19.5 10 17 12.5 11.5 7zM3.5 20.5h11M6 17.5l6-6-2.5-2.5-6 6z',
    chevD: 'M6 9.5 12 15.5 18 9.5',
    chevR: 'M9.5 6 15.5 12 9.5 18',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    filter: 'M3.5 5.5h17l-6.5 8v6l-4-2.5v-3.5z',
    download: 'M12 4v10M8 11l4 4 4-4M4.5 18.5h15',
    upload: 'M12 18V8M8 11l4-4 4 4M4.5 20h15',
    play: 'M7 4.5 19 12 7 19.5z',
    pause: 'M8.5 5v14M15.5 5v14',
    message: 'M4 5.5h16v11H9.5L5 20.5v-4H4zM8 9.5h8M8 12.5h5',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5.2l3.4 2',
    star: 'm12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z',
    alert: 'M12 4 2.8 20h18.4zM12 9.5v4.5M12 17h.01',
    key: 'M15.5 4.5a4.5 4.5 0 0 1-4 6.7L11 12H8v2.5H5.5V17H3v3h3v-2.5M15.5 4.5 19 8',
    map: 'M3 6.5 9 4l6 2.5 6-2v13L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20',
    discord: 'M8.5 6.5c-2 .4-3.6 1-4.4 1.6C2.4 11.4 1.8 15.4 2 18.6c1.4 1 3.4 1.9 5.4 1.9l1-1.9-1.7-.8 1-1.7c2.2.8 4.6.8 6.6 0l1 1.7-1.7.8 1 1.9c2 0 4-.9 5.4-1.9.2-3.7-.7-7.7-2.1-10.5-.8-.6-2.4-1.2-4.4-1.6l-.6 1.4c-1.4-.2-2.9-.2-4.3 0zM8.6 15c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.7.8 1.6 1.8c0 1-.7 1.8-1.6 1.8m6.8 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.7.8 1.6 1.8c0 1-.7 1.8-1.6 1.8',
    youtube: 'M3 12c0-2.4.2-3.8.4-4.6A2.6 2.6 0 0 1 6.3 6c1.9-.2 5.7-.2 7.6 0 1.2.1 2.2.9 2.5 1.9.3 1 .4 2.3.4 4.1s-.1 3.1-.4 4.1a2.7 2.7 0 0 1-2.5 1.9c-1.9.2-5.7.2-7.6 0a2.6 2.6 0 0 1-2.9-2.4C3.2 15.8 3 14.4 3 12M10.5 9.5 15 12l-4.5 2.5z',
    tiktok: 'M14 3.5c.4 2.4 1.9 3.9 4.3 4.1v3c-1.6 0-3-.5-4.3-1.4v5.9a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3.1a2.5 2.5 0 1 0 1.7 2.3V3.5z',
    external: 'M14 4h6v6M20 4l-8.5 8.5M18 13.5V20H4V6h6.5',
    arrowR: 'M4 12h15M14 7l5 5-5 5',
    arrowU: 'M12 19V5M7 10l5-5 5 5',
    arrowD: 'M12 5v14M7 14l5 5 5-5',
    calendar: 'M4 6.5h16V20H4zM8 4v4M16 4v4M4 11h16M8 14.5h2M14 14.5h2',
    tag: 'M4 4h7l9 9-7 7-9-9zM8 8h.01',
    mic: 'M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5M5.5 12a6.5 6.5 0 0 0 13 0M12 19v2.5',
    radio: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 16.5a6.5 6.5 0 0 0 0-9M4.5 4.5a10.5 10.5 0 0 0 0 15M19.5 19.5a10.5 10.5 0 0 0 0-15',
    heart: 'M12 20s-7.5-4.2-7.5-9.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.8 12 20 12 20',
    flame: 'M12 3s5 4 5 8.5A5 5 0 0 1 7 12c0-2 1-3.4 1-3.4S9 11 10.5 11 12 8 12 6.5 12 3 12 3m0 15a2.6 2.6 0 0 0 2.6-2.6c0-1.6-2.6-3.9-2.6-3.9s-2.6 2.3-2.6 3.9A2.6 2.6 0 0 0 12 18',
    coins: 'M8.5 8.5h11v6h-11zM4.5 11h11v6h-11zM7 13.5a.5.5 0 1 0 0-1M17 11V6.5M14 3.5h6M17 3.5v3',
    database: 'M12 7.5c4.4 0 8-1.1 8-2.5S16.4 2.5 12 2.5 4 3.6 4 5s3.6 2.5 8 2.5M4 5v14c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5',
    drive: 'M3.5 13.5h17l1.5 5.5h-20zM5.5 4h13l2.5 9.5h-18zM7 16.5h.01M10 16.5h.01',
    wifi: 'M2.5 9a14 14 0 0 1 19 0M6 12.5a9 9 0 0 1 12 0M9.2 16a4.4 4.4 0 0 1 5.6 0M12 19.5h.01',
    activity: 'M2.5 12.5H7l2.5-7 3.5 14 2.5-7h5',
    list: 'M8 6.5h13M8 12h13M8 17.5h13M4 6.5h.01M4 12h.01M4 17.5h.01',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4.5 20.5c0-3.9 3.4-6 7.5-6s7.5 2.1 7.5 6',
    userCheck: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2.5 20.5c0-3.6 3.4-5.7 7.5-5.7 1 0 2 .1 2.8.4M15.5 17.5 18 20l4-4.5',
    userX: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2.5 20.5c0-3.6 3.4-5.7 7.5-5.7 1 0 2 .1 2.8.4M15.5 15.5 21 21M21 15.5l-5.5 5.5',
    file: 'M6 3.5h7l5 5V20.5H6zM13 3.5V9h6M8.5 13h7M8.5 16.5h7',
    layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
    sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5',
    phone: 'M7 3.5h10v17H7zM10.5 18h3',
    mail: 'M3.5 6h17v12h-17zM3.5 6.5 12 13l8.5-6.5',
    edit: 'M4 20h4l12-12-4-4L4 16zM14 6l4 4',
    trash: 'M4.5 6.5h15M9 6.5V4h6v2.5M6.5 6.5 7.5 21h9l1-14.5M10 10v7M14 10v7',
    sparkles: 'M12 3.5l1.6 4 4 1.6-4 1.6L12 14.7l-1.6-4-4-1.6 4-1.6zM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM5.5 13l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6L3.2 15.3l1.6-.7z',
    flag: 'M5.5 21V3.5h13l-2.5 4.5 2.5 4.5h-13',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
    crown: 'M4 18h16L21 8l-4.5 3L12 4.5 7.5 11 3 8z',
    dice: 'M5 4.5h14v15H5zM9 8.5h.01M15 8.5h.01M12 12h.01M9 15.5h.01M15 15.5h.01',
    gift: 'M3.5 9h17v3.5h-17zM5 12.5h14V20H5zM12 9v11M8.5 9a2.5 2.5 0 1 1 0-5C10.5 4 12 9 12 9s1.5-5 3.5-5a2.5 2.5 0 1 1 0 5',
    book: 'M4 5.5A2 2 0 0 1 6 3.5h5V20H6a2 2 0 0 1-2-2zM20 5.5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 0 2-2z',
    pin: 'M12 21s6-6 6-10a6 6 0 1 0-12 0c0 4 6 10 6 10M12 12a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2',
    power: 'M12 4v8M7.5 7a7 7 0 1 0 9 0',
    hard: 'M6 3.5h12v17H6zM9 7h6M9 11h6M9 15h2',
  };
  const NS = 'http://www.w3.org/2000/svg';
  function icon(name, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'ico ' + (cls || ''));
    s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', P[name] || P.info);
    s.appendChild(p);
    return s;
  }
  const ico = (name, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] || P.info}"/></svg>`;

  /* ---------------- 2. FORMATTERS ---------------- */
  const nf = new Intl.NumberFormat('id-ID');
  const F = {
    n: (v) => nf.format(Math.round(v || 0)),
    money: (v) => '$' + nf.format(Math.round(v || 0)),
    rc: (v) => nf.format(Math.round(v || 0)) + ' RC',
    pct: (v, d = 1) => `${(+v).toFixed(d).replace('.', ',')}%`,
    dt: (iso) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    date: (iso) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ago: (iso) => {
      const ms = Date.now() - new Date(iso).getTime();
      const m = Math.round(ms / 60000);
      if (m < 1) return 'baru saja';
      if (m < 60) return `${m} menit lalu`;
      const h = Math.round(m / 60);
      if (h < 24) return `${h} jam lalu`;
      const d = Math.round(h / 24);
      if (d < 30) return `${d} hari lalu`;
      const mo = Math.round(d / 30);
      return mo < 12 ? `${mo} bulan lalu` : `${Math.round(mo / 12)} tahun lalu`;
    },
    dur: (sec) => {
      const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
      return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m ${Math.floor(sec % 60)}d`;
    },
    hrs: (v) => (v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'rb' : Math.round(v)) + ' jam',
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    truncate: (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s)),
  };

  /* ---------------- 3. API ---------------- */
  const TOKEN_KEY = 'xvault_token';
  const api = {
    get token() { return localStorage.getItem(TOKEN_KEY) || ''; },
    set token(v) { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); },
    async req(path, opts = {}) {
      const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
      if (api.token) headers.Authorization = 'Bearer ' + api.token;
      const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
      let json = {};
      try { json = await res.json(); } catch { /* html */ }
      if (!res.ok || json.ok === false) {
        if (res.status === 401) { api.token = ''; }
        const err = new Error(json.error || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return json.data;
    },
    get: (p) => api.req(p),
    post: (p, body) => api.req(p, { method: 'POST', body }),
  };

  /* ---------------- 4. DOM helpers ---------------- */
  const el = (tag, attrs = {}, ...kids) => {
    const n = typeof tag === 'string' ? document.createElement(tag) : tag;
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(3)) {
      if (kid == null || kid === false) continue;
      n.appendChild(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
    }
    return n;
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const frag = (...kids) => { const f = document.createDocumentFragment(); kids.flat(3).forEach((k) => k && f.appendChild(typeof k === 'object' ? k : document.createTextNode(String(k)))); return f; };

  /* ---------------- 5. TOAST ---------------- */
  let toastHost = $('#toasts');
  function toast(msg, kind = 'info', ms = 3600) {
    if (!toastHost) { toastHost = el('div', { id: 'toasts' }); document.body.appendChild(toastHost); }
    const icons = { ok: 'check2', err: 'alert', warn: 'alert', info: 'bell' };
    const t = el('div', { class: `toast ${kind}` });
    t.appendChild(icon(icons[kind] || 'bell', kind === 'err' ? '' : ''));
    t.appendChild(el('div', { html: `<div>${F.esc(msg)}</div>` }));
    toastHost.appendChild(t);
    setTimeout(() => { t.style.transition = '.25s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 260); }, ms);
    return t;
  }

  /* ---------------- 6. MODAL ---------------- */
  function modal({ title, body, foot, wide, onClose }) {
    const backdrop = el('div', { class: 'modal open' });
    const box = el('div', { class: 'modal-box' + (wide ? ' wide' : '') });
    const head = el('div', { class: 'modal-head' }, el('h3', { style: { margin: '0' }, text: title || '' }));
    const closeBtn = el('button', { class: 'btn ghost icon', 'aria-label': 'Tutup', onclick: () => close() });
    closeBtn.appendChild(icon('x', 'sm'));
    head.appendChild(closeBtn);
    const bodyWrap = el('div', { class: 'modal-body' });
    if (typeof body === 'string') bodyWrap.innerHTML = body; else if (body) bodyWrap.appendChild(body);
    box.append(head, bodyWrap);
    if (foot) {
      const f = el('div', { class: 'modal-foot' });
      (Array.isArray(foot) ? foot : [foot]).forEach((x) => f.appendChild(typeof x === 'string' ? el('span', { html: x }) : x));
      box.appendChild(f);
    }
    backdrop.appendChild(box);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onEsc);
    function close() { document.removeEventListener('keydown', onEsc); backdrop.classList.remove('open'); setTimeout(() => backdrop.remove(), 160); onClose && onClose(); }
    document.body.appendChild(backdrop);
    return { el: backdrop, body: bodyWrap, close };
  }

  function confirmBox(title, text, onYes, yesLabel = 'Konfirmasi', danger = true) {
    const yes = el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), text: yesLabel, onclick: () => { api2(); M.close(); onYes && onYes(); } });
    const no = el('button', { class: 'btn ghost', text: 'Batal', onclick: () => M.close() });
    const M = modal({ title, body: el('p', { class: 'lead', style: { margin: 0 }, html: text }), foot: [no, yes] });
    function api2() {}
    return M;
  }

  /* ---------------- 7. COPY ---------------- */
  async function copy(text, node, msg) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const ta = el('textarea', { style: { position: 'fixed', opacity: '0', top: '-1000px' }, value: text });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      toast(msg || `Tersalin: ${text}`, 'ok', 2200);
      if (node) { node.classList.add('copy-ok'); setTimeout(() => node.classList.remove('copy-ok'), 620); }
      return true;
    } catch { toast('Gagal menyalin — salin manual ya.', 'warn'); return false; }
  }

  /* ---------------- 8. LAYOUT (nav + footer) ---------------- */
  const NAV = [
    { href: '/', key: 'home', label: 'Beranda' },
    { href: '/tentang', key: 'about', label: 'Tentang' },
    { href: '/kualitas', key: 'quality', label: 'Kualitas' },
    { href: '/sistem', key: 'systems', label: 'Sistem Tersedia' },
    { href: '/connect', key: 'connect', label: 'IP & Join' },
    { href: '/ranking', key: 'ranking', label: 'Ranking' },
    { href: '/news', key: 'news', label: 'Berita' },
    { href: '/aturan', key: 'rules', label: 'Aturan' },
    { href: '/toko', key: 'store', label: 'Toko' },
    { href: '/staff', key: 'staff', label: 'Tim' },
  ];

  function renderNav() {
    const page = document.body.dataset.page || '';
    const nav = el('header', { class: 'nav', id: 'nav' });
    const wrap = el('div', { class: 'wrap' });

    const logo = el('a', { class: 'logo', href: '/', 'aria-label': 'Xvault HUB — beranda' },
      el('span', { class: 'logo-mark' }),
      el('span', {}, 'Xvault HUB', el('small', { text: 'SA-MP Indonesia' })));

    const links = el('nav', { class: 'nav-links', id: 'nav-links', 'aria-label': 'Navigasi utama' });
    NAV.forEach((n) => links.appendChild(el('a', { href: n.href, class: n.key === page ? 'on' : '', text: n.label })));

    const cta = el('div', { class: 'nav-cta' });
    const chip = el('a', { class: 'live-chip nav-live-hide', href: '/connect', title: 'Status server live' },
      el('span', { class: 'dot' }), el('span', { id: 'nav-online', text: '— pemain online' }));
    cta.appendChild(chip);
    if (page === 'dashboard' || page === 'admin') {
      cta.appendChild(el('a', { class: 'btn sm', href: '/', html: `${ico('arrowR', 'sm')} <span>Ke Situs</span>` }));
    } else {
      cta.appendChild(el('a', { class: 'btn sm primary', href: page === 'login' ? '/dashboard' : '/login', html: `${ico('gamepad', 'sm')} <span>${page === 'login' ? 'Dasbor' : 'Login'}</span>` }));
    }
    const burger = el('button', { class: 'burger', 'aria-label': 'Menu', 'aria-expanded': 'false', onclick: (e) => { links.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(links.classList.contains('open'))); } });
    burger.appendChild(el('span'));

    wrap.append(logo, links, cta, burger);
    nav.appendChild(wrap);
    document.body.prepend(nav);
    const onScroll = () => nav.classList.toggle('solid', scrollY > 12);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const f = el('footer', { class: 'foot' });
    const w = el('div', { class: 'wrap' });
    const col = (title, items) => el('div', {}, el('h4', { text: title }), ...items.map((i) => el('a', { href: i[1], text: i[0] })));
    w.appendChild(el('div', { class: 'foot-grid' },
      el('div', {},
        el('a', { class: 'logo', href: '/' }, el('span', { class: 'logo-mark' }), el('span', {}, 'Xvault HUB', el('small', { text: 'SA-MP Indonesia' }))),
        el('p', { class: 'tiny', style: { marginTop: '12px', maxWidth: '36ch' }, text: 'Server San Andreas Multiplayer dengan fokus roleplay berkualitas, latency rendah, dan anti-cheat aktif 24/7. Berdiri sejak 2019.' }),
        el('div', { class: 'pill-row' },
          el('a', { class: 'btn sm ghost', href: 'https://discord.gg/xvaulthub', target: '_blank', rel: 'noopener' }, icon('discord', 'sm'), 'Discord'),
          el('a', { class: 'btn sm ghost', href: '#', title: 'YouTube' }, icon('youtube', 'sm'), 'YouTube'),
          el('a', { class: 'btn sm ghost', href: '#', title: 'TikTok' }, icon('tiktok', 'sm'), 'TikTok'))),
      col('Jelajahi', [['Beranda', '/'], ['Tentang Kami', '/tentang'], ['Kualitas Layanan', '/kualitas'], ['Sistem Tersedia', '/sistem'], ['Ranking Pemain', '/ranking'], ['Berita & Update', '/news']]),
      col('Main Sekarang', [['IP & Cara Join', '/connect'], ['Daftar Whitelist', '/aturan#whitelist'], ['Aturan Server', '/aturan'], ['Toko & VIP', '/toko'], ['Tim & Rekrutmen', '/staff'], ['Status Server', '/kualitas#status']]),
      col('Akun', [['Login Player', '/login'], ['Dasbor Player', '/dashboard'], ['Dasbor Admin', '/admin'], ['Buat Akun', '/login?mode=register'], ['Bantuan / Tiket', '/dashboard?tiket'], ['API Developer', '/api/health']])));
    w.appendChild(el('div', { class: 'foot-bar' },
      el('div', {},
        el('span', { id: 'foot-online', class: 'mono tiny' }),
        el('div', { class: 'legal-note', style: { marginTop: '6px' }, html: 'Website komunitas &amp; panel statistik non-komersial. GTA: San Andreas &amp; SA-MP adalah milik Rockstar Games / SA-MP Development Team — tidak berafiliasi. Data pada situs ini <b>simulasi demo</b>.' })),
      el('div', { style: { textAlign: 'right' } },
        el('div', { class: 'tiny', text: '© ' + new Date().getFullYear() + ' Xvault HUB' }),
        el('div', { class: 'tiny mono', id: 'foot-clock', text: '--:--:--' }))));
    f.appendChild(w);
    document.body.appendChild(f);
    const clock = $('#foot-clock');
    if (clock) setInterval(() => { clock.textContent = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB'; }, 1000);
  }

  /* ---------------- 9. LIVE (SSE) ---------------- */
  const live = {
    data: { servers: [], online: 0, console: [] },
    subs: new Set(),
    es: null,
    start() {
      if (live.es || !window.EventSource) { live.tickFallback(); return; }
      try {
        const es = new EventSource('/api/stream');
        live.es = es;
        es.addEventListener('tick', (e) => {
          try { live.data = JSON.parse(e.data); live.subs.forEach((f) => f(live.data)); } catch { /* noop */ }
        });
        es.addEventListener('broadcast', (e) => {
          try { const b = JSON.parse(e.data); toast('📣 ' + b.text, 'info', 6000); live.subs.forEach((f) => f(live.data, b)); } catch { }
        });
        es.onerror = () => { es.close(); live.es = null; setTimeout(() => live.tickFallback(), 4000); };
      } catch { live.tickFallback(); }
    },
    tickFallback() {
      setInterval(async () => {
        try {
          const d = await api.get('/api/live');
          const servers = (d.servers || []).map((s) => ({ ...s }));
          live.data = { ...live.data, servers, online: servers.reduce((a, s) => a + s.online, 0), at: d.at };
          live.subs.forEach((f) => f(live.data));
        } catch { /* server off */ }
      }, 5000);
    },
    on(fn) { live.subs.add(fn); return () => live.subs.delete(fn); },
  };

  function paintLiveChips() {
    const upd = (d) => {
      const txt = d.online ? `${F.n(d.online)} pemain online` : '— pemain online';
      const chips = [$('#nav-online'), $('#foot-online')].filter(Boolean);
      chips.forEach((c) => { c.textContent = txt; });
      const dot = $('#nav-online')?.parentElement?.querySelector('.dot');
      if (dot) dot.className = 'dot' + (d.online > 1200 ? '' : d.online > 600 ? ' yellow' : ' red');
      document.dispatchEvent(new CustomEvent('xv:live', { detail: d }));
    };
    live.on(upd);
    live.start();
    api.get('/api/overview').then((d) => {
      const servers = (d.servers || []).map((s) => ({ id: s.id, online: s.online, ping: s.ping, playersMax: s.maxPlayers }));
      upd({ online: d.stats.totalOnline, servers, uptimeSec: 0, runtime: {}, console: d.console });
    }).catch(() => { });
  }

  /* ---------------- 10. REVEAL + COUNTERS ---------------- */
  function initReveal() {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 }) : null;
    const scan = () => $$('.rv:not(.in)').forEach((n, i) => {
      if (n.dataset.delay) n.style.transitionDelay = n.dataset.delay;
      else n.style.transitionDelay = (i % 6) * 55 + 'ms';
      io ? io.observe(n) : n.classList.add('in');
    });
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  function countUp(root = document) {
    $$('[data-count]', root).forEach((n) => {
      if (n.dataset.done) return;
      const target = parseFloat(n.dataset.count);
      if (!Number.isFinite(target)) return;
      n.dataset.done = '1';
      const dec = +(n.dataset.dec || 0);
      const suffix = n.dataset.suffix || '';
      const prefix = n.dataset.prefix || '';
      const dur = +(n.dataset.dur || 1100);
      const fmt = (v) => prefix + (dec ? v.toFixed(dec).replace('.', ',') : nf.format(Math.round(v))) + suffix;
      if (!('IntersectionObserver' in window)) { n.textContent = fmt(target); return; }
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          n.textContent = fmt(target * eased);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), { threshold: .4 });
      io.observe(n);
    });
  }

  /* ---------------- 11. TAB / ACCORDION ---------------- */
  function initTabs(root = document) {
    $$('[data-tabs]', root).forEach((host) => {
      const btns = $$('button', host);
      btns.forEach((b) => b.addEventListener('click', () => {
        btns.forEach((x) => x.classList.toggle('on', x === b));
        const target = b.dataset.tab;
        $$('[data-panel]', host.parentElement).forEach((p) => p.classList.toggle('on', p.dataset.panel === target));
        if (b.dataset.hash !== 'off') history.replaceState(null, '', '#' + target);
        host.dispatchEvent(new CustomEvent('tabchange', { detail: target }));
      }));
      const hash = location.hash.slice(1);
      const initial = btns.find((b) => b.dataset.tab === hash) || btns.find((b) => b.classList.contains('on')) || btns[0];
      if (initial) initial.click();
    });
    $$('[data-acc]', root).forEach((head) => head.addEventListener('click', () => head.closest('[data-acc-wrap]')?.classList.toggle('open') || head.parentElement.classList.toggle('open')));
  }

  /* ---------------- 12. MISC ---------------- */
  const debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const statusBadge = (s) => {
    const map = {
      online: ['green', 'Online'], offline: ['', 'Offline'], banned: ['red', 'Banned'],
      open: ['yellow', 'Terbuka'], in_progress: ['blue', 'Diproses'], waiting_user: ['violet', 'Menunggu Anda'],
      resolved: ['green', 'Selesai'], closed: ['', 'Ditutup'],
      pending: ['yellow', 'Diproses'], approved: ['green', 'Disetujui'], rejected: ['red', 'Ditolak'],
      Stabil: ['green', 'Stabil'], Beta: ['yellow', 'Beta'], WIP: ['blue', 'Dalam Pengembangan'],
      sukses: ['green', 'sukses'], gagal: ['red', 'gagal'], urgent: ['red', 'urgent'], high: ['yellow', 'tinggi'], normal: ['blue', 'normal'], low: ['', 'rendah'],
      success: ['green', 'sukses'], Minor: ['yellow', 'Minor'], Mayor: ['red', 'Mayor'], Resolusi: ['blue', 'Resolusi'],
    };
    const [kind, label] = map[s] || ['', String(s ?? '-')];
    return `<span class="badge ${kind}">${F.esc(label)}</span>`;
  };

  /* ---------------- 13. BOOT ---------------- */
  function boot() {
    if (document.body.dataset.layout !== 'none') { renderNav(); renderFooter(); paintLiveChips(); }
    initReveal();
    initTabs();
    countUp();
    document.body.classList.add('ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  w.XV = { el, $, $$, frag, icon, ico, F, nf, api, toast, modal, confirmBox, copy, live, countUp, initTabs, statusBadge, debounce, qs, TOKEN_KEY, NAV };
})(window, document);
