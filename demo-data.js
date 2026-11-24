'use strict';

/* ============================================================
   Data demo
   ============================================================ */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
function weightedPick(rnd, items, weights) {
  const total = sum(weights);
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
function monthShiftISO(offset, day = 1) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  d.setDate(day);
  return toISO(d);
}

const DONORS_SEED = [
  ['H. Ahmad Fauzi', 'Individu', 'Rutin', 'Jakarta Selatan', '0812-1100-2244', 'ahmad.fauzi@email.com', 'Referensi', '2022-03-14', 'Pendukung lama program beasiswa. Komitmen donasi rutin Rp 1.000.000 per bulan.', 'beasiswa, alumni'],
  ['Siti Rahmawati', 'Individu', 'Aktif', 'Bandung', '0813-2244-8890', 'siti.rahmawati@email.com', 'Instagram', '2023-01-22', 'Sering terlibat sebagai relawan penggalangan dana.', 'relawan, pendidikan'],
  ['PT Barakah Sejahtera', 'Perusahaan', 'Aktif', 'Jakarta Pusat', '021-555-0188', 'csr@barakahsejahtera.co.id', 'Referensi', '2022-08-05', 'Mitra CSR untuk program infrastruktur dan air bersih.', 'csr, infrastruktur'],
  ['Yayasan Nurul Ilmi', 'Yayasan', 'Aktif', 'Bogor', '0251-882-1044', 'partner@nurulilmi.or.id', 'Event', '2023-04-11', 'Kolaborasi penyaluran beasiswa santri tahfidz.', 'kolaborasi, santri'],
  ['Muhammad Rizky Pratama', 'Individu', 'Rutin', 'Surabaya', '0812-3388-1177', 'rizky.pratama@email.com', 'Website', '2023-06-18', 'Donatur rutin untuk paket gizi balita.', 'rutin, gizi'],
  ['Dewi Anggraini', 'Individu', 'Aktif', 'Yogyakarta', '0813-9090-3344', 'dewi.anggraini@email.com', 'Instagram', '2024-02-09', 'Aktif mengikuti program kesehatan ibu dan anak.', 'kesehatan'],
  ['Komunitas Sedekah Jumat', 'Komunitas', 'Rutin', 'Depok', '0812-7700-5511', 'sedekahjumat@email.com', 'Referensi', '2022-11-30', 'Penyaluran sedekah mingguan melalui Itqan Peduli.', 'komunitas, sedekah'],
  ['PT Sentra Medika', 'Perusahaan', 'Aktif', 'Tangerang', '021-557-2299', 'partnership@sentramedika.co.id', 'Event', '2023-09-27', 'Sponsor utama klinik sehat gratis.', 'kesehatan, csr'],
  ['Ustadz Hasan Basri', 'Individu', 'Aktif', 'Bekasi', '0812-4455-6677', 'hasan.basri@email.com', 'Referensi', '2021-12-03', 'Pembina program tahfidz dan donatur tetap.', 'tahfidz, pembina'],
  ['Nadia Putri', 'Individu', 'Prospek', 'Semarang', '0813-2121-9090', 'nadia.putri@email.com', 'Website', '2026-09-02', 'Tertarik menjadi donatur rutin setelah sesi perkenalan program.', 'prospek, rutin'],
  ['Bank Amanah Syariah', 'Perusahaan', 'Aktif', 'Jakarta Pusat', '021-500-7788', 'csr@amanahsyariah.co.id', 'Referensi', '2022-05-19', 'Kerja sama penyaluran zakat karyawan.', 'zakat, csr'],
  ['Laila Kusuma', 'Individu', 'Pasif', 'Malang', '0812-8080-2121', 'laila.kusuma@email.com', 'Walk-in', '2021-07-08', 'Belum ada donasi sejak tahun lalu. Perlu reaktivasi.', 'reaktivasi'],
  ['Yayasan Cahaya Ummat', 'Yayasan', 'Aktif', 'Surakarta', '0271-722-8080', 'info@cahayaummat.or.id', 'Event', '2023-02-16', 'Menyalurkan program santunan yatim setiap akhir tahun.', 'yatim, kolaborasi'],
  ['Fikri Ramadhan', 'Individu', 'Prospek', 'Medan', '0813-6565-1122', 'fikri.ramadhan@email.com', 'Instagram', '2026-10-20', 'Menghubungi via Instagram, minta proposal program air bersih.', 'prospek, air bersih'],
  ['Ratna Sari Dewi', 'Individu', 'Rutin', 'Jakarta Timur', '0812-3131-7474', 'ratna.sari@email.com', 'Referensi', '2023-03-05', 'Donasi rutin Rp 500.000 setiap bulan untuk santunan yatim.', 'rutin, yatim'],
  ['PT Tirta Abadi Nusantara', 'Perusahaan', 'Prospek', 'Sidoarjo', '031-888-9900', 'csr@tirtaabadi.co.id', 'Website', '2026-10-28', 'Menjajaki kerja sama CSR air bersih untuk wilayah Jawa Barat.', 'csr, prospek']
];

