'use strict';

/* ============================================================
   Konstanta, utilitas, dan format
   ============================================================ */
const STORAGE_KEY = 'itqan_crm_v1';
const ROUTE_KEY = 'itqan_crm_route';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const pad = n => String(n).padStart(2, '0');
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WEEK_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const FUNDS = ['Zakat', 'Infaq', 'Sedekah', 'Wakaf', 'Donasi Umum'];
const METHODS = ['Transfer Bank', 'QRIS', 'E-Wallet', 'Tunai'];
const DONOR_TYPES = ['Individu', 'Perusahaan', 'Yayasan', 'Komunitas'];
const DONOR_STATUSES = ['Aktif', 'Rutin', 'Prospek', 'Pasif'];
const DONOR_SOURCES = ['Referensi', 'Instagram', 'Website', 'Event', 'Walk-in', 'Lainnya'];
const PROSPECT_STAGES = [
  { key: 'Baru', label: 'Prospek baru', prob: 10, tone: 'muted' },
  { key: 'Dihubungi', label: 'Dihubungi', prob: 25, tone: 'info' },
  { key: 'Kualifikasi', label: 'Kualifikasi', prob: 45, tone: 'info' },
  { key: 'Proposal', label: 'Proposal', prob: 65, tone: 'gold' },
  { key: 'Negosiasi', label: 'Negosiasi', prob: 85, tone: 'gold' },
  { key: 'Menang', label: 'Menang', prob: 100, tone: 'green', won: true },
  { key: 'Batal', label: 'Batal', prob: 0, tone: 'red', lost: true }
];
const PROSPECT_RATINGS = ['Hot', 'Warm', 'Cold'];
const PROSPECT_FILTERS = ['Semua', 'Hot', '7 hari', 'Menang', 'Batal'];
const PROGRAM_CATEGORIES = ['Pendidikan', 'Kesehatan', 'Kemanusiaan', 'Infrastruktur', 'Sosial', 'Dakwah'];
const PROGRAM_STATUSES = ['Berjalan', 'Akan Datang', 'Selesai'];
const DONATION_STATUSES = ['Terverifikasi', 'Menunggu', 'Gagal'];
const VOLUNTEER_STATUSES = ['Aktif', 'Standby', 'Nonaktif'];
const BENEFICIARY_CATEGORIES = ['Yatim', 'Dhuafa', 'Santri', 'Lansia', 'Disabilitas', 'Pelajar'];
const BENEFICIARY_STATUSES = ['Terverifikasi', 'Menunggu', 'Lulus'];

const TASK_TYPES = ['Telepon', 'WhatsApp', 'Email', 'Kunjungan', 'Rapat', 'Administrasi'];
const PRIORITIES = ['Tinggi', 'Sedang', 'Rendah'];
const COMMIT_FREQS = ['Bulanan', 'Triwulanan', 'Tahunan'];
const COMMIT_STATUSES = ['Aktif', 'Jeda', 'Selesai'];
const INTERACTION_CHANNELS = ['WhatsApp', 'Telepon', 'Email', 'Kunjungan', 'Rapat'];
const COMM_SEGMENTS = [
  { key: 'semua', label: 'Semua donatur' },
  { key: 'rutin', label: 'Donatur rutin' },
  { key: 'mayor', label: 'Donatur mayor (≥ Rp 20 jt)' },
  { key: 'baru', label: 'Donatur baru (≤ 90 hari)' },
  { key: 'pasif', label: 'Perlu reaktivasi (12 bulan)' },
  { key: 'prospek', label: 'Prospek' }
];

const DEFAULT_SETTINGS = {
  orgName: 'Itqan Peduli',
  tagline: 'CRM Organisasi',
  address: 'Jl. Raya Puncak No. 12, Cisarua',
  city: 'Bogor, Jawa Barat 16750',
  phone: '0251-800-1234',
  email: 'halo@itqanpeduli.org',
  website: 'itqanpeduli.org',
  npwp: '01.234.567.8-901.000',
  receiptPrefix: 'KW',
  signerName: 'Admin Operasional',
  signerTitle: 'Manajer Operasional',
  receiptNote: 'Terima kasih atas kepercayaan dan dukungan Anda. Semoga menjadi amal jariyah yang terus mengalir.',
  reminderDays: 7,
  reportDays: 30,
  lastBackup: ''
};

