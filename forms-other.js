'use strict';

/* ============================================================
   Form: Program
   ============================================================ */
function openProgramForm(id) {
  const p = id ? programById(id) : null;
  if (id && !p) return;

  const body = `<form id="program-form" class="form-grid">
    <div class="field full"><label>Nama program <span class="req">*</span></label><input class="input" name="name" required maxlength="90" value="${esc(p ? p.name : '')}" placeholder="Contoh: Beasiswa Santri Tahfidz"></div>
    <div class="field"><label>Kategori</label><select class="select" name="category">${options(PROGRAM_CATEGORIES, p ? p.category : 'Pendidikan')}</select></div>
    <div class="field"><label>Status</label><select class="select" name="status">${options(PROGRAM_STATUSES, p ? p.status : 'Akan Datang')}</select></div>
    <div class="field">
      <label>Target dana <span class="req">*</span></label>
      <div class="input-group"><span class="prefix">Rp</span><input class="input" name="target" id="program-target" type="number" min="1000000" step="500000" required value="${p ? p.target : ''}" placeholder="0" style="height:38px"></div>
      <div class="quick-amounts">
        <button type="button" data-target="50000000">50 jt</button>
        <button type="button" data-target="100000000">100 jt</button>
        <button type="button" data-target="250000000">250 jt</button>
      </div>
      <div class="amount-preview" id="target-preview"></div>
    </div>
    <div class="field"><label>Mulai</label><input class="input" name="start" type="date" value="${esc(p ? p.start : todayISO())}"></div>
    <div class="field"><label>Selesai</label><input class="input" name="end" type="date" value="${esc(p ? p.end : addDaysISO(todayISO(), 90))}"></div>
    <div class="field"><label>Penanggung jawab</label><input class="input" name="pic" maxlength="70" value="${esc(p ? p.pic : '')}" placeholder="Nama PIC"></div>
    <div class="field full"><label>Lokasi</label><input class="input" name="location" maxlength="90" value="${esc(p ? p.location : '')}" placeholder="Kota, provinsi"></div>
    <div class="field full"><label>Deskripsi</label><textarea name="description" maxlength="400" placeholder="Tujuan, cakupan, dan manfaat program…">${esc(p ? p.description : '')}</textarea></div>
  </form>`;

  openModal({
    title: p ? 'Edit program' : 'Program baru',
    subtitle: p ? 'Perbarui target, status, dan informasi program.' : 'Rancang program baru beserta target pendanaannya.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="program-form">${p ? 'Simpan perubahan' : 'Simpan program'}</button>`,
    onMount() {
      const targetInput = $('#program-target');
      const preview = $('#target-preview');
      const update = () => {
        const val = Number(targetInput.value || 0);
        preview.textContent = val > 0 ? fmtIDR(val) : '';
      };
      targetInput.addEventListener('input', update);
      $$('.quick-amounts [data-target]').forEach(btn => {
        btn.addEventListener('click', () => { targetInput.value = btn.dataset.target; update(); });
      });
      update();

      $('#program-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = String(fd.get('name') || '').trim();
        const target = Math.round(Number(fd.get('target')) || 0);
        if (!name) { toast('Nama program wajib diisi.', 'danger'); return; }
        if (target < 1000000) { toast('Target dana minimal Rp 1.000.000.', 'danger'); return; }
        const start = String(fd.get('start') || todayISO());
        const end = String(fd.get('end') || '');
        if (end && end < start) { toast('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'danger'); return; }
        const rec = {
          name,
          category: String(fd.get('category') || 'Pendidikan'),
          status: String(fd.get('status') || 'Akan Datang'),
          target,
          start,
          end,
          pic: String(fd.get('pic') || '').trim(),
          location: String(fd.get('location') || '').trim(),
          description: String(fd.get('description') || '').trim()
        };
        if (p) {
          Object.assign(p, rec);
          toast('Program diperbarui.');
        } else {
          state.programs.unshift(Object.assign({ id: uid('pr') }, rec));
          toast('Program baru dibuat.');
        }
        saveState();
        closeModal();
        renderRoute();
      });
    }
  });
}

/* ============================================================
   Form: Relawan & penerima manfaat
   ============================================================ */
function openVolunteerForm(id) {
  const v = id ? state.volunteers.find(x => x.id === id) : null;
  if (id && !v) return;

  const body = `<form id="volunteer-form" class="form-grid">
    <div class="field full"><label>Nama relawan <span class="req">*</span></label><input class="input" name="name" required maxlength="80" value="${esc(v ? v.name : '')}" placeholder="Nama lengkap"></div>
    <div class="field"><label>Peran</label><input class="input" name="role" maxlength="60" value="${esc(v ? v.role : '')}" placeholder="Contoh: Relawan Logistik"></div>
    <div class="field"><label>Status</label><select class="select" name="status">${options(VOLUNTEER_STATUSES, v ? v.status : 'Aktif')}</select></div>
    <div class="field"><label>Telepon</label><input class="input" name="phone" maxlength="30" value="${esc(v ? v.phone : '')}" placeholder="0812-xxxx-xxxx"></div>
    <div class="field"><label>Email</label><input class="input" name="email" type="email" maxlength="90" value="${esc(v ? v.email : '')}" placeholder="nama@email.com"></div>
    <div class="field"><label>Domisili</label><input class="input" name="city" maxlength="60" value="${esc(v ? v.city : '')}" placeholder="Kota"></div>
    <div class="field"><label>Bergabung</label><input class="input" name="joined" type="date" value="${esc(v ? v.joined : todayISO())}" max="${todayISO()}"></div>
    <div class="field full"><label>Keahlian</label><input class="input" name="skills" maxlength="140" value="${esc(v ? v.skills : '')}" placeholder="Logistik, komunikasi, dokumentasi"><div class="hint">Pisahkan dengan koma bila lebih dari satu.</div></div>
  </form>`;

  openModal({
    title: v ? 'Edit relawan' : 'Relawan baru',
    subtitle: v ? 'Perbarui data dan kesiapan relawan.' : 'Daftarkan anggota tim relawan Itqan Peduli.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="volunteer-form">${v ? 'Simpan perubahan' : 'Simpan relawan'}</button>`,
    onMount() {
      $('#volunteer-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = String(fd.get('name') || '').trim();
        if (!name) { toast('Nama relawan wajib diisi.', 'danger'); return; }
        const rec = {
          name,
          role: String(fd.get('role') || '').trim() || 'Relawan',
          status: String(fd.get('status') || 'Aktif'),
          phone: String(fd.get('phone') || '').trim(),
          email: String(fd.get('email') || '').trim(),
          city: String(fd.get('city') || '').trim(),
          joined: String(fd.get('joined') || todayISO()),
          skills: String(fd.get('skills') || '').trim()
        };
        if (v) {
          Object.assign(v, rec);
          toast('Data relawan diperbarui.');
        } else {
          state.volunteers.unshift(Object.assign({ id: uid('vl') }, rec));
          toast('Relawan baru ditambahkan.');
        }
        saveState();
        closeModal();
        renderRoute();
      });
    }
  });
}

