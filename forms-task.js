'use strict';

/* ============================================================
   Form: Tugas & interaksi
   ============================================================ */
function openFollowupForm(id = '', presetDonorId = '') {
  const editing = id ? state.followups.find(f => f.id === id) : null;
  if (id && !editing) return;
  const preDonor = editing ? editing.donorId : (presetDonorId || '');
  const preProgram = editing ? editing.programId : '';
  const donorOptions = [...state.donors]
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    .map(d => `<option value="${d.id}"${d.id === preDonor ? ' selected' : ''}>${esc(d.name)} — ${esc(d.type)}</option>`).join('');
  const programOptions = state.programs
    .map(p => `<option value="${p.id}"${p.id === preProgram ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

  const body = `<form id="followup-form" class="form-grid">
    <div class="field full"><label>Judul tugas <span class="req">*</span></label><input class="input" name="title" required maxlength="110" value="${esc(editing ? editing.title : '')}" placeholder="Contoh: Kirim proposal program air bersih"></div>
    <div class="field"><label>Tipe</label><select class="select" name="type">${options(TASK_TYPES, editing ? editing.type : 'Telepon')}</select></div>
    <div class="field"><label>Prioritas</label><select class="select" name="priority">${options(PRIORITIES, editing ? editing.priority : 'Sedang')}</select></div>
    <div class="field"><label>Tenggat</label><input class="input" name="due" type="date" value="${esc(editing ? editing.due : todayISO())}"></div>
    <div class="field"><label>Penanggung jawab</label><input class="input" name="assignee" maxlength="60" value="${esc(editing ? editing.assignee : state.settings.signerName)}" placeholder="Nama PIC"></div>
    <div class="field"><label>Donatur</label><select class="select" name="donorId"><option value="">— Tanpa donatur / umum —</option>${donorOptions}</select></div>
    <div class="field"><label>Program</label><select class="select" name="programId"><option value="">— Tidak terkait program —</option>${programOptions}</select></div>
    <div class="field full"><label>Catatan</label><textarea class="input" name="notes" rows="3" maxlength="300" placeholder="Konteks, hasil pembicaraan, atau langkah berikutnya…">${esc(editing ? editing.notes : '')}</textarea></div>
    <div class="form-note">${IC('info')}<span>Tugas yang jatuh tempo atau terlambat tampil di ringkasan dan lencana navigasi.</span></div>
  </form>`;

  openModal({
    title: editing ? 'Edit tugas' : 'Tugas baru',
    subtitle: editing ? 'Perbarui detail dan prioritas tugas.' : 'Buat pengingat untuk tim dan hubungan donatur.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="followup-form">${editing ? 'Simpan perubahan' : 'Simpan tugas'}</button>`,
    onMount() {
      $('#followup-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const title = String(fd.get('title') || '').trim();
        if (!title) { toast('Judul tugas wajib diisi.', 'danger'); return; }
        const rec = {
          title,
          type: String(fd.get('type') || 'Telepon'),
          priority: String(fd.get('priority') || 'Sedang'),
          due: String(fd.get('due') || todayISO()),
          assignee: String(fd.get('assignee') || '').trim(),
          donorId: String(fd.get('donorId') || ''),
          programId: String(fd.get('programId') || ''),
          notes: String(fd.get('notes') || '').trim()
        };
        if (editing) {
          Object.assign(editing, rec);
          toast('Tugas diperbarui.');
        } else {
          state.followups.unshift({ id: uid('fu'), done: false, createdAt: new Date().toISOString(), ...rec });
          toast('Tugas ditambahkan.');
        }
        saveState();
        closeModal();
        renderRoute();
        refreshOpenDrawer();
      });
    }
  });
}