const COMM_TEMPLATES = [
  {
    id: 'thanks', name: 'Ucapan terima kasih',
    body: `Assalamu'alaikum {sapaan} {nama},

Terima kasih atas donasi terakhir sebesar {donasi_terakhir} melalui {organisasi}. Dukungan Anda membantu program {program} terus berjalan untuk penerima manfaat.

Kami akan mengirimkan laporan penyaluran secara berkala. Semoga Allah membalas kebaikan Anda dengan berlipat ganda.

Salam hangat,
{organisasi}`
  },
  {
    id: 'routine', name: 'Pengingat donasi rutin',
    body: `Assalamu'alaikum {sapaan} {nama},

Kami ingin mengingatkan komitmen donasi {komitmen} per {frekuensi} untuk program {program}. Jadwal berikutnya jatuh pada {tenggat}.

Apabila sudah disalurkan, mohon konfirmasi agar dapat kami catat dan terbitkan kwitansi. Jika ingin mengubah jadwal, kami siap membantu.

Terima kasih,
{organisasi}`
  },
  {
    id: 'invite', name: 'Undangan program',
    body: `Assalamu'alaikum {sapaan} {nama},

Kami mengundang Anda untuk mendukung program {program}. Saat ini capaian dana telah mencapai {pencapaian} dari target {target}.

Kami terbuka untuk sesi diskusi singkat atau kunjungan lapangan agar Anda dapat melihat langsung dampaknya. Silakan balas pesan ini untuk mengatur waktu.

Salam,
{organisasi}`
  },
  {
    id: 'reactivate', name: 'Reaktivasi donatur',
    body: `Assalamu'alaikum {sapaan} {nama},

Sudah cukup lama kami tidak menerima kabar dari Anda. Kontribusi terakhir tercatat pada {terakhir} dan masih menjadi bagian penting dari perjalanan {organisasi}.

Saat ini program {program} kembali membutuhkan dukungan. Kami senang bila dapat berdiskusi singkat mengenai rencana penyaluran berikutnya.

Terima kasih,
{organisasi}`
  },
  {
    id: 'prospect', name: 'Tindak lanjut prospek',
    body: `Assalamu'alaikum {sapaan} {nama},

Terima kasih atas diskusi dan ketertarikan Anda terhadap program {program}. Bersama pesan ini kami sampaikan ringkasan singkat: dana yang terkumpul telah mencapai {pencapaian} dari target {target}.

Kami siap mengirimkan proposal lengkap atau mengatur pertemuan sesuai waktu Anda. Mohon beri tahu kami kebutuhan informasi yang masih diperlukan.

Salam,
{organisasi}`
  },
  {
    id: 'report', name: 'Laporan penyaluran',
    body: `Assalamu'alaikum {sapaan} {nama},

Berikut kabar dari program {program}. Dana yang telah tersalurkan mencapai {pencapaian} dari target {target}, dengan rincian penggunaan yang dapat kami kirimkan atas permintaan.

Total dukungan Anda yang tercatat bersama kami adalah {total}. Terima kasih telah menjadi bagian dari perubahan ini.

Salam,
{organisasi}`
  }
];

const CAT_COLORS = {
  Pendidikan: '#116b4f',
  Kesehatan: '#376f96',
  Kemanusiaan: '#a97b24',
  Infrastruktur: '#7b5aa6',
  Sosial: '#a85a3f',
  Dakwah: '#2f7d6d'
};

