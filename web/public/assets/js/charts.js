/* ==========================================================================
   Xvault HUB — charts.js
   Renderer grafik SVG ringan (tanpa library eksternal): area/line, bar,
   bar horizontal, donut, gauge, sparkline, heatmap. Responsif + tooltip.
   ========================================================================== */
(function (w) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (t, a = {}) => { const n = document.createElementNS(NS, t); for (const k in a) if (a[k] != null) n.setAttribute(k, a[k]); return n; };
  const nf = new Intl.NumberFormat('id-ID');
  const fmtNum = (v) => (Math.abs(v) >= 1000 ? nf.format(Math.round(v)) : (Math.round(v * 100) / 100).toString().replace('.', ','));
  const uid = () => 'c' + Math.random().toString(36).slice(2, 8);
  const PALETTE = ['#9b6bf2', '#4cc9f0', '#31d99a', '#ffc857', '#ff5470', '#d47fe8', '#ff9147'];

  function prep(host, h) {
    host.textContent = '';
    host.style.position = 'relative';
    const svg = mk('svg', { preserveAspectRatio: 'none' });
    svg.style.height = h + 'px';
    host.appendChild(svg);
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    host.appendChild(tip);
    return { svg, tip, host };
  }
  function size(host, h) {
    const box = host.getBoundingClientRect();
    const W = Math.max(240, Math.round(box.width || 640));
    return { W, H: h };
  }

  /* ---------------- LINE / AREA ---------------- */
  function area(host, cfg) {
    const H = cfg.h || 190;
    const { svg, tip } = prep(host, H);
    const { W } = size(host, H);
    const padL = cfg.padL ?? 40, padR = cfg.padR ?? 12, padT = cfg.padT ?? 14, padB = cfg.padB ?? 22;
    const series = cfg.series.filter((s) => s.data.length);
    const xs = series[0].data.map((p) => p.x);
    const allY = series.flatMap((s) => s.data.map((p) => +p.y));
    let minY = Math.min(...allY), maxY = Math.max(...allY);
    if (minY === maxY) { maxY = minY + 1; }
    const span = maxY - minY;
    minY = cfg.zeroBased ? 0 : Math.max(0, minY - span * 0.18);
    maxY = maxY + span * 0.14;
    const iw = W - padL - padR, ih = H - padT - padB;
    const X = (i) => padL + (xs.length === 1 ? iw / 2 : (i / (xs.length - 1)) * iw);
    const Y = (v) => padT + ih - ((+v - minY) / (maxY - minY)) * ih;

    // grid + labels
    const ticks = cfg.yTicks || 4;
    for (let t = 0; t <= ticks; t++) {
      const v = minY + ((maxY - minY) * t) / ticks;
      const y = Y(v);
      svg.appendChild(mk('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: 'grid-l' }));
      const lb = mk('text', { x: padL - 7, y: y + 3.5, class: 'axis', 'text-anchor': 'end' });
      lb.textContent = (cfg.yFmt || fmtNum)(v);
      svg.appendChild(lb);
    }
    const every = Math.max(1, Math.ceil(xs.length / (cfg.maxXLabels || 8)));
    xs.forEach((x, i) => {
      if (i % every && i !== xs.length - 1) return;
      const t = mk('text', { x: X(i), y: H - 6, class: 'axis', 'text-anchor': i === xs.length - 1 ? 'end' : i === 0 ? 'start' : 'middle' });
      t.textContent = x;
      svg.appendChild(t);
    });

    const defs = mk('defs');
    svg.appendChild(defs);
    series.forEach((s, si) => {
      const color = s.color || PALETTE[si % PALETTE.length];
      const pts = s.data.map((p, i) => [X(i), Y(p.y)]);
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      if (cfg.smooth !== false && pts.length > 2) {
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
          const cx = (x0 + x1) / 2;
          d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
        }
      } else d += pts.slice(1).map((p) => ` L ${p[0]} ${p[1]}`).join('');
      if (cfg.fill !== false) {
        const gid = uid();
        const g = mk('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
        g.appendChild(mk('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': .55 }));
        g.appendChild(mk('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }));
        defs.appendChild(g);
        const areaD = d + ` L ${pts[pts.length - 1][0]} ${padT + ih} L ${pts[0][0]} ${padT + ih} Z`;
        svg.appendChild(mk('path', { d: areaD, fill: `url(#${gid})`, class: 'area', stroke: 'none' }));
      }
      svg.appendChild(mk('path', { d, fill: 'none', stroke: color, class: 'line', 'stroke-dasharray': s.dash || '' }));
      if (cfg.dots !== false && s.data.length <= 32) pts.forEach((p) => svg.appendChild(mk('circle', { cx: p[0], cy: p[1], r: 2.4, fill: color, class: 'pt' })));
    });

    // crosshair + tooltip
    const ch = mk('line', { y1: padT, y2: padT + ih, class: 'crosshair', opacity: 0 });
    svg.appendChild(ch);
    const overlay = mk('rect', { x: padL, y: padT, width: iw, height: ih, fill: 'transparent' });
    svg.appendChild(overlay);
    overlay.addEventListener('mousemove', (e) => {
      const box = svg.getBoundingClientRect();
      const rx = ((e.clientX - box.left) / box.width) * W;
      let i = Math.round(((rx - padL) / iw) * (xs.length - 1));
      i = Math.max(0, Math.min(xs.length - 1, i));
      const px = X(i);
      ch.setAttribute('x1', px); ch.setAttribute('x2', px); ch.setAttribute('opacity', 1);
      tip.style.opacity = 1;
      tip.style.left = (px / W) * host.clientWidth + 'px';
      tip.style.top = (Y(series[0].data[i].y) / H) * host.clientHeight + 'px';
      tip.innerHTML = `<b style="color:#fff">${xs[i]}</b>` + series.map((s, si) =>
        `<div style="color:${s.color || PALETTE[si % PALETTE.length]}">${(s.name ? s.name + ' ' : '')}${(cfg.yFmt || fmtNum)(s.data[i].y)}</div>`).join('');
    });
    overlay.addEventListener('mouseleave', () => { ch.setAttribute('opacity', 0); tip.style.opacity = 0; });
    return svg;
  }

  /* ---------------- VERTICAL BARS ---------------- */
  function bars(host, cfg) {
    const H = cfg.h || 190;
    const { svg, tip } = prep(host, H);
    const { W } = size(host, H);
    const data = cfg.data;
    const padL = cfg.padL ?? 38, padR = 10, padT = 12, padB = 22;
    const max = Math.max(...data.map((d) => +d.value)) * 1.1 || 1;
    const min = cfg.zeroBased === false ? Math.min(...data.map((d) => d.value)) * .98 : 0;
    const iw = W - padL - padR, ih = H - padT - padB;
    const bw = Math.max(4, Math.min(34, (iw / data.length) * .62));
    const step = iw / data.length;
    for (let t = 0; t <= 3; t++) {
      const v = min + ((max - min) * t) / 3, y = padT + ih - ((v - min) / (max - min)) * ih;
      svg.appendChild(mk('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: 'grid-l' }));
      const lb = mk('text', { x: padL - 6, y: y + 3.5, class: 'axis', 'text-anchor': 'end' });
      lb.textContent = (cfg.yFmt || fmtNum)(v); svg.appendChild(lb);
    }
    const defs = mk('defs'); svg.appendChild(defs);
    data.forEach((d, i) => {
      const x = padL + step * i + (step - bw) / 2;
      const hh = Math.max(2, ((+d.value - min) / (max - min)) * ih);
      const color = d.color || cfg.color || PALETTE[i % PALETTE.length];
      const gid = uid();
      const g = mk('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
      g.appendChild(mk('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 1 }));
      g.appendChild(mk('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': .35 }));
      defs.appendChild(g);
      const r = mk('rect', { x, y: padT + ih - hh, width: bw, height: hh, rx: Math.min(5, bw / 2), fill: `url(#${gid})` });
      r.style.transition = 'opacity .15s';
      r.addEventListener('mouseenter', () => {
        tip.style.opacity = 1; tip.innerHTML = `<b style="color:#fff">${d.label}</b><div>${(cfg.yFmt || fmtNum)(d.value)}</div>`;
        tip.style.left = (x + bw / 2) / W * host.clientWidth + 'px';
        tip.style.top = (padT + ih - hh) / H * host.clientHeight + 'px';
      });
      r.addEventListener('mouseleave', () => tip.style.opacity = 0);
      svg.appendChild(r);
      if (data.length <= 26 || i % Math.ceil(data.length / 12) === 0) {
        const t = mk('text', { x: x + bw / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' });
        t.textContent = d.label; svg.appendChild(t);
      }
    });
    return svg;
  }

  /* ---------------- HORIZONTAL BARS (HTML) ---------------- */
  function hbars(host, cfg) {
    host.textContent = '';
    const wrap = document.createElement('div');
    wrap.className = 'bars';
    const max = Math.max(...cfg.data.map((d) => +d.value)) || 1;
    cfg.data.forEach((d, i) => {
      const color = d.color || PALETTE[i % PALETTE.length];
      const row = document.createElement('div');
      row.className = 'b';
      row.innerHTML = `<span title="${d.label}">${d.label}</span>
        <div class="bar"><i style="background:${color};width:0"></i></div>
        <b>${(cfg.fmt || fmtNum)(d.value)}</b>`;
      wrap.appendChild(row);
      requestAnimationFrame(() => { row.querySelector('.bar > i').style.width = Math.max(3, (d.value / max) * 100) + '%'; });
    });
    host.appendChild(wrap);
  }

  /* ---------------- DONUT ---------------- */
  function donut(host, cfg) {
    host.textContent = '';
    const size_ = cfg.size || 168;
    const sw = cfg.stroke || 20;
    const total = cfg.data.reduce((a, d) => a + +d.value, 0) || 1;
    const svg = mk('svg', { viewBox: `0 0 ${size_} ${size_}`, width: size_, height: size_ });
    svg.style.margin = '0 auto';
    const g = mk('g', { transform: `rotate(-90 ${size_ / 2} ${size_ / 2})` });
    const r = (size_ - sw) / 2;
    const C = 2 * Math.PI * r;
    let off = 0;
    cfg.data.forEach((d, i) => {
      const frac = +d.value / total;
      const c = d.color || PALETTE[i % PALETTE.length];
      const seg = mk('circle', {
        cx: size_ / 2, cy: size_ / 2, r, fill: 'none', stroke: c, 'stroke-width': sw,
        'stroke-dasharray': `${C * frac - 2} ${C - C * frac + 2}`, 'stroke-dashoffset': -off * C, 'stroke-linecap': 'butt',
      });
      seg.style.transition = 'stroke-width .18s, opacity .18s';
      seg.addEventListener('mouseenter', () => { seg.setAttribute('stroke-width', sw + 5); center.innerHTML = `<div style="font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:#847da6">${d.label}</div><div style="font-family:var(--disp);font-size:1.25rem;font-weight:700">${fmtNum(d.value)}</div>`; });
      seg.addEventListener('mouseleave', () => { seg.setAttribute('stroke-width', sw); drawCenter(); });
      g.appendChild(seg);
      off += frac;
    });
    svg.appendChild(g);
    const center = document.createElement('div');
    center.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none';
    const host_ = document.createElement('div');
    host_.style.cssText = 'position:relative;display:grid;place-items:center';
    host_.append(svg, center);
    host.appendChild(host_);
    function drawCenter() {
      center.innerHTML = cfg.centerHtml || `<div style="font-family:var(--disp);font-size:1.5rem;font-weight:700">${fmtNum(total)}</div><div style="font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:#847da6">${cfg.caption || 'total'}</div>`;
    }
    drawCenter();
    if (cfg.legend !== false) {
      const lg = document.createElement('div');
      lg.className = 'legend';
      lg.style.justifyContent = 'center';
      lg.innerHTML = cfg.data.map((d, i) => `<span><i style="background:${d.color || PALETTE[i % PALETTE.length]}"></i>${d.label} · ${Math.round((d.value / total) * 100)}%</span>`).join('');
      host.appendChild(lg);
    }
  }

  /* ---------------- GAUGE ---------------- */
  function gauge(host, cfg) {
    host.textContent = '';
    const s = cfg.size || 150, sw = cfg.stroke || 12;
    const r = (s - sw) / 2, C = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, cfg.value / (cfg.max ?? 100)));
    const svg = mk('svg', { width: s, height: s, viewBox: `0 0 ${s} ${s}` });
    const gid = uid();
    const defs = mk('defs');
    const grad = mk('linearGradient', { id: gid, x1: 0, y1: 0, x2: 1, y2: 1 });
    (cfg.colors || ['#9370db', '#da70d6']).forEach((c, i, a) => grad.appendChild(mk('stop', { offset: `${(i / (a.length - 1)) * 100}%`, 'stop-color': c })));
    defs.appendChild(grad); svg.appendChild(defs);
    const g = mk('g', { transform: `rotate(-90 ${s / 2} ${s / 2})` });
    g.appendChild(mk('circle', { cx: s / 2, cy: s / 2, r, fill: 'none', stroke: 'rgba(255,255,255,.09)', 'stroke-width': sw }));
    const arc = mk('circle', { cx: s / 2, cy: s / 2, r, fill: 'none', stroke: `url(#${gid})`, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-dasharray': `${C * pct} ${C * (1 - pct)}`, 'stroke-dashoffset': C * 0.0001 });
    arc.style.transition = 'stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1)';
    arc.setAttribute('stroke-dasharray', `0 ${C}`);
    g.appendChild(arc); svg.appendChild(g);
    host.appendChild(svg);
    const lab = document.createElement('div');
    lab.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;text-align:center;pointer-events:none';
    lab.innerHTML = `<div><div style="font-family:var(--disp);font-size:${cfg.big || '1.5rem'};font-weight:700;line-height:1">${cfg.text ?? Math.round(pct * 100) + '%'}</div>
      ${cfg.sub ? `<div style="font-size:.7rem;color:#847da6;letter-spacing:.08em;text-transform:uppercase;margin-top:3px">${cfg.sub}</div>` : ''}</div>`;
    host.style.position = 'relative';
    host.appendChild(lab);
    requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute('stroke-dasharray', `${C * pct} ${C * (1 - pct)}`)));
  }

  /* ---------------- SPARKLINE ---------------- */
  function spark(host, data, color = '#9b6bf2', h = 40) {
    const svg = mk('svg', { viewBox: '0 0 100 30', preserveAspectRatio: 'none' });
    svg.style.cssText = `width:100%;height:${h}px;display:block`;
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 28 - ((v - min) / (max - min || 1)) * 24]);
    const gid = uid();
    const defs = mk('defs');
    const grad = mk('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(mk('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': .5 }));
    grad.appendChild(mk('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }));
    defs.appendChild(grad); svg.appendChild(defs);
    const d = 'M ' + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ');
    svg.appendChild(mk('path', { d: `${d} L 100 30 L 0 30 Z`, fill: `url(#${gid})`, stroke: 'none' }));
    svg.appendChild(mk('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' }));
    if (host) { host.textContent = ''; host.appendChild(svg); }
    return svg;
  }

  /* ---------------- HEATMAP ---------------- */
  function heat(host, cfg) {
    host.textContent = '';
    const days = cfg.days || ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const cells = document.createElement('div');
    cells.className = 'cells';
    const max = Math.max(...cfg.matrix.flat()) || 1;
    cfg.matrix.forEach((row, di) => row.forEach((v, hi) => {
      const i = document.createElement('i');
      const p = v / max;
      i.style.background = p < .04 ? 'rgba(255,255,255,.05)' : `rgba(155,107,242,${(.14 + p * .8).toFixed(2)})`;
      i.style.boxShadow = p > .72 ? '0 0 12px rgba(218,112,214,.5)' : '';
      i.title = `${days[di]} ${String(hi).padStart(2, '0')}:00 — ${fmtNum(v)}${cfg.unit || ''}`;
      cells.appendChild(i);
    }));
    const dcol = document.createElement('div');
    dcol.className = 'days';
    dcol.style.gridTemplateRows = `repeat(${days.length},1fr)`;
    days.forEach((dd) => dcol.appendChild(Object.assign(document.createElement('span'), { textContent: dd })));
    const wrap = document.createElement('div');
    wrap.className = 'heat';
    wrap.append(dcol, cells);
    host.appendChild(wrap);
  }

  /* ---------------- STACKED STRIP (uptime) ---------------- */
  function strip(host, data) {
    host.textContent = '';
    host.className = 'uptime-strip';
    data.forEach((d) => {
      const i = document.createElement('i');
      i.style.height = Math.max(18, ((d.value - 99) / 1) * 100) + '%';
      if (d.bad) i.classList.add('bad');
      i.title = `${d.label}: ${d.value}%${d.note ? ' — ' + d.note : ''}`;
      host.appendChild(i);
    });
  }

  w.XVChart = { area, bars, hbars, donut, gauge, spark, heat, strip, PALETTE, fmtNum };
})(window);
