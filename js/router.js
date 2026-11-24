'use strict';

/* ============================================================
   Peta halaman & router
   ============================================================ */
const PAGES = {
  dashboard: {
    title: 'Ringkasan', crumb: 'Dashboard', actionLabel: 'Catat donasi', actionIcon: 'plus',
    page: dashboardPage, bind: null
  },
  tugas: {
    title: 'Tugas', crumb: 'Alur kerja', actionLabel: 'Tugas baru', actionIcon: 'plus',
    page: tugasPage, bind: bindTugas
  },
  donatur: {
    title: 'Donatur', crumb: 'Relasi & donatur', actionLabel: 'Donatur baru', actionIcon: 'plus',
    page: donaturPage, bind: bindDonatur
  },
  pipeline: {
    title: 'Pipeline', crumb: 'Prospek & pipeline', actionLabel: 'Prospek baru', actionIcon: 'plus',
    page: pipelinePage, bind: bindPipeline
  },
  donasi: {
    title: 'Donasi', crumb: 'Keuangan', actionLabel: 'Catat donasi', actionIcon: 'plus',
    page: donasiPage, bind: bindDonasi
  },
  komitmen: {
    title: 'Komitmen', crumb: 'Donasi berulang', actionLabel: 'Komitmen baru', actionIcon: 'plus',
    page: komitmenPage, bind: bindKomitmen
  },
  komunikasi: {
    title: 'Komunikasi', crumb: 'Relasi donatur', actionLabel: 'Catat interaksi', actionIcon: 'message',
    page: komunikasiPage, bind: bindKomunikasi
  },
  program: {
    title: 'Program', crumb: 'Program sosial', actionLabel: 'Program baru', actionIcon: 'plus',
    page: programPage, bind: null
  },
  relawan: {
    title: 'Relawan', crumb: 'SDM & relawan', actionLabel: 'Relawan baru', actionIcon: 'plus',
    page: relawanPage, bind: bindRelawan
  },
  penerima: {
    title: 'Penerima Manfaat', crumb: 'Dampak', actionLabel: 'Penerima baru', actionIcon: 'plus',
    page: penerimaPage, bind: bindPenerima
  },
  laporan: {
    title: 'Laporan', crumb: 'Analitik', actionLabel: 'Ekspor donasi', actionIcon: 'download',
    page: laporanPage, bind: bindLaporan
  },
  pengaturan: {
    title: 'Pengaturan', crumb: 'Sistem', actionLabel: 'Unduh cadangan', actionIcon: 'download',
    page: pengaturanPage, bind: bindPengaturan
  }
};

function setNavBadge(selector, count) {
  const badge = $(selector);
  if (!badge) return;
  badge.hidden = !count;
  badge.textContent = count > 99 ? '99+' : String(count);
}
function updateNavBadges() {
  const pending = state.donations.filter(d => d.status === 'Menunggu').length;
  const dueTasks = state.followups.filter(f => !f.done && f.due <= todayISO()).length;
  const dueCommits = dueCommitments(7).length;
  const reminderCount = reminderQueue().length;
  setNavBadge('#nav-pending', pending);
  setNavBadge('#nav-tasks', dueTasks);
  setNavBadge('#nav-commitments', dueCommits);
  setNavBadge('#nav-pipeline', pipelineStats().staleCount);
  setNavBadge('#bell-count', reminderCount);
  const bell = $('#bell-btn');
  if (bell) bell.title = reminderCount ? `${reminderCount} donatur perlu diingatkan` : 'Pengingat donatur';
}

function rememberRoute(route) {
  try { sessionStorage.setItem(ROUTE_KEY, route); } catch (err) { /* penyimpanan sesi tidak tersedia */ }
}
function initialRoute() {
  const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
  if (PAGES[raw]) return raw;
  try {
    const saved = sessionStorage.getItem(ROUTE_KEY);
    if (saved && PAGES[saved]) return saved;
  } catch (err) { /* abaikan */ }
  return 'dashboard';
}

