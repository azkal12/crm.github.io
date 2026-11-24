'use strict';

/* ============================================================
   Form: Donatur
   ============================================================ */
function openDonorForm(id) {
  const d = id ? donorById(id) : null;
  if (id && !d) return;
  const tags = d ? (d.tags || []).join(', ') : '';

  const body = `<form id="donor-form" class="form-grid">
    <div class="field full"><label>Nama donatur <span class="req">*</span></label><input class="input" name="name" required maxlength="90" value="${esc(d ? d.name : '')}" placeholder="Nama individu atau lembaga" autocomplete="off"></div>
    <div class="field"><label>Tipe donatur</label><select class="select" name="type">${options(DONOR_TYPES, d ? d.type : 'Individu')}</select></div>
    <div class="field"><label>Status hubungan</label><select class="select" name="status">${options(DONOR_STATUSES, d ? d.status : 'Aktif')}</select></div>
    <div class="field"><label>Telepon</label><input class="input" name="phone" maxlength="30" value="${esc(d ? d.phone : '')}" placeholder="0812-xxxx-xxxx"></div>
    <div class="field"><label>Email</label><input class="input" name="email" type="email" maxlength="90" value="${esc(d ? d.email : '')}" placeholder="nama@email.com"></div>
    <div class="field"><label>Kota</label><input class="input" name="city" maxlength="60" value="${esc(d ? d.city : '')}" placeholder="Jakarta Selatan"></div>
    <div class="field"><label>Sumber perolehan</label><select class="select" name="source">${options(DONOR_SOURCES, d ? d.source : 'Referensi')}</select></div>
    <div class="field full"><label>Alamat lengkap</label><input class="input" name="address" maxlength="140" value="${esc(d ? d.address || '' : '')}" placeholder="Opsional"></div>
    <div class="field"><label>Donatur sejak</label><input class="input" name="since" type="date" value="${esc(d ? d.since : todayISO())}" max="${todayISO()}"></div>
    <div class="field"><label>Tag</label><input class="input" name="tags" maxlength="120" value="${esc(tags)}" placeholder="rutin, beasiswa"><div class="hint">Pisahkan beberapa tag dengan koma.</div></div>
    <div class="field full"><label>Catatan</label><textarea name="notes" maxlength="500" placeholder="Preferensi donasi, komitmen, atau konteks relasi…">${esc(d ? d.notes : '')}</textarea></div>
  </form>`;

  openModal({
    title: d ? 'Edit donatur' : 'Donatur baru',
    subtitle: d ? 'Perbarui informasi dan status hubungan donatur.' : 'Tambahkan individu atau lembaga ke basis data relasi.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="donor-form">${d ? 'Simpan perubahan' : 'Simpan donatur'}</button>`,
    onMount() {
      $('#donor-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = String(fd.get('name') || '').trim();
        if (!name) { toast('Nama donatur wajib diisi.', 'danger'); return; }
        const rec = {
          name,
          type: String(fd.get('type') || 'Individu'),
          status: String(fd.get('status') || 'Aktif'),
          phone: String(fd.get('phone') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          city: String(fd.get('city') || '').trim(),
          address: String(fd.get('address') || '').trim(),
          source: String(fd.get('source') || 'Referensi'),
          since: String(fd.get('since') || todayISO()),
          tags: String(fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean),
          notes: String(fd.get('notes') || '').trim()
        };
        if (d) {
          Object.assign(d, rec);
          toast('Data donatur diperbarui.');
        } else {
          state.donors.unshift(Object.assign({ id: uid('dn') }, rec));
          toast('Donatur baru ditambahkan.');
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
   Form: Donasi
   ============================================================ */
function openDonationForm(opts = {}) {
  if (!state.donors.length || !state.programs.length) {
    toast('Tambahkan minimal satu donatur dan satu program terlebih dahulu.', 'danger');
    return;
  }
  const editing = opts.id ? state.donations.find(d => d.id === opts.id) : null;
  const preDonor = editing ? editing.donorId : (opts.donorId || '');
  const preProgram = editing ? editing.programId : (opts.programId || '');
  const preDate = editing ? editing.date : todayISO();
  const preAmount = editing ? editing.amount : (opts.amount || '');
  const preFund = editing ? editing.fund : (opts.fund || 'Infaq');

  const donorOptions = [...state.donors]
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    .map(d => `<option value="${d.id}"${d.id === preDonor ? ' selected' : ''}>${esc(d.name)} — ${esc(d.type)}</option>`).join('');
  const programOptions = state.programs
    .map(p => `<option value="${p.id}"${p.id === preProgram ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

  const body = `<form id="donation-form" class="form-grid">
    <div class="field full"><label>Donatur <span class="req">*</span></label><select class="select" name="donorId" required>${donorOptions}</select></div>
    <div class="field full"><label>Program <span class="req">*</span></label><select class="select" name="programId" required>${programOptions}</select></div>
    <div class="field">
      <label>Nominal donasi <span class="req">*</span></label>
      <div class="input-group"><span class="prefix">Rp</span><input class="input" name="amount" id="donation-amount" type="number" min="1000" step="1000" required value="${preAmount}" placeholder="0" style="height:38px"></div>
      <div class="quick-amounts">
        <button type="button" data-amount="250000">250 rb</button>
        <button type="button" data-amount="500000">500 rb</button>
        <button type="button" data-amount="1000000">1 jt</button>
        <button type="button" data-amount="2500000">2,5 jt</button>
        <button type="button" data-amount="5000000">5 jt</button>
      </div>
      <div class="amount-preview" id="amount-preview"></div>
    </div>
    <div class="field"><label>Tanggal donasi <span class="req">*</span></label><input class="input" name="date" type="date" required value="${esc(preDate)}" max="${todayISO()}"></div>
    <div class="field"><label>Metode</label><select class="select" name="method">${options(METHODS, editing ? editing.method : 'Transfer Bank')}</select></div>
    <div class="field"><label>Jenis dana</label><select class="select" name="fund">${options(FUNDS, preFund)}</select></div>
    <div class="field"><label>Status verifikasi</label><select class="select" name="status">${options(DONATION_STATUSES, editing ? editing.status : 'Terverifikasi')}</select></div>
    <div class="field" style="justify-content:flex-end"><label>Donasi rutin</label><div class="checkbox-row"><input type="checkbox" name="recurring" id="donation-recurring"${editing && editing.recurring ? ' checked' : ''}><label for="donation-recurring" style="font-weight:500;font-size:12px;color:var(--ink-2)">Tandai sebagai komitmen rutin</label></div></div>
    <div class="field full"><label>Catatan</label><input class="input" name="note" maxlength="160" value="${esc(editing ? editing.note || '' : '')}" placeholder="Opsional"></div>
    <div class="form-note">${IC('info')}<span>Hanya donasi berstatus <b>Terverifikasi</b> yang dihitung ke progres program dan laporan.</span></div>
  </form>`;

  openModal({
    title: editing ? 'Edit donasi' : 'Catat donasi',
    subtitle: editing ? 'Perbarui detail transaksi donasi.' : `Masukkan transaksi baru yang diterima ${state.settings.orgName}.`,
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="donation-form">${editing ? 'Simpan perubahan' : 'Catat donasi'}</button>`,
    onMount() {
      const amountInput = $('#donation-amount');
      const preview = $('#amount-preview');
      const updatePreview = () => {
        const val = Number(amountInput.value || 0);
        preview.textContent = val > 0 ? fmtIDR(val) : '';
      };
      amountInput.addEventListener('input', updatePreview);
      $$('.quick-amounts [data-amount]').forEach(btn => {
        btn.addEventListener('click', () => {
          amountInput.value = btn.dataset.amount;
          updatePreview();
        });
      });
      updatePreview();

      $('#donation-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const amount = Math.round(Number(fd.get('amount')) || 0);
        if (amount < 1000) { toast('Nominal donasi minimal Rp 1.000.', 'danger'); return; }
        const rec = {
          donorId: String(fd.get('donorId') || ''),
          programId: String(fd.get('programId') || ''),
          amount,
          date: String(fd.get('date') || todayISO()),
          method: String(fd.get('method') || 'Transfer Bank'),
          fund: String(fd.get('fund') || 'Infaq'),
          status: String(fd.get('status') || 'Terverifikasi'),
          recurring: !!fd.get('recurring'),
          note: String(fd.get('note') || '').trim(),
          commitmentId: editing ? (editing.commitmentId || '') : (opts.commitmentId || '')
        };
        let message = editing ? 'Donasi diperbarui.' : 'Donasi berhasil dicatat.';
        if (editing) {
          Object.assign(editing, rec);
        } else {
          state.donations.unshift(Object.assign({ id: uid('d') }, rec));
          if (opts.commitmentId) {
            const commitment = state.commitments.find(c => c.id === opts.commitmentId);
            if (commitment && rec.status === 'Terverifikasi') {
              advanceCommitment(commitment);
              message = 'Donasi dicatat dan jadwal komitmen diperbarui.';
            }
          }
        }
        saveState();
        closeModal();
        renderRoute();
        refreshOpenDrawer();
        toast(message);
      });
    }
  });
}