/* --- Aksi pengingat donatur --- */
function reminderTaskMeta(donor, kind, item) {
  const stats = item ? item.stats : donorStats(donor.id);
  const last = item ? item.lastDonation : latestVerifiedDonation(donor.id);
  const program = last ? programById(last.programId) : null;
  const title = kind === 'both'
    ? `Pengingat mingguan & laporan penyaluran — ${donor.name}`
    : kind === 'report' ? `Kirim laporan penyaluran ke ${donor.name}` : `Pengingat mingguan untuk ${donor.name}`;
  const parts = [];
  if (last) parts.push(`Donasi terakhir ${fmtIDR(last.amount)} pada ${fmtDate(last.date)}${program ? ` (${program.name})` : ''}.`);
  else parts.push('Belum ada donasi terverifikasi.');
  parts.push(item && item.lastReminder ? `Terakhir diingatkan ${fmtDate(item.lastReminder)}.` : 'Belum pernah diingatkan.');
  if (kind !== 'reminder') parts.push(item && item.lastReport ? `Laporan terakhir ${fmtDate(item.lastReport)}.` : 'Laporan penyaluran belum pernah dikirim.');
  parts.push('Gunakan tombol Kirim pada antrean pengingat agar WhatsApp terbuka dan interaksi tercatat otomatis.');
  return {
    title, type: 'WhatsApp', priority: 'Sedang', due: todayISO(),
    assignee: state.settings.signerName, donorId: donor.id,
    programId: last ? last.programId : '', notes: parts.join(' ')
  };
}
function createReminderTask(donorId, kind, opts = {}) {
  const donor = donorById(donorId);
  if (!donor) return false;
  const safeKind = ['reminder', 'report', 'both'].includes(kind) ? kind : 'both';
  if (openReminderTaskFor(donor.id)) {
    if (!opts.silent) toast('Tugas pengingat untuk donatur ini sudah ada.', 'info');
    return false;
  }
  const meta = reminderTaskMeta(donor, safeKind, reminderItem(donor));
  state.followups.unshift({
    id: uid('fu'), done: false, createdAt: new Date().toISOString(),
    reminderKind: safeKind, reminderPrev: null, ...meta
  });
  if (!opts.silent) {
    saveState();
    renderKeepScroll();
    refreshOpenDrawer();
    toast(`Tugas pengingat untuk ${donor.name} dibuat.`);
  }
  return true;
}
function createReminderTasksForQueue() {
  const queue = reminderQueue();
  if (!queue.length) { toast('Tidak ada donatur yang perlu diingatkan saat ini.', 'info'); return; }
  openModal({
    title: 'Buat tugas pengingat?',
    size: 'sm',
    body: `<p class="confirm-text">${queue.length} tugas akan dibuat untuk donatur yang belum diingatkan atau belum menerima laporan. Setiap tugas tertaut ke donatur dan menandai status pengingat saat diselesaikan.</p>`,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="button" id="reminder-bulk-create">Buat ${queue.length} tugas</button>`,
    onMount() {
      $('#reminder-bulk-create').addEventListener('click', () => {
        let count = 0;
        queue.forEach(item => {
          if (createReminderTask(item.donor.id, item.kind, { silent: true })) count++;
        });
        saveState();
        closeModal();
        renderKeepScroll();
        refreshOpenDrawer();
        toast(`${count} tugas pengingat dibuat.`);
      });
    }
  });
}
function markDonorReminded(donorId, kind, channel, note, date = todayISO(), opts = {}) {
  const donor = donorById(donorId);
  if (!donor) return;
  const safeKind = ['reminder', 'report', 'both'].includes(kind) ? kind : 'reminder';
  const safeDate = isISODate(date) ? date : todayISO();
  applyReminderMark(donor, safeKind, safeDate);
  const last = latestVerifiedDonation(donor.id);
  const summary = safeKind === 'report'
    ? 'Laporan penyaluran dikirim'
    : safeKind === 'both' ? 'Pengingat mingguan & laporan penyaluran dikirim' : 'Pengingat mingguan dikirim';
  state.interactions.unshift({
    id: uid('in'), donorId: donor.id, programId: last ? last.programId : '',
    channel: INTERACTION_CHANNELS.includes(channel) ? channel : 'WhatsApp',
    date: safeDate, summary: `${summary}${note ? ` — ${note}` : ''}`, nextStep: '',
    assignee: state.settings.signerName, createdAt: new Date().toISOString()
  });
  state.followups.forEach(f => {
    if (!f.done && f.donorId === donor.id && f.reminderKind) {
      f.done = true;
      f.reminderPrev = null;
    }
  });
  saveState();
  if (ui.currentPage === 'tugas') renderKeepScroll();
  else renderRoute();
  refreshOpenDrawer();
  if (!opts.silent) toast(`${reminderKindLabel(safeKind)} untuk ${donor.name} tercatat.`);
}
function sendDonorReminder(donorId, kind) {
  const donor = donorById(donorId);
  if (!donor) return;
  const safeKind = ['reminder', 'report', 'both'].includes(kind) ? kind : 'reminder';
  const message = reminderMessage(donor, safeKind);
  const phone = normalizePhone(donor.phone);
  if (!phone) {
    copyText(message);
    toast('Nomor WhatsApp belum tersedia. Pesan disalin — tandai manual setelah dikirim.', 'info', 5200);
    return;
  }
  let win = null;
  try {
    win = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  } catch (err) {
    win = null;
  }
  if (!win) {
    copyText(message);
    toast('Jendela WhatsApp diblokir. Pesan disalin, buka WhatsApp manual lalu tandai terkirim.', 'info', 5200);
    return;
  }
  markDonorReminded(donor.id, safeKind, 'WhatsApp', '', todayISO(), { silent: true });
  toast(`${reminderKindLabel(safeKind)} untuk ${donor.name} dibuka di WhatsApp dan dicatat.`);
}
function openReminderLog(donorId, kind) {
  const donor = donorById(donorId);
  if (!donor) return;
  const item = reminderItem(donor);
  const preKind = ['reminder', 'report', 'both'].includes(kind) ? kind : (item ? item.kind : 'reminder');
  const kindOptions = [['reminder', 'Pengingat mingguan'], ['report', 'Laporan penyaluran'], ['both', 'Pengingat + laporan']]
    .map(([value, label]) => `<option value="${value}"${value === preKind ? ' selected' : ''}>${label}</option>`).join('');
  const body = `<form id="reminder-log-form" class="form-grid">
    <div class="field full"><label>Jenis yang sudah dikirim <span class="req">*</span></label><select class="select" name="kind">${kindOptions}</select></div>
    <div class="field"><label>Kanal</label><select class="select" name="channel">${options(INTERACTION_CHANNELS, 'WhatsApp')}</select></div>
    <div class="field"><label>Tanggal</label><input class="input" name="date" type="date" value="${todayISO()}" max="${todayISO()}" required></div>
    <div class="field full"><label>Catatan (opsional)</label><input class="input" name="note" maxlength="160" placeholder="Contoh: donatur membalas dan mengonfirmasi penerimaan laporan"></div>
    <div class="form-note">${IC('info')}<span>Status pengingat dan laporan donatur akan diperbarui, interaksi tercatat di profil, dan tugas pengingat yang terbuka ditandai selesai.</span></div>
  </form>`;
  openModal({
    title: 'Tandai pengingat terkirim',
    subtitle: donor.name,
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="reminder-log-form">Simpan</button>`,
    onMount() {
      $('#reminder-log-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const kindValue = String(fd.get('kind') || 'reminder');
        const date = String(fd.get('date') || todayISO());
        if (!isISODate(date)) { toast('Tanggal tidak valid.', 'danger'); return; }
        if (date > todayISO()) { toast('Tanggal tidak boleh melewati hari ini.', 'danger'); return; }
        closeModal();
        markDonorReminded(donor.id, kindValue, String(fd.get('channel') || 'WhatsApp'), String(fd.get('note') || '').trim(), date);
      });
    }
  });
}
function openReminderCenter() {
  goTo('tugas');
  setTimeout(() => {
    const panel = $('#reminder-panel');
    if (!panel) return;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    panel.classList.add('is-flash');
    setTimeout(() => panel.classList.remove('is-flash'), 1300);
  }, 60);
}

