'use strict';

/* ============================================================
   State & penyimpanan
   ============================================================ */
function normalizeFollowup(f, i = 0) {
  const reminderKind = ['reminder', 'report', 'both'].includes(f.reminderKind) ? f.reminderKind : '';
  const prev = f.reminderPrev && typeof f.reminderPrev === 'object' ? f.reminderPrev : null;
  return {
    id: f.id || `fu-${Date.now().toString(36)}${i}`,
    donorId: f.donorId || '', programId: f.programId || '',
    title: f.title || 'Tugas tanpa judul',
    type: TASK_TYPES.includes(f.type) ? f.type : 'Telepon',
    priority: PRIORITIES.includes(f.priority) ? f.priority : 'Sedang',
    assignee: f.assignee || '', notes: f.notes || '',
    due: f.due || todayISO(), done: Boolean(f.done),
    createdAt: f.createdAt || new Date().toISOString(),
    reminderKind,
    reminderPrev: reminderKind && prev
      ? { lastReminder: isISODate(prev.lastReminder) ? prev.lastReminder : '', lastReport: isISODate(prev.lastReport) ? prev.lastReport : '' }
      : null
  };
}
function normalizeInteraction(x, i = 0) {
  return {
    id: x.id || `in-${Date.now().toString(36)}${i}`,
    donorId: x.donorId || '', programId: x.programId || '',
    channel: INTERACTION_CHANNELS.includes(x.channel) ? x.channel : 'Telepon',
    date: x.date || todayISO(), summary: x.summary || '',
    nextStep: x.nextStep || '', assignee: x.assignee || '',
    createdAt: x.createdAt || new Date().toISOString()
  };
}
function normalizeCommitment(x, i = 0) {
  return {
    id: x.id || `co-${Date.now().toString(36)}${i}`,
    donorId: x.donorId || '', programId: x.programId || '',
    amount: Number(x.amount) || 0,
    fund: FUNDS.includes(x.fund) ? x.fund : 'Infaq',
    frequency: COMMIT_FREQS.includes(x.frequency) ? x.frequency : 'Bulanan',
    nextDue: x.nextDue || todayISO(),
    status: COMMIT_STATUSES.includes(x.status) ? x.status : 'Aktif',
    note: x.note || '', createdAt: x.createdAt || new Date().toISOString()
  };
}
function normalizeProspect(x, i = 0) {
  const stage = PROSPECT_STAGES.some(s => s.key === x.stage) ? x.stage : 'Baru';
  const createdAt = x.createdAt || todayISO();
  const history = (Array.isArray(x.stageHistory) ? x.stageHistory : [])
    .filter(h => h && PROSPECT_STAGES.some(s => s.key === h.stage))
    .map(h => ({ stage: h.stage, at: h.at || createdAt, note: h.note || '' }));
  return {
    id: x.id || `ps-${Date.now().toString(36)}${i}`,
    name: x.name || 'Prospek tanpa nama',
    contactName: x.contactName || '',
    type: DONOR_TYPES.includes(x.type) ? x.type : 'Perusahaan',
    source: DONOR_SOURCES.includes(x.source) ? x.source : 'Referensi',
    phone: x.phone || '', email: x.email || '', city: x.city || '',
    programId: x.programId || '',
    amount: Number(x.amount) || 0,
    stage,
    rating: PROSPECT_RATINGS.includes(x.rating) ? x.rating : 'Warm',
    owner: x.owner || '',
    closeDate: x.closeDate || addDaysISO(todayISO(), 14),
    nextStep: x.nextStep || '', notes: x.notes || '',
    createdAt,
    stageSince: x.stageSince || (history.length ? history[history.length - 1].at : createdAt),
    stageHistory: history.length ? history : [{ stage, at: createdAt, note: 'Prospek dibuat' }],
    donorId: x.donorId || '', convertedAt: x.convertedAt || '', lostReason: x.lostReason || ''
  };
}
function normalizeState(data, seedMissing = true) {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.donors) || !Array.isArray(data.programs) || !Array.isArray(data.donations)) return null;
  data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
  const reminderDays = Number(data.settings.reminderDays);
  const reportDays = Number(data.settings.reportDays);
  data.settings.reminderDays = [7, 14, 30].includes(reminderDays) ? reminderDays : 7;
  data.settings.reportDays = [30, 60, 90].includes(reportDays) ? reportDays : 30;
  data.donors = data.donors.map(d => ({
    ...d,
    lastReminder: isISODate(d.lastReminder) ? d.lastReminder : '',
    lastReport: isISODate(d.lastReport) ? d.lastReport : ''
  }));
  data.volunteers = Array.isArray(data.volunteers) ? data.volunteers : [];
  data.beneficiaries = Array.isArray(data.beneficiaries) ? data.beneficiaries : [];
  data.followups = (Array.isArray(data.followups) ? data.followups : []).map(normalizeFollowup);
  data.interactions = Array.isArray(data.interactions)
    ? data.interactions.map(normalizeInteraction)
    : (seedMissing ? seedInteractions(data) : []);
  data.commitments = Array.isArray(data.commitments)
    ? data.commitments.map(normalizeCommitment)
    : (seedMissing ? seedCommitments(data) : []);
  data.prospects = Array.isArray(data.prospects)
    ? data.prospects.map(normalizeProspect)
    : (seedMissing ? seedProspects(data) : []);
  data.__version = 3;
  return data;
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    const data = JSON.parse(raw);
    return normalizeState(data, true) || seedData();
  } catch (err) {
    return seedData();
  }
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    toast('Perubahan tidak dapat disimpan di perangkat ini.', 'danger');
  }
}