const PROGRAM_SEED = [
  { key: 'pr-1', name: 'Beasiswa Santri Tahfidz', category: 'Pendidikan', status: 'Berjalan', pic: 'Ustadz Hasan Basri', location: 'Bogor, Jawa Barat', start: -6, end: 4, goal: 0.74, description: 'Beasiswa bulanan untuk 40 santri tahfidz dari keluarga dhuafa, mencakup biaya asrama, kitab, dan uang saku.' },
  { key: 'pr-2', name: 'Renovasi Asrama Yatim', category: 'Infrastruktur', status: 'Berjalan', pic: 'Rizal Maulana', location: 'Cianjur, Jawa Barat', start: -4, end: 3, goal: 0.58, description: 'Perbaikan atap, kamar, dan ruang belajar asrama yang menampung 32 anak yatim binaan.' },
  { key: 'pr-3', name: 'Paket Gizi Balita', category: 'Kesehatan', status: 'Berjalan', pic: 'Dewi Anggraini', location: 'Jakarta Utara', start: -3, end: 2, goal: 0.66, description: 'Distribusi paket makanan bergizi dan edukasi pola asuh untuk 120 balita berisiko stunting.' },
  { key: 'pr-4', name: 'Air Bersih Desa Cilembu', category: 'Infrastruktur', status: 'Berjalan', pic: 'Rizal Maulana', location: 'Sumedang, Jawa Barat', start: -2, end: 4, goal: 0.41, description: 'Pembangunan sumur bor dan instalasi air bersih untuk 85 keluarga di desa kekeringan.' },
  { key: 'pr-5', name: 'Klinik Sehat Gratis', category: 'Kesehatan', status: 'Selesai', pic: 'dr. Salma Huda', location: 'Bekasi, Jawa Barat', start: -9, end: -1, goal: 0.96, description: 'Layanan pemeriksaan umum dan pengobatan gratis untuk 640 warga prasejahtera.' },
  { key: 'pr-6', name: 'Santunan Yatim Akhir Tahun', category: 'Sosial', status: 'Akan Datang', pic: 'Aisyah Nur Fadhilah', location: 'Bandung, Jawa Barat', start: 1, end: 2, goal: 0.18, description: 'Santunan pendidikan dan kebutuhan pokok untuk 75 anak yatim menjelang tahun baru.' }
];