const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  return toISO(parseISO(value)) === value;
}
const todayISO = () => toISO(new Date());
const addDaysISO = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); };
const fmtDate = s => { if (!s) return '—'; const d = parseISO(s); return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDateShort = s => { if (!s) return '—'; const d = parseISO(s); return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`; };
const fmtDateFull = d => `${WEEK_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
const fmtIDR = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
const fmtNum = n => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
const sum = arr => arr.reduce((a, b) => a + b, 0);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function fmtShort(n, withRp = true) {
  const a = Math.abs(Number(n) || 0);
  let s;
  if (a >= 1e12) s = (a / 1e12).toFixed(a % 1e12 === 0 ? 0 : 1).replace('.', ',') + ' T';
  else if (a >= 1e9) s = (a / 1e9).toFixed(a % 1e9 === 0 ? 0 : 1).replace('.', ',') + ' M';
  else if (a >= 1e6) s = (a / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1).replace('.', ',') + ' jt';
  else if (a >= 1e3) s = Math.round(a / 1e3) + ' rb';
  else s = String(Math.round(a));
  return (withRp ? 'Rp ' : '') + s;
}

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = name => String(name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const uid = p => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const colorFor = category => CAT_COLORS[category] || '#5b7a6c';
const IC = (name, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const options = (arr, selected) => arr.map(v => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(v)}</option>`).join('');

const daysBetween = (from, to) => Math.round((parseISO(to) - parseISO(from)) / 86400000);
function addMonthsISO(s, n) {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, dim));
  return toISO(d);
}
function fmtStamp(v) {
  if (!v) return 'Belum pernah';
  const d = v.length <= 10 ? parseISO(v) : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function normalizePhone(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}
const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
function satuanRatus(n) {
  const kata = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 12) return kata[n];
  if (n < 20) return kata[n - 10] + ' belas';
  if (n < 100) return kata[Math.floor(n / 10)] + ' puluh' + (n % 10 ? ' ' + kata[n % 10] : '');
  if (n < 200) return 'seratus' + (n % 100 ? ' ' + satuanRatus(n % 100) : '');
  return kata[Math.floor(n / 100)] + ' ratus' + (n % 100 ? ' ' + satuanRatus(n % 100) : '');
}
function terbilang(value) {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (!n) return 'nol rupiah';
  const units = ['', 'ribu', 'juta', 'miliar', 'triliun'];
  const parts = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      const label = chunk === 1 && i === 1 ? 'seribu' : satuanRatus(chunk) + (units[i] ? ' ' + units[i] : '');
      parts.unshift(label);
    }
    n = Math.floor(n / 1000);
    i++;
  }
  return capitalize(parts.join(' ').replace(/\s+/g, ' ').trim()) + ' rupiah';
}

const AV_COLORS = [
  ['#e7f2ec', '#116b4f'], ['#faf3df', '#96762a'], ['#eaf2f8', '#376f96'], ['#f2edf9', '#7b5aa6'],
  ['#fbecea', '#a8463c'], ['#eef3e6', '#587534'], ['#fdf0e6', '#a5642a'], ['#e9f0f2', '#406a74']
];

function avatarStyle(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const pair = AV_COLORS[h % AV_COLORS.length];
  return `background:${pair[0]};color:${pair[1]}`;
}
function avatar(name, cls = '') {
  return `<span class="avatar ${cls}" style="${avatarStyle(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
}

const STATUS_TONE = {
  Aktif: 'ok', Rutin: 'ok', Terverifikasi: 'ok', Berjalan: 'ok', Selesai: 'ok',
  Menunggu: 'warn', Prospek: 'warn', Standby: 'warn',
  Gagal: 'danger', Nonaktif: 'danger',
  Pasif: 'muted', Lulus: 'muted', 'Akan Datang': 'info'
};
function statusChip(text, extra = '') {
  if (!text) return '';
  return `<span class="chip chip-${STATUS_TONE[text] || 'muted'} ${extra}">${esc(text)}</span>`;
}
const typeTag = type => `<span class="tag">${esc(type)}</span>`;
const priorityClass = p => p === 'Tinggi' ? 'priority-high' : p === 'Rendah' ? 'priority-low' : 'priority-med';
const priorityChip = p => `<span class="priority ${priorityClass(p || 'Sedang')}">${esc(p || 'Sedang')}</span>`;

function catBadge(category, size = '28px') {
  return `<span class="cat-dot" style="background:${colorFor(category)};width:${size};height:${size}">${esc(String(category || '?').charAt(0))}</span>`;
}

