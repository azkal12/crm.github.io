'use strict';

/* ============================================================
   Komponen bersama
   ============================================================ */
function pageHead(title, sub, actions = '') {
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions no-print">${actions}</div></div>`;
}

function emptyState(icon, title, text, action = '') {
  return `<div class="empty"><div class="empty-ic">${IC(icon)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

function deltaBadge(current, previous, title = '') {
  const titleAttr = title ? ` title="${esc(title)}"` : '';
  if (previous <= 0) {
    return current > 0
      ? `<span class="delta delta-up"${titleAttr}>${IC('arrow-up')}baru</span>`
      : `<span class="delta delta-flat"${titleAttr}>—</span>`;
  }
  const diff = ((current - previous) / previous) * 100;
  const up = diff >= 0;
  return `<span class="delta ${up ? 'delta-up' : 'delta-down'}"${titleAttr}>${IC(up ? 'arrow-up' : 'arrow-down')}${Math.abs(diff).toFixed(1).replace('.', ',')}%</span>`;
}

function toast(message, tone = 'success', timeout = 3800) {
  const root = $('#toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast-${tone}`;
  const icon = tone === 'danger' ? 'alert' : tone === 'info' ? 'info' : 'check';
  el.innerHTML = `<span class="toast-icon">${IC(icon)}</span><div class="toast-message">${esc(message)}</div><button class="toast-close" type="button" aria-label="Tutup notifikasi">${IC('x')}</button>`;
  root.appendChild(el);
  const remove = () => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; el.style.transition = '.2s'; setTimeout(() => el.remove(), 210); };
  el.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, timeout);
}

/* ============================================================
   Grafik SVG
   ============================================================ */
function niceMax(value) {
  if (!value || value <= 0) return 1000000;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  let nf;
  if (f <= 1) nf = 1;
  else if (f <= 2) nf = 2;
  else if (f <= 2.5) nf = 2.5;
  else if (f <= 5) nf = 5;
  else nf = 10;
  return nf * exp;
}

function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildTrendChart(series) {
  const w = 720, h = 252, pl = 58, pr = 16, pt = 18, pb = 34;
  const innerW = w - pl - pr;
  const innerH = h - pt - pb;
  const max = niceMax(Math.max(...series.map(s => s.total), 1000000) * 1.08);
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const pts = series.map((s, i) => ({
    x: pl + i * stepX,
    y: pt + innerH * (1 - s.total / max),
    total: s.total, label: s.label, full: s.full
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${h - pb} L ${pts[0].x.toFixed(1)} ${h - pb} Z`;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = pt + innerH * i / 4;
    const val = max * (1 - i / 4);
    grid += `<line class="chart-grid" x1="${pl}" y1="${y}" x2="${w - pr}" y2="${y}"/>`;
    grid += `<text class="axis-text" x="${pl - 10}" y="${y + 3}" text-anchor="end">${esc(fmtShort(val, false))}</text>`;
  }

  let xlabels = '';
  const skip = series.length > 8 ? 2 : 1;
  pts.forEach((p, i) => {
    if (i % skip !== 0 && i !== pts.length - 1) return;
    xlabels += `<text class="axis-text" x="${p.x}" y="${h - 11}" text-anchor="middle">${esc(p.label)}</text>`;
  });

  const dots = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.4" fill="#ffffff" stroke="#116b4f" stroke-width="2"><title>${esc(p.full)}: ${fmtIDR(p.total)}</title></circle>`).join('');

  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik tren donasi per bulan">
    <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#178a63" stop-opacity=".24"/>
      <stop offset="100%" stop-color="#178a63" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#areaGrad)"/>
    <path d="${line}" fill="none" stroke="#116b4f" stroke-width="2.4" stroke-linecap="round"/>
    ${dots}
    ${xlabels}
  </svg>`;
}

function buildBarChart(series) {
  const w = 720, h = 230, pl = 54, pr = 14, pt = 16, pb = 30;
  const innerW = w - pl - pr;
  const innerH = h - pt - pb;
  const max = niceMax(Math.max(...series.map(s => s.total), 1000000) * 1.05);
  const slot = innerW / series.length;
  const barW = Math.min(30, slot * 0.55);

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const y = pt + innerH * i / 4;
    grid += `<line class="chart-grid" x1="${pl}" y1="${y}" x2="${w - pr}" y2="${y}"/>`;
    grid += `<text class="axis-text" x="${pl - 9}" y="${y + 3}" text-anchor="end">${esc(fmtShort(max * (1 - i / 4), false))}</text>`;
  }

  const bars = series.map((s, i) => {
    const bh = innerH * (s.total / max);
    const x = pl + slot * i + (slot - barW) / 2;
    const y = pt + innerH - bh;
    const isLast = i === series.length - 1;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 2).toFixed(1)}" rx="4" fill="${isLast ? '#c7a04b' : '#bcd6c8'}"><title>${esc(s.full)}: ${fmtIDR(s.total)}</title></rect>
      <text class="axis-text" x="${(x + barW / 2).toFixed(1)}" y="${h - 11}" text-anchor="middle">${esc(s.label)}</text>`;
  }).join('');

  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik donasi per bulan">${grid}${bars}</svg>`;
}

function buildDonut(items) {
  const total = sum(items.map(i => i.value));
  const size = 164, cx = 82, cy = 82, r = 64, stroke = 17;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = items.map(item => {
    const frac = total ? item.value / total : 0;
    const len = Math.max(0, frac * C - 3);
    const offset = -acc;
    acc += frac * C;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${item.color}" stroke-width="${stroke}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(item.label)}: ${fmtIDR(item.value)}</title></circle>`;
  }).join('');

  return `<svg class="donut-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Distribusi dana per program">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#eef2ed" stroke-width="${stroke}"/>
    ${arcs}
    <text x="${cx}" y="${cy - 2}" text-anchor="middle" class="donut-center-value">${esc(fmtShort(total))}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" class="donut-center-label">TERKUMPUL</text>
  </svg>`;
}