const VOLUNTEERS_SEED = [
  ['Aisyah Nur Fadhilah', 'Koordinator Program', 'Bogor', '0813-2200-7788', 'aisyahnur@email.com', 'Manajemen program, komunikasi', '2023-02-11', 'Aktif'],
  ['Rizal Maulana', 'Relawan Logistik', 'Cianjur', '0812-7711-3344', 'rizal.maulana@email.com', 'Logistik, survei lapangan', '2022-10-04', 'Aktif'],
  ['dr. Salma Huda', 'Relawan Medis', 'Bekasi', '0812-9090-1212', 'salma.huda@email.com', 'Pemeriksaan umum, pediatri', '2023-01-15', 'Aktif'],
  ['Bagus Setiawan', 'Tim Survei', 'Bandung', '0813-4343-8787', 'bagus.setiawan@email.com', 'Survei, wawancara', '2024-03-09', 'Aktif'],
  ['Nabila Zahra', 'Guru Bimbel', 'Jakarta Utara', '0812-6767-1010', 'nabila.zahra@email.com', 'Matematika, literasi', '2024-05-21', 'Aktif'],
  ['Yusuf Hidayat', 'Dokumentasi', 'Jakarta Selatan', '0813-1212-4545', 'yusuf.hidayat@email.com', 'Fotografi, videografi', '2023-08-13', 'Standby'],
  ['Imam Nawawi', 'Guru Ngaji', 'Bogor', '0812-5555-2323', 'imam.nawawi@email.com', 'Tahfidz, tajwid', '2021-09-01', 'Aktif'],
  ['Sari Melati', 'Relawan Dapur', 'Depok', '0813-8989-6767', 'sari.melati@email.com', 'Katering, kebersihan', '2024-01-19', 'Aktif'],
  ['Agus Salim', 'Driver Ambulans', 'Bekasi', '0812-3030-8585', 'agus.salim@email.com', 'Mengemudi, tanggap darurat', '2023-11-07', 'Standby'],
  ['Maya Lestari', 'Admin Data', 'Tangerang', '0813-7474-6161', 'maya.lestari@email.com', 'Entri data, pelaporan', '2024-07-02', 'Nonaktif']
];

const BENEFICIARIES_SEED = [
  ['Ahmad Zaki', 'Yatim', 'pr-1', 'Bogor', '0812-1020-3040', '2023-07-12', 'Terverifikasi'],
  ['Siti Aisyah', 'Santri', 'pr-1', 'Bogor', '0812-1020-3041', '2023-07-12', 'Terverifikasi'],
  ['Muhammad Alif', 'Yatim', 'pr-2', 'Cianjur', '0813-2030-4050', '2023-09-03', 'Terverifikasi'],
  ['Nabila Zahra', 'Dhuafa', 'pr-3', 'Jakarta Utara', '0812-3040-5060', '2024-02-18', 'Terverifikasi'],
  ['Ibu Sumiati', 'Lansia', 'pr-3', 'Jakarta Utara', '0813-4050-6070', '2024-02-18', 'Terverifikasi'],
  ['Raka Pratama', 'Pelajar', 'pr-4', 'Sumedang', '0812-5060-7080', '2026-08-25', 'Menunggu'],
  ['Ibu Nurhayati', 'Dhuafa', 'pr-4', 'Sumedang', '0813-6070-8090', '2026-08-25', 'Menunggu'],
  ['Fauzan Hakim', 'Yatim', 'pr-2', 'Cianjur', '0812-7080-9010', '2023-09-03', 'Terverifikasi'],
  ['Salma Hanifah', 'Santri', 'pr-1', 'Bogor', '0813-8090-1120', '2023-07-12', 'Terverifikasi'],
  ['Pak Darsono', 'Disabilitas', 'pr-5', 'Bekasi', '0812-9010-2230', '2025-03-10', 'Lulus'],
  ['Kirana Maharani', 'Yatim', 'pr-6', 'Bandung', '0813-1120-3340', '2026-10-05', 'Terverifikasi'],
  ['Bagas Saputra', 'Pelajar', 'pr-6', 'Bandung', '0812-2230-4450', '2026-10-05', 'Menunggu']
];

