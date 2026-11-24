'use strict';

/* ============================================================
   Halaman: Pipeline prospek
   ============================================================ */
function stageChip(key) {
  const m = stageMeta(key);
  const tone = m.won ? 'ok' : m.lost ? 'danger' : m.tone === 'gold' ? 'gold' : m.tone === 'info' ? 'info' : 'muted';
  return `<span class="chip chip-${tone}">${esc(m.label)}</span>`;
}
function ratingDot(rating) {
  const key = String(rating || 'Warm').toLowerCase();
  return `<span class="rating-dot rating-${key}">${esc(rating || 'Warm')}</span>`;
}
function stageOptions(selected) {
  return PROSPECT_STAGES.map(s => `<option value="${s.key}"${s.key === selected ? ' selected' : ''}>${esc(s.label)} (${s.prob}%)</option>`).join('');
}
function assessProspect(p) {
  const meta = stageMeta(p.stage);
  return { meta, weighted: p.amount * meta.prob / 100, age: daysSinceISO(p.stageSince), stale: isOpenProspect(p) && daysSinceISO(p.stageSince) >= 7 };
}
function changeProspectStage(p, stage, note = '') {
  if (!p || p.stage === stage) return false;
  const meta = stageMeta(stage);
  p.stage = stage;
  p.stageSince = todayISO();
  p.stageHistory.push({ stage, at: p.stageSince, note: note || `Tahap diperbarui ke ${meta.label}` });
  if (!meta.lost) p.lostReason = '';
  if (meta.lost && !p.lostReason) p.lostReason = 'Ditandai batal';
  return true;
}