function openInteractionForm(idOrDonor = '', presetDonorId = '') {  const editing = state.interactions.find(x => x.id === idOrDonor) || null;
  const preDonor = editing ? editing.donorId : (donorById(idOrDonor) ? idOrDonor : (presetDonorId || ''));
  const donorOptions = [...state.donors]
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    .map(d => `<option value="${d.id}"${d.id === preDonor ? ' selected' : ''}>${esc(d.name)} — ${esc(d.type)}</option>`).join('');
  const programOptions = state.programs
    .map(p => `<option value="${p.id}"${editing && p.id === editing.programId ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const body = `<form id="interaction-form" class="form-grid">
    <div class="field full"><label>Donatur <span class="req">*</span></label><select class="select" name="donorId" required>${donorOptions}</select></div>
    <div class="field"><label>Kanal</label><select class="select" name="channel">${options(INTERACTION_CHANNELS, editing ? editing.channel : 'WhatsApp')}</select></div>
    <div class="field"><label>Tanggal</label><input class="input" name="date" type="date" value="${esc(editing ? editing.date : todayISO())}" max="${todayISO()}"></div>
    <div class="field"><label>Program terkait</label><select class="select" name="programId"><option value="">— Tidak terkait —</option>${programOptions}</select></div>
    <div class="field"><label>PIC</label><input class="input" name="assignee" maxlength="60" value="${esc(editing ? editing.assignee : state.settings.signerName)}"></div>
    <div class="field full"><label>Ringkasan interaksi <span class="req">*</span></label><textarea class="input" name="summary" rows="3" maxlength="400" required placeholder="Apa yang dibahas dan bagaimana respons donatur?">${esc(editing ? editing.summary : '')}</textarea></div>
    <div class="field full"><label>Langkah berikutnya</label><input class="input" name="nextStep" maxlength="160" value="${esc(editing ? editing.nextStep : '')}" placeholder="Contoh: Kirim proposal pada Senin"></div>
    <div class="form-note">${IC('info')}<span>Riwayat interaksi tersimpan di profil donatur dan dapat diekspor ke CSV.</span></div>
  </form>`;

  openModal({
    title: editing ? 'Edit interaksi' : 'Catat interaksi',
    subtitle: editing ? 'Perbarui catatan komunikasi donatur.' : 'Simpan hasil telepon, pesan, email, kunjungan, atau rapat.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="interaction-form">${editing ? 'Simpan perubahan' : 'Simpan interaksi'}</button>`,
    onMount() {
      $('#interaction-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const summary = String(fd.get('summary') || '').trim();
        if (!summary) { toast('Ringkasan interaksi wajib diisi.', 'danger'); return; }
        const rec = {
          donorId: String(fd.get('donorId') || ''),
          channel: String(fd.get('channel') || 'WhatsApp'),
          date: String(fd.get('date') || todayISO()),
          programId: String(fd.get('programId') || ''),
          assignee: String(fd.get('assignee') || '').trim(),
          summary,
          nextStep: String(fd.get('nextStep') || '').trim()
        };
        if (editing) {
          Object.assign(editing, rec);
          toast('Interaksi diperbarui.');
        } else {
          state.interactions.unshift({ id: uid('in'), createdAt: new Date().toISOString(), ...rec });
          toast('Interaksi dicatat.');
        }
        saveState();
        closeModal();
        renderRoute();
        refreshOpenDrawer();
      });
    }
  });
}