function renderRoute() {
  const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
  const route = PAGES[raw] ? raw : 'dashboard';
  if (location.hash !== '#/' + route) {
    try { history.replaceState(null, '', '#/' + route); }
    catch (err) { location.hash = '#/' + route; }
  }
  ui.currentPage = route;
  const page = PAGES[route];
  const s = state.settings;
  $('#topbar-title').textContent = page.title;
  $('#topbar-sub').textContent = `${s.orgName} / ${page.crumb}`;
  document.title = `${page.title} — ${s.orgName}`;
  const brandName = $('#brand-name');
  const brandSub = $('#brand-sub');
  const userName = $('#user-name');
  const userRole = $('#user-role');
  if (brandName) brandName.textContent = s.orgName;
  if (brandSub) brandSub.textContent = s.tagline;
  if (userName) userName.textContent = s.signerName;
  if (userRole) userRole.textContent = s.orgName;
  $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === route));

  const primary = $('#primary-action');
  if (primary) primary.innerHTML = `${IC(page.actionIcon)}<span>${page.actionLabel}</span>`;

  const view = $('#view');
  view.innerHTML = page.page();
  if (route !== 'pengaturan') window.scrollTo(0, 0);
  if (typeof page.bind === 'function') page.bind();
  updateNavBadges();
  rememberRoute(route);
  closeMobileNav();
}

function goTo(page) {
  const target = PAGES[page] ? page : 'dashboard';
  const hash = '#/' + target;
  if (location.hash === hash) {
    renderRoute();
    return;
  }
  try {
    history.pushState(null, '', hash);
  } catch (err) {
    location.hash = hash;
    return;
  }
  renderRoute();
}

/* ============================================================
   Modal, konfirmasi, dan drawer
   ============================================================ */
function openModal({ title, subtitle = '', body, footer = '', size = '', onMount }) {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay" data-modal-overlay>
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <div>
          <div class="modal-title">${esc(title)}</div>
          ${subtitle ? `<div class="modal-sub">${esc(subtitle)}</div>` : ''}
        </div>
        <button class="icon-btn" type="button" data-close-modal aria-label="Tutup">${IC('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>
  </div>`;
  document.body.classList.add('modal-open');
  if (typeof onMount === 'function') onMount();
}

function closeModal() {
  const root = $('#modal-root');
  if (root) root.innerHTML = '';
  const drawer = $('#drawer-root');
  if (!drawer || !drawer.innerHTML.trim()) document.body.classList.remove('modal-open');
}

function confirmAction({ title, message, confirmLabel = 'Hapus', tone = 'danger', onConfirm }) {
  openModal({
    title,
    subtitle: 'Tindakan ini tidak dapat dibatalkan.',
    size: 'sm',
    body: `<p class="confirm-text">${message}</p>`,
    footer: `<button class="btn btn-ghost" type="button" data-close-modal>Batal</button>
      <button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" type="button" id="confirm-action-btn">${esc(confirmLabel)}</button>`,
    onMount() {
      $('#confirm-action-btn').addEventListener('click', () => {
        closeModal();
        onConfirm();
      });
    }
  });
}

function closeDrawer() {
  const root = $('#drawer-root');
  if (root) {
    root.innerHTML = '';
    delete root.dataset.donorId;
  }
  const modal = $('#modal-root');
  if (!modal || !modal.innerHTML.trim()) document.body.classList.remove('modal-open');
}

function refreshOpenDrawer() {
  const root = $('#drawer-root');
  if (!root || !root.dataset.donorId) return;
  const id = root.dataset.donorId;
  if (donorById(id)) openDonorDrawer(id);
  else closeDrawer();
}