function seedInteractions(data) {
  const donors = data.donors || [];
  const has = id => donors.some(d => d.id === id);
  const today = todayISO();
  const rows = [
    { donorId: 'dn-10', channel: 'Telepon', programId: 'pr-1', date: addDaysISO(today, -2), summary: 'Sesi perkenalan program beasiswa dan rencana donasi rutin.', nextStep: 'Kirim ringkasan komitmen dan jadwal transfer.', assignee: 'Admin Operasional' },
    { donorId: 'dn-16', channel: 'WhatsApp', programId: 'pr-4', date: addDaysISO(today, -3), summary: 'Meminta proposal CSR air bersih untuk wilayah Jawa Barat.', nextStep: 'Kirim proposal dan susun jadwal presentasi.', assignee: 'Rizal Maulana' },
    { donorId: 'dn-3', channel: 'Rapat', programId: 'pr-2', date: addDaysISO(today, -5), summary: 'Pertemuan CSR triwulanan membahas renovasi asrama dan air bersih.', nextStep: 'Kirim laporan penggunaan dana triwulan lalu.', assignee: 'Admin Operasional' },
    { donorId: 'dn-8', channel: 'Email', programId: 'pr-5', date: addDaysISO(today, -8), summary: 'Konfirmasi sponsor klinik sehat gratis dan permintaan dokumentasi.', nextStep: 'Kirim album dokumentasi dan laporan penerima manfaat.', assignee: 'Aisyah Nur Fadhilah' },
    { donorId: 'dn-14', channel: 'WhatsApp', programId: 'pr-4', date: addDaysISO(today, -1), summary: 'Menanyakan jadwal kunjungan lapangan ke Desa Cilembu.', nextStep: 'Konfirmasi tanggal kunjungan bersama tim lapangan.', assignee: 'Rizal Maulana' },
    { donorId: 'dn-1', channel: 'Telepon', programId: 'pr-1', date: addDaysISO(today, -6), summary: 'Ucapan terima kasih atas donasi rutin beasiswa bulan ini.', nextStep: 'Kirim laporan bulanan beasiswa.', assignee: 'Admin Operasional' },
    { donorId: 'dn-15', channel: 'Email', programId: 'pr-6', date: addDaysISO(today, -9), summary: 'Konfirmasi penyaluran santunan yatim dan rencana donasi berikutnya.', nextStep: 'Kirim kwitansi dan jadwal penyaluran.', assignee: 'Aisyah Nur Fadhilah' }
  ];
  return rows.filter(x => has(x.donorId)).map((x, i) => ({ id: `in-${i + 1}`, ...x, createdAt: new Date().toISOString() }));
}

function seedCommitments(data) {
  const donors = data.donors || [];
  const programs = data.programs || [];
  const today = todayISO();
  const hasDonor = id => donors.some(d => d.id === id);
  const hasProgram = id => programs.some(p => p.id === id);
  const rows = [
    { donorId: 'dn-1', programId: 'pr-1', amount: 1000000, fund: 'Infaq', frequency: 'Bulanan', nextDue: addDaysISO(today, 4), status: 'Aktif', note: 'Donasi rutin beasiswa santri tahfidz.' },
    { donorId: 'dn-5', programId: 'pr-3', amount: 500000, fund: 'Sedekah', frequency: 'Bulanan', nextDue: addDaysISO(today, -2), status: 'Aktif', note: 'Paket gizi balita setiap bulan.' },
    { donorId: 'dn-7', programId: 'pr-6', amount: 750000, fund: 'Sedekah', frequency: 'Bulanan', nextDue: addDaysISO(today, 6), status: 'Aktif', note: 'Penyaluran sedekah Jumat untuk santunan yatim.' },
    { donorId: 'dn-15', programId: 'pr-6', amount: 500000, fund: 'Infaq', frequency: 'Bulanan', nextDue: addDaysISO(today, 12), status: 'Aktif', note: 'Santunan yatim rutin bulanan.' },
    { donorId: 'dn-3', programId: 'pr-4', amount: 10000000, fund: 'Donasi Umum', frequency: 'Triwulanan', nextDue: addDaysISO(today, 18), status: 'Aktif', note: 'Komitmen CSR triwulanan untuk air bersih.' },
    { donorId: 'dn-4', programId: 'pr-1', amount: 5000000, fund: 'Infaq', frequency: 'Tahunan', nextDue: addDaysISO(today, 45), status: 'Aktif', note: 'Dukungan tahunan beasiswa santri.' },
    { donorId: 'dn-8', programId: 'pr-5', amount: 15000000, fund: 'Donasi Umum', frequency: 'Tahunan', nextDue: addDaysISO(today, -40), status: 'Selesai', note: 'Sponsor klinik sehat tahun lalu.' }
  ];
  return rows.filter(x => hasDonor(x.donorId) && hasProgram(x.programId)).map((x, i) => ({ id: `co-${i + 1}`, ...x, createdAt: new Date().toISOString() }));
}