function openCommitmentForm(id = '', presetDonorId = '') {
  if (!state.donors.length || !state.programs.length) {
    toast('Tambahkan minimal satu donatur dan satu program terlebih dahulu.', 'danger');
    return;
  }
  const editing = id ? state.commitments.find(c => c.id === id) : null;
  if (id && !editing) return;
  const preDonor = editing ? editing.donorId : (presetDonorId || '');
  const donorOptions = [...state.donors]
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    .map(d => `<option value="${d.id}"${d.id === preDonor ? ' selected' : ''}>${esc(d.name)} — ${esc(d.type)}</option>`).join('');
  const programOptions = state.programs
    .map(p => `<option value="${p.id}"${editing && p.id === editing.programId ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

  const body = `<form id="commitment-form" class="form-grid">
    <div class="field full"><label>Donatur <span class="req">*</span></label><select class="select" name="donorId" required>${donorOptions}</select></div>
    <div class="field full"><label>Program <span class="req">*</span></label><select class="select" name="programId" required>${programOptions}</select></div>
    <div class="field"><label>Nominal per periode <span class="req">*</span></label><div class="input-group"><span class="prefix">Rp</span><input class="input" name="amount" type="number" min="1000" step="1000" required value="${editing ? editing.amount : ''}" placeholder="0" style="height:38px"></div></div>
    <div class="field"><label>Frekuensi</label><select class="select" name="frequency">${options(COMMIT_FREQS, editing ? editing.frequency : 'Bulanan')}</select></div>
    <div class="field"><label>Jenis dana</label><select class="select" name="fund">${options(FUNDS, editing ? editing.fund : 'Infaq')}</select></div>
    <div class="field"><label>Jatuh tempo berikutnya</label><input class="input" name="nextDue" type="date" value="${esc(editing ? editing.nextDue : addDaysISO(todayISO(), 7))}"></div>
    <div class="field"><label>Status</label><select class="select" name="status">${options(COMMIT_STATUSES, editing ? editing.status : 'Aktif')}</select></div>
    <div class="field full"><label>Catatan</label><input class="input" name="note" maxlength="160" value="${esc(editing ? editing.note : '')}" placeholder="Kesepakatan, metode transfer, atau PIC donatur"></div>
    <div class="form-note">${IC('info')}<span>Setelah donasi dicatat dari komitmen, jadwal berikutnya maju otomatis sesuai frekuensi.</span></div>
  </form>`;

  openModal({
    title: editing ? 'Edit komitmen' : 'Komitmen donasi baru',
    subtitle: 'Catat kesepakatan donasi berulang untuk pengingat dan proyeksi dana.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="commitment-form">${editing ? 'Simpan perubahan' : 'Simpan komitmen'}</button>`,
    onMount() {
      $('#commitment-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const amount = Math.round(Number(fd.get('amount')) || 0);
        if (amount < 1000) { toast('Nominal komitmen minimal Rp 1.000.', 'danger'); return; }
        const rec = {
          donorId: String(fd.get('donorId') || ''),
          programId: String(fd.get('programId') || ''),
          amount,
          frequency: String(fd.get('frequency') || 'Bulanan'),
          fund: String(fd.get('fund') || 'Infaq'),
          nextDue: String(fd.get('nextDue') || todayISO()),
          status: String(fd.get('status') || 'Aktif'),
          note: String(fd.get('note') || '').trim()
        };
        if (editing) {
          Object.assign(editing, rec);
          toast('Komitmen diperbarui.');
        } else {
          state.commitments.unshift({ id: uid('co'), createdAt: new Date().toISOString(), ...rec });
          toast('Komitmen donasi ditambahkan.');
        }
        saveState();
        closeModal();
        renderRoute();
        refreshOpenDrawer();
      });
    }
  });
}

