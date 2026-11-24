'use strict';

/* ============================================================
   Ekspor CSV
   ============================================================ */
function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportKind(kind) {
  const stamp = todayISO();
  if (kind === 'donations') {
    const rows = [['ID', 'Tanggal', 'Donatur', 'Tipe donatur', 'Program', 'Jenis dana', 'Metode', 'Nominal', 'Status', 'Rutin', 'Catatan']];
    [...state.donations].sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach(d => {
      const donor = donorById(d.donorId);
      const program = programById(d.programId);
      rows.push([d.id, d.date, donor ? donor.name : '', donor ? donor.type : '', program ? program.name : '', d.fund || '', d.method, d.amount, d.status, d.recurring ? 'Ya' : 'Tidak', d.note || '']);
    });
    downloadCSV(`itqan-donasi-${stamp}.csv`, rows);
  } else if (kind === 'donors') {
    const rows = [['ID', 'Nama', 'Tipe', 'Status', 'Kota', 'Telepon', 'Email', 'Sumber', 'Sejak', 'Total donasi', 'Jumlah transaksi', 'Donasi terakhir', 'Pengingat terakhir', 'Laporan terakhir', 'Tag', 'Catatan']];
    state.donors.forEach(d => {
      const s = donorStats(d.id);
      rows.push([d.id, d.name, d.type, d.status, d.city, d.phone, d.email, d.source, d.since, s.total, s.count, s.last, d.lastReminder || 'Belum pernah', d.lastReport || 'Belum dikirim', (d.tags || []).join('; '), d.notes || '']);
    });
    downloadCSV(`itqan-donatur-${stamp}.csv`, rows);
  } else if (kind === 'programs') {
    const rows = [['ID', 'Nama', 'Kategori', 'Status', 'Target', 'Terkumpul', 'Progres %', 'PIC', 'Lokasi', 'Mulai', 'Selesai', 'Deskripsi']];
    state.programs.forEach(p => {
      const s = programProgress(p);
      rows.push([p.id, p.name, p.category, p.status, p.target, s.total, Math.round(s.pct), p.pic, p.location, p.start, p.end, p.description]);
    });
    downloadCSV(`itqan-program-${stamp}.csv`, rows);
  } else if (kind === 'volunteers') {
    const rows = [['ID', 'Nama', 'Peran', 'Status', 'Kota', 'Telepon', 'Email', 'Keahlian', 'Bergabung']];
    state.volunteers.forEach(v => rows.push([v.id, v.name, v.role, v.status, v.city, v.phone, v.email, v.skills, v.joined]));
    downloadCSV(`itqan-relawan-${stamp}.csv`, rows);
  } else if (kind === 'beneficiaries') {
    const rows = [['ID', 'Nama', 'Kategori', 'Status', 'Program', 'Kota', 'Kontak wali', 'Bergabung']];
    state.beneficiaries.forEach(b => {
      const program = programById(b.programId);
      rows.push([b.id, b.name, b.category, b.status, program ? program.name : '', b.city, b.phone, b.joined]);
    });
    downloadCSV(`itqan-penerima-${stamp}.csv`, rows);
  } else if (kind === 'tasks') {
    const rows = [['ID', 'Tugas', 'Tipe', 'Jenis pengingat', 'Prioritas', 'Donatur', 'Program', 'PIC', 'Tenggat', 'Status', 'Catatan']];
    state.followups.forEach(f => {
      const donor = donorById(f.donorId);
      const program = programById(f.programId);
      rows.push([f.id, f.title, f.type, f.reminderKind ? reminderKindLabel(f.reminderKind) : '', f.priority, donor ? donor.name : '', program ? program.name : '', f.assignee, f.due, f.done ? 'Selesai' : 'Terbuka', f.notes || '']);
    });
    downloadCSV(`itqan-tugas-${stamp}.csv`, rows);
  } else if (kind === 'commitments') {
    const rows = [['ID', 'Donatur', 'Program', 'Nominal', 'Frekuensi', 'Nilai bulanan', 'Jenis dana', 'Jatuh tempo', 'Status', 'Catatan']];
    state.commitments.forEach(c => {
      const donor = donorById(c.donorId);
      const program = programById(c.programId);
      rows.push([c.id, donor ? donor.name : '', program ? program.name : '', c.amount, c.frequency, Math.round(commitmentMonthly(c)), c.fund, c.nextDue, c.status, c.note || '']);
    });
    downloadCSV(`itqan-komitmen-${stamp}.csv`, rows);
  } else if (kind === 'interactions') {
    const rows = [['ID', 'Tanggal', 'Donatur', 'Kanal', 'Program', 'Ringkasan', 'Langkah berikutnya', 'PIC']];
    [...state.interactions].sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach(x => {
      const donor = donorById(x.donorId);
      const program = programById(x.programId);
      rows.push([x.id, x.date, donor ? donor.name : '', x.channel, program ? program.name : '', x.summary, x.nextStep, x.assignee]);
    });
    downloadCSV(`itqan-interaksi-${stamp}.csv`, rows);
  } else if (kind === 'prospects') {
    const rows = [['ID', 'Prospek', 'Kontak', 'Tipe', 'Sumber', 'Kota', 'Telepon', 'Email', 'Program', 'Nilai peluang', 'Tahap', 'Probabilitas %', 'Nilai tertimbang', 'Rating', 'PIC', 'Target tutup', 'Usia tahap (hari)', 'Langkah berikutnya', 'Donatur hasil konversi', 'Catatan']];
    state.prospects.forEach(p => {
      const program = programById(p.programId);
      const meta = stageMeta(p.stage);
      const donor = p.donorId ? donorById(p.donorId) : null;
      rows.push([p.id, p.name, p.contactName, p.type, p.source, p.city, p.phone, p.email, program ? program.name : '', p.amount, meta.label, meta.prob, Math.round(p.amount * meta.prob / 100), p.rating, p.owner, p.closeDate, daysSinceISO(p.stageSince), p.nextStep, donor ? donor.name : '', p.notes]);
    });
    downloadCSV(`itqan-pipeline-${stamp}.csv`, rows);
  }
  toast('Ekspor CSV dibuat.');
}