function seedProspects(data) {
  const programs = data.programs || [];
  const today = todayISO();
  const hasProgram = id => programs.some(p => p.id === id);
  const rows = [
    {
      name: 'PT Sinar Abadi', contactName: 'Rahmat Hidayat', type: 'Perusahaan', source: 'Referensi',
      phone: '021-555-1200', email: 'csr@sinarabadi.co.id', city: 'Jakarta Selatan',
      programId: 'pr-1', amount: 25000000, stage: 'Proposal', rating: 'Hot',
      owner: 'Admin Operasional', closeDate: addDaysISO(today, 12),
      nextStep: 'Kirim proposal beasiswa dan RAB', notes: 'Tertarik mendukung beasiswa untuk 20 santri.',
      createdAt: addDaysISO(today, -20), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'Yayasan Bina Insan', contactName: 'Ust. Fahmi', type: 'Yayasan', source: 'Event',
      phone: '022-720-8811', email: 'program@binainsan.org', city: 'Bandung',
      programId: 'pr-2', amount: 15000000, stage: 'Negosiasi', rating: 'Hot',
      owner: 'Aisyah Nur Fadhilah', closeDate: addDaysISO(today, 5),
      nextStep: 'Konfirmasi jadwal pencairan', notes: 'Membutuhkan laporan penggunaan dana sebelum pencairan.',
      createdAt: addDaysISO(today, -28), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'PT Nusantara Hijau', contactName: 'Dinda Prameswari', type: 'Perusahaan', source: 'Website',
      phone: '031-887-4410', email: 'csr@nusantarahijau.co.id', city: 'Surabaya',
      programId: 'pr-4', amount: 40000000, stage: 'Kualifikasi', rating: 'Warm',
      owner: 'Rizal Maulana', closeDate: addDaysISO(today, 25),
      nextStep: 'Jadwalkan presentasi program air bersih', notes: 'Sedang memetakan program CSR triwulan berikutnya.',
      createdAt: addDaysISO(today, -14), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'PT Global Amanah', contactName: 'Fajar Nugroho', type: 'Perusahaan', source: 'Event',
      phone: '021-501-7722', email: 'partnership@globalamanah.co.id', city: 'Jakarta Pusat',
      programId: 'pr-6', amount: 30000000, stage: 'Proposal', rating: 'Hot',
      owner: 'Aisyah Nur Fadhilah', closeDate: addDaysISO(today, 9),
      nextStep: 'Tindak lanjut proposal santunan akhir tahun', notes: 'Menunggu persetujuan komite CSR.',
      createdAt: addDaysISO(today, -17), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'Komunitas Peduli Desa', contactName: 'Bayu Saputra', type: 'Komunitas', source: 'Instagram',
      phone: '0813-3030-5151', email: 'halo@pedulidesa.id', city: 'Sumedang',
      programId: 'pr-4', amount: 7500000, stage: 'Dihubungi', rating: 'Warm',
      owner: 'Rizal Maulana', closeDate: addDaysISO(today, 18),
      nextStep: 'Kirim ringkasan program air bersih', notes: 'Ingin melibatkan relawan komunitas dalam survei lokasi.',
      createdAt: addDaysISO(today, -9), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'dr. Salma Huda', contactName: '', type: 'Individu', source: 'Referensi',
      phone: '0812-7220-9001', email: 'salma.huda@email.com', city: 'Bekasi',
      programId: 'pr-3', amount: 1500000, stage: 'Baru', rating: 'Warm',
      owner: 'Admin Operasional', closeDate: addDaysISO(today, 10),
      nextStep: 'Telepon perkenalan program gizi', notes: 'Direkomendasikan oleh mitra klinik.',
      createdAt: addDaysISO(today, -3), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'Ibu Nabila Rahma', contactName: '', type: 'Individu', source: 'Instagram',
      phone: '0813-4111-8080', email: 'nabila.rahma@email.com', city: 'Depok',
      programId: 'pr-3', amount: 750000, stage: 'Dihubungi', rating: 'Warm',
      owner: 'Maya Lestari', closeDate: addDaysISO(today, 6),
      nextStep: 'Kirim video dampak program gizi', notes: 'Menanyakan cara donasi rutin melalui e-wallet.',
      createdAt: addDaysISO(today, -6), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'PT Sentosa Edukasi', contactName: 'Yuni Astuti', type: 'Perusahaan', source: 'Website',
      phone: '021-299-3400', email: 'foundation@sentosa-edu.co.id', city: 'Tangerang',
      programId: 'pr-1', amount: 20000000, stage: 'Menang', rating: 'Warm',
      owner: 'Admin Operasional', closeDate: addDaysISO(today, -2),
      nextStep: 'Konversi sebagai donatur dan jadwalkan penyaluran', notes: 'Komitmen sponsor disetujui secara lisan.',
      createdAt: addDaysISO(today, -35), donorId: '', convertedAt: '', lostReason: ''
    },
    {
      name: 'CV Karya Mandiri', contactName: 'Hendra Wijaya', type: 'Perusahaan', source: 'Walk-in',
      phone: '022-444-9001', email: 'office@karyamandiri.id', city: 'Cimahi',
      programId: 'pr-2', amount: 5000000, stage: 'Batal', rating: 'Cold',
      owner: 'Admin Operasional', closeDate: addDaysISO(today, -8),
      nextStep: '', notes: 'Anggaran CSR dialihkan ke kegiatan internal.',
      createdAt: addDaysISO(today, -30), donorId: '', convertedAt: '', lostReason: 'Anggaran dialihkan ke kegiatan internal.'
    },
    {
      name: 'Yayasan Al-Falah', contactName: 'Ust. Munir', type: 'Yayasan', source: 'Referensi',
      phone: '0251-404-7788', email: 'sekretariat@al-falah.org', city: 'Bogor',
      programId: 'pr-6', amount: 12000000, stage: 'Baru', rating: 'Cold',
      owner: 'Aisyah Nur Fadhilah', closeDate: addDaysISO(today, 30),
      nextStep: 'Kirim profil organisasi dan ajukan pertemuan', notes: 'Perlu pendekatan awal ke pengurus yayasan.',
      createdAt: addDaysISO(today, -1), donorId: '', convertedAt: '', lostReason: ''
    }
  ];
  return rows.filter(x => hasProgram(x.programId)).map((x, i) => {
    const idx = PROSPECT_STAGES.findIndex(s => s.key === x.stage);
    const history = PROSPECT_STAGES.slice(0, idx + 1).map((s, k) => ({
      stage: s.key,
      at: k === 0 ? x.createdAt : addDaysISO(x.createdAt, k * 3),
      note: k === 0 ? 'Prospek dibuat' : `Tahap diperbarui ke ${s.label}`
    }));
    return { id: `ps-${i + 1}`, ...x, stageSince: history[history.length - 1].at, stageHistory: history };
  });
}