const ui = {
  donorSearch: '', donorStatus: 'Semua', donorType: 'Semua', donorSort: 'recent', donorSegment: 'semua',
  donationSearch: '', donationStatus: 'Semua', donationProgram: 'Semua', donationMonth: 'Semua',
  programFilter: 'Semua',
  volunteerSearch: '', volunteerStatus: 'Semua',
  beneficiarySearch: '', beneficiaryCategory: 'Semua',
  trendRange: 6,
  reportPeriod: 'bulan',
  taskFilter: 'open', taskType: 'Semua',
  commitFilter: 'Semua',
  commTemplate: 'thanks', commSegment: 'semua', commProgram: '',
  interactionChannel: 'Semua',
  pipelineView: 'papan', pipelineFilter: 'Semua', pipelineSearch: '',
  currentPage: 'dashboard'
};

/* ============================================================
   Turunan data
   ============================================================ */
const donorById = id => state.donors.find(d => d.id === id);
const programById = id => state.programs.find(p => p.id === id);
const verifiedDonations = () => state.donations.filter(d => d.status === 'Terverifikasi');

function donorStats(id) {
  const all = state.donations.filter(d => d.donorId === id);
  const ok = all.filter(d => d.status === 'Terverifikasi');
  return {
    total: sum(ok.map(d => d.amount)),
    count: ok.length,
    last: ok.map(d => d.date).sort().pop() || '',
    pending: all.filter(d => d.status === 'Menunggu').length
  };
}

function programStats(id) {
  const ok = state.donations.filter(d => d.programId === id && d.status === 'Terverifikasi');
  return {
    total: sum(ok.map(d => d.amount)),
    count: ok.length,
    donors: new Set(ok.map(d => d.donorId)).size
  };
}

function programProgress(program) {
  const s = programStats(program.id);
  const pct = program.target > 0 ? clamp((s.total / program.target) * 100, 0, 100) : 0;
  return Object.assign({}, s, { pct });
}