/* ============================================================
   Konfirmasi hapus
   ============================================================ */
function confirmDeleteDonor(id) {
  const d = donorById(id);
  if (!d) return;
  const used = state.donations.filter(x => x.donorId === id).length;
  if (used) {
    toast('Donatur ini masih memiliki riwayat donasi. Ubah status menjadi Pasif atau hapus donasinya terlebih dahulu.', 'danger', 5000);
    return;
  }
  confirmAction({
    title: 'Hapus donatur?',
    message: `<b>${esc(d.name)}</b> akan dihapus dari basis data donatur.`,
    confirmLabel: 'Hapus donatur',
    onConfirm() {
      state.donors = state.donors.filter(x => x.id !== id);
      state.interactions = state.interactions.filter(x => x.donorId !== id);
      state.commitments = state.commitments.filter(x => x.donorId !== id);
      state.followups.forEach(f => { if (f.donorId === id) f.donorId = ''; });
      state.prospects.forEach(p => { if (p.donorId === id) p.donorId = ''; });
      saveState();
      closeDrawer();
      renderRoute();
      toast('Donatur dihapus.');
    }
  });
}

function confirmDeleteDonation(id) {
  const d = state.donations.find(x => x.id === id);
  if (!d) return;
  const donor = donorById(d.donorId);
  confirmAction({
    title: 'Hapus donasi?',
    message: `Donasi <b>${fmtIDR(d.amount)}</b> dari <b>${esc(donor ? donor.name : 'donatur')}</b> pada ${fmtDate(d.date)} akan dihapus.`,
    confirmLabel: 'Hapus donasi',
    onConfirm() {
      state.donations = state.donations.filter(x => x.id !== id);
      saveState();
      renderRoute();
      refreshOpenDrawer();
      toast('Donasi dihapus.');
    }
  });
}

