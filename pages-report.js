'use strict';

/* ============================================================
   Halaman: Laporan
   ============================================================ */
function reportRange() {
  const all = verifiedDonations();
  const now = new Date();
  if (ui.reportPeriod === 'bulan') {
    const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    return { donations: all.filter(d => String(d.date).slice(0, 7) === key), label: `${MONTH_LONG[now.getMonth()]} ${now.getFullYear()}` };
  }
  if (ui.reportPeriod === 'tribulan') {
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() - 2);
    const startISO = toISO(start);
    return {
      donations: all.filter(d => d.date >= startISO),
      label: `${MONTH_SHORT[start.getMonth()]} – ${MONTH_SHORT[now.getMonth()]} ${now.getFullYear()}`
    };
  }
  if (ui.reportPeriod === 'tahun') {
    return { donations: all.filter(d => String(d.date).slice(0, 4) === String(now.getFullYear())), label: `Januari – Desember ${now.getFullYear()}` };
  }
  return { donations: all, label: 'Semua periode' };
}

function reportBody() {
  const range = reportRange();
  const ds = range.donations;
  const total = sum(ds.map(d => d.amount));
  const count = ds.length;
  const avg = count ? total / count : 0;
  const uniqueDonors = new Set(ds.map(d => d.donorId)).size;

  const byProgram = state.programs.map(p => {
    const rows = ds.filter(d => d.programId === p.id);
    return { program: p, total: sum(rows.map(d => d.amount)), count: rows.length };
  }).sort((a, b) => b.total - a.total);

  const byFund = FUNDS.map(f => ({
    name: f,
    total: sum(ds.filter(d => d.fund === f).map(d => d.amount)),
    count: ds.filter(d => d.fund === f).length
  })).filter(x => x.count > 0).sort((a, b) => b.total - a.total);

  const byMethod = METHODS.map(m => ({
    name: m,
    total: sum(ds.filter(d => d.method === m).map(d => d.amount)),
    count: ds.filter(d => d.method === m).length
  })).filter(x => x.count > 0).sort((a, b) => b.total - a.total);

  const donorMap = new Map();
  ds.forEach(d => {
    const prev = donorMap.get(d.donorId) || { total: 0, count: 0 };
    donorMap.set(d.donorId, { total: prev.total + d.amount, count: prev.count + 1 });
  });
  const topDonors = [...donorMap.entries()]
    .map(([id, v]) => ({ donor: donorById(id), ...v }))
    .filter(x => x.donor)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const maxProg = Math.max(...byProgram.map(x => x.total), 1);
  const maxFund = Math.max(...byFund.map(x => x.total), 1);
  const maxMethod = Math.max(...byMethod.map(x => x.total), 1);

  const metric = (row, max, color) => `
    <div class="metric-row">
      <span class="name">${esc(row.name)}</span>
      <span class="bar"><span style="width:${Math.max(2, (row.total / max) * 100)}%;background:${color}"></span></span>
      <span class="val">${fmtShort(row.total)}</span>
      <span class="cnt">${row.count} trx</span>
    </div>`;

  const programRows = byProgram.map(({ program, total: t, count: c }) => {
    const stats = programProgress(program);
    return `<tr>
      <td><div class="cell-main">${catBadge(program.category)}<div style="min-width:0"><div class="cell-title">${esc(program.name)}</div><div class="cell-sub">${esc(program.category)} · target ${fmtShort(program.target)}</div></div></div></td>
      <td class="text-right num">${t ? fmtIDR(t) : '—'}</td>
      <td class="text-center">${c}</td>
      <td style="min-width:130px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress" style="flex:1"><span style="width:${stats.pct.toFixed(1)}%"></span></div>
          <span class="small" style="font-weight:700;color:var(--muted)">${Math.round(stats.pct)}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  const fundRows = byFund.length ? byFund.map(f => metric({ name: f.name, total: f.total, count: f.count }, maxFund, '#c7a04b')).join('') : '<div class="muted small" style="padding:8px 0">Belum ada data pada periode ini.</div>';
  const methodRows = byMethod.length ? byMethod.map(m => metric({ name: m.name, total: m.total, count: m.count }, maxMethod, '#376f96')).join('') : '<div class="muted small" style="padding:8px 0">Belum ada data pada periode ini.</div>';

  const topRows = topDonors.length ? topDonors.map((d, i) => `<tr>
    <td style="width:34px"><span class="rank">${i + 1}</span></td>
    <td><div class="cell-main">${avatar(d.donor.name)}<div style="min-width:0"><div class="cell-title">${esc(d.donor.name)}</div><div class="cell-sub">${esc(d.donor.type)}</div></div></div></td>
    <td class="text-center">${d.count}</td>
    <td class="text-right num">${fmtIDR(d.total)}</td>
  </tr>`).join('') : `<tr><td colspan="4"><div class="empty" style="padding:26px 10px"><h3 style="font-size:13px">Belum ada donasi</h3><p style="font-size:11.5px">Tidak ada donasi terverifikasi pada periode ini.</p></div></td></tr>`;

  const exportCounts = {
    donations: state.donations.length,
    donors: state.donors.length,
    prospects: state.prospects.length,
    programs: state.programs.length,
    volunteers: state.volunteers.length,
    beneficiaries: state.beneficiaries.length,
    tasks: state.followups.length,
    commitments: state.commitments.length,
    interactions: state.interactions.length
  };

  const pipe = pipelineStats();
  const pipeMax = Math.max(...pipe.byStage.map(x => x.value), 1);
  const pipelineRows = pipe.byStage.map(x => `
    <div class="metric-row">
      <span class="name">${esc(x.stage.label)}</span>
      <span class="bar"><span style="width:${Math.max(2, (x.value / pipeMax) * 100)}%;background:${x.stage.won ? '#1a9169' : x.stage.lost ? '#c0665b' : '#b9cdc0'}"></span></span>
      <span class="val">${fmtShort(x.value)}</span>
      <span class="cnt">${x.count} prospek</span>
    </div>`).join('');

  const health = donorHealth();
  const lapsedRows = health.lapsed.slice(0, 3).map(d => {
    const s = donorStats(d.id);
    return `<div class="lapsed-item">${avatar(d.name)}
      <div class="r-main"><div class="name">${esc(d.name)}</div><div class="sub">${s.last ? `Terakhir ${fmtDate(s.last)}` : 'Belum ada donasi'} · ${fmtShort(s.total)}</div></div>
      <button class="link-btn" type="button" data-action="message-donor" data-id="${d.id}">Pesan</button>
    </div>`;
  }).join('');

  return `
  <div class="report-head">
    <div>
      <h1 style="font-size:20px;font-weight:800;letter-spacing:-.02em">Laporan donasi</h1>
      <p style="font-size:12px;color:var(--muted);margin-top:4px">Periode <b style="color:var(--ink-2)">${esc(range.label)}</b> · data terverifikasi</p>
    </div>
    <div class="report-control no-print">
      <select class="select" id="report-period" aria-label="Periode laporan">
        <option value="bulan"${ui.reportPeriod === 'bulan' ? ' selected' : ''}>Bulan ini</option>
        <option value="tribulan"${ui.reportPeriod === 'tribulan' ? ' selected' : ''}>3 bulan terakhir</option>
        <option value="tahun"${ui.reportPeriod === 'tahun' ? ' selected' : ''}>Tahun ${new Date().getFullYear()}</option>
        <option value="semua"${ui.reportPeriod === 'semua' ? ' selected' : ''}>Semua periode</option>
      </select>
      <button class="btn btn-secondary" data-action="print-report">${IC('print')}Cetak</button>
      <button class="btn btn-primary" data-action="export" data-kind="donations">${IC('download')}Ekspor</button>
    </div>
  </div>

  <div class="report-stats">
    <div class="report-stat"><label>${IC('money')}Total donasi</label><b>${fmtIDR(total)}</b><span>${esc(range.label)}</span></div>
    <div class="report-stat"><label>${IC('wallet')}Transaksi</label><b>${fmtNum(count)}</b><span>donasi terverifikasi</span></div>
    <div class="report-stat"><label>${IC('bars')}Rata-rata</label><b>${fmtIDR(avg)}</b><span>per transaksi</span></div>
    <div class="report-stat"><label>${IC('users')}Donatur unik</label><b>${fmtNum(uniqueDonors)}</b><span>berkontribusi</span></div>
  </div>

  <section class="card report-section">
    <div class="card-head">
      <div><div class="card-title">Tren 12 bulan</div><div class="card-sub">Donasi terverifikasi per bulan · bulan berjalan ditandai emas</div></div>
    </div>
    <div class="chart-body">${buildBarChart(trendSeries(12))}</div>
  </section>

  <div class="grid grid-even" style="margin-bottom:18px">
    <section class="card">
      <div class="card-head"><div><div class="card-title">Kinerja program</div><div class="card-sub">Dana masuk pada periode &amp; progres target</div></div></div>
      <div class="table-wrap" style="max-height:none">
        <table>
          <thead><tr><th>Program</th><th class="text-right">Dana periode</th><th class="text-center">Trx</th><th>Progres</th></tr></thead>
          <tbody>${programRows}</tbody>
        </table>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><div><div class="card-title">Sumber dana</div><div class="card-sub">Rincian per jenis dana dan metode</div></div></div>
      <div class="card-body">
        <div class="section-label" style="margin-top:0">Per jenis dana</div>
        <div class="metric-rows">${fundRows}</div>
        <div class="section-label">Per metode pembayaran</div>
        <div class="metric-rows">${methodRows}</div>
      </div>
    </section>
  </div>

  <section class="card" style="margin-bottom:18px">
      <div class="card-head"><div><div class="card-title">Donatur teratas</div><div class="card-sub">Berdasarkan total donasi pada periode</div></div></div>
      <div class="table-wrap" style="max-height:none">
        <table>
          <thead><tr><th>#</th><th>Donatur</th><th class="text-center">Trx</th><th class="text-right">Total</th></tr></thead>
          <tbody>${topRows}</tbody>
        </table>
      </div>
    </section>

  <section class="card report-section">
    <div class="card-head">
      <div><div class="card-title">Pipeline &amp; prakiraan donasi</div><div class="card-sub">Peluang aktif, nilai tertimbang, dan riwayat konversi</div></div>
      <a class="card-link" href="#/pipeline">Kelola pipeline ${IC('chevron-right')}</a>
    </div>
    <div class="card-body">
      <div class="health-grid">
        <div class="health-item"><label>Nilai pipeline</label><b>${fmtShort(pipe.openValue)}</b><span>${pipe.openCount} prospek aktif</span></div>
        <div class="health-item"><label>Prakiraan tertimbang</label><b>${fmtShort(pipe.weighted)}</b><span>sesuai probabilitas tahap</span></div>
        <div class="health-item"><label>Tingkat menang</label><b>${pipe.winRate}%</b><span>${pipe.wonCount} menang · ${pipe.lostCount} batal</span></div>
        <div class="health-item"><label>Rata-rata nilai menang</label><b>${fmtShort(pipe.avgDeal)}</b><span>per prospek yang berhasil</span></div>
      </div>
      <div class="section-label" style="margin-top:16px">Nilai peluang per tahap</div>
      <div class="metric-rows">${pipelineRows}</div>
    </div>
  </section>

  <div class="grid grid-even">
    <section class="card">
      <div class="card-head"><div><div class="card-title">Kesehatan basis donor</div><div class="card-sub">Retensi, loyalitas, dan konsentrasi donasi</div></div></div>
      <div class="card-body">
        <div class="health-grid">
          <div class="health-item"><label>Retensi 90 hari</label><b>${health.retention}%</b><span>${health.retained} dari ${health.prevCount} donor aktif bertahan</span></div>
          <div class="health-item"><label>Donasi rutin</label><b>${health.recurringShare}%</b><span>transaksi bertanda rutin</span></div>
          <div class="health-item"><label>Konsentrasi 10 donor</label><b>${health.top10Share}%</b><span>kontribusi terhadap total dana</span></div>
          <div class="health-item"><label>Perlu reaktivasi</label><b>${fmtNum(health.lapsed.length)}</b><span>pasif atau tanpa donasi &gt; 12 bulan</span></div>
        </div>
        <div class="section-label" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span>Donatur perlu reaktivasi</span>
          ${health.lapsed.length ? `<button class="link-btn" type="button" data-action="reactivate-donors">Siapkan pesan ${IC('chevron-right')}</button>` : ''}
        </div>
        ${lapsedRows ? `<div class="lapsed-list">${lapsedRows}</div>` : '<div class="muted small">Semua donatur masih aktif dalam 12 bulan terakhir.</div>'}
      </div>
    </section>
    <section class="card">
      <div class="card-head"><div><div class="card-title">Ekspor data</div><div class="card-sub">Unduh CSV untuk pengolahan lebih lanjut</div></div></div>
      <div class="card-body">
        <div class="export-grid">
          <button class="export-item" type="button" data-action="export" data-kind="donations">
            <span class="icon-btn">${IC('wallet')}</span>
            <span><strong>Donasi</strong><span>Riwayat transaksi</span></span>
            <span class="count">${exportCounts.donations}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="donors">
            <span class="icon-btn">${IC('users')}</span>
            <span><strong>Donatur</strong><span>Basis data relasi</span></span>
            <span class="count">${exportCounts.donors}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="prospects">
            <span class="icon-btn">${IC('pipeline')}</span>
            <span><strong>Pipeline</strong><span>Prospek &amp; prakiraan</span></span>
            <span class="count">${exportCounts.prospects}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="programs">
            <span class="icon-btn">${IC('target')}</span>
            <span><strong>Program</strong><span>Target &amp; progres</span></span>
            <span class="count">${exportCounts.programs}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="volunteers">
            <span class="icon-btn">${IC('user-check')}</span>
            <span><strong>Relawan</strong><span>Data tim</span></span>
            <span class="count">${exportCounts.volunteers}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="beneficiaries">
            <span class="icon-btn">${IC('heart')}</span>
            <span><strong>Penerima</strong><span>Data mustahik</span></span>
            <span class="count">${exportCounts.beneficiaries}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="tasks">
            <span class="icon-btn">${IC('calendar-check')}</span>
            <span><strong>Tugas</strong><span>Alur kerja tim</span></span>
            <span class="count">${exportCounts.tasks}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="commitments">
            <span class="icon-btn">${IC('briefcase')}</span>
            <span><strong>Komitmen</strong><span>Donasi berulang</span></span>
            <span class="count">${exportCounts.commitments}</span>
          </button>
          <button class="export-item" type="button" data-action="export" data-kind="interactions">
            <span class="icon-btn">${IC('message')}</span>
            <span><strong>Interaksi</strong><span>Riwayat komunikasi</span></span>
            <span class="count">${exportCounts.interactions}</span>
          </button>
        </div>
      </div>
    </section>
  </div>`;
}

function laporanPage() {
  return `<div class="print-head">
      <h1>${esc(state.settings.orgName)} — Laporan Donasi</h1>
      <p>Periode ${esc(reportRange().label)} · Dicetak ${fmtDateFull(new Date())}</p>
    </div>` + reportBody();
}

function bindLaporan() {
  const period = $('#report-period');
  if (period) period.addEventListener('change', e => { ui.reportPeriod = e.target.value; renderRoute(); });
}