function openDonorDrawer(id) {
  const d = donorById(id);
  if (!d) return;
  const stats = donorStats(d.id);
  const history = state.donations
    .filter(x => x.donorId === d.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
  const tags = (d.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  const commitment = state.commitments.find(c => c.donorId === d.id && c.status === 'Aktif');
  const interactions = state.interactions
    .filter(x => x.donorId === d.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5);

  const root = $('#drawer-root');
  root.dataset.donorId = d.id;
  root.innerHTML = `<div class="drawer-overlay" data-close-drawer></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail donatur ${esc(d.name)}">
    <div class="drawer-head">
      <div class="drawer-topline">
        <span class="eyebrow">Profil donatur</span>
        <button class="icon-btn" type="button" data-close-drawer aria-label="Tutup">${IC('x')}</button>
      </div>
      <div class="drawer-profile">
        ${avatar(d.name, 'avatar-lg')}
        <div style="min-width:0">
          <h2>${esc(d.name)}</h2>
          <p>${esc(d.type)} · ${esc(d.city)}</p>
        </div>
      </div>
      <div class="drawer-chips">
        ${statusChip(d.status)}
        <span class="chip chip-muted chip-plain">${esc(d.source)}</span>
        ${(d.tags || []).includes('rutin') ? '<span class="chip chip-gold chip-plain">Donatur rutin</span>' : ''}
      </div>
    </div>
    <div class="drawer-body">
      <div class="drawer-stats">
        <div class="dstat"><label>Total donasi</label><b>${stats.total ? fmtShort(stats.total) : '—'}</b></div>
        <div class="dstat"><label>Transaksi</label><b>${stats.count}</b></div>
        <div class="dstat"><label>Terakhir</label><b style="font-size:11px;line-height:1.5">${stats.last ? fmtDate(stats.last) : '—'}</b></div>
      </div>

      ${d.notes ? `<div class="section-label">Catatan</div><div class="note-box">${esc(d.notes)}</div>` : ''}

      <div class="section-label">Informasi kontak</div>
      <div class="detail-list">
        <div class="detail-row">${IC('phone')}<span class="k">Telepon</span><span class="v">${esc(d.phone || '—')}</span></div>
        <div class="detail-row">${IC('mail')}<span class="k">Email</span><span class="v">${esc(d.email || '—')}</span></div>
        <div class="detail-row">${IC('pin')}<span class="k">Wilayah</span><span class="v">${esc([d.city, d.address].filter(Boolean).join(', ') || '—')}</span></div>
        <div class="detail-row">${IC('calendar')}<span class="k">Sejak</span><span class="v">${fmtDate(d.since)}</span></div>
        <div class="detail-row">${IC('bell')}<span class="k">Pengingat</span><span class="v">${d.lastReminder ? fmtDate(d.lastReminder) : 'Belum pernah'}</span></div>
        <div class="detail-row">${IC('file')}<span class="k">Laporan</span><span class="v">${d.lastReport ? fmtDate(d.lastReport) : 'Belum dikirim'}</span></div>
        <div class="detail-row">${IC('building')}<span class="k">Sumber</span><span class="v">${esc(d.source)}</span></div>
      </div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}

      ${commitment ? `<div class="section-label">Komitmen rutin</div>
        <div class="commit-mini">
          <b>${fmtIDR(commitment.amount)} / ${esc(commitment.frequency.toLowerCase())}</b>
          <span>${esc((programById(commitment.programId) || {}).name || 'Program')} · ${esc(commitment.fund)}</span>
          <span class="due">Jadwal berikut: ${fmtDate(commitment.nextDue)} · ${esc(dueLabel(commitment.nextDue))}</span>
        </div>` : ''}

      <div class="section-label" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span>Interaksi terakhir</span>
        <button class="link-btn" type="button" data-action="add-interaction" data-id="${d.id}">+ Catat</button>
      </div>
      ${interactions.length ? `<div class="timeline">${interactions.map(x => `
        <div class="tl-item">
          <div class="tl-title">${esc(x.summary)}</div>
          <div class="tl-meta"><span class="tag">${esc(x.channel)}</span><span>${fmtDate(x.date)}</span><span>${esc(x.assignee || '—')}</span></div>
          ${x.nextStep ? `<div class="tl-next">Berikutnya: ${esc(x.nextStep)}</div>` : ''}
        </div>`).join('')}</div>` : '<div class="muted small" style="padding:4px 0 2px">Belum ada interaksi tercatat.</div>'}

      <div class="section-label">Riwayat donasi ${history.length ? `<span style="letter-spacing:0;text-transform:none;font-weight:600">${history.length} terakhir</span>` : ''}</div>
      ${history.length ? `<div class="hist-list">${history.map(x => {
        const program = programById(x.programId);
        return `<div class="hist-item">
          <div>
            <div class="hist-title">${esc(program ? program.name : 'Program dihapus')}</div>
            <div class="hist-sub">${fmtDate(x.date)} · ${esc(x.method)} · ${esc(x.fund)}</div>
          </div>
          <div class="hist-right">
            <div class="hist-amount">${fmtIDR(x.amount)}</div>
            <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end;margin-top:3px">
              ${statusChip(x.status)}
              <button class="icon-btn" type="button" data-action="receipt" data-id="${x.id}" title="Lihat kwitansi">${IC('receipt')}</button>
            </div>
          </div>
        </div>`;
      }).join('')}</div>` : '<div class="muted small" style="padding:6px 0 2px">Belum ada riwayat donasi.</div>'}
    </div>
    <div class="drawer-foot">
      <button class="btn btn-danger-quiet btn-sm" type="button" data-action="delete-donor" data-id="${d.id}">${IC('trash')}Hapus</button>
      <span class="spacer" style="flex:1"></span>
      <button class="btn btn-secondary btn-sm" type="button" data-action="edit-donor" data-id="${d.id}">${IC('edit')}Edit</button>
      <button class="btn btn-primary btn-sm" type="button" data-action="add-donation" data-id="${d.id}">${IC('plus')}Catat donasi</button>
    </div>
  </aside>`;
  document.body.classList.add('modal-open');
}

function openProgramDetail(id) {
  const p = programById(id);
  if (!p) return;
  const s = programProgress(p);
  const remaining = Math.max(p.target - s.total, 0);
  const benCount = state.beneficiaries.filter(b => b.programId === p.id).length;
  const recent = state.donations
    .filter(x => x.programId === p.id && x.status === 'Terverifikasi')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);

  const rows = recent.length ? recent.map(x => {
    const donor = donorById(x.donorId);
    return `<tr>
      <td><div class="cell-main">${avatar(donor ? donor.name : '?', 'avatar-sm')}<span class="cell-title">${esc(donor ? donor.name : 'Donatur')}</span></div></td>
      <td class="nowrap">${fmtDate(x.date)}</td>
      <td><span class="tag">${esc(x.fund)}</span></td>
      <td class="text-right num">${fmtIDR(x.amount)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4"><div class="muted small" style="padding:14px 0;text-align:center">Belum ada donasi terverifikasi untuk program ini.</div></td></tr>`;

  openModal({
    title: 'Detail program',
    subtitle: 'Capaian dana dan penyaluran program',
    size: 'lg',
    body: `
      <div class="modal-hero">
        <span class="cat-dot" style="background:${colorFor(p.category)};width:46px;height:46px;border-radius:13px;font-size:15px">${esc(p.category.charAt(0))}</span>
        <div>
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <span class="eyebrow">${esc(p.category)}</span>${statusChip(p.status)}
          </div>
          <h2 style="margin-top:5px">${esc(p.name)}</h2>
          <p>${esc(p.description)}</p>
        </div>
      </div>
      <div class="detail-stats">
        <div class="dstat"><label>Target dana</label><b>${fmtShort(p.target)}</b></div>
        <div class="dstat"><label>Terkumpul</label><b>${fmtShort(s.total)}</b></div>
        <div class="dstat"><label>Kekurangan</label><b>${remaining ? fmtShort(remaining) : 'Tercapai'}</b></div>
        <div class="dstat"><label>Donatur</label><b>${s.donors}</b></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
        <span class="small" style="font-weight:600;color:var(--muted)">Progres pencapaian</span>
        <span class="num" style="color:var(--brand);font-size:12px">${Math.round(s.pct)}%</span>
      </div>
      <div class="progress" style="height:9px"><span style="width:${s.pct.toFixed(1)}%"></span></div>
      <div class="meta-grid">
        <div class="detail-row">${IC('user-check')}<span class="k">PIC</span><span class="v">${esc(p.pic || '—')}</span></div>
        <div class="detail-row">${IC('pin')}<span class="k">Lokasi</span><span class="v">${esc(p.location || '—')}</span></div>
        <div class="detail-row">${IC('calendar')}<span class="k">Periode</span><span class="v">${fmtDate(p.start)} – ${fmtDate(p.end)}</span></div>
        <div class="detail-row">${IC('heart')}<span class="k">Penerima</span><span class="v">${benCount} orang terdaftar</span></div>
      </div>
      <div class="section-label">Donasi terverifikasi terbaru</div>
      <div class="table-wrap" style="max-height:260px;border:1px solid var(--line);border-radius:10px">
        <table>
          <thead><tr><th>Donatur</th><th>Tanggal</th><th>Jenis dana</th><th class="text-right">Nominal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`,
    footer: `<button class="btn btn-danger-quiet" type="button" data-action="delete-program" data-id="${p.id}">${IC('trash')}Hapus</button>
      <span style="flex:1"></span>
      <button class="btn btn-ghost" type="button" data-close-modal>Tutup</button>
      <button class="btn btn-secondary" type="button" data-action="edit-program" data-id="${p.id}">${IC('edit')}Edit program</button>
      <button class="btn btn-primary" type="button" data-action="add-donation" data-program="${p.id}">${IC('plus')}Catat donasi</button>`
  });
}