function confirmDeleteProgram(id) {
  const p = programById(id);
  if (!p) return;
  const used = state.donations.filter(x => x.programId === id).length;
  if (used) {
    toast(`Program ini memiliki ${used} riwayat donasi. Hapus donasinya terlebih dahulu bila program memang dibatalkan.`, 'danger', 5000);
    return;
  }
  const linkedBen = state.beneficiaries.filter(b => b.programId === id).length;
  confirmAction({
    title: 'Hapus program?',
    message: `<b>${esc(p.name)}</b> akan dihapus.${linkedBen ? ` ${linkedBen} penerima manfaat akan dilepas dari program ini.` : ''}`,
    confirmLabel: 'Hapus program',
    onConfirm() {
      state.programs = state.programs.filter(x => x.id !== id);
      if (linkedBen) state.beneficiaries.forEach(b => { if (b.programId === id) b.programId = ''; });
      saveState();
      renderRoute();
      toast('Program dihapus.');
    }
  });
}

function confirmDeleteVolunteer(id) {
  const v = state.volunteers.find(x => x.id === id);
  if (!v) return;
  confirmAction({
    title: 'Hapus relawan?',
    message: `<b>${esc(v.name)}</b> akan dihapus dari daftar relawan.`,
    confirmLabel: 'Hapus relawan',
    onConfirm() {
      state.volunteers = state.volunteers.filter(x => x.id !== id);
      saveState();
      renderRoute();
      toast('Relawan dihapus.');
    }
  });
}

function confirmDeleteBeneficiary(id) {
  const b = state.beneficiaries.find(x => x.id === id);
  if (!b) return;
  confirmAction({
    title: 'Hapus penerima manfaat?',
    message: `<b>${esc(b.name)}</b> akan dihapus dari daftar penerima manfaat.`,
    confirmLabel: 'Hapus penerima',
    onConfirm() {
      state.beneficiaries = state.beneficiaries.filter(x => x.id !== id);
      saveState();
      renderRoute();
      toast('Penerima manfaat dihapus.');
    }
  });
}

function confirmDeleteInteraction(id) {
  const x = state.interactions.find(i => i.id === id);
  if (!x) return;
  const donor = donorById(x.donorId);
  confirmAction({
    title: 'Hapus interaksi?',
    message: `Catatan interaksi dengan <b>${esc(donor ? donor.name : 'donatur')}</b> pada ${fmtDate(x.date)} akan dihapus.`,
    confirmLabel: 'Hapus interaksi',
    onConfirm() {
      state.interactions = state.interactions.filter(i => i.id !== id);
      saveState();
      renderRoute();
      refreshOpenDrawer();
      toast('Interaksi dihapus.');
    }
  });
}

function confirmDeleteCommitment(id) {
  const c = state.commitments.find(x => x.id === id);
  if (!c) return;
  const donor = donorById(c.donorId);
  confirmAction({
    title: 'Hapus komitmen?',
    message: `Komitmen <b>${fmtIDR(c.amount)}</b> per ${esc(c.frequency.toLowerCase())} dari <b>${esc(donor ? donor.name : 'donatur')}</b> akan dihapus.`,
    confirmLabel: 'Hapus komitmen',
    onConfirm() {
      state.commitments = state.commitments.filter(x => x.id !== id);
      saveState();
      renderRoute();
      refreshOpenDrawer();
      toast('Komitmen dihapus.');
    }
  });
}

function confirmResetData() {
  confirmAction({
    title: 'Reset data demo?',
    message: 'Seluruh perubahan yang Anda buat di perangkat ini akan diganti dengan data contoh baru. Tindakan ini tidak dapat dibatalkan.',
    confirmLabel: 'Reset data',
    onConfirm() {
      state = seedData();
      saveState();
      closeDrawer();
      renderRoute();
      toast('Data demo berhasil dipulihkan.');
    }
  });
}