function prospectCard(p) {
  const program = programById(p.programId);
  const a = assessProspect(p);
  return `<div class="pipe-card ${a.meta.won ? 'done-card' : ''}" draggable="true" data-prospect-id="${p.id}">
    <div class="pipe-card-top">
      <div style="min-width:0">
        <button class="pipe-card-name" type="button" data-action="prospect-detail" data-id="${p.id}">${esc(p.name)}</button>
        <div class="pipe-card-sub">${esc(p.contactName || p.type)}${p.city ? ' · ' + esc(p.city) : ''}</div>
      </div>
      ${ratingDot(p.rating)}
    </div>
    <div class="pipe-card-amount">${fmtIDR(p.amount)}</div>
    <div class="pipe-card-sub">${esc(program ? program.name : 'Program belum dipilih')}</div>
    <div class="pipe-card-meta">
      <span>${IC('calendar')}${fmtDateShort(p.closeDate)}</span>
      <span class="${a.stale ? 'pipe-stale' : ''}">${a.stale ? `${a.age} hari di tahap` : esc(p.owner || 'Tanpa PIC')}</span>
    </div>
    <div class="pipe-card-tags">
      <span class="tag">${esc(p.type)}</span>
      ${p.donorId ? `<span class="chip chip-ok">Donatur</span>` : ''}
      ${a.stale ? `<span class="tag pipe-stale">Perlu perhatian</span>` : ''}
    </div>
  </div>`;
}
function prospectBoard() {
  const rows = prospectFiltered();
  return `<div class="pipe-board" id="pipe-board">${PROSPECT_STAGES.map(s => {
    const list = rows.filter(p => p.stage === s.key);
    const value = sum(list.map(p => p.amount));
    return `<div class="pipe-col" data-stage="${s.key}">
      <div class="pipe-col-head">
        <div class="pipe-col-title"><span class="pipe-col-dot ${s.tone}"></span><span>${esc(s.label)}</span></div>
        <span class="pipe-col-count">${list.length}</span>
      </div>
      <div class="pipe-col-sum"><span>Peluang</span><b>${fmtShort(value)}</b><span>${s.prob}%</span></div>
      <div class="pipe-cards">
        ${list.length ? list.map(prospectCard).join('') : `<div class="pipe-empty">Belum ada prospek di tahap ini.</div>`}
      </div>
      <button class="pipe-add" type="button" data-action="add-prospect" data-stage="${s.key}">${IC('plus')}Tambah prospek</button>
    </div>`;
  }).join('')}</div>`;
}
function prospectTable() {
  const order = Object.fromEntries(PROSPECT_STAGES.map((s, i) => [s.key, i]));
  const rows = [...prospectFiltered()].sort((a, b) => (order[a.stage] - order[b.stage]) || String(a.closeDate).localeCompare(String(b.closeDate)));
  if (!rows.length) {
    return emptyState('pipeline', 'Tidak ada prospek pada filter ini', 'Ubah pencarian atau tambahkan prospek baru untuk mulai membangun pipeline.', `<button class="btn btn-secondary btn-sm" data-action="add-prospect">${IC('plus')}Prospek baru</button>`);
  }
  return `<div class="table-wrap"><table>
    <thead><tr><th>Prospek</th><th>Tahap</th><th>Rating</th><th>Program</th><th class="text-right">Nilai</th><th>Target tutup</th><th></th></tr></thead>
    <tbody>${rows.map(p => {
      const program = programById(p.programId);
      const a = assessProspect(p);
      return `<tr>
        <td><div class="cell-main">${avatar(p.name)}<div style="min-width:0"><div class="cell-title"><button class="link-btn" type="button" data-action="prospect-detail" data-id="${p.id}">${esc(p.name)}</button></div><div class="cell-sub">${esc(p.contactName || p.type)}${p.city ? ' · ' + esc(p.city) : ''}</div></div></div></td>
        <td>${stageChip(p.stage)}</td>
        <td>${ratingDot(p.rating)}</td>
        <td><div class="cell-title" style="font-weight:500">${esc(program ? program.name : '—')}</div><div class="cell-sub">${esc(p.source)}</div></td>
        <td class="text-right"><div class="num">${fmtIDR(p.amount)}</div><div class="cell-sub">Tertimbang ${fmtShort(a.weighted)}</div></td>
        <td class="nowrap"><div style="font-weight:600">${fmtDate(p.closeDate)}</div><div class="cell-sub">${esc(p.owner || 'Tanpa PIC')}</div></td>
        <td><div class="row-actions">
          <button class="icon-btn" type="button" data-action="prospect-detail" data-id="${p.id}" title="Lihat detail">${IC('external')}</button>
          <button class="icon-btn" type="button" data-action="edit-prospect" data-id="${p.id}" title="Edit prospek">${IC('edit')}</button>
          <button class="icon-btn" type="button" data-action="delete-prospect" data-id="${p.id}" title="Hapus prospek">${IC('trash')}</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>
  <div class="table-foot"><div class="summary-line"><span>${rows.length} prospek</span><span>Nilai <b>${fmtIDR(sum(rows.map(p => p.amount)))}</b></span><span>Prakiraan <b>${fmtIDR(sum(rows.map(p => assessProspect(p).weighted)))}</b></span></div><span>Tarik kartu di tampilan papan untuk memindahkan tahap.</span></div>`;
}
function pipelineArea() {
  return ui.pipelineView === 'papan' ? prospectBoard() : prospectTable();
}
function pipelinePage() {
  const s = pipelineStats();
  const counts = {
    Semua: state.prospects.length,
    Hot: s.hotCount,
    '7 hari': s.staleCount,
    Menang: s.wonCount,
    Batal: s.lostCount
  };
  const chips = PROSPECT_FILTERS.map(f => `<button class="filter-chip ${ui.pipelineFilter === f ? 'active' : ''}" type="button" data-action="prospect-filter" data-filter="${f}">${f}<span class="count">${counts[f]}</span></button>`).join('');
  const forecastRatio = s.openValue > 0 ? Math.round(s.weighted / s.openValue * 100) : 0;
  return pageHead(
    'Pipeline prospek',
    'Kelola calon donatur dari kontak awal hingga komitmen, dengan prakiraan nilai tertimbang.',
    `<button class="btn btn-secondary" data-action="export" data-kind="prospects">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-prospect">${IC('plus')}Prospek baru</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Prospek terbuka</label><b>${fmtNum(s.openCount)}</b></div><span class="mini-ic tint-green">${IC('pipeline')}</span></div>
    <div class="mini-stat"><div><label>Nilai pipeline</label><b>${fmtShort(s.openValue)}</b></div><span class="mini-ic tint-gold">${IC('wallet')}</span></div>
    <div class="mini-stat"><div><label>Prakiraan tertimbang</label><b>${fmtShort(s.weighted)}</b></div><span class="mini-ic tint-blue">${IC('target')}</span></div>
    <div class="mini-stat"><div><label>Tingkat menang</label><b>${s.winRate}%</b></div><span class="mini-ic tint-violet">${IC('user-check')}</span></div>
  </div>
  <div class="card">
    <div class="toolbar">
      <div class="toolbar-search">${IC('search')}<input class="input" id="pipe-search" type="search" placeholder="Cari prospek, kontak, atau kota…" value="${esc(ui.pipelineSearch)}" autocomplete="off"></div>
      <div class="filter-chips" style="margin:0">${chips}</div>
      <div class="segmented" style="margin-left:auto">
        <button class="${ui.pipelineView === 'papan' ? 'active' : ''}" type="button" data-action="prospect-view" data-view="papan">Papan</button>
        <button class="${ui.pipelineView === 'daftar' ? 'active' : ''}" type="button" data-action="prospect-view" data-view="daftar">Daftar</button>
      </div>
    </div>
    <div class="card-body" id="pipe-area" style="padding-top:14px">${pipelineArea()}</div>
    <div class="table-foot">
      <div class="pipe-legend"><span>${ratingDot('Hot')} prioritas tinggi</span><span>${ratingDot('Warm')} potensial</span><span>${ratingDot('Cold')} perlu edukasi</span></div>
      <div class="summary-line"><span>Tertimbang <b>${fmtIDR(s.weighted)}</b> (${forecastRatio}%)</span><span>${s.wonCount} menang · ${s.lostCount} batal</span></div>
    </div>
  </div>
  <div class="pipe-summary">
    <div class="dstat"><label>Rata-rata nilai menang</label><b>${fmtShort(s.avgDeal)}</b></div>
    <div class="dstat"><label>Prospek Hot</label><b>${fmtNum(s.hotCount)}</b></div>
    <div class="dstat"><label>Perlu perhatian</label><b>${fmtNum(s.staleCount)}</b></div>
    <div class="dstat"><label>Tutup ≤ 14 hari</label><b>${fmtNum(s.dueSoonCount)}</b></div>
  </div>`;
}
function bindPipelineBoard() {
  const board = $('#pipe-board');
  if (!board) return;
  $$('.pipe-card', board).forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.prospectId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  $$('.pipe-col', board).forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      moveProspectToStage(e.dataTransfer.getData('text/plain'), col.dataset.stage);
    });
  });
}
function bindPipeline() {
  const search = $('#pipe-search');
  if (search) search.addEventListener('input', e => {
    ui.pipelineSearch = e.target.value;
    const area = $('#pipe-area');
    if (area) area.innerHTML = pipelineArea();
    bindPipelineBoard();
  });
  bindPipelineBoard();
}
function moveProspectToStage(id, stage) {
  const p = prospectById(id);
  if (!p || p.stage === stage) return;
  const meta = stageMeta(stage);
  changeProspectStage(p, stage);
  saveState();
  renderKeepScroll();
  if (meta.won) toast('Prospek dipindahkan ke Menang. Konversikan menjadi donatur melalui detail prospek.', 'info');
  else if (meta.lost) toast('Prospek ditandai batal.', 'info');
  else toast(`Tahap diperbarui ke ${meta.label}.`);
}

function prospectStageTrack(p) {
  const idx = PROSPECT_STAGES.findIndex(s => s.key === p.stage);
  const main = PROSPECT_STAGES.slice(0, 5).map((s, i) => {
    const cls = p.stage === s.key ? 'current' : (idx > i ? 'done' : '');
    return `<span class="stage-step ${cls}">${esc(s.label)}</span>`;
  }).join('<span class="stage-sep">›</span>');
  if (stageMeta(p.stage).won) return `${main}<span class="stage-sep">›</span><span class="stage-step current">Menang</span>`;
  if (stageMeta(p.stage).lost) return `${main}<span class="stage-sep">›</span><span class="stage-step lost">Batal</span>`;
  return main;
}

function openProspectDetail(id) {
  const p = prospectById(id);
  if (!p) { toast('Prospek tidak ditemukan.', 'danger'); return; }
  const program = programById(p.programId);
  const a = assessProspect(p);
  const donor = p.donorId ? donorById(p.donorId) : null;
  const history = [...p.stageHistory].reverse().map((h, i) => `<div class="tl-item ${i === 0 ? 'current' : ''}">
    <span class="tl-dot"></span>
    <div class="tl-main"><div class="tl-title">${esc(stageMeta(h.stage).label)}</div><div class="tl-sub">${esc(h.note || 'Tahap diperbarui')}</div></div>
    <div class="tl-date">${fmtDate(h.at)}</div>
  </div>`).join('');
  const body = `
    <div class="modal-hero">
      <div class="cat-dot prospect-hero-ic">${esc(initials(p.name))}</div>
      <div style="min-width:0">
        <h2>${esc(p.name)}</h2>
        <p>${esc(p.contactName || 'Kontak belum diisi')} · ${esc(p.type)} · ${esc(p.city || 'Kota belum diisi')}</p>
        <div class="drawer-chips">${stageChip(p.stage)}${ratingDot(p.rating)}${typeTag(p.source)}${donor ? `<span class="chip chip-ok">Donatur: ${esc(donor.name)}</span>` : ''}</div>
      </div>
    </div>
    ${prospectStageTrack(p)}
    <div class="detail-stats">
      <div class="dstat"><label>Nilai peluang</label><b>${fmtIDR(p.amount)}</b></div>
      <div class="dstat"><label>Probabilitas</label><b>${a.meta.prob}%</b></div>
      <div class="dstat"><label>Nilai tertimbang</label><b>${fmtIDR(a.weighted)}</b></div>
      <div class="dstat"><label>Usia tahap</label><b class="${a.stale ? 'pipe-stale' : ''}">${a.age} hari</b></div>
    </div>
    ${a.stale ? `<div class="note-box">Sudah ${a.age} hari di tahap ${esc(a.meta.label)}. Tentukan langkah lanjutan agar peluang ini tidak terhenti.</div>` : ''}
    <div class="meta-grid">
      <div class="detail-row">${IC('users')}<span class="k">PIC</span><span class="v">${esc(p.owner || '—')}</span></div>
      <div class="detail-row">${IC('target')}<span class="k">Program</span><span class="v">${esc(program ? program.name : '—')}</span></div>
      <div class="detail-row">${IC('send')}<span class="k">Sumber</span><span class="v">${esc(p.source)}</span></div>
      <div class="detail-row">${IC('calendar')}<span class="k">Target tutup</span><span class="v">${fmtDate(p.closeDate)}</span></div>
      <div class="detail-row">${IC('phone')}<span class="k">Telepon</span><span class="v">${esc(p.phone || '—')}</span></div>
      <div class="detail-row">${IC('mail')}<span class="k">Email</span><span class="v">${esc(p.email || '—')}</span></div>
      <div class="detail-row">${IC('pin')}<span class="k">Kota</span><span class="v">${esc(p.city || '—')}</span></div>
      <div class="detail-row">${IC('clock')}<span class="k">Dibuat</span><span class="v">${fmtDate(p.createdAt)}</span></div>
    </div>
    ${p.nextStep ? `<div class="section-label">Langkah berikutnya</div><div class="commit-mini"><b>${esc(p.nextStep)}</b><span>Target penutupan ${fmtDate(p.closeDate)}</span></div>` : ''}
    ${p.notes ? `<div class="section-label">Catatan</div><div class="note-box">${esc(p.notes)}</div>` : ''}
    ${p.lostReason ? `<div class="section-label">Alasan batal</div><div class="note-box" style="background:var(--danger-soft);border-color:#f3d8d4;color:#8b3f37">${esc(p.lostReason)}</div>` : ''}
    <div class="section-label">Aktivitas tahap</div>
    <div class="prospect-timeline">${history}</div>
    <div class="section-label">Tindakan</div>
    <div class="detail-actions">
      <button class="btn btn-secondary btn-sm" type="button" data-action="edit-prospect" data-id="${p.id}">${IC('edit')}Edit</button>
      <button class="btn btn-secondary btn-sm" type="button" data-action="prospect-to-task" data-id="${p.id}">${IC('calendar-check')}Buat tugas</button>
      ${p.phone ? `<button class="btn btn-secondary btn-sm" type="button" data-action="prospect-wa" data-id="${p.id}">${IC('message')}WhatsApp</button>` : ''}
      ${donor
        ? `<button class="btn btn-secondary btn-sm" type="button" data-action="open-donor" data-id="${donor.id}">${IC('users')}Lihat donatur</button>`
        : `<button class="btn btn-primary btn-sm" type="button" data-action="convert-prospect" data-id="${p.id}">${IC('user-check')}Konversi menjadi donatur</button>`}
    </div>
    <div class="section-label">Pindah tahap</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select class="select" id="prospect-stage-select" style="max-width:230px" aria-label="Pilih tahap baru">${stageOptions(p.stage)}</select>
      <button class="btn btn-primary btn-sm" type="button" data-action="prospect-stage-apply" data-id="${p.id}">Terapkan tahap</button>
    </div>`;
  openModal({
    title: 'Detail prospek',
    subtitle: `${p.name} · ${a.meta.label}`,
    size: 'lg',
    body,
    footer: `<button class="btn btn-danger-quiet" type="button" data-action="delete-prospect" data-id="${p.id}">Hapus prospek</button>
      <div style="flex:1"></div>
      <button class="btn btn-ghost" type="button" data-close-modal>Tutup</button>`
  });
}

function openProspectForm(id = '', presetStage = 'Baru') {
  const editing = id ? state.prospects.find(p => p.id === id) : null;
  if (id && !editing) return;
  const stage = editing ? editing.stage : (PROSPECT_STAGES.some(s => s.key === presetStage) ? presetStage : 'Baru');
  const programOptions = state.programs.map(p => `<option value="${p.id}"${editing && p.id === editing.programId ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const body = `<form id="prospect-form" class="form-grid">
    <div class="field full"><label>Nama prospek <span class="req">*</span></label><input class="input" name="name" maxlength="90" required value="${esc(editing ? editing.name : '')}" placeholder="Nama individu, perusahaan, atau yayasan"></div>
    <div class="field"><label>Nama kontak</label><input class="input" name="contactName" maxlength="70" value="${esc(editing ? editing.contactName : '')}" placeholder="PIC yang dihubungi"></div>
    <div class="field"><label>Tipe</label><select class="select" name="type">${options(DONOR_TYPES, editing ? editing.type : 'Perusahaan')}</select></div>
    <div class="field"><label>Tahap</label><select class="select" name="stage">${stageOptions(stage)}</select></div>
    <div class="field"><label>Rating</label><select class="select" name="rating">${options(PROSPECT_RATINGS, editing ? editing.rating : 'Warm')}</select></div>
    <div class="field"><label>Perkiraan nilai <span class="req">*</span></label><div class="input-group"><span class="prefix">Rp</span><input class="input" name="amount" type="number" min="0" step="1000" required value="${editing ? editing.amount : ''}" placeholder="0" style="height:38px"></div></div>
    <div class="field"><label>Program</label><select class="select" name="programId"><option value="">— Belum dipilih —</option>${programOptions}</select></div>
    <div class="field"><label>Sumber</label><select class="select" name="source">${options(DONOR_SOURCES, editing ? editing.source : 'Referensi')}</select></div>
    <div class="field"><label>PIC internal</label><input class="input" name="owner" maxlength="60" value="${esc(editing ? editing.owner : state.settings.signerName)}"></div>
    <div class="field"><label>Target penutupan</label><input class="input" name="closeDate" type="date" value="${esc(editing ? editing.closeDate : addDaysISO(todayISO(), 14))}"></div>
    <div class="field"><label>Telepon</label><input class="input" name="phone" maxlength="24" value="${esc(editing ? editing.phone : '')}" placeholder="08xx atau 021-xxxx"></div>
    <div class="field"><label>Email</label><input class="input" name="email" type="email" maxlength="80" value="${esc(editing ? editing.email : '')}" placeholder="nama@organisasi.id"></div>
    <div class="field"><label>Kota</label><input class="input" name="city" maxlength="40" value="${esc(editing ? editing.city : '')}"></div>
    <div class="field full"><label>Langkah berikutnya</label><input class="input" name="nextStep" maxlength="160" value="${esc(editing ? editing.nextStep : '')}" placeholder="Contoh: Kirim proposal dan jadwalkan presentasi"></div>
    <div class="field full"><label>Catatan</label><textarea name="notes" rows="3" maxlength="400" placeholder="Kebutuhan, preferensi, atau konteks percakapan">${esc(editing ? editing.notes : '')}</textarea></div>
    <div class="form-note">${IC('info')}<span>Probabilitas tahap dipakai menghitung prakiraan nilai pipeline. Prospek yang menang dapat dikonversi menjadi donatur.</span></div>
  </form>`;
  openModal({
    title: editing ? 'Edit prospek' : 'Prospek baru',
    subtitle: 'Catat calon donatur dan peluang dukungannya untuk program.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="prospect-form">${editing ? 'Simpan perubahan' : 'Simpan prospek'}</button>`,
    onMount() {
      $('#prospect-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = String(fd.get('name') || '').trim();
        if (!name) { toast('Nama prospek wajib diisi.', 'danger'); return; }
        const rec = {
          name,
          contactName: String(fd.get('contactName') || '').trim(),
          type: String(fd.get('type') || 'Perusahaan'),
          source: String(fd.get('source') || 'Referensi'),
          phone: String(fd.get('phone') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          city: String(fd.get('city') || '').trim(),
          programId: String(fd.get('programId') || ''),
          amount: Math.max(0, Math.round(Number(fd.get('amount')) || 0)),
          rating: String(fd.get('rating') || 'Warm'),
          owner: String(fd.get('owner') || '').trim(),
          closeDate: String(fd.get('closeDate') || addDaysISO(todayISO(), 14)),
          nextStep: String(fd.get('nextStep') || '').trim(),
          notes: String(fd.get('notes') || '').trim()
        };
        const stage = String(fd.get('stage') || 'Baru');
        if (editing) {
          Object.assign(editing, rec);
          changeProspectStage(editing, stage, 'Diperbarui melalui formulir prospek');
          if (stageMeta(stage).lost && !editing.lostReason) editing.lostReason = 'Ditandai batal';
          toast('Prospek diperbarui.');
        } else {
          state.prospects.unshift({
            id: uid('ps'), ...rec, stage,
            createdAt: todayISO(), stageSince: todayISO(),
            stageHistory: [{ stage, at: todayISO(), note: 'Prospek dibuat' }],
            donorId: '', convertedAt: '',
            lostReason: stageMeta(stage).lost ? 'Ditandai batal' : ''
          });
          toast('Prospek ditambahkan ke pipeline.');
        }
        saveState();
        closeModal();
        renderRoute();
        if (editing) openProspectDetail(editing.id);
      });
    }
  });
}

function openProspectTaskForm(p) {
  if (!p) return;
  openModal({
    title: 'Buat tugas tindak lanjut',
    subtitle: `${p.name} · ${stageMeta(p.stage).label}`,
    body: `<form id="prospect-task-form" class="form-grid">
      <div class="field full"><label>Judul tugas <span class="req">*</span></label><input class="input" name="title" maxlength="120" required value="${esc('Tindak lanjut ' + p.name)}"></div>
      <div class="field"><label>Tipe</label><select class="select" name="type">${options(TASK_TYPES, 'Telepon')}</select></div>
      <div class="field"><label>Prioritas</label><select class="select" name="priority">${options(PRIORITIES, p.rating === 'Hot' ? 'Tinggi' : 'Sedang')}</select></div>
      <div class="field"><label>Jatuh tempo</label><input class="input" name="due" type="date" value="${addDaysISO(todayISO(), 2)}"></div>
      <div class="field"><label>PIC</label><input class="input" name="assignee" maxlength="60" value="${esc(p.owner || state.settings.signerName)}"></div>
      <div class="field full"><label>Catatan</label><textarea name="notes" rows="3" maxlength="300">${esc(p.nextStep || '')}</textarea></div>
      <div class="form-note">${IC('info')}<span>Tugas muncul di halaman Tugas &amp; Pengingat dan tidak otomatis memindahkan tahap prospek.</span></div>
    </form>`,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="prospect-task-form">Simpan tugas</button>`,
    onMount() {
      $('#prospect-task-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const title = String(fd.get('title') || '').trim();
        if (!title) { toast('Judul tugas wajib diisi.', 'danger'); return; }
        state.followups.unshift({
          id: uid('fu'), donorId: '', programId: p.programId,
          title,
          type: String(fd.get('type') || 'Telepon'),
          priority: String(fd.get('priority') || 'Sedang'),
          due: String(fd.get('due') || addDaysISO(todayISO(), 2)),
          assignee: String(fd.get('assignee') || '').trim(),
          notes: String(fd.get('notes') || '').trim(),
          done: false, createdAt: new Date().toISOString()
        });
        saveState();
        closeModal();
        renderRoute();
        toast('Tugas tindak lanjut dibuat.');
        openProspectDetail(p.id);
      });
    }
  });
}

function openProspectWhatsApp(id) {
  const p = prospectById(id);
  if (!p) return;
  const phone = normalizePhone(p.phone);
  if (!phone) { toast('Nomor WhatsApp prospek belum tersedia.', 'danger'); return; }
  const program = programById(p.programId);
  const message = `Assalamu'alaikum${p.contactName ? ' ' + p.contactName : ''},\n\nKami dari ${state.settings.orgName} ingin menindaklanjuti rencana dukungan untuk ${program ? program.name : 'program kami'}. Apakah kami dapat mengirim proposal ringkas atau menjadwalkan diskusi singkat?\n\nTerima kasih.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  toast('WhatsApp dibuka. Perbarui tahap prospek setelah komunikasi.', 'info');
}

function convertProspectToDonor(id) {
  const p = prospectById(id);
  if (!p) return;
  if (p.donorId) {
    toast('Prospek ini sudah dikonversi menjadi donatur.', 'info');
    openDonorDrawer(p.donorId);
    return;
  }
  const programOptions = state.programs.map(pr => `<option value="${pr.id}"${pr.id === p.programId ? ' selected' : ''}>${esc(pr.name)}</option>`).join('');
  openModal({
    title: 'Konversi prospek menjadi donatur',
    subtitle: 'Prospek tetap tersimpan sebagai riwayat dan terhubung ke donatur baru.',
    body: `<form id="convert-form" class="form-grid">
      <div class="field full"><label>Nama donatur</label><input class="input" value="${esc(p.name)}" disabled></div>
      <div class="field"><label>Status donatur</label><select class="select" name="status">${options(['Aktif', 'Rutin'], 'Aktif')}</select></div>
      <div class="field"><label>Program</label><select class="select" name="programId">${programOptions}</select></div>
      <div class="field"><label>Nilai komitmen</label><div class="input-group"><span class="prefix">Rp</span><input class="input" name="amount" type="number" min="1000" step="1000" value="${p.amount || ''}" placeholder="0" style="height:38px"></div></div>
      <div class="field"><label>Frekuensi</label><select class="select" name="frequency">${options(COMMIT_FREQS, 'Bulanan')}</select></div>
      <div class="field full checkbox-row"><input type="checkbox" name="makeCommitment" id="make-commitment" ${p.amount >= 1000 ? 'checked' : ''}><label for="make-commitment">Buat komitmen donasi berulang dari nilai peluang ini</label></div>
      <div class="form-note">${IC('info')}<span>Donatur baru langsung muncul di halaman Donatur. Tahap prospek berubah menjadi Menang dan nilai peluang tercatat sebagai komitmen.</span></div>
    </form>`,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="convert-form">Konversi sekarang</button>`,
    onMount() {
      $('#convert-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const makeCommitment = fd.get('makeCommitment') === 'on';
        const amount = Math.round(Number(fd.get('amount')) || 0);
        const programId = String(fd.get('programId') || '');
        if (makeCommitment && amount < 1000) { toast('Nilai komitmen minimal Rp 1.000.', 'danger'); return; }
        if (makeCommitment && !programId) { toast('Pilih program untuk komitmen donasi.', 'danger'); return; }
        const donor = {
          id: uid('dn'), name: p.name, type: p.type,
          status: String(fd.get('status') || 'Aktif'),
          city: p.city, phone: p.phone, email: p.email, source: p.source,
          since: todayISO(),
          notes: `Dikonversi dari prospek ${p.id}. ${p.notes || ''}`.trim(),
          tags: ['Konversi prospek']
        };
        state.donors.unshift(donor);
        if (makeCommitment) {
          state.commitments.unshift({
            id: uid('co'), donorId: donor.id, programId, amount,
            fund: 'Infaq', frequency: String(fd.get('frequency') || 'Bulanan'),
            nextDue: addDaysISO(todayISO(), 30), status: 'Aktif',
            note: `Komitmen dari konversi prospek ${p.name}.`,
            createdAt: new Date().toISOString()
          });
        }
        if (p.stage !== 'Menang') changeProspectStage(p, 'Menang', 'Dikonversi menjadi donatur');
        else p.stageHistory.push({ stage: 'Menang', at: todayISO(), note: 'Dikonversi menjadi donatur' });
        p.donorId = donor.id;
        p.convertedAt = new Date().toISOString();
        p.nextStep = 'Donatur aktif. Catat donasi pertama dan kirim kwitansi.';
        saveState();
        closeModal();
        renderRoute();
        toast(`${p.name} kini menjadi donatur${makeCommitment ? ' dengan komitmen donasi.' : '.'}`, 'success');
        openDonorDrawer(donor.id);
      });
    }
  });
}