function openBeneficiaryForm(id) {
  const b = id ? state.beneficiaries.find(x => x.id === id) : null;
  if (id && !b) return;

  const programOpts = state.programs.map(p => `<option value="${p.id}"${b && b.programId === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');

  const body = `<form id="beneficiary-form" class="form-grid">
    <div class="field full"><label>Nama penerima <span class="req">*</span></label><input class="input" name="name" required maxlength="80" value="${esc(b ? b.name : '')}" placeholder="Nama lengkap"></div>
    <div class="field"><label>Kategori</label><select class="select" name="category">${options(BENEFICIARY_CATEGORIES, b ? b.category : 'Yatim')}</select></div>
    <div class="field"><label>Status verifikasi</label><select class="select" name="status">${options(BENEFICIARY_STATUSES, b ? b.status : 'Menunggu')}</select></div>
    <div class="field full"><label>Program pendamping</label><select class="select" name="programId"><option value="">— Belum ditentukan —</option>${programOpts}</select></div>
    <div class="field"><label>Domisili</label><input class="input" name="city" maxlength="60" value="${esc(b ? b.city : '')}" placeholder="Kota / kabupaten"></div>
    <div class="field"><label>Kontak wali</label><input class="input" name="phone" maxlength="30" value="${esc(b ? b.phone : '')}" placeholder="0812-xxxx-xxxx"></div>
    <div class="field"><label>Bergabung</label><input class="input" name="joined" type="date" value="${esc(b ? b.joined : todayISO())}" max="${todayISO()}"></div>
  </form>`;

  openModal({
    title: b ? 'Edit penerima manfaat' : 'Penerima manfaat baru',
    subtitle: b ? 'Perbarui data penerima dan status verifikasi.' : 'Catat mustahik atau penerima program Itqan Peduli.',
    body,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn btn-primary" type="submit" form="beneficiary-form">${b ? 'Simpan perubahan' : 'Simpan penerima'}</button>`,
    onMount() {
      $('#beneficiary-form').addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = String(fd.get('name') || '').trim();
        if (!name) { toast('Nama penerima wajib diisi.', 'danger'); return; }
        const rec = {
          name,
          category: String(fd.get('category') || 'Dhuafa'),
          status: String(fd.get('status') || 'Menunggu'),
          programId: String(fd.get('programId') || ''),
          city: String(fd.get('city') || '').trim(),
          phone: String(fd.get('phone') || '').trim(),
          joined: String(fd.get('joined') || todayISO())
        };
        if (b) {
          Object.assign(b, rec);
          toast('Data penerima diperbarui.');
        } else {
          state.beneficiaries.unshift(Object.assign({ id: uid('bm') }, rec));
          toast('Penerima manfaat baru ditambahkan.');
        }
        saveState();
        closeModal();
        renderRoute();
      });
    }
  });
}

