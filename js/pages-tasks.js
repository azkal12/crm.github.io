'use strict';

/* ============================================================
   Halaman: Tugas & pengingat
   ============================================================ */
function taskRow(f) {
  const donor = f.donorId ? donorById(f.donorId) : null;
  const program = f.programId ? programById(f.programId) : null;
  const overdue = !f.done && f.due < todayISO();
  return `<div class="task-row ${f.done ? 'is-done' : ''} ${overdue ? 'overdue' : ''}">
    <button class="task-check" type="button" data-action="toggle-followup" data-id="${f.id}" aria-label="${f.done ? 'Tandai belum selesai' : 'Tandai selesai'}">${IC('check')}</button>
    <div class="task-main">
      <div class="task-title">${esc(f.title)} ${priorityChip(f.priority)}</div>
      <div class="task-meta">
        ${typeTag(f.type || 'Telepon')}
        ${f.reminderKind ? `<span class="chip chip-gold chip-plain">${esc(reminderKindLabel(f.reminderKind))}</span>` : ''}
        ${donor ? `<button class="link-btn" type="button" data-action="open-donor" data-id="${donor.id}">${esc(donor.name)}</button>` : ''}
        ${program ? `<span>${esc(program.name)}</span>` : ''}
        ${f.assignee ? `<span>PIC ${esc(f.assignee)}</span>` : ''}
      </div>
      ${f.notes ? `<div class="cell-sub" style="margin-top:4px">${esc(f.notes)}</div>` : ''}
    </div>
    <div class="task-side">
      <span class="fu-due ${overdue ? 'overdue' : ''}">${IC('clock')}${esc(dueLabel(f.due))}</span>
      <div class="task-actions">
        <button class="icon-btn" type="button" data-action="edit-followup" data-id="${f.id}" title="Edit tugas">${IC('edit')}</button>
        <button class="icon-btn" type="button" data-action="delete-followup" data-id="${f.id}" title="Hapus tugas">${IC('trash')}</button>
      </div>
    </div>
  </div>`;
}

function reminderPanelHTML() {
  const queue = reminderQueue();
  const never = queue.filter(x => x.needsReminder && !x.lastReminder).length;
  const reports = queue.filter(x => x.needsReport).length;
  const scheduled = scheduledReminderCount();
  const intervalOptions = [7, 14, 30].map(d => `<option value="${d}"${reminderDays() === d ? ' selected' : ''}>${d} hari</option>`).join('');
  const reportOptions = [30, 60, 90].map(d => `<option value="${d}"${reportDays() === d ? ' selected' : ''}>${d} hari</option>`).join('');
  const rows = queue.map(item => {
    const d = item.donor;
    const phone = normalizePhone(d.phone);
    const reminderReason = item.needsReminder
      ? (item.reminderAge === null
        ? '<span class="reminder-reason danger">Belum pernah diingatkan</span>'
        : `<span class="reminder-reason warn">${item.reminderAge} hari sejak pengingat</span>`)
      : '';
    const reportReason = item.needsReport
      ? (item.reportAge === null
        ? '<span class="reminder-reason info">Laporan belum pernah dikirim</span>'
        : `<span class="reminder-reason info">Laporan ${item.reportAge} hari lalu</span>`)
      : '';
    return `<div class="reminder-row">
      ${avatar(d.name)}
      <div class="reminder-main">
        <div class="reminder-name">${esc(d.name)} ${statusChip(d.status)}</div>
        <div class="reminder-meta">
          <span>${esc(d.type)} · ${esc(d.city || '—')}</span>
          <span>${item.stats.last ? `Donasi terakhir ${fmtDateShort(item.stats.last)}` : 'Belum ada donasi'}</span>
          ${item.lastReminder ? `<span>${IC('bell')}Diingatkan ${fmtDateShort(item.lastReminder)}</span>` : ''}
        </div>
        <div class="reminder-reasons">${reminderReason}${reportReason}</div>
      </div>
      <div class="reminder-actions">
        <button class="btn btn-primary btn-sm" type="button" data-action="reminder-send" data-id="${d.id}" data-kind="${item.kind}" title="${phone ? 'Kirim melalui WhatsApp' : 'Salin pesan pengingat'}">${IC('send')}${phone ? 'Kirim' : 'Salin'}</button>
        <button class="btn btn-secondary btn-sm" type="button" data-action="reminder-task" data-id="${d.id}" data-kind="${item.kind}" title="Buat tugas pengingat">${IC('calendar-check')}Tugas</button>
        <button class="icon-btn" type="button" data-action="reminder-log" data-id="${d.id}" data-kind="${item.kind}" title="Tandai sudah diingatkan" aria-label="Tandai sudah diingatkan">${IC('check')}</button>
      </div>
    </div>`;
  }).join('');
  const body = queue.length
    ? `<div class="reminder-list">${rows}</div>`
    : emptyState('bell', 'Semua donatur aktif sudah diingatkan', `Tidak ada pengingat atau laporan yang tertunda. Antrean akan muncul otomatis setelah ${reminderDays()} hari.`);

  return `<section class="card reminder-panel" id="reminder-panel" style="margin-bottom:18px">
    <div class="card-head">
      <div>
        <div class="card-title">Pengingat donatur <span class="chip chip-gold chip-plain">Mingguan</span></div>
        <div class="card-sub">Donatur aktif yang belum diingatkan dalam ${reminderDays()} hari atau belum menerima laporan penyaluran ${reportDays()} hari terakhir.</div>
      </div>
      <div class="reminder-tools">
        <label class="reminder-interval">Pengingat<select class="select" id="reminder-interval" aria-label="Interval pengingat donatur">${intervalOptions}</select></label>
        <label class="reminder-interval">Laporan<select class="select" id="report-interval" aria-label="Interval laporan penyaluran">${reportOptions}</select></label>
        ${queue.length ? `<button class="btn btn-secondary btn-sm" type="button" data-action="reminder-create-all">${IC('calendar-check')}Buat semua (${queue.length})</button>` : ''}
      </div>
    </div>
    <div class="card-body">
      <div class="reminder-stats">
        <div class="reminder-stat"><label>Perlu diingatkan</label><b>${fmtNum(queue.length)}</b><span>donatur pada antrean</span></div>
        <div class="reminder-stat"><label>Belum pernah</label><b>${fmtNum(never)}</b><span>belum diingatkan sama sekali</span></div>
        <div class="reminder-stat"><label>Laporan tertunda</label><b>${fmtNum(reports)}</b><span>perlu kabar penyaluran</span></div>
        <div class="reminder-stat"><label>Tugas terjadwal</label><b>${fmtNum(scheduled)}</b><span>menunggu dikirim</span></div>
      </div>
      ${body}
      <div class="reminder-note">${IC('info')}<span>Tombol <b>Kirim</b> membuka WhatsApp dengan pesan siap kirim dan mencatat interaksi otomatis. Tombol centang mencatat pengingat manual, misalnya setelah menelepon donatur.</span></div>
    </div>
  </section>`;
}

