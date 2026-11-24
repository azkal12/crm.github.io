'use strict';

/* ============================================================
   Halaman: Komitmen donasi
   ============================================================ */
function komitmenPage() {
  const active = state.commitments.filter(c => c.status === 'Aktif');
  const monthly = sum(active.map(commitmentMonthly));
  const due = dueCommitments(7);
  const annual = monthly * 12;
  const filters = ['Semua', 'Aktif', 'Jatuh tempo', 'Jeda', 'Selesai'];
  const chips = filters.map(f => {
    const count = f === 'Semua' ? state.commitments.length : f === 'Jatuh tempo' ? due.length : state.commitments.filter(c => c.status === f).length;
    return `<button class="filter-chip ${ui.commitFilter === f ? 'active' : ''}" type="button" data-action="commit-filter" data-filter="${f}">${f}<span class="count">${count}</span></button>`;
  }).join('');
  const list = commitmentFiltered();
  const body = list.length ? list.map(c => {
    const donor = donorById(c.donorId);
    const program = programById(c.programId);
    const late = c.status === 'Aktif' && c.nextDue < todayISO();
    return `<tr>
      <td><div class="cell-main">${avatar(donor ? donor.name : '?')}<div style="min-width:0"><div class="cell-title">${donor ? `<button class="link-btn" type="button" data-action="open-donor" data-id="${donor.id}">${esc(donor.name)}</button>` : 'Donatur dihapus'}</div><div class="cell-sub">${esc(c.note || 'Komitmen donasi berulang')}</div></div></div></td>
      <td><div class="cell-title" style="font-weight:500">${esc(program ? program.name : 'Program dihapus')}</div><div class="cell-sub">${esc(c.fund)}</div></td>
      <td class="text-right"><div class="num">${fmtIDR(c.amount)}</div><div class="cell-sub">${fmtIDR(commitmentMonthly(c))}/bulan</div></td>
      <td><span class="tag">${esc(c.frequency)}</span></td>
      <td class="nowrap"><div style="font-weight:600">${fmtDate(c.nextDue)}</div><div class="cell-sub ${late ? 'text-danger' : ''}" style="${late ? 'color:var(--danger)' : ''}">${esc(dueLabel(c.nextDue))}</div></td>
      <td>${statusChip(c.status)}</td>
      <td><div class="row-actions">
        ${c.status === 'Aktif' ? `<button class="icon-btn" type="button" data-action="commit-to-donation" data-id="${c.id}" title="Catat donasi dari komitmen">${IC('wallet')}</button>` : ''}
        <button class="icon-btn" type="button" data-action="edit-commitment" data-id="${c.id}" title="Edit komitmen">${IC('edit')}</button>
        <button class="icon-btn" type="button" data-action="delete-commitment" data-id="${c.id}" title="Hapus komitmen">${IC('trash')}</button>
      </div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="7">${emptyState('briefcase', 'Belum ada komitmen', 'Catat kesepakatan donasi berulang agar pengingat dan proyeksi dana lebih teratur.', `<button class="btn btn-secondary btn-sm" data-action="add-commitment">${IC('plus')}Komitmen baru</button>`)}</td></tr>`;

  return pageHead(
    'Komitmen donasi',
    'Pantau janji donasi berulang, jadwal penagihan, dan proyeksi dana masuk.',
    `<button class="btn btn-secondary" data-action="export" data-kind="commitments">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-commitment">${IC('plus')}Komitmen baru</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Komitmen aktif</label><b>${fmtNum(active.length)}</b></div><span class="mini-ic tint-green">${IC('briefcase')}</span></div>
    <div class="mini-stat"><div><label>Nilai per bulan</label><b>${fmtShort(monthly)}</b></div><span class="mini-ic tint-gold">${IC('money')}</span></div>
    <div class="mini-stat"><div><label>Jatuh tempo 7 hari</label><b>${fmtNum(due.length)}</b></div><span class="mini-ic tint-blue">${IC('clock')}</span></div>
    <div class="mini-stat"><div><label>Proyeksi setahun</label><b>${fmtShort(annual)}</b></div><span class="mini-ic tint-violet">${IC('bars')}</span></div>
  </div>
  <div class="filter-chips">${chips}</div>
  <div class="card">
    <div class="table-wrap" style="max-height:none">
      <table>
        <thead><tr><th>Donatur</th><th>Program</th><th class="text-right">Nominal</th><th>Frekuensi</th><th>Jadwal berikut</th><th>Status</th><th></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="table-foot"><span>${active.length} komitmen aktif</span><span class="summary-line"><span>Proyeksi bulanan</span><b>${fmtIDR(monthly)}</b></span></div>
    </div>
  </div>`;
}

function bindKomitmen() {
  // Filter memakai event delegation global.
}

/* ============================================================
   Halaman: Komunikasi donatur
   ============================================================ */
function renderKeepScroll() {
  const y = window.scrollY;
  renderRoute();
  window.scrollTo(0, y);
}
function copyText(text) {
  const done = () => toast('Pesan disalin ke clipboard.');
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (err) { toast('Tidak dapat menyalin otomatis. Salin manual dari pratinjau.', 'danger'); }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else fallback();
}
function openWhatsApp(donorId, templateId = ui.commTemplate) {
  const donor = donorById(donorId);
  if (!donor) { toast('Donatur tidak ditemukan.', 'danger'); return; }
  const phone = normalizePhone(donor.phone);
  if (!phone) { toast('Nomor WhatsApp donatur belum tersedia.', 'danger'); return; }
  const message = buildCommMessage(templateId, donor);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  toast('WhatsApp dibuka. Catat interaksi setelah pesan terkirim.', 'info');
}
function exportAudience() {
  const rows = [['Nama', 'Tipe', 'Status', 'Kota', 'Telepon', 'Email', 'Total donasi', 'Donasi terakhir', 'Segmen']];
  commAudience().forEach(d => {
    const s = donorStats(d.id);
    rows.push([d.name, d.type, d.status, d.city, d.phone, d.email, s.total, s.last, ui.commSegment]);
  });
  downloadCSV(`itqan-audiens-${ui.commSegment}-${todayISO()}.csv`, rows);
  toast('Audiens komunikasi diekspor.');
}
function commPreviewHTML() {
  const list = commAudience();
  const first = list[0];
  const tpl = COMM_TEMPLATES.find(t => t.id === ui.commTemplate) || COMM_TEMPLATES[0];
  const message = first ? buildCommMessage(ui.commTemplate, first) : tpl.body;
  return `<div class="message-head"><span>Pratinjau${first ? ` · ${esc(first.name)}` : ''}</span><span>${esc(tpl.name)}</span></div>
    <div class="message-box">${esc(message)}</div>
    <div class="comm-meta">
      <button class="btn btn-secondary btn-sm" type="button" data-action="comm-copy">${IC('copy')}Salin pesan</button>
      ${first ? `<button class="btn btn-primary btn-sm" type="button" data-action="wa-message" data-id="${first.id}">${IC('send')}Kirim WhatsApp</button>` : ''}
      <button class="btn btn-ghost btn-sm" type="button" data-action="add-interaction" data-id="${first ? first.id : ''}">${IC('plus')}Catat interaksi</button>
    </div>`;
}
function commAudienceTableHTML() {
  const list = commAudience();
  if (!list.length) return `<tr><td colspan="5">${emptyState('users', 'Tidak ada penerima', 'Ubah segmen audiens untuk melihat donatur yang sesuai.')}</td></tr>`;
  return list.map(d => {
    const s = donorStats(d.id);
    return `<tr>
      <td><div class="cell-main">${avatar(d.name)}<div style="min-width:0"><div class="cell-title">${esc(d.name)}</div><div class="cell-sub">${esc(d.type)} · ${esc(d.city)}</div></div></div></td>
      <td><div class="cell-title" style="font-weight:500">${esc(d.phone || '—')}</div><div class="cell-sub">${esc(d.email || '—')}</div></td>
      <td class="text-right"><div class="num">${s.total ? fmtShort(s.total) : '—'}</div><div class="cell-sub">${s.count} donasi</div></td>
      <td class="nowrap">${s.last ? fmtDate(s.last) : '<span class="muted">Belum ada</span>'}</td>
      <td><div class="row-actions">
        <button class="icon-btn" type="button" data-action="wa-message" data-id="${d.id}" title="Kirim WhatsApp">${IC('send')}</button>
        <button class="icon-btn" type="button" data-action="comm-copy-donor" data-id="${d.id}" title="Salin pesan">${IC('copy')}</button>
        <button class="icon-btn" type="button" data-action="add-interaction" data-id="${d.id}" title="Catat interaksi">${IC('plus')}</button>
      </div></td>
    </tr>`;
  }).join('');
}
function komunikasiPage() {
  const list = commAudience();
  const first = list[0];
  const templateOpts = COMM_TEMPLATES.map(t => `<option value="${t.id}"${ui.commTemplate === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  const segOpts = COMM_SEGMENTS.map(s => `<option value="${s.key}"${ui.commSegment === s.key ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
  const programOpts = state.programs.map(p => `<option value="${p.id}"${ui.commProgram === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const recipients = list.slice(0, 8).map(d => `
    <div class="recipient">${avatar(d.name)}
      <div class="r-main"><div class="name">${esc(d.name)}</div><div class="sub">${esc(d.phone || 'Tanpa telepon')} · ${esc(d.city)}</div></div>
      <button class="wa-link" type="button" data-action="wa-message" data-id="${d.id}">${IC('send')}WA</button>
      <button class="icon-btn" type="button" data-action="add-interaction" data-id="${d.id}" title="Catat interaksi">${IC('plus')}</button>
    </div>`).join('') || '<div class="muted small" style="padding:10px 0">Tidak ada donatur pada segmen ini.</div>';
  const history = state.interactions
    .filter(x => ui.interactionChannel === 'Semua' || x.channel === ui.interactionChannel)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(x => {
      const donor = donorById(x.donorId);
      return `<tr>
        <td class="nowrap"><div style="font-weight:600">${fmtDate(x.date)}</div><div class="cell-sub">${esc(dueLabel(x.date))}</div></td>
        <td>${donor ? `<div class="cell-main">${avatar(donor.name)}<div style="min-width:0"><div class="cell-title">${esc(donor.name)}</div><div class="cell-sub">${esc(donor.type)}</div></div></div>` : '<span class="muted">—</span>'}</td>
        <td><span class="tag">${esc(x.channel)}</span></td>
        <td style="max-width:280px"><div class="cell-title" style="font-weight:500">${esc(x.summary)}</div>${x.nextStep ? `<div class="cell-sub">Langkah: ${esc(x.nextStep)}</div>` : ''}</td>
        <td class="nowrap">${esc(x.assignee || '—')}</td>
        <td><div class="row-actions">
          <button class="icon-btn" type="button" data-action="edit-interaction" data-id="${x.id}" title="Edit interaksi">${IC('edit')}</button>
          <button class="icon-btn" type="button" data-action="delete-interaction" data-id="${x.id}" title="Hapus interaksi">${IC('trash')}</button>
        </div></td>
      </tr>`;
    }).join('');

  return pageHead(
    'Komunikasi',
    'Susun pesan personal, hubungi donatur, dan simpan riwayat interaksi.',
    `<button class="btn btn-secondary" data-action="export-audience">${IC('download')}Ekspor audiens</button>
     <button class="btn btn-primary" data-action="add-interaction">${IC('plus')}Catat interaksi</button>`
  ) + `
  <div class="grid grid-main" style="margin-bottom:18px">
    <section class="card">
      <div class="card-head"><div><div class="card-title">Template pesan</div><div class="card-sub">Variabel terisi otomatis dari data donatur</div></div></div>
      <div class="card-body">
        <div class="comm-controls">
          <div class="field"><label for="comm-template">Template</label><select class="select" id="comm-template">${templateOpts}</select></div>
          <div class="field"><label for="comm-segment">Audiens</label><select class="select" id="comm-segment">${segOpts}</select></div>
          <div class="field"><label for="comm-program">Program personalisasi</label><select class="select" id="comm-program">${programOpts}</select></div>
        </div>
        <div id="comm-preview">${commPreviewHTML()}</div>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><div><div class="card-title">Audiens</div><div class="card-sub">${list.length} donatur pada segmen ini</div></div><button class="icon-btn" type="button" data-action="add-interaction" title="Catat interaksi">${IC('plus')}</button></div>
      <div class="card-body" style="padding-top:8px">
        <div class="recipient-list">${recipients}</div>
        ${list.length > 8 ? `<div class="setting-note">Menampilkan 8 dari ${list.length} penerima. Lihat tabel lengkap di bawah.</div>` : ''}
      </div>
    </section>
  </div>

  <section class="card" style="margin-bottom:18px">
    <div class="card-head">
      <div><div class="card-title">Daftar audiens</div><div class="card-sub">${esc((COMM_SEGMENTS.find(s => s.key === ui.commSegment) || {}).label || 'Semua donatur')}</div></div>
      <button class="btn btn-secondary btn-sm" type="button" data-action="export-audience">${IC('download')}CSV</button>
    </div>
    <div class="table-wrap" style="max-height:none">
      <table>
        <thead><tr><th>Donatur</th><th>Kontak</th><th class="text-right">Total donasi</th><th>Terakhir</th><th></th></tr></thead>
        <tbody id="comm-audience-body">${commAudienceTableHTML()}</tbody>
      </table>
    </div>
  </section>

  <section class="card">
    <div class="card-head">
      <div><div class="card-title">Riwayat interaksi</div><div class="card-sub">Catatan komunikasi dan langkah berikutnya</div></div>
      <select class="select" id="interaction-channel" aria-label="Filter kanal" style="max-width:170px">${options(['Semua', ...INTERACTION_CHANNELS], ui.interactionChannel)}</select>
    </div>
    <div class="table-wrap" style="max-height:none">
      <table>
        <thead><tr><th>Tanggal</th><th>Donatur</th><th>Kanal</th><th>Ringkasan</th><th>PIC</th><th></th></tr></thead>
        <tbody>${history || `<tr><td colspan="6">${emptyState('message', 'Belum ada interaksi', 'Catat percakapan, kunjungan, atau rapat agar riwayat hubungan donatur tetap utuh.')}</td></tr>`}</tbody>
      </table>
    </div>
  </section>`;
}

function bindKomunikasi() {
  const tpl = $('#comm-template');
  const seg = $('#comm-segment');
  const program = $('#comm-program');
  const channel = $('#interaction-channel');
  if (tpl) tpl.addEventListener('change', e => { ui.commTemplate = e.target.value; renderKeepScroll(); });
  if (seg) seg.addEventListener('change', e => { ui.commSegment = e.target.value; renderKeepScroll(); });
  if (program) program.addEventListener('change', e => { ui.commProgram = e.target.value; renderKeepScroll(); });
  if (channel) channel.addEventListener('change', e => { ui.interactionChannel = e.target.value; renderKeepScroll(); });
}


/* ============================================================
   Halaman: Pengaturan organisasi & data
   ============================================================ */
function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
}
function pengaturanPage() {
  const s = state.settings;
  const used = new Blob([JSON.stringify(state)]).size;
  const pct = clamp((used / (5 * 1024 * 1024)) * 100, 1, 100);
  return pageHead(
    'Pengaturan',
    'Kelola identitas organisasi, format kwitansi, dan cadangan data lokal.',
    `<button class="btn btn-secondary" data-action="download-backup">${IC('download')}Unduh cadangan</button>`
  ) + `
  <form id="settings-form">
    <div class="grid grid-even" style="margin-bottom:18px">
      <section class="card">
        <div class="card-head"><div><div class="card-title">Profil organisasi</div><div class="card-sub">Tampil pada aplikasi, laporan, dan kwitansi</div></div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field full"><label for="set-org">Nama organisasi</label><input class="input" id="set-org" name="orgName" value="${esc(s.orgName)}" required></div>
            <div class="field"><label for="set-tagline">Subjudul aplikasi</label><input class="input" id="set-tagline" name="tagline" value="${esc(s.tagline)}"></div>
            <div class="field"><label for="set-npwp">NPWP / nomor izin</label><input class="input" id="set-npwp" name="npwp" value="${esc(s.npwp)}"></div>
            <div class="field full"><label for="set-address">Alamat</label><input class="input" id="set-address" name="address" value="${esc(s.address)}"></div>
            <div class="field"><label for="set-city">Kota &amp; kode pos</label><input class="input" id="set-city" name="city" value="${esc(s.city)}"></div>
            <div class="field"><label for="set-phone">Telepon</label><input class="input" id="set-phone" name="phone" value="${esc(s.phone)}"></div>
            <div class="field"><label for="set-email">Email</label><input class="input" id="set-email" name="email" type="email" value="${esc(s.email)}"></div>
            <div class="field"><label for="set-website">Situs web</label><input class="input" id="set-website" name="website" value="${esc(s.website)}"></div>
          </div>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><div><div class="card-title">Kwitansi donasi</div><div class="card-sub">Format nomor dan penandatangan</div></div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label for="set-prefix">Prefiks nomor</label><input class="input" id="set-prefix" name="receiptPrefix" value="${esc(s.receiptPrefix)}" maxlength="6" placeholder="KW"></div>
            <div class="field"><label for="set-signer">Nama penandatangan</label><input class="input" id="set-signer" name="signerName" value="${esc(s.signerName)}"></div>
            <div class="field full"><label for="set-role">Jabatan penandatangan</label><input class="input" id="set-role" name="signerTitle" value="${esc(s.signerTitle)}"></div>
            <div class="field full"><label for="set-note">Catatan kaki kwitansi</label><textarea class="input" id="set-note" name="receiptNote" rows="4">${esc(s.receiptNote)}</textarea></div>
          </div>
          <div class="setting-note">Nomor kwitansi dibuat otomatis dengan pola <b>${esc(s.receiptPrefix)}/tahun/bulan/urutan</b> berdasarkan tanggal transaksi.</div>
        </div>
      </section>
    </div>
    <div class="settings-save"><button class="btn btn-primary" type="submit">${IC('check')}Simpan pengaturan</button></div>
  </form>

  <div class="grid grid-even">
    <section class="card">
      <div class="card-head"><div><div class="card-title">Cadangan &amp; pemulihan</div><div class="card-sub">Seluruh data tersimpan di perangkat ini</div></div></div>
      <div class="card-body">
        <div class="data-actions">
          <button class="btn btn-secondary" type="button" data-action="download-backup">${IC('download')}Unduh cadangan JSON</button>
          <button class="btn btn-secondary" type="button" data-action="import-backup">${IC('upload')}Impor cadangan</button>
        </div>
        <input type="file" id="backup-file" accept=".json,application/json" hidden>
        <div class="setting-note">Cadangan terakhir: <b id="last-backup">${esc(fmtStamp(s.lastBackup))}</b></div>
        <div class="storage-meter"><span style="width:${pct}%"></span></div>
        <div class="setting-note">${formatBytes(used)} terpakai dari perkiraan kuota 5 MB penyimpanan browser.</div>
        <div class="setting-note">Impor akan mengganti seluruh data saat ini. Unduh cadangan sebelum memulihkan versi lama.</div>
      </div>
    </section>
    <section class="card danger-zone">
      <div class="card-head"><div><div class="card-title">Reset data demo</div><div class="card-sub">Kembalikan aplikasi ke data contoh awal</div></div></div>
      <div class="card-body">
        <div class="setting-note" style="margin-top:0">Semua donatur, donasi, program, tugas, komitmen, dan interaksi yang Anda buat akan dihapus lalu diganti data contoh.</div>
        <div class="data-actions" style="margin-top:12px">
          <button class="btn btn-danger-quiet" type="button" data-action="reset-data">${IC('refresh')}Reset data demo</button>
        </div>
      </div>
    </section>
  </div>`;
}

function bindPengaturan() {
  const form = $('#settings-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const val = name => String(fd.get(name) || '').trim();
      state.settings = {
        ...state.settings,
        orgName: val('orgName') || 'Itqan Peduli',
        tagline: val('tagline') || 'CRM Organisasi',
        npwp: val('npwp'), address: val('address'), city: val('city'),
        phone: val('phone'), email: val('email'), website: val('website'),
        receiptPrefix: (val('receiptPrefix') || 'KW').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'KW',
        signerName: val('signerName') || 'Admin Operasional',
        signerTitle: val('signerTitle'), receiptNote: val('receiptNote')
      };
      saveState();
      toast('Pengaturan organisasi disimpan.');
      renderRoute();
    });
  }
  const file = $('#backup-file');
  if (file) {
    file.addEventListener('change', () => {
      const selected = file.files[0];
      file.value = '';
      if (!selected) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const data = normalizeState(parsed, false);
          if (!data) throw new Error('Struktur cadangan tidak dikenali');
          confirmAction({
            title: 'Pulihkan cadangan?',
            message: `Cadangan berisi <b>${data.donors.length}</b> donatur, <b>${data.donations.length}</b> donasi, dan <b>${data.programs.length}</b> program. Data saat ini akan diganti.`,
            confirmLabel: 'Pulihkan',
            tone: 'primary',
            onConfirm() {
              state = data;
              saveState();
              closeDrawer();
              renderRoute();
              toast('Cadangan berhasil dipulihkan.');
            }
          });
        } catch (err) {
          toast('File cadangan tidak valid. Pastikan berkas JSON berasal dari aplikasi ini.', 'danger');
        }
      };
      reader.readAsText(selected);
    });
  }
}

function downloadBackup() {
  state.settings.lastBackup = new Date().toISOString();
  saveState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `itqan-crm-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const el = $('#last-backup');
  if (el) el.textContent = fmtStamp(state.settings.lastBackup);
  toast('Cadangan data berhasil diunduh.');
}

/* ============================================================
   Kwitansi donasi
   ============================================================ */
function receiptNumber(donation) {
  const pool = [...state.donations].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  const index = Math.max(1, pool.findIndex(d => d.id === donation.id) + 1);
  const dt = parseISO(donation.date);
  return `${state.settings.receiptPrefix || 'KW'}/${dt.getFullYear()}/${pad(dt.getMonth() + 1)}/${String(index).padStart(4, '0')}`;
}
function receiptHTML(donation) {
  const s = state.settings;
  const donor = donorById(donation.donorId);
  const program = programById(donation.programId);
  const city = (s.city || '').split(',')[0].trim();
  const final = donation.status === 'Terverifikasi';
  return `<div class="receipt" id="receipt-doc">
    <div class="receipt-head">
      <div class="receipt-org">
        <div class="receipt-logo">${esc(initials(s.orgName))}</div>
        <div>
          <h2>${esc(s.orgName)}</h2>
          <p>${esc(s.tagline || '')}</p>
          <p>${esc(s.address || '')}${s.city ? `, ${esc(s.city)}` : ''}</p>
          <p>${esc(s.phone || '')}${s.email ? ` · ${esc(s.email)}` : ''}${s.website ? ` · ${esc(s.website)}` : ''}</p>
          ${s.npwp ? `<p>NPWP ${esc(s.npwp)}</p>` : ''}
        </div>
      </div>
      <div class="receipt-title">
        <h3>Kwitansi Donasi</h3>
        <div class="no">No. ${esc(receiptNumber(donation))}</div>
        <div class="no">${fmtDate(donation.date)}</div>
      </div>
    </div>
    <div class="receipt-row">
      <div style="flex:1">
        <span class="receipt-label">Telah diterima dari</span>
        <div class="val">${esc(donor ? donor.name : 'Donatur')}</div>
        <div class="cell-sub">${esc(donor ? `${donor.type} · ${donor.city}` : '—')}</div>
      </div>
      <div style="text-align:right;flex:none">
        <span class="receipt-label" style="min-width:0">Status</span>
        ${statusChip(donation.status)}
      </div>
    </div>
    <div class="receipt-amount">
      <span class="receipt-label">Nominal donasi</span>
      <b>${fmtIDR(donation.amount)}</b>
      <div class="receipt-terbilang">${esc(terbilang(donation.amount))}</div>
    </div>
    <div class="receipt-grid">
      <div class="item"><label>Program</label><span>${esc(program ? program.name : '—')}</span></div>
      <div class="item"><label>Jenis dana</label><span>${esc(donation.fund || '—')}</span></div>
      <div class="item"><label>Metode pembayaran</label><span>${esc(donation.method || '—')}</span></div>
      <div class="item"><label>Tanggal transaksi</label><span>${fmtDate(donation.date)}</span></div>
    </div>
    <div class="receipt-row" style="margin-top:0">
      <div style="flex:1">
        <span class="receipt-label">Keterangan</span>
        <div style="font-size:11px">Donasi untuk ${esc(program ? program.name : 'program sosial')}${donation.note ? ` — ${esc(donation.note)}` : ''}.</div>
      </div>
    </div>
    ${final ? '' : `<div class="receipt-note" style="color:#a03b31;border-top-color:#f0d6d1">Dokumen ini belum final. Kwitansi resmi diterbitkan setelah donasi berstatus terverifikasi.</div>`}
    <div class="receipt-sign">
      <div class="receipt-stamp">${esc(initials(s.orgName))}<br>SAH</div>
      <div class="receipt-sign-box">
        <div class="city">${esc(city || 'Indonesia')}, ${fmtDate(todayISO())}</div>
        <div class="name">${esc(s.signerName)}</div>
        <div class="role">${esc(s.signerTitle || '')}</div>
      </div>
    </div>
    <div class="receipt-note">${esc(s.receiptNote || '')}</div>
  </div>`;
}
function openReceipt(id) {
  const donation = state.donations.find(d => d.id === id);
  if (!donation) return;
  openModal({
    title: 'Kwitansi donasi',
    subtitle: `${receiptNumber(donation)} · ${fmtDate(donation.date)}`,
    size: 'lg',
    body: receiptHTML(donation),
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Tutup</button>
      <button class="btn btn-primary" type="button" data-action="print-receipt" data-id="${donation.id}">${IC('print')}Cetak / Simpan PDF</button>`
  });
}
function printReceipt(id) {
  const donation = state.donations.find(d => d.id === id);
  if (!donation) return;
  printHTML(receiptHTML(donation), `Kwitansi ${receiptNumber(donation)}`);
}
const RECEIPT_PRINT_CSS = `
  @page{size:A4;margin:14mm}
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1b2b24;margin:0;padding:0;font-size:12px;line-height:1.55}
  .receipt{border:1px solid #dde6dd;border-radius:10px;padding:26px 28px}
  .receipt-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:2px solid #116b4f;padding-bottom:14px;margin-bottom:18px}
  .receipt-org{display:flex;gap:11px;align-items:flex-start}
  .receipt-logo{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#116b4f;color:#fff;font-weight:700;font-size:14px}
  .receipt-org h2{font-size:16px;margin:0}
  .receipt-org p{font-size:10px;color:#708177;margin:2px 0 0}
  .receipt-title{text-align:right}
  .receipt-title h3{font-size:14px;letter-spacing:.12em;text-transform:uppercase;color:#116b4f;margin:0}
  .receipt-title .no{font-size:10.5px;color:#708177;margin-top:3px}
  .receipt-label{font-size:9px;letter-spacing:.11em;text-transform:uppercase;color:#708177;font-weight:700;display:block;min-width:96px}
  .receipt-row{display:flex;justify-content:space-between;gap:14px;margin-top:12px}
  .receipt-row .val{font-weight:700;font-size:12px;margin-top:2px}
  .receipt-amount{background:#f1f8f4;border:1px solid #d8e9de;border-radius:9px;padding:12px 14px;margin:16px 0 6px}
  .receipt-amount b{font-size:20px;display:block;color:#116b4f}
  .receipt-terbilang{font-size:10.5px;color:#557064;font-style:italic;margin-top:3px}
  .receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;margin:14px 0 18px}
  .receipt-grid .item label{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:#708177;font-weight:700;display:block;margin-bottom:2px}
  .receipt-grid .item span{font-size:11.5px;font-weight:600}
  .receipt-sign{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-top:24px}
  .receipt-stamp{width:76px;height:76px;border:2px solid rgba(17,107,79,.35);border-radius:50%;display:grid;place-items:center;text-align:center;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:rgba(17,107,79,.55);font-weight:700;transform:rotate(-8deg)}
  .receipt-sign-box{text-align:center;min-width:190px}
  .receipt-sign-box .city{font-size:10.5px;color:#708177}
  .receipt-sign-box .name{font-size:12px;font-weight:700;margin-top:44px;border-top:1px solid #c9d6cc;padding-top:5px}
  .receipt-sign-box .role{font-size:9.5px;color:#708177}
  .receipt-note{font-size:9.5px;color:#708177;border-top:1px dashed #dde6dd;margin-top:18px;padding-top:10px;line-height:1.55}
  .chip{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid #d8e9de;background:#f1f8f4;color:#116b4f}
  .cell-sub{font-size:10px;color:#708177;margin-top:2px}
  .muted{color:#708177}
`;
function printHTML(html, title) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${RECEIPT_PRINT_CSS}</style></head><body>${html}</body></html>`);
  doc.close();
  setTimeout(() => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (err) {
      toast('Fitur cetak tidak tersedia di browser ini.', 'danger');
    }
    setTimeout(() => frame.remove(), 3000);
  }, 350);
}