function seedData() {
  const rnd = mulberry32(20261116);
  const donors = DONORS_SEED.map((row, i) => ({
    id: `dn-${i + 1}`,
    name: row[0], type: row[1], status: row[2], city: row[3],
    phone: row[4], email: row[5], source: row[6], since: row[7],
    notes: row[8], tags: row[9].split(',').map(t => t.trim()).filter(Boolean)
  }));

  // Buat data prospek tetap terasa baru kapan pun aplikasi pertama kali dibuka.
  donors.forEach(d => {
    if (d.id === 'dn-10') d.since = monthShiftISO(0, 2);
    if (d.id === 'dn-14') d.since = monthShiftISO(-1, 20);
    if (d.id === 'dn-16') d.since = monthShiftISO(-2, 8);
  });

  const programs = PROGRAM_SEED.map(p => ({
    id: p.key, name: p.name, category: p.category, status: p.status,
    pic: p.pic, location: p.location,
    start: monthShiftISO(p.start, 1), end: monthShiftISO(p.end, 1),
    description: p.description,
    target: 0,
    goal: p.goal
  }));

  const donations = [];
  const donorPool = donors.filter(d => d.status !== 'Pasif');
  const corporateTypes = ['Perusahaan', 'Yayasan'];
  let seq = 1;

  programs.forEach(program => {
    const count = program.status === 'Selesai' ? 16 : program.status === 'Akan Datang' ? 7 : 11 + Math.floor(rnd() * 5);
    for (let i = 0; i < count; i++) {
      let offset;
      if (program.status === 'Selesai') offset = 4 + Math.floor(rnd() * 5);
      else if (program.status === 'Akan Datang') offset = Math.floor(rnd() * 2);
      else offset = weightedPick(rnd, [0, 1, 2, 3, 4, 5, 6, 7], [0.21, 0.18, 0.15, 0.13, 0.11, 0.09, 0.07, 0.06]);

      const base = new Date();
      base.setDate(1);
      base.setMonth(base.getMonth() - offset);
      const dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const maxDay = offset === 0 ? Math.max(1, Math.min(new Date().getDate(), dim)) : Math.min(28, dim);
      base.setDate(1 + Math.floor(rnd() * maxDay));

      const donor = pick(rnd, donorPool);
      const corporate = corporateTypes.includes(donor.type);
      let amount;
      if (corporate && rnd() < 0.8) amount = pick(rnd, [5000000, 10000000, 15000000, 25000000, 50000000]);
      else {
        amount = pick(rnd, [250000, 500000, 750000, 1000000, 1500000, 2500000]);
        if (corporate) amount *= 2;
      }
      if (rnd() < 0.05) amount *= 2;

      const r = rnd();
      const status = r < 0.93 ? 'Terverifikasi' : (r < 0.975 ? 'Menunggu' : 'Gagal');
      const m = rnd();
      const method = m < 0.55 ? 'Transfer Bank' : m < 0.75 ? 'QRIS' : m < 0.9 ? 'E-Wallet' : 'Tunai';
      const f = rnd();
      const fund = f < 0.2 ? 'Zakat' : f < 0.6 ? 'Infaq' : f < 0.9 ? 'Sedekah' : f < 0.96 ? 'Wakaf' : 'Donasi Umum';
      const recurring = donor.status === 'Rutin' && rnd() < 0.45;

      donations.push({
        id: `d-${seq++}`,
        donorId: donor.id,
        programId: program.id,
        amount,
        date: toISO(base),
        method,
        fund,
        status,
        recurring,
        note: recurring ? 'Donasi rutin bulanan' : ''
      });
    }
  });

  donations.sort((a, b) => b.date.localeCompare(a.date));

  programs.forEach(p => {
    const verifiedTotal = sum(donations.filter(d => d.programId === p.id && d.status === 'Terverifikasi').map(d => d.amount));
    const goal = Math.max(p.goal, 0.08);
    p.target = Math.max(25000000, Math.round((verifiedTotal / goal) / 2500000) * 2500000);
    delete p.goal;
  });

  const volunteers = VOLUNTEERS_SEED.map((row, i) => ({
    id: `vl-${i + 1}`, name: row[0], role: row[1], city: row[2], phone: row[3],
    email: row[4], skills: row[5], joined: row[6], status: row[7]
  }));

  const beneficiaries = BENEFICIARIES_SEED.map((row, i) => ({
    id: `bm-${i + 1}`, name: row[0], category: row[1], programId: row[2],
    city: row[3], phone: row[4], joined: row[5], status: row[6]
  }));

  const today = todayISO();
  // Sebagian donatur sudah diingatkan / menerima laporan agar antrean pengingat terasa nyata.
  const lastReminderAgo = { 'dn-1': 12, 'dn-3': 2, 'dn-5': 9, 'dn-7': 7, 'dn-8': 16, 'dn-13': 3, 'dn-15': 10 };
  donors.forEach(d => {
    if (lastReminderAgo[d.id] != null) d.lastReminder = addDaysISO(today, -lastReminderAgo[d.id]);
  });
  const lastReportAgo = { 'dn-1': 45, 'dn-5': 38, 'dn-8': 12, 'dn-15': 70 };
  donors.forEach(d => {
    if (lastReportAgo[d.id] != null) d.lastReport = addDaysISO(today, -lastReportAgo[d.id]);
  });
  const followups = [
    { id: 'fu-1', donorId: 'dn-10', programId: 'pr-1', title: 'Telepon konfirmasi komitmen donasi rutin', type: 'Telepon', priority: 'Tinggi', assignee: 'Admin Operasional', notes: 'Sampaikan ringkasan program dan jadwal transfer otomatis.', due: today, done: false },
    { id: 'fu-2', donorId: 'dn-16', programId: 'pr-4', title: 'Kirim proposal program air bersih', type: 'Email', priority: 'Tinggi', assignee: 'Rizal Maulana', notes: 'Lampirkan RAB, peta lokasi, dan profil penerima manfaat.', due: addDaysISO(today, 2), done: false },
    { id: 'fu-3', donorId: 'dn-3', programId: 'pr-2', title: 'Follow-up hasil pertemuan CSR', type: 'Telepon', priority: 'Tinggi', assignee: 'Admin Operasional', notes: 'Konfirmasi komitmen renovasi asrama dan jadwal pencairan.', due: addDaysISO(today, -1), done: false },
    { id: 'fu-4', donorId: 'dn-1', programId: 'pr-1', title: 'Kirim laporan penggunaan donasi beasiswa', type: 'Email', priority: 'Sedang', assignee: 'Aisyah Nur Fadhilah', notes: '', due: addDaysISO(today, 3), done: false },
    { id: 'fu-5', donorId: 'dn-8', programId: 'pr-5', title: 'Ucapan terima kasih sponsor klinik', type: 'WhatsApp', priority: 'Sedang', assignee: 'Admin Operasional', notes: '', due: addDaysISO(today, -3), done: true },
    { id: 'fu-6', donorId: 'dn-14', programId: 'pr-4', title: 'Jadwalkan kunjungan program', type: 'Kunjungan', priority: 'Sedang', assignee: 'Rizal Maulana', notes: 'Koordinasikan dengan koordinator desa.', due: addDaysISO(today, 5), done: false },
    { id: 'fu-7', donorId: '', programId: '', title: 'Perbarui data kontak donatur korporasi', type: 'Administrasi', priority: 'Rendah', assignee: 'Maya Lestari', notes: 'Lengkapi nama PIC dan nomor telepon kantor.', due: addDaysISO(today, 1), done: false },
    { id: 'fu-8', donorId: '', programId: 'pr-2', title: 'Susun laporan penyaluran triwulan', type: 'Administrasi', priority: 'Tinggi', assignee: 'Aisyah Nur Fadhilah', notes: 'Gabungkan data donasi terverifikasi dan dokumentasi lapangan.', due: addDaysISO(today, 6), done: false }
  ];

  return {
    __version: 3,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    donors, programs, donations, volunteers, beneficiaries, followups,
    interactions: seedInteractions({ donors }),
    commitments: seedCommitments({ donors, programs }),
    prospects: seedProspects({ programs })
  };
}