function tugasPage() {
  const today = todayISO();
  const open = openTasks();
  const overdue = open.filter(f => f.due < today).length;
  const todayCount = open.filter(f => f.due === today).length;
  const high = open.filter(f => f.priority === 'Tinggi').length;
  const done = state.followups.filter(f => f.done).length;
  const labels = [['open', 'Terbuka'], ['overdue', 'Terlambat'], ['today', 'Hari ini'], ['week', '7 hari'], ['done', 'Selesai']];
  const counts = {
    open: open.length,
    overdue,
    today: todayCount,
    week: open.filter(f => f.due <= addDaysISO(today, 7)).length,
    done
  };
  const chips = labels.map(([key, label]) => `<button class="filter-chip ${ui.taskFilter === key ? 'active' : ''}" type="button" data-action="task-filter" data-filter="${key}">${label}<span class="count">${counts[key]}</span></button>`).join('');
  const list = taskFiltered();
  const body = list.length
    ? list.map(taskRow).join('')
    : emptyState('calendar-check', 'Tidak ada tugas pada filter ini', 'Ubah filter atau tambahkan tugas baru untuk tim.', `<button class="btn btn-secondary btn-sm" data-action="add-followup">${IC('plus')}Tambah tugas</button>`);

  return pageHead(
    'Tugas & pengingat',
    'Prioritaskan follow-up donatur, komunikasi, dan pekerjaan operasional tim.',
    `<button class="btn btn-secondary" data-action="export" data-kind="tasks">${IC('download')}Ekspor</button>
     <button class="btn btn-primary" data-action="add-followup">${IC('plus')}Tugas baru</button>`
  ) + `
  <div class="mini-stats">
    <div class="mini-stat"><div><label>Tugas terbuka</label><b>${fmtNum(open.length)}</b></div><span class="mini-ic tint-green">${IC('calendar-check')}</span></div>
    <div class="mini-stat"><div><label>Terlambat</label><b>${fmtNum(overdue)}</b></div><span class="mini-ic tint-red">${IC('alert')}</span></div>
    <div class="mini-stat"><div><label>Jatuh tempo hari ini</label><b>${fmtNum(todayCount)}</b></div><span class="mini-ic tint-gold">${IC('clock')}</span></div>
    <div class="mini-stat"><div><label>Prioritas tinggi</label><b>${fmtNum(high)}</b></div><span class="mini-ic tint-violet">${IC('target')}</span></div>
  </div>
  ${reminderPanelHTML()}
  <div class="card">
    <div class="toolbar">
      <div class="filter-chips" style="margin:0">${chips}</div>
      <select class="select" id="task-type" aria-label="Filter tipe tugas" style="margin-left:auto;max-width:180px">${options(['Semua', ...TASK_TYPES], ui.taskType)}</select>
    </div>
    <div class="card-body" style="padding-top:14px">
      <div class="task-list">${body}</div>
    </div>
  </div>`;
}

function bindTugas() {
  const type = $('#task-type');
  if (type) type.addEventListener('change', e => { ui.taskType = e.target.value; renderKeepScroll(); });
  const interval = $('#reminder-interval');
  if (interval) interval.addEventListener('change', e => {
    const value = Number(e.target.value);
    state.settings.reminderDays = [7, 14, 30].includes(value) ? value : 7;
    saveState();
    renderKeepScroll();
    toast(`Interval pengingat diatur ke ${state.settings.reminderDays} hari.`);
  });
  const report = $('#report-interval');
  if (report) report.addEventListener('change', e => {
    const value = Number(e.target.value);
    state.settings.reportDays = [30, 60, 90].includes(value) ? value : 30;
    saveState();
    renderKeepScroll();
    toast(`Interval laporan diatur ke ${state.settings.reportDays} hari.`);
  });
}

