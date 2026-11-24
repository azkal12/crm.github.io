'use strict';

/* ============================================================
   Delegasi aksi
   ============================================================ */
function handleAction(action, el) {
  const id = el.dataset.id;
  switch (action) {
    case 'open-donor': openDonorDrawer(id); break;
    case 'add-donor': openDonorForm(); break;
    case 'edit-donor': openDonorForm(id); break;
    case 'delete-donor': confirmDeleteDonor(id); break;
    case 'add-donation': openDonationForm({ donorId: id || undefined, programId: el.dataset.program || undefined }); break;
    case 'edit-donation': openDonationForm({ id }); break;
    case 'delete-donation': confirmDeleteDonation(id); break;
    case 'open-program': openProgramDetail(id); break;
    case 'add-program': openProgramForm(); break;
    case 'edit-program': openProgramForm(id); break;
    case 'delete-program': confirmDeleteProgram(id); break;
    case 'program-filter': ui.programFilter = el.dataset.status || 'Semua'; renderRoute(); break;
    case 'add-volunteer': openVolunteerForm(); break;
    case 'edit-volunteer': openVolunteerForm(id); break;
    case 'delete-volunteer': confirmDeleteVolunteer(id); break;
    case 'add-beneficiary': openBeneficiaryForm(); break;
    case 'edit-beneficiary': openBeneficiaryForm(id); break;
    case 'delete-beneficiary': confirmDeleteBeneficiary(id); break;
    case 'add-followup': openFollowupForm('', el.dataset.donor || el.dataset.id || ''); break;
    case 'edit-followup': openFollowupForm(id); break;
    case 'reminder-send': sendDonorReminder(id, el.dataset.kind || 'reminder'); break;
    case 'reminder-task': createReminderTask(id, el.dataset.kind || 'reminder'); break;
    case 'reminder-log': openReminderLog(id, el.dataset.kind || 'reminder'); break;
    case 'reminder-create-all': createReminderTasksForQueue(); break;
    case 'open-reminders': openReminderCenter(); break;
    case 'task-filter': ui.taskFilter = el.dataset.filter || 'open'; renderKeepScroll(); break;
    case 'commit-filter': ui.commitFilter = el.dataset.filter || 'Semua'; renderKeepScroll(); break;
    case 'toggle-followup': {
      const f = state.followups.find(x => x.id === id);
      if (f) {
        f.done = !f.done;
        if (f.reminderKind && f.donorId) {
          const donor = donorById(f.donorId);
          if (donor) {
            if (f.done) {
              f.reminderPrev = { lastReminder: donor.lastReminder || '', lastReport: donor.lastReport || '' };
              applyReminderMark(donor, f.reminderKind, todayISO());
              toast(`Tugas selesai. ${donor.name} ditandai sudah diingatkan.`);
            } else if (f.reminderPrev) {
              donor.lastReminder = f.reminderPrev.lastReminder || '';
              donor.lastReport = f.reminderPrev.lastReport || '';
              f.reminderPrev = null;
              toast(`Status pengingat ${donor.name} dikembalikan.`, 'info');
            }
          }
        }
        saveState();
        renderKeepScroll();
      }
      break;
    }
    case 'delete-followup': {
      const f = state.followups.find(x => x.id === id);
      if (!f) break;
      confirmAction({
        title: 'Hapus tugas?',
        message: `<b>${esc(f.title)}</b> akan dihapus dari daftar tugas.`,
        confirmLabel: 'Hapus tugas',
        onConfirm() {
          state.followups = state.followups.filter(x => x.id !== id);
          saveState();
          renderRoute();
          toast('Tugas dihapus.');
        }
      });
      break;
    }
    case 'add-commitment': openCommitmentForm(); break;
    case 'edit-commitment': openCommitmentForm(id); break;
    case 'delete-commitment': confirmDeleteCommitment(id); break;
    case 'add-prospect': openProspectForm('', el.dataset.stage || 'Baru'); break;
    case 'edit-prospect': openProspectForm(id); break;
    case 'prospect-detail': openProspectDetail(id); break;
    case 'prospect-filter': ui.pipelineFilter = el.dataset.filter || 'Semua'; renderKeepScroll(); break;
    case 'prospect-view': ui.pipelineView = el.dataset.view === 'daftar' ? 'daftar' : 'papan'; renderKeepScroll(); break;
    case 'prospect-stage-apply': {
      const p = prospectById(id);
      const sel = $('#prospect-stage-select');
      if (p && sel) {
        if (p.stage === sel.value) { toast('Tahap tidak berubah.', 'info'); break; }
        const label = stageMeta(sel.value).label;
        changeProspectStage(p, sel.value);
        saveState();
        renderRoute();
        toast(`Tahap diperbarui ke ${label}.`);
        openProspectDetail(p.id);
      }
      break;
    }
    case 'prospect-to-task': {
      const p = prospectById(id);
      if (p) openProspectTaskForm(p);
      break;
    }
    case 'prospect-wa': openProspectWhatsApp(id); break;
    case 'convert-prospect': convertProspectToDonor(id); break;
    case 'delete-prospect': {
      const p = prospectById(id);
      if (!p) break;
      confirmAction({
        title: 'Hapus prospek?',
        message: `<b>${esc(p.name)}</b> akan dihapus dari pipeline.${p.donorId ? ' Data donatur hasil konversi tetap tersimpan.' : ''}`,
        confirmLabel: 'Hapus prospek',
        onConfirm() {
          state.prospects = state.prospects.filter(x => x.id !== id);
          saveState();
          renderRoute();
          toast('Prospek dihapus.');
        }
      });
      break;
    }
    case 'commit-to-donation': {
      const c = state.commitments.find(x => x.id === id);
      if (c) openDonationForm({ donorId: c.donorId, programId: c.programId, amount: c.amount, fund: c.fund, commitmentId: c.id });
      break;
    }
    case 'add-interaction': openInteractionForm(id || ''); break;
    case 'edit-interaction': openInteractionForm(id); break;
    case 'delete-interaction': confirmDeleteInteraction(id); break;
    case 'donor-segment': ui.donorSegment = el.dataset.segment || 'semua'; renderKeepScroll(); break;
    case 'message-donor': openWhatsApp(id); break;
    case 'wa-message': openWhatsApp(id); break;
    case 'comm-copy': {
      const first = commAudience()[0];
      copyText(first ? buildCommMessage(ui.commTemplate, first) : (COMM_TEMPLATES.find(t => t.id === ui.commTemplate) || COMM_TEMPLATES[0]).body);
      break;
    }
    case 'comm-copy-donor': {
      const donor = donorById(id);
      if (donor) copyText(buildCommMessage(ui.commTemplate, donor));
      break;
    }
    case 'export-audience': exportAudience(); break;
    case 'reactivate-donors':
      ui.commTemplate = 'reactivate';
      ui.commSegment = 'pasif';
      goTo('komunikasi');
      break;
    case 'receipt': openReceipt(id); break;
    case 'print-receipt': printReceipt(id); break;
    case 'download-backup': downloadBackup(); break;
    case 'import-backup': {
      const input = $('#backup-file');
      if (input) input.click();
      break;
    }
    case 'go': goTo(el.dataset.page || 'dashboard'); break;
    case 'trend-range': {
      ui.trendRange = Number(el.dataset.range) === 12 ? 12 : 6;
      const panel = $('#trend-panel');
      if (panel) panel.innerHTML = trendPanelHTML();
      $$('[data-action="trend-range"]').forEach(b => b.classList.toggle('active', Number(b.dataset.range) === ui.trendRange));
      break;
    }
    case 'export': exportKind(el.dataset.kind || 'donations'); break;
    case 'print-report': window.print(); break;
    case 'reset-data': confirmResetData(); break;
    case 'search-open': {
      const type = el.dataset.type;
      closeSearch();
      const input = $('#global-search');
      if (input) input.value = '';
      if (type === 'donor') openDonorDrawer(id);
      else if (type === 'prospect') openProspectDetail(id);
      else if (type === 'program') openProgramDetail(id);
      else if (type === 'task') openFollowupForm(id);
      else if (type === 'volunteer') {
        const v = state.volunteers.find(x => x.id === id);
        if (v) { ui.volunteerSearch = v.name; ui.volunteerStatus = 'Semua'; goTo('relawan'); }
      } else if (type === 'beneficiary') {
        const b = state.beneficiaries.find(x => x.id === id);
        if (b) { ui.beneficiarySearch = b.name; ui.beneficiaryCategory = 'Semua'; goTo('penerima'); }
      }
      break;
    }
    default: break;
  }
}