/* ============================================================
   Pencarian global
   ============================================================ */
function closeSearch() {
  const box = $('#search-results');
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
}

function searchMatches(query) {
  const q = query.trim().toLowerCase();
  const out = { donors: [], prospects: [], programs: [], tasks: [], volunteers: [], beneficiaries: [] };
  if (!q) return out;
  out.donors = state.donors.filter(d => [d.name, d.city, d.phone, d.email, (d.tags || []).join(' ')].join(' ').toLowerCase().includes(q)).slice(0, 4);
  out.prospects = state.prospects.filter(p => [p.name, p.contactName, p.city, p.phone, p.email, p.notes, p.nextStep].join(' ').toLowerCase().includes(q)).slice(0, 3);
  out.programs = state.programs.filter(p => [p.name, p.category, p.location, p.pic].join(' ').toLowerCase().includes(q)).slice(0, 3);
  out.tasks = state.followups.filter(f => {
    const donor = donorById(f.donorId);
    return [f.title, f.type, f.assignee, donor ? donor.name : ''].join(' ').toLowerCase().includes(q);
  }).slice(0, 3);
  out.volunteers = state.volunteers.filter(v => [v.name, v.role, v.city, v.skills].join(' ').toLowerCase().includes(q)).slice(0, 3);
  out.beneficiaries = state.beneficiaries.filter(b => [b.name, b.category, b.city].join(' ').toLowerCase().includes(q)).slice(0, 3);
  return out;
}

function renderSearch(query) {
  const box = $('#search-results');
  if (!box) return;
  if (!query.trim()) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const r = searchMatches(query);
  const groups = [];

  if (r.donors.length) {
    groups.push('<div class="search-group">Donatur</div>' + r.donors.map(d => `
      <button class="search-hit" type="button" data-action="search-open" data-type="donor" data-id="${d.id}">
        ${avatar(d.name)}<span class="search-hit-text"><span class="search-hit-title">${esc(d.name)}</span><span class="search-hit-sub">${esc(d.type)} · ${esc(d.city)}</span></span>${IC('chevron-right')}
      </button>`).join(''));
  }
  if (r.programs.length) {
    groups.push('<div class="search-group">Program</div>' + r.programs.map(p => `
      <button class="search-hit" type="button" data-action="search-open" data-type="program" data-id="${p.id}">
        ${catBadge(p.category, '28px')}<span class="search-hit-text"><span class="search-hit-title">${esc(p.name)}</span><span class="search-hit-sub">${esc(p.category)} · ${esc(p.location || '—')}</span></span>${IC('chevron-right')}
      </button>`).join(''));
  }
  if (r.prospects.length) {
    groups.push('<div class="search-group">Pipeline</div>' + r.prospects.map(p => `
      <button class="search-hit" type="button" data-action="search-open" data-type="prospect" data-id="${p.id}">
        ${avatar(p.name)}<span class="search-hit-text"><span class="search-hit-title">${esc(p.name)}</span><span class="search-hit-sub">${esc(stageMeta(p.stage).label)} · ${fmtIDR(p.amount)}</span></span>${IC('chevron-right')}
      </button>`).join(''));
  }
  if (r.volunteers.length) {
    groups.push('<div class="search-group">Relawan</div>' + r.volunteers.map(v => `
      <button class="search-hit" type="button" data-action="search-open" data-type="volunteer" data-id="${v.id}">
        ${avatar(v.name)}<span class="search-hit-text"><span class="search-hit-title">${esc(v.name)}</span><span class="search-hit-sub">${esc(v.role)} · ${esc(v.city)}</span></span>${IC('chevron-right')}
      </button>`).join(''));
  }
  if (r.tasks.length) {
    groups.push('<div class="search-group">Tugas</div>' + r.tasks.map(f => {
      const donor = donorById(f.donorId);
      return `<button class="search-hit" type="button" data-action="search-open" data-type="task" data-id="${f.id}">
        ${avatar(donor ? donor.name : 'Tugas')}<span class="search-hit-text"><span class="search-hit-title">${esc(f.title)}</span><span class="search-hit-sub">${esc(f.priority)} · ${esc(dueLabel(f.due))}${donor ? ` · ${esc(donor.name)}` : ''}</span></span>${IC('chevron-right')}
      </button>`;
    }).join(''));
  }
  if (r.beneficiaries.length) {
    groups.push('<div class="search-group">Penerima manfaat</div>' + r.beneficiaries.map(b => `
      <button class="search-hit" type="button" data-action="search-open" data-type="beneficiary" data-id="${b.id}">
        ${avatar(b.name)}<span class="search-hit-text"><span class="search-hit-title">${esc(b.name)}</span><span class="search-hit-sub">${esc(b.category)} · ${esc(b.city)}</span></span>${IC('chevron-right')}
      </button>`).join(''));
  }

  if (!groups.length) {
    box.innerHTML = `<div class="search-empty">Tidak ada hasil untuk “${esc(query)}”.</div>`;
  } else {
    box.innerHTML = groups.join('');
  }
  box.hidden = false;
}

