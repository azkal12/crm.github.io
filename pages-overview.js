'use strict';

/* ============================================================
   Halaman: Ringkasan
   ============================================================ */
function dueLabel(due) {
  if (!due) return '';
  const diff = Math.round((parseISO(due) - parseISO(todayISO())) / 86400000);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';
  if (diff > 1) return `${diff} hari lagi`;
  if (diff === -1) return 'Kemarin';
  return `${Math.abs(diff)} hari lalu`;
}

function trendPanelHTML() {
  const series = trendSeries(ui.trendRange);
  const total = sum(series.map(s => s.total));
  return `<div class="chart-body" id="trend-chart">${buildTrendChart(series)}</div>
    <div class="chart-legend">
      <span class="legend-key"><span class="legend-dot" style="background:#116b4f"></span>Donasi terverifikasi</span>
      <span>Total ${ui.trendRange} bulan: <b style="color:var(--ink-2)">${fmtIDR(total)}</b></span>
    </div>`;
}

function dashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
  const cur = monthTotal(0);
  const prev = monthTotalToDate(1);
  const activeDonors = state.donors.filter(d => d.status === 'Aktif' || d.status === 'Rutin');
  const newDonors = state.donors.filter(d => String(d.since).slice(0, 7) === todayISO().slice(0, 7)).length;
  const year = now.getFullYear();
  const yearDonations = verifiedDonations().filter(d => String(d.date).slice(0, 4) === String(year));
  const yearTotal = sum(yearDonations.map(d => d.amount));
  const running = state.programs.filter(p => p.status === 'Berjalan');
  const doneCount = state.programs.filter(p => p.status === 'Selesai').length;
  const upcomingCount = state.programs.filter(p => p.status === 'Akan Datang').length;
  const pendingDonations = state.donations.filter(d => d.status === 'Menunggu').length;
  const today = todayISO();
  const dueTaskCount = openTasks().filter(f => f.due <= today).length;
  const commitDueCount = dueCommitments(7).length;
  const reminderCount = reminderQueue().length;
  const pipe = pipelineStats();
  const attention = [];
  if (reminderCount) attention.push(`<b>${reminderCount} donatur</b> belum diingatkan ${reminderDays()} hari terakhir`);
  if (dueTaskCount) attention.push(`<b>${dueTaskCount} tugas</b> jatuh tempo atau terlambat`);
  if (commitDueCount) attention.push(`<b>${commitDueCount} komitmen</b> jatuh tempo dalam 7 hari`);
  if (pipe.staleCount) attention.push(`<b>${pipe.staleCount} prospek</b> belum bergerak lebih dari 7 hari`);

  const stageMax = Math.max(...pipe.byStage.slice(0, 5).map(x => x.value), 1);
  const pipelineStageRows = pipe.byStage.slice(0, 5).map(x => `
    <div class="metric-row">
      <span class="name">${esc(x.stage.label)}</span>
      <span class="bar"><span style="width:${(x.value / stageMax * 100).toFixed(1)}%"></span></span>
      <span class="val">${fmtShort(x.value)}</span>
      <span class="cnt">${x.count} prospek</span>
    </div>`).join('');

  const topPrograms = [...state.programs]
    .map(p => ({ p, stats: programProgress(p) }))
    .sort((a, b) => b.stats.pct - a.stats.pct)
    .slice(0, 4);

  const followups = [...state.followups].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const due = String(a.due).localeCompare(String(b.due));
    if (due !== 0) return due;
    const weight = { Tinggi: 0, Sedang: 1, Rendah: 2 };
    return (weight[a.priority] ?? 1) - (weight[b.priority] ?? 1);
  }).slice(0, 6);

  const recent = [...state.donations]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);

  const donutItems = state.programs
    .map(p => ({
      label: p.name,
      value: sum(yearDonations.filter(d => d.programId === p.id).map(d => d.amount)),
      color: colorFor(p.category)
    }))
    .filter(i => i.value > 0)
    .sort((a, b) => b.value - a.value);
  const donutTotal = sum(donutItems.map(i => i.value));

  const programRows = topPrograms.map(({ p, stats }) => `
    <div class="program-row" data-action="open-program" data-id="${p.id}" style="cursor:pointer">
      <span class="cat-dot" style="background:${colorFor(p.category)}">${esc(p.category.charAt(0))}</span>
      <div class="program-row-main">
        <div class="program-row-top">
          <span class="program-row-name">${esc(p.name)}</span>
          <span class="program-row-pct">${Math.round(stats.pct)}%</span>
        </div>
        <div class="progress"><span style="width:${stats.pct.toFixed(1)}%"></span></div>
        <div class="program-row-sub"><span>${fmtShort(stats.total)} / ${fmtShort(p.target)}</span><span>${stats.donors} donatur</span></div>
      </div>
    </div>`).join('');

  const followupRows = followups.length ? followups.map(f => {
    const donor = donorById(f.donorId);
    const overdue = !f.done && f.due < todayISO();
    return `<div class="followup ${f.done ? 'done' : ''}">
      <button class="check" type="button" data-action="toggle-followup" data-id="${f.id}" aria-label="${f.done ? 'Tandai belum selesai' : 'Tandai selesai'}">${IC('check')}</button>
      <div class="fu-body">
        <div class="fu-title">${esc(f.title)}</div>
        <div class="fu-meta">
          ${priorityChip(f.priority)}
          ${typeTag(f.type || 'Telepon')}
          ${donor ? `<span>${esc(donor.name)}</span>` : ''}
          <span class="fu-due ${overdue ? 'overdue' : ''}">${IC('clock')}${esc(dueLabel(f.due))}</span>
        </div>
      </div>
      <span class="fu-delete"><button class="icon-btn" type="button" data-action="delete-followup" data-id="${f.id}" title="Hapus tugas">${IC('x')}</button></span>
    </div>`;
  }).join('') : emptyState('check', 'Tidak ada tugas terbuka', 'Semua tugas dan follow-up sudah beres. Tambahkan pengingat baru bila diperlukan.', `<button class="btn btn-secondary btn-sm" data-action="add-followup">${IC('plus')}Tambah tugas</button>`);

  const donutLegend = donutItems.map(item => {
    const pct = donutTotal ? Math.round((item.value / donutTotal) * 100) : 0;
    return `<div class="donut-row">
      <span class="dot" style="background:${item.color}"></span>
      <span class="name" title="${esc(item.label)}">${esc(item.label)}</span>
      <span class="amount"><b>${pct}%</b>${fmtShort(item.value)}</span>
    </div>`;
  }).join('') || '<div class="muted small">Belum ada donasi terverifikasi.</div>';

  const recentRows = recent.length ? recent.map(d => {
    const donor = donorById(d.donorId);
    const program = programById(d.programId);
    return `<tr>
      <td><div class="cell-main">${avatar(donor ? donor.name : '?')}<div style="min-width:0"><div class="cell-title">${esc(donor ? donor.name : 'Donatur dihapus')}</div><div class="cell-sub">${esc(donor ? donor.type : '—')}</div></div></div></td>
      <td><div class="cell-title" style="font-weight:500">${esc(program ? program.name : 'Program dihapus')}</div><div class="cell-sub">${esc(d.fund || '—')}</div></td>
      <td class="nowrap">${fmtDate(d.date)}</td>
      <td><span class="tag">${esc(d.method)}</span></td>
      <td class="text-right num">${fmtIDR(d.amount)}</td>
      <td>${statusChip(d.status)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="6">${emptyState('wallet', 'Belum ada donasi', 'Catat donasi pertama untuk mulai memantau tren organisasi.')}</td></tr>`;

  return `
  <div class="page-head">
    <div>
      <h1>${greeting}, Admin</h1>
      <p>Berikut ringkasan aktivitas ${esc(state.settings.orgName)}. ${pendingDonations > 0 ? `<b style="color:var(--warn)">${pendingDonations} donasi</b> menunggu verifikasi.` : 'Semua donasi sudah diverifikasi.'}</p>
    </div>
    <div class="head-actions no-print">
      <button class="btn btn-secondary" data-action="export" data-kind="donations">${IC('download')}Unduh ringkasan</button>
      <button class="btn btn-primary" data-action="add-donation">${IC('plus')}Catat donasi</button>
    </div>
  </div>

  ${attention.length ? `<div class="alert-strip">${IC('alert')}<span><b>Perlu perhatian:</b> ${attention.join(', ')}.</span><span class="alert-actions">${reminderCount ? '<button class="alert-link" type="button" data-action="open-reminders">Lihat pengingat</button>' : ''}<button class="alert-link" type="button" data-action="go" data-page="tugas">Lihat tugas</button><button class="alert-link" type="button" data-action="go" data-page="komitmen">Lihat komitmen</button><button class="alert-link" type="button" data-action="go" data-page="pipeline">Lihat pipeline</button></span></div>` : ''}

  <div class="kpi-grid">
    <article class="card kpi">
      <div class="kpi-top"><span class="kpi-label">Donasi bulan ini</span><span class="kpi-icon tint-green">${IC('wallet')}</span></div>
      <div class="kpi-value sm">${fmtIDR(cur)}</div>
      <div class="kpi-foot">${deltaBadge(cur, prev, 'Perbandingan dengan periode yang sama bulan lalu')}<span>${monthCount(0)} transaksi terverifikasi</span></div>
    </article>
    <article class="card kpi">
      <div class="kpi-top"><span class="kpi-label">Donatur aktif</span><span class="kpi-icon tint-blue">${IC('users')}</span></div>
      <div class="kpi-value">${fmtNum(activeDonors.length)}</div>
      <div class="kpi-foot"><span class="delta delta-up">${IC('plus')}${newDonors}</span><span>baru bulan ini · ${state.donors.length} total</span></div>
    </article>
    <article class="card kpi">
      <div class="kpi-top"><span class="kpi-label">Dana terkumpul ${year}</span><span class="kpi-icon tint-gold">${IC('money')}</span></div>
      <div class="kpi-value sm">${fmtIDR(yearTotal)}</div>
      <div class="kpi-foot"><span>${yearDonations.length} transaksi terverifikasi</span></div>
    </article>
    <article class="card kpi">
      <div class="kpi-top"><span class="kpi-label">Program berjalan</span><span class="kpi-icon tint-violet">${IC('target')}</span></div>
      <div class="kpi-value">${running.length}</div>
      <div class="kpi-foot"><span>${doneCount} selesai · ${upcomingCount} akan datang</span></div>
    </article>
  </div>

  <div class="grid grid-main" style="margin-bottom:18px">
    <section class="card">
      <div class="card-head">
        <div><div class="card-title">Tren donasi</div><div class="card-sub">Donasi terverifikasi per bulan</div></div>
        <div class="segmented no-print" role="group" aria-label="Rentang waktu">
          <button type="button" data-action="trend-range" data-range="6" class="${ui.trendRange === 6 ? 'active' : ''}">6 bulan</button>
          <button type="button" data-action="trend-range" data-range="12" class="${ui.trendRange === 12 ? 'active' : ''}">12 bulan</button>
        </div>
      </div>
      <div id="trend-panel">${trendPanelHTML()}</div>
    </section>

    <section class="card">
      <div class="card-head">
        <div><div class="card-title">Distribusi dana</div><div class="card-sub">Berdasarkan program · ${year}</div></div>
        <a class="card-link" href="#/laporan">Laporan ${IC('chevron-right')}</a>
      </div>
      <div class="card-body">
        <div class="donut-wrap">
          ${buildDonut(donutItems)}
          <div class="donut-legend">${donutLegend}</div>
        </div>
      </div>
    </section>
  </div>

  <div class="grid grid-even" style="margin-bottom:18px">
    <section class="card">
      <div class="card-head">
        <div><div class="card-title">Progres program</div><div class="card-sub">Pencapaian target program prioritas</div></div>
        <a class="card-link" href="#/program">Semua program ${IC('chevron-right')}</a>
      </div>
      <div class="card-body" style="padding-top:6px">
        <div class="program-list">${programRows}</div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <div><div class="card-title">Tugas &amp; pengingat</div><div class="card-sub">Prioritas follow-up dan pekerjaan tim</div></div>
        <div style="display:flex;align-items:center;gap:4px" class="no-print">
          <a class="card-link" href="#/tugas">Semua</a>
          <button class="icon-btn" type="button" data-action="add-followup" title="Tambah tugas" aria-label="Tambah tugas">${IC('plus')}</button>
        </div>
      </div>
      <div class="card-body" style="padding-top:6px">
        <div class="followup-list">${followupRows}</div>
      </div>
    </section>
  </div>

  <section class="card" style="margin-bottom:18px">
    <div class="card-head">
      <div><div class="card-title">Pipeline prospek</div><div class="card-sub">Peluang dukungan yang sedang berjalan</div></div>
      <a class="card-link" href="#/pipeline">Buka pipeline ${IC('chevron-right')}</a>
    </div>
    <div class="card-body" style="padding-top:12px">
      <div class="detail-stats" style="margin:0 0 12px">
        <div class="dstat"><label>Prospek terbuka</label><b>${fmtNum(pipe.openCount)}</b></div>
        <div class="dstat"><label>Nilai pipeline</label><b>${fmtShort(pipe.openValue)}</b></div>
        <div class="dstat"><label>Prakiraan tertimbang</label><b>${fmtShort(pipe.weighted)}</b></div>
        <div class="dstat"><label>Tingkat menang</label><b>${pipe.winRate}%</b></div>
      </div>
      <div class="metric-rows">${pipelineStageRows}</div>
    </div>
  </section>

  <section class="card">
    <div class="card-head">
      <div><div class="card-title">Donasi terbaru</div><div class="card-sub">Enam transaksi terakhir yang masuk</div></div>
      <a class="card-link" href="#/donasi">Lihat semua ${IC('chevron-right')}</a>
    </div>
    <div class="table-wrap" style="max-height:none">
      <table>
        <thead><tr><th>Donatur</th><th>Program</th><th>Tanggal</th><th>Metode</th><th class="text-right">Nominal</th><th>Status</th></tr></thead>
        <tbody>${recentRows}</tbody>
      </table>
    </div>
  </section>`;
}

/* ============================================================
   Halaman: Donatur
   ============================================================ */
function donorTable() {
  const q = ui.donorSearch.trim().toLowerCase();
  const segMap = donorSegmentMap();
  const segSet = ui.donorSegment === 'semua' ? null : new Set((segMap[ui.donorSegment] || []).map(d => d.id));
  let rows = state.donors.filter(d => {
    const hay = [d.name, d.city, d.phone, d.email, (d.tags || []).join(' ')].join(' ').toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchStatus = ui.donorStatus === 'Semua' || d.status === ui.donorStatus;
    const matchType = ui.donorType === 'Semua' || d.type === ui.donorType;
    const matchSegment = !segSet || segSet.has(d.id);
    return matchQ && matchStatus && matchType && matchSegment;
  });

  rows.sort((a, b) => {
    if (ui.donorSort === 'name') return a.name.localeCompare(b.name, 'id');
    if (ui.donorSort === 'total') return donorStats(b.id).total - donorStats(a.id).total;
    if (ui.donorSort === 'last') return String(donorStats(b.id).last).localeCompare(String(donorStats(a.id).last));
    return String(b.since).localeCompare(String(a.since));
  });

  if (!rows.length) {
    return `<div class="empty" style="padding:38px 20px">
      <div class="empty-ic">${IC('users')}</div>
      <h3>Tidak ada donatur yang cocok</h3>
      <p>Ubah kata kunci atau filter, atau tambahkan donatur baru ke basis data.</p>
      <button class="btn btn-secondary btn-sm" data-action="add-donor">${IC('plus')}Tambah donatur</button>
    </div>`;
  }

  const body = rows.map(d => {
    const s = donorStats(d.id);
    return `<tr>
      <td>
        <div class="cell-main">${avatar(d.name)}
          <div style="min-width:0">
            <div class="cell-title"><button class="link-btn" type="button" data-action="open-donor" data-id="${d.id}">${esc(d.name)}</button></div>
            <div class="cell-sub">${esc(d.city)} · sejak ${fmtDateShort(d.since)} ${parseISO(d.since).getFullYear()}</div>
          </div>
        </div>
      </td>
      <td>${typeTag(d.type)}</td>
      <td><div class="cell-title" style="font-weight:500">${esc(d.phone || '—')}</div><div class="cell-sub">${esc(d.email || '—')}</div></td>
      <td>${statusChip(d.status)}</td>
      <td class="text-right"><div class="num">${s.total ? fmtShort(s.total) : '—'}</div><div class="cell-sub">${s.count} donasi</div></td>
      <td class="nowrap">${s.last ? fmtDate(s.last) : '<span class="muted">Belum ada</span>'}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-action="message-donor" data-id="${d.id}" title="Kirim pesan">${IC('message')}</button>
          <button class="icon-btn" type="button" data-action="add-donation" data-id="${d.id}" title="Catat donasi">${IC('plus')}</button>
          <button class="icon-btn" type="button" data-action="edit-donor" data-id="${d.id}" title="Edit donatur">${IC('edit')}</button>
          <button class="icon-btn" type="button" data-action="delete-donor" data-id="${d.id}" title="Hapus donatur">${IC('trash')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const kontribusi = sum(rows.map(d => donorStats(d.id).total));
  return `<div class="table-wrap" style="max-height:none">
    <table>
      <thead><tr><th>Donatur</th><th>Tipe</th><th>Kontak</th><th>Status</th><th class="text-right">Total donasi</th><th>Terakhir</th><th></th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="table-foot">
      <span>${rows.length} donatur ditampilkan</span>
      <span class="summary-line"><span>Kontribusi terverifikasi</span><b>${fmtIDR(kontribusi)}</b></span>
    </div>
  </div>`;
}

function donaturPage() {
  const active = state.donors.filter(d => d.status === 'Aktif' || d.status === 'Rutin').length;
  const rutin = state.donors.filter(d => d.status === 'Rutin').length;
  const prospek = state.donors.filter(d => d.status === 'Prospek').length;
  const segs = donorSegmentMap();
  const segLabels = { semua: 'Semua', rutin: 'Rutin', mayor: 'Mayor', prospek: 'Prospek', baru: 'Baru', pasif: 'Perlu reaktivasi' };
  const segChips = Object.keys(segLabels).map(key => `
    <button class="filter-chip ${ui.donorSegment === key ? 'active' : ''}" type="button" data-action="donor-segment" data-segment="${key}">
      ${segLabels[key]}<span class="count">${segs[key] ? segs[key].length : 0}</span>
    </button>`).join('');

  return pageHead(
    'Donatur',
    'Kelola basis data donatur, segmentasi hubungan, dan riwayat kontribusi.',
    `<button class="btn btn-secondary" data-action="export" data-kind="donors">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-donor">${IC('plus')}Donatur baru</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Total donatur</label><b>${fmtNum(state.donors.length)}</b></div><span class="mini-ic tint-green">${IC('users')}</span></div>
    <div class="mini-stat"><div><label>Aktif &amp; rutin</label><b>${fmtNum(active)}</b></div><span class="mini-ic tint-blue">${IC('check')}</span></div>
    <div class="mini-stat"><div><label>Donatur rutin</label><b>${fmtNum(rutin)}</b></div><span class="mini-ic tint-gold">${IC('refresh')}</span></div>
    <div class="mini-stat"><div><label>Prospek</label><b>${fmtNum(prospek)}</b></div><span class="mini-ic tint-violet">${IC('target')}</span></div>
  </div>
  <div class="filter-chips">${segChips}</div>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-search">${IC('search')}<input class="input" id="donor-search" type="search" placeholder="Cari nama, kota, atau kontak…" value="${esc(ui.donorSearch)}" autocomplete="off"></div>
      <select class="select" id="donor-status" aria-label="Filter status">${options(['Semua', ...DONOR_STATUSES], ui.donorStatus)}</select>
      <select class="select" id="donor-type" aria-label="Filter tipe">${options(['Semua', ...DONOR_TYPES], ui.donorType)}</select>
      <select class="select" id="donor-sort" aria-label="Urutkan" style="margin-left:auto">
        <option value="recent"${ui.donorSort === 'recent' ? ' selected' : ''}>Terbaru bergabung</option>
        <option value="name"${ui.donorSort === 'name' ? ' selected' : ''}>Nama A–Z</option>
        <option value="total"${ui.donorSort === 'total' ? ' selected' : ''}>Total donasi</option>
        <option value="last"${ui.donorSort === 'last' ? ' selected' : ''}>Donasi terakhir</option>
      </select>
    </div>
    <div id="donor-table">${donorTable()}</div>
  </div>`;
}

function bindDonatur() {
  const search = $('#donor-search');
  const status = $('#donor-status');
  const type = $('#donor-type');
  const sort = $('#donor-sort');
  if (search) search.addEventListener('input', e => { ui.donorSearch = e.target.value; $('#donor-table').innerHTML = donorTable(); });
  if (status) status.addEventListener('change', e => { ui.donorStatus = e.target.value; $('#donor-table').innerHTML = donorTable(); });
  if (type) type.addEventListener('change', e => { ui.donorType = e.target.value; $('#donor-table').innerHTML = donorTable(); });
  if (sort) sort.addEventListener('change', e => { ui.donorSort = e.target.value; $('#donor-table').innerHTML = donorTable(); });
}

/* ============================================================
   Halaman: Donasi
   ============================================================ */
function donationMonths() {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    out.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}

function donationTable() {
  const q = ui.donationSearch.trim().toLowerCase();
  let rows = state.donations.filter(d => {
    const donor = donorById(d.donorId);
    const program = programById(d.programId);
    const hay = [donor ? donor.name : '', program ? program.name : '', d.method, d.fund, d.note].join(' ').toLowerCase();
    const matchQ = !q || hay.includes(q);
    const matchStatus = ui.donationStatus === 'Semua' || d.status === ui.donationStatus;
    const matchProgram = ui.donationProgram === 'Semua' || d.programId === ui.donationProgram;
    const matchMonth = ui.donationMonth === 'Semua' || String(d.date).slice(0, 7) === ui.donationMonth;
    return matchQ && matchStatus && matchProgram && matchMonth;
  });
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));

  if (!rows.length) {
    return `<div class="empty" style="padding:38px 20px">
      <div class="empty-ic">${IC('wallet')}</div>
      <h3>Tidak ada donasi yang cocok</h3>
      <p>Ubah kata kunci atau filter, atau catat donasi baru untuk mulai mengisi buku kas.</p>
      <button class="btn btn-secondary btn-sm" data-action="add-donation">${IC('plus')}Catat donasi</button>
    </div>`;
  }

  const body = rows.map(d => {
    const donor = donorById(d.donorId);
    const program = programById(d.programId);
    return `<tr>
      <td>
        <div class="cell-main">${avatar(donor ? donor.name : '?')}
          <div style="min-width:0">
            <div class="cell-title">${esc(donor ? donor.name : 'Donatur dihapus')}</div>
            <div class="cell-sub">${esc(donor ? donor.type : '—')}${d.recurring ? ' · rutin' : ''}</div>
          </div>
        </div>
      </td>
      <td><div class="cell-title" style="font-weight:500">${esc(program ? program.name : 'Program dihapus')}</div><div class="cell-sub">${esc(d.fund || '—')}</div></td>
      <td class="nowrap">${fmtDate(d.date)}</td>
      <td><span class="tag">${esc(d.method)}</span></td>
      <td class="text-right num">${fmtIDR(d.amount)}</td>
      <td>${statusChip(d.status)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" type="button" data-action="receipt" data-id="${d.id}" title="Lihat kwitansi">${IC('receipt')}</button>
          <button class="icon-btn" type="button" data-action="edit-donation" data-id="${d.id}" title="Edit donasi">${IC('edit')}</button>
          <button class="icon-btn" type="button" data-action="delete-donation" data-id="${d.id}" title="Hapus donasi">${IC('trash')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const verifiedTotal = sum(rows.filter(d => d.status === 'Terverifikasi').map(d => d.amount));
  const pendingCount = rows.filter(d => d.status === 'Menunggu').length;
  return `<div class="table-wrap">
    <table>
      <thead><tr><th>Donatur</th><th>Program</th><th>Tanggal</th><th>Metode</th><th class="text-right">Nominal</th><th>Status</th><th></th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="table-foot">
      <span>${rows.length} transaksi${pendingCount ? ` · ${pendingCount} menunggu verifikasi` : ''}</span>
      <span class="summary-line"><span>Total terverifikasi</span><b>${fmtIDR(verifiedTotal)}</b></span>
    </div>
  </div>`;
}

function donasiPage() {
  const allVerified = verifiedDonations();
  const total = sum(allVerified.map(d => d.amount));
  const pending = state.donations.filter(d => d.status === 'Menunggu').length;
  const avg = allVerified.length ? total / allVerified.length : 0;
  const monthOpts = donationMonths().map(m => `<option value="${m.key}"${ui.donationMonth === m.key ? ' selected' : ''}>${m.label}</option>`).join('');
  const programOpts = state.programs.map(p => `<option value="${p.id}"${ui.donationProgram === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

  return pageHead(
    'Donasi',
    'Catat, verifikasi, dan telusuri seluruh transaksi donasi yang masuk.',
    `<button class="btn btn-secondary" data-action="export" data-kind="donations">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-donation">${IC('plus')}Catat donasi</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Total terverifikasi</label><b>${fmtShort(total)}</b></div><span class="mini-ic tint-green">${IC('money')}</span></div>
    <div class="mini-stat"><div><label>Transaksi</label><b>${fmtNum(allVerified.length)}</b></div><span class="mini-ic tint-blue">${IC('wallet')}</span></div>
    <div class="mini-stat"><div><label>Rata-rata donasi</label><b>${fmtShort(avg)}</b></div><span class="mini-ic tint-gold">${IC('bars')}</span></div>
    <div class="mini-stat"><div><label>Menunggu verifikasi</label><b>${fmtNum(pending)}</b></div><span class="mini-ic tint-violet">${IC('clock')}</span></div>
  </div>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-search">${IC('search')}<input class="input" id="donation-search" type="search" placeholder="Cari donatur, program, metode…" value="${esc(ui.donationSearch)}" autocomplete="off"></div>
      <select class="select" id="donation-program" aria-label="Filter program">
        <option value="Semua"${ui.donationProgram === 'Semua' ? ' selected' : ''}>Semua program</option>
        ${programOpts}
      </select>
      <select class="select" id="donation-status" aria-label="Filter status">${options(['Semua', ...DONATION_STATUSES], ui.donationStatus)}</select>
      <select class="select" id="donation-month" aria-label="Filter bulan" style="margin-left:auto">
        <option value="Semua"${ui.donationMonth === 'Semua' ? ' selected' : ''}>Semua bulan</option>
        ${monthOpts}
      </select>
    </div>
    <div id="donation-table">${donationTable()}</div>
  </div>`;
}

function bindDonasi() {
  const search = $('#donation-search');
  const program = $('#donation-program');
  const status = $('#donation-status');
  const month = $('#donation-month');
  if (search) search.addEventListener('input', e => { ui.donationSearch = e.target.value; $('#donation-table').innerHTML = donationTable(); });
  if (program) program.addEventListener('change', e => { ui.donationProgram = e.target.value; $('#donation-table').innerHTML = donationTable(); });
  if (status) status.addEventListener('change', e => { ui.donationStatus = e.target.value; $('#donation-table').innerHTML = donationTable(); });
  if (month) month.addEventListener('change', e => { ui.donationMonth = e.target.value; $('#donation-table').innerHTML = donationTable(); });
}

/* ============================================================
   Halaman: Program
   ============================================================ */
function programCard(p) {
  const stats = programProgress(p);
  return `<article class="card program-card" data-action="open-program" data-id="${p.id}" role="button" tabindex="0" aria-label="Lihat detail program ${esc(p.name)}">
    <div class="program-top">
      <div class="program-cat">${catBadge(p.category, '28px')}${esc(p.category)}</div>
      ${statusChip(p.status)}
    </div>
    <h3>${esc(p.name)}</h3>
    <p class="program-desc">${esc(p.description)}</p>
    <div>
      <div class="program-amounts">
        <span><strong>${fmtShort(stats.total)}</strong> dari ${fmtShort(p.target)}</span>
        <span class="pct">${Math.round(stats.pct)}%</span>
      </div>
      <div class="progress" style="margin-top:6px"><span style="width:${stats.pct.toFixed(1)}%"></span></div>
      <div class="program-amounts" style="margin-top:7px">
        <span>${stats.count} transaksi</span>
        <span>${stats.donors} donatur</span>
      </div>
    </div>
    <div class="program-meta">
      <span>${IC('calendar')}${fmtDateShort(p.start)}${parseISO(p.start).getFullYear() !== parseISO(p.end).getFullYear() ? ' ' + parseISO(p.start).getFullYear() : ''} – ${fmtDateShort(p.end)} ${parseISO(p.end).getFullYear()}</span>
      <span>${IC('pin')}${esc(p.location || '—')}</span>
    </div>
    <div class="program-foot">
      <span class="who">${avatar(p.pic)}${esc(p.pic || 'Belum ada PIC')}</span>
      <span class="card-link">Detail ${IC('chevron-right')}</span>
    </div>
  </article>`;
}

function programPage() {
  const counts = {
    Semua: state.programs.length,
    Berjalan: state.programs.filter(p => p.status === 'Berjalan').length,
    'Akan Datang': state.programs.filter(p => p.status === 'Akan Datang').length,
    Selesai: state.programs.filter(p => p.status === 'Selesai').length
  };
  const chips = ['Semua', ...PROGRAM_STATUSES].map(status => `
    <button class="filter-chip ${ui.programFilter === status ? 'active' : ''}" type="button" data-action="program-filter" data-status="${status}">
      ${status}<span class="count">${counts[status]}</span>
    </button>`).join('');
  const list = state.programs.filter(p => ui.programFilter === 'Semua' || p.status === ui.programFilter);

  return pageHead(
    'Program & kampanye',
    'Pantau target dana, progres pencapaian, dan penanggung jawab setiap program.',
    `<button class="btn btn-primary" data-action="add-program">${IC('plus')}Program baru</button>`
  ) + `
  <div class="filter-chips">${chips}</div>
  <div class="program-grid">
    ${list.length ? list.map(programCard).join('') : emptyState('target', 'Belum ada program', 'Tambahkan program baru untuk mulai menggalang dan memantau donasi.', `<button class="btn btn-secondary btn-sm" data-action="add-program">${IC('plus')}Program baru</button>`)}
  </div>`;
}

/* ============================================================
   Halaman: Relawan
   ============================================================ */
function volunteerTable() {
  const q = ui.volunteerSearch.trim().toLowerCase();
  let rows = state.volunteers.filter(v => {
    const hay = [v.name, v.role, v.city, v.skills, v.email].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (ui.volunteerStatus === 'Semua' || v.status === ui.volunteerStatus);
  });
  rows.sort((a, b) => String(b.joined).localeCompare(String(a.joined)));

  if (!rows.length) {
    return `<div class="empty" style="padding:38px 20px">
      <div class="empty-ic">${IC('user-check')}</div>
      <h3>Tidak ada relawan yang cocok</h3>
      <p>Ubah filter atau tambahkan relawan baru ke tim Itqan Peduli.</p>
      <button class="btn btn-secondary btn-sm" data-action="add-volunteer">${IC('plus')}Tambah relawan</button>
    </div>`;
  }

  return `<div class="table-wrap" style="max-height:none">
    <table>
      <thead><tr><th>Relawan</th><th>Peran</th><th>Kontak</th><th>Domisili</th><th>Keahlian</th><th>Bergabung</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows.map(v => `<tr>
          <td><div class="cell-main">${avatar(v.name)}<div style="min-width:0"><div class="cell-title">${esc(v.name)}</div><div class="cell-sub">${esc(v.email)}</div></div></div></td>
          <td>${esc(v.role)}</td>
          <td class="nowrap">${esc(v.phone)}</td>
          <td>${esc(v.city)}</td>
          <td><div class="cell-sub" style="margin-top:0;max-width:190px">${esc(v.skills)}</div></td>
          <td class="nowrap">${fmtDate(v.joined)}</td>
          <td>${statusChip(v.status)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" type="button" data-action="edit-volunteer" data-id="${v.id}" title="Edit relawan">${IC('edit')}</button>
            <button class="icon-btn" type="button" data-action="delete-volunteer" data-id="${v.id}" title="Hapus relawan">${IC('trash')}</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="table-foot"><span>${rows.length} relawan ditampilkan</span><span class="summary-line"><span>Total tim</span><b>${state.volunteers.length} relawan</b></span></div>
  </div>`;
}

function relawanPage() {
  const aktif = state.volunteers.filter(v => v.status === 'Aktif').length;
  const standby = state.volunteers.filter(v => v.status === 'Standby').length;
  const nonaktif = state.volunteers.filter(v => v.status === 'Nonaktif').length;

  return pageHead(
    'Relawan',
    'Kelola tim relawan, peran, keahlian, dan kesiapan mereka.',
    `<button class="btn btn-secondary" data-action="export" data-kind="volunteers">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-volunteer">${IC('plus')}Relawan baru</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Total relawan</label><b>${fmtNum(state.volunteers.length)}</b></div><span class="mini-ic tint-green">${IC('users')}</span></div>
    <div class="mini-stat"><div><label>Aktif</label><b>${fmtNum(aktif)}</b></div><span class="mini-ic tint-blue">${IC('user-check')}</span></div>
    <div class="mini-stat"><div><label>Standby</label><b>${fmtNum(standby)}</b></div><span class="mini-ic tint-gold">${IC('clock')}</span></div>
    <div class="mini-stat"><div><label>Nonaktif</label><b>${fmtNum(nonaktif)}</b></div><span class="mini-ic tint-violet">${IC('users')}</span></div>
  </div>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-search">${IC('search')}<input class="input" id="volunteer-search" type="search" placeholder="Cari nama, peran, keahlian…" value="${esc(ui.volunteerSearch)}" autocomplete="off"></div>
      <select class="select" id="volunteer-status" aria-label="Filter status" style="margin-left:auto">${options(['Semua', ...VOLUNTEER_STATUSES], ui.volunteerStatus)}</select>
    </div>
    <div id="volunteer-table">${volunteerTable()}</div>
  </div>`;
}

function bindRelawan() {
  const search = $('#volunteer-search');
  const status = $('#volunteer-status');
  if (search) search.addEventListener('input', e => { ui.volunteerSearch = e.target.value; $('#volunteer-table').innerHTML = volunteerTable(); });
  if (status) status.addEventListener('change', e => { ui.volunteerStatus = e.target.value; $('#volunteer-table').innerHTML = volunteerTable(); });
}

/* ============================================================
   Halaman: Penerima manfaat
   ============================================================ */
function beneficiaryTable() {
  const q = ui.beneficiarySearch.trim().toLowerCase();
  let rows = state.beneficiaries.filter(b => {
    const program = programById(b.programId);
    const hay = [b.name, b.category, b.city, b.phone, program ? program.name : ''].join(' ').toLowerCase();
    return (!q || hay.includes(q)) && (ui.beneficiaryCategory === 'Semua' || b.category === ui.beneficiaryCategory);
  });
  rows.sort((a, b) => String(b.joined).localeCompare(String(a.joined)));

  if (!rows.length) {
    return `<div class="empty" style="padding:38px 20px">
      <div class="empty-ic">${IC('heart')}</div>
      <h3>Tidak ada penerima manfaat yang cocok</h3>
      <p>Ubah filter atau tambahkan data penerima manfaat baru.</p>
      <button class="btn btn-secondary btn-sm" data-action="add-beneficiary">${IC('plus')}Tambah penerima</button>
    </div>`;
  }

  return `<div class="table-wrap" style="max-height:none">
    <table>
      <thead><tr><th>Nama</th><th>Kategori</th><th>Program</th><th>Domisili</th><th>Kontak wali</th><th>Bergabung</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows.map(b => {
          const program = programById(b.programId);
          return `<tr>
            <td><div class="cell-main">${avatar(b.name)}<div style="min-width:0"><div class="cell-title">${esc(b.name)}</div><div class="cell-sub">${esc(b.category)}</div></div></div></td>
            <td><span class="tag">${esc(b.category)}</span></td>
            <td>${program ? `<span class="cell-title" style="font-weight:500">${esc(program.name)}</span>` : '<span class="muted">—</span>'}</td>
            <td>${esc(b.city)}</td>
            <td class="nowrap">${esc(b.phone || '—')}</td>
            <td class="nowrap">${fmtDate(b.joined)}</td>
            <td>${statusChip(b.status)}</td>
            <td><div class="row-actions">
              <button class="icon-btn" type="button" data-action="edit-beneficiary" data-id="${b.id}" title="Edit penerima">${IC('edit')}</button>
              <button class="icon-btn" type="button" data-action="delete-beneficiary" data-id="${b.id}" title="Hapus penerima">${IC('trash')}</button>
            </div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="table-foot"><span>${rows.length} penerima manfaat ditampilkan</span><span class="summary-line"><span>Total terdaftar</span><b>${state.beneficiaries.length} orang</b></span></div>
  </div>`;
}

function penerimaPage() {
  const verified = state.beneficiaries.filter(b => b.status === 'Terverifikasi').length;
  const waiting = state.beneficiaries.filter(b => b.status === 'Menunggu').length;
  const graduated = state.beneficiaries.filter(b => b.status === 'Lulus').length;

  return pageHead(
    'Penerima manfaat',
    'Catat mustahik dan penerima program beserta status verifikasinya.',
    `<button class="btn btn-secondary" data-action="export" data-kind="beneficiaries">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-beneficiary">${IC('plus')}Penerima baru</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Total penerima</label><b>${fmtNum(state.beneficiaries.length)}</b></div><span class="mini-ic tint-green">${IC('heart')}</span></div>
    <div class="mini-stat"><div><label>Terverifikasi</label><b>${fmtNum(verified)}</b></div><span class="mini-ic tint-blue">${IC('check')}</span></div>
    <div class="mini-stat"><div><label>Menunggu</label><b>${fmtNum(waiting)}</b></div><span class="mini-ic tint-gold">${IC('clock')}</span></div>
    <div class="mini-stat"><div><label>Lulus / mandiri</label><b>${fmtNum(graduated)}</b></div><span class="mini-ic tint-violet">${IC('user-check')}</span></div>
  </div>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-search">${IC('search')}<input class="input" id="beneficiary-search" type="search" placeholder="Cari nama, kategori, program…" value="${esc(ui.beneficiarySearch)}" autocomplete="off"></div>
      <select class="select" id="beneficiary-category" aria-label="Filter kategori" style="margin-left:auto">
        <option value="Semua"${ui.beneficiaryCategory === 'Semua' ? ' selected' : ''}>Semua kategori</option>
        ${BENEFICIARY_CATEGORIES.map(c => `<option value="${esc(c)}"${ui.beneficiaryCategory === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
    </div>
    <div id="beneficiary-table">${beneficiaryTable()}</div>
  </div>`;
}

function bindPenerima() {
  const search = $('#beneficiary-search');
  const cat = $('#beneficiary-category');
  if (search) search.addEventListener('input', e => { ui.beneficiarySearch = e.target.value; $('#beneficiary-table').innerHTML = beneficiaryTable(); });
  if (cat) cat.addEventListener('change', e => { ui.beneficiaryCategory = e.target.value; $('#beneficiary-table').innerHTML = beneficiaryTable(); });
}