const prospectById = id => state.prospects.find(p => p.id === id);
const stageMeta = key => PROSPECT_STAGES.find(s => s.key === key) || PROSPECT_STAGES[0];
const isOpenProspect = p => { const m = stageMeta(p.stage); return !m.won && !m.lost; };
const prospectOpenList = () => state.prospects.filter(isOpenProspect);
function daysSinceISO(s) {
  if (!s) return 0;
  const a = parseISO(s); const b = new Date();
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
function pipelineStats() {
  const all = state.prospects;
  const open = all.filter(isOpenProspect);
  const won = all.filter(p => stageMeta(p.stage).won);
  const lost = all.filter(p => stageMeta(p.stage).lost);
  const decided = won.length + lost.length;
  const byStage = PROSPECT_STAGES.map(s => {
    const rows = all.filter(p => p.stage === s.key);
    return {
      stage: s,
      count: rows.length,
      value: sum(rows.map(p => p.amount)),
      weighted: sum(rows.map(p => p.amount * s.prob / 100))
    };
  });
  return {
    all, open, won, lost, byStage,
    openCount: open.length,
    openValue: sum(open.map(p => p.amount)),
    weighted: sum(open.map(p => p.amount * stageMeta(p.stage).prob / 100)),
    wonCount: won.length,
    wonValue: sum(won.map(p => p.amount)),
    lostCount: lost.length,
    winRate: decided ? Math.round(won.length / decided * 100) : 0,
    avgDeal: won.length ? sum(won.map(p => p.amount)) / won.length : 0,
    hotCount: open.filter(p => p.rating === 'Hot').length,
    staleCount: open.filter(p => daysSinceISO(p.stageSince) >= 7).length,
    dueSoonCount: open.filter(p => {
      const d = daysSinceISO(p.closeDate);
      return d <= 0 && d >= -14;
    }).length
  };
}
function prospectFiltered() {
  const q = ui.pipelineSearch.trim().toLowerCase();
  return state.prospects.filter(p => {
    const meta = stageMeta(p.stage);
    if (ui.pipelineFilter === 'Hot' && !(isOpenProspect(p) && p.rating === 'Hot')) return false;
    if (ui.pipelineFilter === '7 hari' && !(isOpenProspect(p) && daysSinceISO(p.stageSince) >= 7)) return false;
    if (ui.pipelineFilter === 'Menang' && !meta.won) return false;
    if (ui.pipelineFilter === 'Batal' && !meta.lost) return false;
    if (q) {
      const hay = `${p.name} ${p.contactName} ${p.city} ${p.email} ${p.phone}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function monthKeyShift(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthTotal(offset) {
  const key = monthKeyShift(offset);
  return sum(verifiedDonations().filter(d => String(d.date).slice(0, 7) === key).map(d => d.amount));
}
function monthTotalToDate(offset) {
  const key = monthKeyShift(offset);
  const day = new Date().getDate();
  return sum(verifiedDonations().filter(d => {
    return String(d.date).slice(0, 7) === key && Number(String(d.date).slice(8, 10)) <= day;
  }).map(d => d.amount));
}
function monthCount(offset) {
  const key = monthKeyShift(offset);
  return verifiedDonations().filter(d => String(d.date).slice(0, 7) === key).length;
}
function trendSeries(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const total = sum(verifiedDonations().filter(x => String(x.date).slice(0, 7) === key).map(x => x.amount));
    out.push({
      label: MONTH_SHORT[d.getMonth()],
      full: `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`,
      total,
      count: verifiedDonations().filter(x => String(x.date).slice(0, 7) === key).length
    });
  }
  return out;
}

/* ============================================================
   Turunan alur kerja, komitmen, dan segmentasi
   ============================================================ */
function openTasks() {
  return state.followups.filter(f => !f.done);
}
function taskFiltered() {
  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);
  let list = state.followups.slice();
  switch (ui.taskFilter) {
    case 'overdue': list = list.filter(f => !f.done && f.due < today); break;
    case 'today': list = list.filter(f => !f.done && f.due === today); break;
    case 'week': list = list.filter(f => !f.done && f.due <= weekEnd); break;
    case 'done': list = list.filter(f => f.done); break;
    case 'open': list = list.filter(f => !f.done); break;
    default: break;
  }
  if (ui.taskType !== 'Semua') list = list.filter(f => f.type === ui.taskType);
  const weight = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const due = String(a.due).localeCompare(String(b.due));
    if (due !== 0) return due;
    return (weight[a.priority] ?? 1) - (weight[b.priority] ?? 1);
  });
}
function tasksDueSoon(days = 0) {
  const limit = addDaysISO(todayISO(), days);
  return openTasks().filter(f => f.due <= limit);
}

/* --- Pengingat donatur berkala --- */
function reminderDays() {
  const n = Number(state.settings.reminderDays);
  return [7, 14, 30].includes(n) ? n : 7;
}
function reportDays() {
  const n = Number(state.settings.reportDays);
  return [30, 60, 90].includes(n) ? n : 30;
}
function reminderKindLabel(kind) {
  return kind === 'both' ? 'Pengingat + laporan' : kind === 'report' ? 'Laporan penyaluran' : 'Pengingat';
}
function latestVerifiedDonation(donorId) {
  return state.donations
    .filter(d => d.donorId === donorId && d.status === 'Terverifikasi')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}
function openReminderTaskFor(donorId) {
  return state.followups.find(f => !f.done && f.donorId === donorId && f.reminderKind) || null;
}
function reminderItem(donor) {
  if (!donor) return null;
  const stats = donorStats(donor.id);
  const lastReminder = isISODate(donor.lastReminder) ? donor.lastReminder : '';
  const lastReport = isISODate(donor.lastReport) ? donor.lastReport : '';
  const reminderAge = lastReminder ? Math.max(0, daysSinceISO(lastReminder)) : null;
  const reportAge = lastReport ? Math.max(0, daysSinceISO(lastReport)) : null;
  const needsReminder = reminderAge === null || reminderAge >= reminderDays();
  const needsReport = stats.count > 0 && (reportAge === null || reportAge >= reportDays());
  if (!needsReminder && !needsReport) return null;
  return {
    donor, stats, needsReminder, needsReport, lastReminder, lastReport, reminderAge, reportAge,
    kind: needsReminder && needsReport ? 'both' : needsReminder ? 'reminder' : 'report',
    lastDonation: latestVerifiedDonation(donor.id),
    scheduled: openReminderTaskFor(donor.id)
  };
}
function reminderQueue() {
  const rank = item => (item.needsReminder && item.reminderAge === null ? 3 : item.needsReminder && item.needsReport ? 2 : item.needsReminder ? 1 : 0);
  return state.donors
    .filter(d => d.status === 'Aktif' || d.status === 'Rutin')
    .map(reminderItem)
    .filter(item => item && !item.scheduled)
    .sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(b) - rank(a);
      const aAge = Math.max(a.reminderAge ?? 0, a.reportAge ?? 0);
      const bAge = Math.max(b.reminderAge ?? 0, b.reportAge ?? 0);
      if (aAge !== bAge) return bAge - aAge;
      return a.donor.name.localeCompare(b.donor.name, 'id');
    });
}
function scheduledReminderCount() {
  return state.followups.filter(f => !f.done && f.reminderKind && donorById(f.donorId)).length;
}
function applyReminderMark(donor, kind, date) {
  if (!donor) return;
  if (kind === 'reminder' || kind === 'both') donor.lastReminder = date;
  if (kind === 'report' || kind === 'both') donor.lastReport = date;
}
function reminderMessage(donor, kind) {
  const org = state.settings.orgName;
  const stats = donorStats(donor.id);
  const last = latestVerifiedDonation(donor.id);
  const program = last ? programById(last.programId) : null;
  const progress = program ? programProgress(program) : null;
  const lines = [`Assalamu'alaikum Bapak/Ibu ${donor.name},`, ''];
  if (kind === 'report') {
    lines.push(`Berikut kabar dari ${org}${program ? ` untuk program ${program.name}` : ''}.`);
    if (last) lines.push(`Donasi terakhir Anda tercatat ${fmtIDR(last.amount)} pada ${fmtDate(last.date)}.`);
    if (progress) lines.push(`Saat ini program telah mencapai ${Math.round(progress.pct)}% dari target ${fmtIDR(program.target)} dan terus berjalan untuk penerima manfaat.`);
    lines.push(`Total dukungan Anda yang tercatat bersama kami ${fmtIDR(stats.total)}. Rincian penggunaan dana dapat kami kirimkan bila diperlukan.`);
  } else {
    lines.push(`Kami dari ${org} ingin menyapa dan memastikan kabar baik Anda.`);
    if (last) lines.push(`Terima kasih atas donasi terakhir ${fmtIDR(last.amount)} pada ${fmtDate(last.date)}${program ? ` untuk program ${program.name}` : ''}.`);
    else lines.push('Terima kasih telah menjadi bagian dari perjalanan kami.');
    if (kind === 'both' && progress) {
      lines.push(`Sebagai kabar, program ${program.name} telah mencapai ${Math.round(progress.pct)}% dari target ${fmtIDR(program.target)}.`);
      lines.push(`Total dukungan Anda yang tercatat bersama kami ${fmtIDR(stats.total)}.`);
    }
    lines.push('Jika ada pertanyaan, masukan, atau keinginan mengunjungi program, silakan balas pesan ini.');
  }
  lines.push('', 'Terima kasih,', org);
  return lines.join('\n');
}

function commitmentMonthly(c) {
  if (c.frequency === 'Triwulanan') return c.amount / 3;
  if (c.frequency === 'Tahunan') return c.amount / 12;
  return c.amount;
}
function commitmentFiltered() {
  let list = state.commitments.slice();
  if (ui.commitFilter === 'Jatuh tempo') list = list.filter(c => c.status === 'Aktif' && c.nextDue <= addDaysISO(todayISO(), 7));
  else if (ui.commitFilter !== 'Semua') list = list.filter(c => c.status === ui.commitFilter);
  return list.sort((a, b) => {
    const order = { Aktif: 0, Jeda: 1, Selesai: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return String(a.nextDue).localeCompare(String(b.nextDue));
  });
}
function advanceCommitment(c) {
  if (!c || c.status !== 'Aktif') return;
  const step = c.frequency === 'Bulanan' ? 1 : c.frequency === 'Triwulanan' ? 3 : 12;
  c.nextDue = addMonthsISO(c.nextDue || todayISO(), step);
}
function dueCommitments(days = 7) {
  const limit = addDaysISO(todayISO(), days);
  return state.commitments.filter(c => c.status === 'Aktif' && c.nextDue <= limit);
}

function donorSegmentMap() {
  const ok = verifiedDonations();
  const lastById = new Map();
  ok.forEach(d => {
    if (!lastById.has(d.donorId) || d.date > lastById.get(d.donorId)) lastById.set(d.donorId, d.date);
  });
  const commitmentDonors = new Set(state.commitments.filter(c => c.status === 'Aktif').map(c => c.donorId));
  const today = todayISO();
  return {
    semua: state.donors,
    rutin: state.donors.filter(d => d.status === 'Rutin' || commitmentDonors.has(d.id)),
    mayor: state.donors.filter(d => donorStats(d.id).total >= 20000000),
    prospek: state.donors.filter(d => d.status === 'Prospek'),
    baru: state.donors.filter(d => daysBetween(d.since, today) <= 90),
    pasif: state.donors.filter(d => {
      const last = lastById.get(d.id);
      if (d.status === 'Pasif') return true;
      if (last) return daysBetween(last, today) > 365;
      return d.status !== 'Prospek' && daysBetween(d.since, today) > 365;
    })
  };
}

function donorHealth() {
  const today = todayISO();
  const yearAgo = addDaysISO(today, -365);
  const recentStart = addDaysISO(today, -90);
  const prevStart = addDaysISO(today, -180);
  const ok = verifiedDonations();
  const prev = new Set(ok.filter(d => d.date >= prevStart && d.date < recentStart).map(d => d.donorId));
  const recent = new Set(ok.filter(d => d.date >= recentStart).map(d => d.donorId));
  const retained = [...prev].filter(id => recent.has(id)).length;
  const ranked = state.donors
    .map(d => ({ donor: d, total: donorStats(d.id).total }))
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const totalAll = sum(ranked.map(x => x.total));
  const top10 = ranked.slice(0, 10);
  const recurring = ok.filter(d => d.recurring).length;
  const lapsed = state.donors.filter(d => {
    const s = donorStats(d.id);
    if (d.status === 'Pasif') return true;
    if (s.last) return s.last < yearAgo;
    return d.status !== 'Prospek' && daysBetween(d.since, today) > 365;
  });
  return {
    retention: prev.size ? Math.round((retained / prev.size) * 100) : 0,
    retained, prevCount: prev.size,
    recurringShare: ok.length ? Math.round((recurring / ok.length) * 100) : 0,
    top10Share: totalAll ? Math.round((sum(top10.map(x => x.total)) / totalAll) * 100) : 0,
    lapsed
  };
}

function commAudience() {
  return donorSegmentMap()[ui.commSegment] || state.donors;
}
function commProgram() {
  return programById(ui.commProgram) || state.programs.find(p => p.status === 'Berjalan') || state.programs[0] || null;
}
function buildCommMessage(templateId, donor) {
  const tpl = COMM_TEMPLATES.find(t => t.id === templateId) || COMM_TEMPLATES[0];
  const s = donorStats(donor.id);
  const commit = state.commitments.find(c => c.donorId === donor.id && c.status === 'Aktif');
  const program = commProgram();
  const progress = program ? programProgress(program) : { pct: 0 };
  const vars = {
    nama: donor.name, sapaan: 'Bapak/Ibu',
    organisasi: state.settings.orgName,
    total: s.total ? fmtIDR(s.total) : '—',
    donasi_terakhir: s.last ? fmtIDR(state.donations.find(d => d.donorId === donor.id && d.date === s.last && d.status === 'Terverifikasi')?.amount || 0) : '—',
    terakhir: s.last ? fmtDate(s.last) : '—',
    program: program ? program.name : 'program sosial kami',
    target: program ? fmtShort(program.target) : '—',
    pencapaian: `${Math.round(progress.pct)}%`,
    tenggat: commit ? fmtDate(commit.nextDue) : '—',
    komitmen: commit ? fmtIDR(commit.amount) : '—',
    frekuensi: commit ? commit.frequency.toLowerCase() : '—'
  };
  let body = tpl.body;
  if (!s.last) {
    body = body
      .replace('Terima kasih atas donasi terakhir sebesar {donasi_terakhir} melalui {organisasi}.', 'Terima kasih atas kepercayaan Anda kepada {organisasi}.')
      .replace('Kontribusi terakhir tercatat pada {terakhir} dan masih menjadi bagian penting dari perjalanan {organisasi}.', 'Hubungan Anda dengan {organisasi} masih menjadi bagian penting dari perjalanan kami.');
  }
  if (!commit && templateId === 'routine') {
    body = body.replace('Kami ingin mengingatkan komitmen donasi {komitmen} per {frekuensi} untuk program {program}. Jadwal berikutnya jatuh pada {tenggat}.', 'Kami ingin mengingatkan komitmen donasi rutin untuk program {program}.');
  }
  return body.replace(/\{(\w+)\}/g, (m, key) => vars[key] ?? m);
}