function handleGlobalClick(e) {
  const routeLink = e.target.closest('a[href^="#/"]');
  if (routeLink && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    closeSearch();
    goTo(routeLink.getAttribute('href').replace(/^#\//, '').split('?')[0].replace(/\/+$/, ''));
    return;
  }
  const actionEl = e.target.closest('[data-action]');
  if (actionEl) {
    handleAction(actionEl.dataset.action, actionEl);
    return;
  }
  if (e.target.closest('[data-close-modal]')) { closeModal(); return; }
  if (e.target.matches('[data-modal-overlay]')) { closeModal(); return; }
  if (e.target.closest('[data-close-drawer]')) { closeDrawer(); return; }
  if (!e.target.closest('#search-wrap')) closeSearch();
}

/* ============================================================
   Navigasi mobile & inisialisasi
   ============================================================ */
function openMobileNav() {
  $('#app').classList.add('nav-open');
  $('#nav-scrim').classList.add('show');
}
function closeMobileNav() {
  $('#app').classList.remove('nav-open');
  $('#nav-scrim').classList.remove('show');
}

function notifyReminderQueue() {
  const count = reminderQueue().length;
  if (!count) return;
  try {
    if (sessionStorage.getItem('itqan_crm_reminder_notified') === todayISO()) return;
    sessionStorage.setItem('itqan_crm_reminder_notified', todayISO());
  } catch (err) { /* abaikan */ }
  toast(`${count} donatur belum diingatkan. Buka Tugas & pengingat untuk menindaklanjuti.`, 'info', 5600);
}

function init() {
  $('#date-chip-text').textContent = fmtDateFull(new Date());

  const startRoute = initialRoute();
  if (location.hash !== '#/' + startRoute) {
    try { history.replaceState(null, '', '#/' + startRoute); }
    catch (err) { location.hash = '#/' + startRoute; }
  }
  window.addEventListener('hashchange', renderRoute);
  window.addEventListener('popstate', renderRoute);

  $('#menu-btn').addEventListener('click', () => {
    if ($('#app').classList.contains('nav-open')) closeMobileNav();
    else openMobileNav();
  });
  $('#nav-scrim').addEventListener('click', closeMobileNav);

  $('#primary-action').addEventListener('click', () => {
    switch (ui.currentPage) {
      case 'donatur': openDonorForm(); break;
      case 'pipeline': openProspectForm(); break;
      case 'tugas': openFollowupForm(); break;
      case 'komitmen': openCommitmentForm(); break;
      case 'komunikasi': openInteractionForm(); break;
      case 'pengaturan': downloadBackup(); break;
      case 'program': openProgramForm(); break;
      case 'relawan': openVolunteerForm(); break;
      case 'penerima': openBeneficiaryForm(); break;
      case 'laporan': exportKind('donations'); break;
      default: openDonationForm();
    }
  });

  const search = $('#global-search');
  search.addEventListener('input', e => renderSearch(e.target.value));
  search.addEventListener('focus', e => { if (e.target.value.trim()) renderSearch(e.target.value); });
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('#search-results .search-hit');
      if (first) {
        e.preventDefault();
        first.click();
      }
    }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      search.focus();
      search.select();
      return;
    }
    if (e.key === 'Escape') {
      if ($('#modal-root') && $('#modal-root').innerHTML.trim()) closeModal();
      else if ($('#drawer-root') && $('#drawer-root').innerHTML.trim()) closeDrawer();
      else if (!$('#search-results').hidden) { closeSearch(); search.blur(); }
      else closeMobileNav();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action][role="button"]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  document.addEventListener('click', handleGlobalClick);

  saveState();
  renderRoute();
  notifyReminderQueue();
}

init();
