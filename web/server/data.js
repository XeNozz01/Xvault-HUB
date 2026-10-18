/**
 * Xvault HUB — Data Engine
 * ------------------------------------------------------------------
 * Semua data di modul ini adalah data simulasi (seeded / deterministik)
 * yang dibuat agar struktur website SA-MP terasa nyata: leaderboard,
 * statistik server, kualitas layanan, sistem gamemode, tiket, log admin,
 * dsb. Tidak ada database eksternal yang dibutuhkan untuk demo.
 *
 * Jika ingin dihubungkan ke server SA-MP asli, ganti fungsi `build*()`
 * dengan query ke plugin MySQL / SQLite gamemode (punitive, apache, dll)
 * atau ke RPC (HTTP/AMP) dari gamemode pawn.
 */

'use strict';

/* ------------------------------------------------------------------ *
 * 1. Utilities
 * ------------------------------------------------------------------ */

/** PRNG deterministik (mulberry32) supaya data demo selalu konsisten. */
function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const int = (r, min, max) => min + Math.floor(r() * (max - min + 1));
const flt = (r, min, max, d = 2) => +(min + r() * (max - min)).toFixed(d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ago = (ms) => new Date(now - ms).toISOString();

/* ------------------------------------------------------------------ *
 * 2. Konfigurasi brand & server
 * ------------------------------------------------------------------ */

const BRAND = {
  name: 'Xvault HUB',
  tagline: 'Server SA-MP Indonesia — Roleplay, Gangwar & Cops n Robbers',
  domain: 'play.xvaulthub.id',
  discord: 'discord.gg/xvaulthub',
  email: 'staff@xvaulthub.id',
  founded: 2019,
  version: '2.4.1',
  map: 'San Andreas 0.3.7 / 0.3.DL',
  lang: ['id', 'en'],
};

const SERVERS = [
  {
    id: 'rp',
    name: 'Xvault HUB — Roleplay',
    mode: 'Roleplay (ERP-free, Strict Rules)',
    host: 'play.xvaulthub.id',
    port: 7777,
    maxPlayers: 1000,
    baseOnline: 640,
    version: '0.3.7 R3-1-1',
    gamemode: 'xvault_rp_2.4.1.pwn',
    password: false,
    lang: 'ID / EN',
    location: 'Jakarta — Biznet DC (ID-JKT-01)',
    tickrate: 4.0,
    basePing: 18,
    restartEvery: '6 jam',
    anticheat: 'XGuard 3.4 + Sync Check',
    whitelist: true,
    tags: ['Ekonomi', 'Faction', 'Whitelist', 'Voice', 'House'],
    desc:
      'Server utama Xvault HUB. Ekonomi tertutup, faction resmi, ' +
      'hukum berjalan lewat LSPD/DOJ, dan whitelist karakter untuk menjaga kualitas RP.',
  },
  {
    id: 'fw',
    name: 'Xvault HUB — Gangwar',
    mode: 'Gangwar / Territory Control',
    host: 'play.xvaulthub.id',
    port: 7878,
    maxPlayers: 500,
    baseOnline: 275,
    version: '0.3.7 R3-1-1',
    gamemode: 'xvault_fw_1.9.4.pwn',
    password: false,
    lang: 'ID / EN',
    location: 'Jakarta — Biznet DC (ID-JKT-01)',
    tickrate: 4.0,
    basePing: 17,
    restartEvery: '2 jam',
    anticheat: 'XGuard 3.4 (aim/teleport check)',
    whitelist: false,
    tags: ['Turf', 'Kilat', 'Rank', 'Statistik'],
    desc:
      'Perang wilayah 24/7. 42 zone, rank divisi, senjata loadout, ' +
      'dan statistik kill/death real-time dengan anti-cheat ketat.',
  },
  {
    id: 'cnr',
    name: 'Xvault HUB — Cops n Robbers',
    mode: 'Cops n Robbers / Speedrun',
    host: 'play.xvaulthub.id',
    port: 7979,
    maxPlayers: 300,
    baseOnline: 148,
    version: '0.3.7 R3-1-1',
    gamemode: 'xvault_cnr_3.2.0.pwn',
    password: false,
    lang: 'ID',
    location: 'Jakarta — Biznet DC (ID-JKT-01)',
    tickrate: 4.0,
    basePing: 21,
    restartEvery: '30 menit',
    anticheat: 'XGuard Lite',
    whitelist: false,
    tags: ['Casual', 'Bank Robbery', 'Event'],
    desc:
      'Sesi cepat 30 menit: rampah bank, kabur dari polisi, event mingguan ' +
      'dan leaderboard skor tertinggi. Ramah untuk pemain baru.',
  },
  {
    id: 'starter',
    name: 'Xvault HUB — Beginner',
    mode: 'Starter RP (Tutorial)',
    host: 'play.xvaulthub.id',
    port: 8080,
    maxPlayers: 200,
    baseOnline: 62,
    version: '0.3.7 R3-1-1',
    gamemode: 'xvault_starter_1.3.2.pwn',
    password: false,
    lang: 'ID',
    location: 'Jakarta — Biznet DC (ID-JKT-01)',
    tickrate: 4.0,
    basePing: 19,
    restartEvery: '12 jam',
    anticheat: 'XGuard Lite',
    whitelist: false,
    tags: ['Newbie', 'Tutorial', 'Free'],
    desc:
      'Tempat belajar sebelum masuk server RP utama. Tutorial interaktif, ' +
      'tugas /help, dan staff pendamping tiap sesi jam sibuk.',
  },
];

/* ------------------------------------------------------------------ *
 * 3. Faction
 * ------------------------------------------------------------------ */

const FACTION_DEFS = [
  { id: 1,  name: 'Los Santos Police Dept.', short: 'LSPD',   type: 'government', color: '#3b82f6', slots: 120, member: 108, rank: ['Cadet','Officer','Sergeant','Lieutenant','Captain','Chief'] },
  { id: 2,  name: 'Federal Bureau ofInvestigation', short: 'FBI', type: 'government', color: '#6366f1', slots: 60, member: 44, rank: ['Agent','Senior Agent','Supervisor','Director'] },
  { id: 3,  name: 'Emergency Medical Service', short: 'EMS',   type: 'government', color: '#22c55e', slots: 70, member: 51, rank: ['Medic','Paramedic','Chief Medic'] },
  { id: 4,  name: 'Department of Justice', short: 'DOJ',       type: 'government', color: '#eab308', slots: 40, member: 27, rank: ['Clerk','Prosecutor','Judge','Chief Justice'] },
  { id: 5,  name: 'Xvault News Channel', short: 'XNC',        type: 'media',      color: '#f97316', slots: 30, member: 22, rank: ['Reporter','Editor','Anchor'] },
  { id: 6,  name: 'Los Santos Customs', short: 'LSC',         type: 'business',   color: '#06b6d4', slots: 45, member: 38, rank: ['Mechanic','Senior','Manager'] },
  { id: 7,  name: 'Grove Street Families', short: 'GSF',      type: 'gang',       color: '#22c55e', slots: 55, member: 55, rank: ['Associate','Soldier','Capo','Underboss','Boss'] },
  { id: 8,  name: 'Ballas', short: 'BAL',                     type: 'gang',       color: '#a855f7', slots: 55, member: 49, rank: ['Associate','Soldier','Capo','Underboss','Boss'] },
  { id: 9,  name: 'Vagos', short: 'VAG',                      type: 'gang',       color: '#facc15', slots: 50, member: 41, rank: ['Associate','Soldier','Capo','Boss'] },
  { id: 10, name: 'Marabunta', short: 'MTA',                   type: 'gang',       color: '#ef4444', slots: 50, member: 36, rank: ['Associate','Soldier','Capo','Boss'] },
  { id: 11, name: 'La Cosa Nostra', short: 'LCN',              type: 'mafia',      color: '#f5f5f4', slots: 40, member: 29, rank: ['Made Guy','Capo','Underboss','Don'] },
  { id: 12, name: 'People’s Driver', short: 'PDX',            type: 'legal',      color: '#fbbf24', slots: 60, member: 47, rank: ['Driver','Senior Driver','Dispatcher'] },
];

/* ------------------------------------------------------------------ *
 * 4. Builder — Pemain
 * ------------------------------------------------------------------ */

const FIRST = ['Bagas','Rizky','Aditya','Fajar','Yoga','Dimas','Rangga','Bayu','Ilham','Reza','Arif','Galih','Hendra','Krisna','Langit','Mahendra','Naufal','Panji','Qori','Rafi','Satria','Teguh','Umar','Vino','Wahyu','Yusuf','Zaki','Damar','Elang','Farhan','Gilang','Hafiz','Iqbal','Jefri','Kevin','Leo','Manda','Nanda','Ovan','Pratama','Reno','Sandi','Tio','Unu','Wawan','Yayan','Zidan','Aldi','Bimo','Candra'];
const LAST = ['Wijaya','Pratama','Saputra','Nugroho','Santoso','Halim','Kusuma','Maulana','Ramadhan','Hidayat','Permana','Firmansyah','Setiawan','Utomo','Gunawan','Wibowo','Siregar','Simanjuntak','Naibaho','Hasibuan','Saragih','Lubis','Daulay','Sitorus','Anggara','Fernandez','Alfarizi','Nurhadi','Syahputra','Mardianto','Zulvan','Ardiansyah','Ekaputra','Ismail','Fadillah','Hakim','Iskandar','Laksmana','Munthe','Prayoga'];
const STYLE = ['xX', '_Pro_', 'Dark', 'King', 'Cyber', 'Shadow', 'Neo', 'Viper', 'Zero', 'Rex', 'Ghost', 'Sky', '_'];

function playerName(r, i) {
  const f = FIRST[i % FIRST.length];
  const l = LAST[Math.floor(r() * LAST.length)];
  const mode = r();
  if (mode > 0.93) return `${pick(r, STYLE)}_${f}_${l[0]}`;
  if (mode > 0.86) return `${f}_${l}${int(r, 1, 99)}`;
  return `${f}_${l}`;
}

const ACHIEVEMENTS = [
  { code: 'FIRST_BLOOD', name: 'Kill Pertama', desc: 'Membunuh player lain untuk pertama kali.', icon: '⚔' },
  { code: 'DRIFT_KING', name: 'Drift King', desc: 'Skor drift di atas 250.000.', icon: '🏎' },
  { code: 'TYCOON', name: 'Tycoon', desc: 'Memiliki 5 bisnis aktif sekaligus.', icon: '🏢' },
  { code: 'LAWYER', name: 'Sidang Kilat', desc: 'Menangkan 25 sidang di DOJ.', icon: '⚖' },
  { code: 'MEDIC_X', name: 'Nyawa Penyelamat', desc: 'Bangkitkan 500 pemain.', icon: '✚' },
  { code: 'MARATHON', name: 'Maraton', desc: 'Total main 300 jam nonstop-bulanan.', icon: '⏱' },
  { code: 'TURF_WAR', name: 'Turf Veteran', desc: 'Menang 100 perang wilayah.', icon: '🚩' },
  { code: 'LEGEND', name: 'Legenda Server', desc: 'Level 150+ dan top 20 leaderboard.', icon: '👑' },
];

function levelFromHours(h) {
  return clamp(Math.floor(Math.pow(h, 0.62) * 2.1) + 1, 1, 250);
}

function buildPlayers(count = 240) {
  const r = rng(20240817);
  const players = [];
  for (let i = 0; i < count; i++) {
    const hours = Math.round(Math.pow(r(), 2.1) * 1850 + r() * 12);
    const level = levelFromHours(hours);
    const kills = Math.round(hours * (4 + r() * 12));
    const deaths = Math.round(kills / (0.6 + r() * 1.6));
    const money = Math.round((level * 1400 + r() * 90000) / 100) * 100;
    const bank = Math.round((level * 9000 + r() * 780000) / 100) * 100;
    const faction = r() > 0.62 ? FACTION_DEFS[Math.floor(r() * FACTION_DEFS.length)] : null;
    const online = r() < 0.34;
    const banned = r() < 0.045;
    players.push({
      id: 1000 + i,
      name: playerName(r, i),
      level,
      hours,
      score: Math.round(hours * 8 + kills * 4 + level * 25),
      money,
      bank,
      kills,
      deaths,
      kdr: +(kills / Math.max(1, deaths)).toFixed(2),
      driftScore: Math.round(r() * 480000),
      races: Math.round(r() * 340),
      turfWins: faction && faction.type === 'gang' ? Math.round(r() * 120) : 0,
      arrests: Math.round(r() * 260),
      deaths_medic: Math.round(r() * 180),
      factionId: faction ? faction.id : null,
      faction: faction ? faction.short : null,
      role: i === 0 ? 'Founder' : i < 5 ? 'Admin' : i < 14 ? 'Moderator' : i < 30 ? 'Helper' : 'Player',
      staff: i < 30,
      vip: r() > 0.8 ? pick(r, ['VIP', 'VIP+', 'SUPREME']) : null,
      status: banned ? 'banned' : online ? 'online' : 'offline',
      banned,
      banReason: banned ? pick(r, ['Aimbot / Cheat Deteksi', 'Kill Without Reason', 'Insult / Hate Speech', 'Advantage Bug', 'Evasion Ban']) : null,
      ping: int(r, 12, 92),
      country: 'ID',
      city: pick(r, ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Bekasi', 'Depok', 'Bogor', 'Malang', 'Yogyakarta', 'Balikpapan']),
      joinedAt: ago(int(r, 20, 2100) * DAY),
      lastSeen: online ? ago(int(r, 0, 8) * 60000) : ago(int(r, 1, 900) * HOUR),
      playtime7d: Array.from({ length: 7 }, () => +(r() * 9).toFixed(1)),
      whitelist: pick(r, ['approved', 'approved', 'approved', 'pending', 'rejected']),
      vehicles: Math.round(r() * 9),
      houses: r() > 0.7 ? Math.round(r() * 3) : 0,
      businesses: r() > 0.82 ? Math.round(r() * 4) : 0,
      messages: Math.round(r() * 48000),
      reports: Math.round(r() * 40),
      tickets: Math.round(r() * 7),
      achievements: ACHIEVEMENTS.filter(() => r() > 0.72).map((a) => a.code),
    });
  }
  // pastikan nama unik
  const seen = new Map();
  for (const p of players) {
    let nm = p.name;
    while (seen.has(nm)) nm = `${nm}_${int(r, 10, 99)}`;
    seen.set(nm, p);
    p.name = nm;
  }
  return players;
}

const PLAYERS = buildPlayers(240);

/* ------------------------------------------------------------------ *
 * 5. Builder — Kurva & metrik live
 * ------------------------------------------------------------------ */

/** Pola kepadatan pemain: puncak 20:00–01:00 WIB. */
function loadCurve(hourWeights) {
  return hourWeights;
}

const HOUR_SHAPE = [0.55, 0.7, 0.62, 0.42, 0.26, 0.18, 0.16, 0.2, 0.28, 0.36, 0.42, 0.5, 0.62, 0.7, 0.68, 0.66, 0.7, 0.8, 0.9, 0.98, 1.0, 0.96, 0.82, 0.66];

function serverCurve(s, i, jitterR) {
  const shape = HOUR_SHAPE[i];
  return Math.round(s.baseOnline * (0.62 + shape * 0.72) + jitterR() * 14 - 7);
}

function buildLiveSeries(days = 30) {
  const r = rng(777);
  const out = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now - d * DAY);
    const weekend = [0, 6].includes(date.getDay());
    const peak = Math.round(PLAYERS.filter((p) => !p.banned).length * (weekend ? 0.42 : 0.34) * (0.9 + r() * 0.25));
    out.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      peak,
      avg: Math.round(peak * (0.58 + r() * 0.12)),
      newPlayers: int(r, 6, 46),
      uptime: +clamp(99.5 + r() * 0.5, 99.2, 100).toFixed(2),
      avgPing: int(r, 14, 29),
      restarts: int(r, 4, 12),
      incidents: r() > 0.86 ? int(r, 1, 2) : 0,
      bans: int(r, 3, 27),
      tickets: int(r, 4, 21),
    });
  }
  return out;
}

const LIVE_30D = buildLiveSeries(30);

/* ------------------------------------------------------------------ *
 * 6. Builder — Kualitas / layanan
 * ------------------------------------------------------------------ */

const QUALITY = {
  score: 94.6,
  grade: 'A+',
  sla: 99.9,
  uptime30: 99.94,
  avgPing: 21,
  tickrate: 4.0,
  desync: 0.31,
  crashFreeDays: 41,
  syncLoss: 0.08,
  hardware: {
    cpu: 'AMD Ryzen 9 5950X — 16C/32T @ 4.1 GHz',
    ram: '128 GB DDR4 ECC 3600 MHz',
    disk: '2 TB NVMe Gen4 (RAID1)',
    net: '1 Gbps Uninterrupted — DDoS Protected L3/L4/L7',
    os: 'Ubuntu 24.04 LTS — SA-MP 0.3.7 R3-1-1 + ALS/SSCANF',
    panel: 'Pterodactyl + watchdog XvaultGuard',
  },
  regions: [
    { region: 'Indonesia — Jakarta', ping: 12, loss: 0.02, players: 58 },
    { region: 'Indonesia — Surabaya', ping: 19, loss: 0.04, players: 14 },
    { region: 'Malaysia — KL', ping: 28, loss: 0.05, players: 9 },
    { region: 'Singapore', ping: 26, loss: 0.03, players: 7 },
    { region: 'Philippines', ping: 41, loss: 0.09, players: 4 },
    { region: 'Vietnam', ping: 52, loss: 0.12, players: 3 },
    { region: 'Australia — Perth', ping: 88, loss: 0.21, players: 2 },
    { region: 'India — Mumbai', ping: 121, loss: 0.44, players: 3 },
  ],
  pillars: [
    { key: 'stability', name: 'Stabilitas', value: 98.2, max: 100, desc: 'Uptime 99.94%, auto-restart terjadwal, watchdog anti-hang 24/7.' },
    { key: 'latency', name: 'Latency', value: 95.4, max: 100, desc: 'Ping rata-rata 21 ms se-Indonesia, rute Biznet privat ke DC Jakarta.' },
    { key: 'fairplay', name: 'Fair Play', value: 92.8, max: 100, desc: 'XGuard 3.4: aim/teleport/healthhack check + review manual staff tiap 15 menit.' },
    { key: 'support', name: 'Respon Support', value: 90.1, max: 100, desc: 'Median respon tiket 7 menit 12 detik, 24 jam, 7 hari.' },
    { key: 'rp-quality', name: 'Kualitas RP', value: 89.6, max: 100, desc: 'Whitelist karakter, RDM/VDM tracker, sidang DOJ, dan post-event review.' },
    { key: 'economy', name: 'Ekonomi', value: 93.3, max: 100, desc: 'Inflasi terjaga (2,1%/bulan), pajak progresif, audit kas tiap minggu.' },
  ],
  incidents: [
    { date: ago(3 * DAY), level: 'Resolusi', durasi: '14 menit', title: 'Degradasi latency rute Telkom', desc: 'Upstream ISP mengalami loss 3%. Routing dipindah ke link cadangan Biznet, ping normal kembali.' },
    { date: ago(11 * DAY), level: 'Minor', durasi: '6 menit', title: 'Restart otomatis (watchdog)', desc: 'Proses gamemode tidak merespons 3 tick, watchdog melakukan soft-restart. Data tersimpan dari save-async.' },
    { date: ago(19 * DAY), level: 'Mayor', durasi: '42 menit', title: 'Serangan DDoS UDP 38 Gbps', desc: 'Mitigasi otomatis pada scrubbing center. Server offline 2 menit, kemudian pulih tanpa data loss.' },
    { date: ago(34 * DAY), level: 'Resolusi', durasi: '22 menit', title: 'Bug duplikasi item /give', desc: 'Hotfix pawn dirilis, 14 akun di-snapshot & dibersihkan, pelaku dibanned permanen.' },
  ],
  schedule: [
    { name: 'Auto-restart RP', cron: '00:00 / 06:00 / 12:00 / 18:00 WIB', note: 'Save penuh + compaction DB' },
    { name: 'Backup database', cron: 'Setiap 30 menit (retensi 30 hari)', note: 'Offsite ke storage terpisah, terenkripsi AES-256' },
    { name: 'Audit ekonomi', cron: 'Minggu, 21:00 WIB', note: 'Rekonsiliasi kas server vs sirkulasi player' },
    { name: 'Scan anti-cheat', cron: 'Continuous + laporan 15 menit', note: 'Review manual untuk flag score > 0.8' },
  ],
};

/* ------------------------------------------------------------------ *
 * 7. Builder — Sistem gamemode
 * ------------------------------------------------------------------ */

const SYSTEM_CATEGORIES = [
  {
    key: 'core',
    name: 'Core Roleplay',
    icon: '🎭',
    desc: 'Fondasi karakter, hukum, dan interaksi sosial di server RP.',
    items: [
      { name: 'Sistem Karakter & Whitelist', cmd: '/char, /createrp', status: 'Stabil', pct: 100, desc: '1 karakter per akun, backstory, skill point, dan seleksi RP sebelum masuk server utama.' },
      { name: 'Inventory & Loot', cmd: '/inv, /give, /drop', status: 'Stabil', pct: 100, desc: '36 slot, weight system, item bound, drop loot saat tumbang.' },
      { name: 'Medic & Wound System', cmd: '/heal, /revive', status: 'Stabil', pct: 96, desc: 'Luka per bagian tubuh, pendarahan, respawn timer, dan biaya rumah sakit.' },
      { name: 'Bank, ATM & Transfer', cmd: '/bank, /atm', status: 'Stabil', pct: 100, desc: 'ATM di 34 titik, transfer antar rekening, bunga tabungan 0,3%/hari.' },
      { name: 'Telepon & Kontak', cmd: '/phone, /dial', status: 'Stabil', pct: 92, desc: '300 slot nomor, SMS, call, grup, dan aplikasi BankX di dalam HP.' },
      { name: 'Voice Proximity (SAMVoice)', cmd: '—', status: 'Beta', pct: 78, desc: 'Voice chat jarak 15 m per channel, push-to-talk, dan radio faction.' },
      { name: 'Emote & /me Animasi', cmd: '/me, /do, /anim', status: 'Stabil', pct: 100, desc: '184 animasi valid, /do untuk aksi, log emote untuk moderasi.' },
      { name: 'Cuaca & Waktu Dinamis', cmd: '/weather (admin)', status: 'Stabil', pct: 100, desc: 'Siklus 1 jam = 24 menit nyata, pengaruh jarak pandang & grip jalan.' },
    ],
  },
  {
    key: 'law',
    name: 'Hukum & Fraksi',
    icon: '⚖️',
    desc: 'Police, pengadilan, dan otoritas pemerintah.',
    items: [
      { name: 'Arrest, Ticket & Jail', cmd: '/arrest, /ticket', status: 'Stabil', pct: 100, desc: 'Bukti tertulis, tilang otomatis ke rekening, masa tahanan dihitung ulang saat offline.' },
      { name: 'Sidang & Pengacara (DOJ)', cmd: '/court', status: 'Stabil', pct: 94, desc: 'Agenda sidang, berkas perkara, vonis, banding, dan pencabutan izin.' },
      { name: 'Kartu Identitas & SIM', cmd: '/id, /license', status: 'Stabil', pct: 100, desc: 'SIM per kelas kendaraan, izin senjata, paspor untuk kapal/kargo.' },
      { name: 'Faction Management', cmd: '/f, /faction', status: 'Stabil', pct: 98, desc: 'Rank, kas faction, wilayah, izin operasi, logo, dan agenda internal.' },
      { name: 'Bounty & Wanted', cmd: '/bounty', status: 'Stabil', pct: 90, desc: 'Level wanted 1–5, bounty dari pemain/faction, timer kadaluarsa.' },
      { name: 'Government & Pajak', cmd: '/gov', status: 'Beta', pct: 71, desc: 'Pemilu wali kota, tarif pajak dinamis, APBD, dan proyek kota.' },
    ],
  },
  {
    key: 'econ',
    name: 'Ekonomi & Properti',
    icon: '💰',
    desc: 'Sirkulasi uang, pekerjaan, bisnis, dan aset.',
    items: [
      { name: 'Jobs & Paycheck', cmd: '/job, /works', status: 'Stabil', pct: 100, desc: '27 pekerjaan (trucker, taxicab, fisher, miner, courier) dengan gaji berbasis jam.' },
      { name: 'House & Furniture', cmd: '/house, /buyhouse', status: 'Stabil', pct: 100, desc: '312 rumah, interior editor, alarm, vault privat, sublet ke pemain lain.' },
      { name: 'Business & Shop Owner', cmd: '/biz', status: 'Stabil', pct: 97, desc: 'Bisnis bisa dibeli, atur harga barang, gaji karyawan, dan laporan laba/rugi.' },
      { name: 'Vehicle Dealer & Auction', cmd: '/vhouse, /auction', status: 'Stabil', pct: 93, desc: '212 model kendaraan, lelang mingguan, spek upgrade, plat custom.' },
      { name: 'Fuel & Service Kendaraan', cmd: '/fuel, /repair', status: 'Stabil', pct: 100, desc: 'Konsumsi BBM, kesehatan mesin, servis berkala, derek 24 jam.' },
      { name: 'Drugs & Illegal Loop', cmd: '/cook, /weed', status: 'Stabil', pct: 88, desc: 'Cooking mini-game, kualitas barang, rantai pasok, dan razza police.' },
      { name: 'Black Market & Fence', cmd: '/fence', status: 'Beta', pct: 74, desc: 'Penadah barang curian, harga fluktuatif, risiko informan polisi.' },
    ],
  },
  {
    key: 'pvp',
    name: 'PvP & Gangwar',
    icon: '🔫',
    desc: 'Sistem tempur, zona, dan statistik untuk mode kompetitif.',
    items: [
      { name: 'Turf / Zone Control', cmd: '/turf, /zone', status: 'Stabil', pct: 100, desc: '42 zona, claim timer, buff wilayah owner, pajak zona tiap cycle.' },
      { name: 'Weapon Loadout & Slot', cmd: '/loadout', status: 'Stabil', pct: 100, desc: 'Slot pistol/shotgun/rifle, ammo count, attachment, dan skin.' },
      { name: 'Kill/Death & Streak', cmd: '/stats', status: 'Stabil', pct: 100, desc: 'KDR real-time, streak multiplier, badge, dan penalti TK.' },
      { name: 'Anti-Cheat XGuard 3.4', cmd: '—', status: 'Stabil', pct: 95, desc: 'Deteksi aim snap, teleport, health lock, speedhack; flag score 0–1.' },
      { name: 'Tournament & Bracket', cmd: '/event', status: 'Stabil', pct: 86, desc: 'Bracket 16/32 tim, spectator mode, hadiah otomatis ke rekening.' },
      { name: 'Rank & Division', cmd: '/rank', status: 'Beta', pct: 69, desc: 'Divisi Bronze→Legend, MM matchmaking, degradasi musiman tiap 60 hari.' },
    ],
  },
  {
    key: 'social',
    name: 'Komunitas & Event',
    icon: '🎉',
    desc: 'Yang membuat server ramai bahkan di luar jam RP.',
    items: [
      { name: 'Radio & announcer', cmd: '/r, /radio', status: 'Stabil', pct: 100, desc: '9 channel, streaming musik, penyiar harian, dan pengumuman event.' },
      { name: 'Event Harian & Wheel', cmd: '/events, /wheel', status: 'Stabil', pct: 91, desc: 'Spin wheel 3x sehari, hunt item, karaoke, balapan, dan giveaway.' },
      { name: 'Forum & Bug Bounty', cmd: '—', status: 'Stabil', pct: 84, desc: 'Lapor bug berhadiah RC, anekdot RP, dan arsip sanksi publik.' },
      { name: 'Discord Sync (Webhook)', cmd: '/dc', status: 'Stabil', pct: 100, desc: 'Chat in-game ↔ Discord, notifikasi join/leave, link akun, verif role VIP.' },
      { name: 'Clan / Team Registry', cmd: '/clan', status: 'Beta', pct: 63, desc: 'Buat clan, tag, wars antar clan, dan poin liga bulanan.' },
      { name: 'Achievement & Badge', cmd: '/badge', status: 'Stabil', pct: 88, desc: '64 pencapaian, profil publik, badge VIP dan koleksi langka.' },
    ],
  },
  {
    key: 'admin',
    name: 'Moderasi & Admin',
    icon: '🛡️',
    desc: 'Peralatan staff — juga yang dipakai di dasbor admin situs ini.',
    items: [
      { name: 'Admin Level 1–5', cmd: '/a', status: 'Stabil', pct: 100, desc: 'Hak granular: helper, moderator, admin, owner. Tiap aksi tercatat di audit log.' },
      { name: 'Freeze, Mute, Kick, Ban', cmd: '/afreeze, /aban', status: 'Stabil', pct: 100, desc: 'Sanksi berlapis dengan alasan wajib, banding 1x lewat form situs.' },
      { name: 'Audit Log & Snapshot', cmd: '—', status: 'Stabil', pct: 100, desc: 'Semua perintah admin tercatat; snapshot posisi/uang sebelum sanksi.' },
      { name: 'Live Console & Watchdog', cmd: '/acmd', status: 'Stabil', pct: 97, desc: 'Log realtime, auto-restart saat hang, alarm ke Discord staff.' },
      { name: 'Whitelist Review Panel', cmd: '—', status: 'Stabil', pct: 92, desc: 'Antrean aplikasi, nilai per aspek, dan komentar reviewer.' },
      { name: 'Economy Adjustment', cmd: '/amoney', status: 'Stabil', pct: 89, desc: 'Koreksi saldo dengan limit harian + persetujuan admin level 4.' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 8. Builder — Aturan, FAQ, news, store
 * ------------------------------------------------------------------ */

const RULES = [
  { code: 'R1', title: 'Dilarang RDM / VDM', desc: 'Menembak atau menabrak tanpa alasan roleplay yang jelas. Sanksi: ban 3–7 hari.', field: 'Roleplay' },
  { code: 'R2', title: 'Dilarang Combat Login (CK)', desc: 'Logout saat dikejar/masuk baku tembak. Sanksi: ban 2 hari + sita barang.', field: 'Roleplay' },
  { code: 'R3', title: 'Dilarang Metagaming', desc: 'Memakai informasi dari Discord/Stream untuk keuntungan in-game.', field: 'Roleplay' },
  { code: 'R4', title: 'Dilarang Powergaming / Fear RP', desc: 'Memaksakan aksi tidak realistis atauIgnore rasa takut karakter saat diancam.', field: 'Roleplay' },
  { code: 'R5', title: 'Dilarang Cheat & Mod Menu', desc: 'Airbreak, health hack, aim, speedhack, textures ilegal. Sanksi: ban permanen.', field: 'Fair Play' },
  { code: 'R6', title: 'Dilarang Bug Abuse', desc: 'Memanfaatkan bug gamemode (duplikasi item, clip weapons). Lapor = bounty.', field: 'Fair Play' },
  { code: 'R7', title: 'Dilarang ujaran kebencian & SARA', desc: 'Termasuk di nama karakter, chat, dan Discord. Sanksi: ban 30 hari s/d permanen.', field: 'Etika' },
  { code: 'R8', title: 'Dilarang iklan & jual-beli akun', desc: 'Iklan server lain, jual RC/uang nyata tanpa persetujuan staff.', field: 'Etika' },
  { code: 'R9', title: 'WAJPAD melapor dengan bukti', desc: 'Tiket harus menyertakan video ≥ 30 detik sebelum kejadian + timestamp.', field: 'Moderasi' },
  { code: 'R10', title: 'Ikuti perintah staff', desc: 'Keputusan staff final; banding hanya 1x lewat form, bukan di global chat.', field: 'Moderasi' },
];

const FAQ = [
  { q: 'SA-MP versi berapa yang dipakai?', a: 'Semua server berjalan di SA-MP 0.3.7 R3-1-1 (client GTA SA 1.0 US). Mode DL tersedia untuk pemain yang butuh launcher pihak ketiga, tapi 0.3.7 adalah rekomendasi resmi kami.' },
  { q: 'Apa itu whitelist dan kenapa saya perlu daftar?', a: 'Whitelist adalah seleksi karakter RP. Kamu mengisi form latar belakang karakter, lalu staff menilai kesiapan RP-mu. Ini alasan utama kualitas roleplay server stabil.' },
  { q: 'Saya banned, bisa banding?', a: 'Bisa, satu kali banding per sanksi lewat menu Banding di dasbor player. Sertakan nomor sanksi, video, dan penjelasan. Median diputuskan dalam 24 jam.' },
  { q: 'Apakah butuh PC spesifikasi tinggi?', a: 'GTA SA sangat ringan. Yang penting koneksi stabil: ping < 60 ms dan packet loss 0%. Kami sarankan setting fps_limit 50 dan GTA Settings → Setup → Effects: Low untuk sync lebih baik.' },
  { q: 'Bisa main dari HP (Android)?', a: 'Bisa lewat sandbox/launcher pihak ketiga, namun tidak kami dukung penuh karena rawan desync dan tidak bisa menjalankan XGuard. Pengalaman terbaik tetap PC.' },
  { q: 'Apakah RP ini 18+/ERP?', a: 'Tidak. Server Xvault HUB adalah ERP-free. Kekerasan dan tema dewasa berat dibatasi sesuai aturan roleplay sehat.' },
  { q: 'Bagaimana cara top-up RC / VIP?', a: 'Lewat menu Toko, pilih paket, bayar via QRIS / bank transfer / e-wallet. Aktivasi otomatis < 60 detik setelah pembayaran terverifikasi.' },
  { q: 'Apakah data karakter saya aman kalau server tutup?', a: 'Kamu boleh meminta ekspor data karakter (JSON) kapan pun lewat tiket. Backup DB dibuat tiap 30 menit dan disimpan offsite.' },
];

const NEWS = [
  { id: 'n1', title: 'Patch 2.4.1 — Voice Proximity rilis untuk Faction Resmi', cat: 'Update', date: ago(1 * DAY), tag: 'RP', hot: true, desc: 'SAMVoice kini aktif di semua channel faction, jarak 15 m, dan 12 animasi baru untuk interaksi /me.', author: 'Xvault Dev' },
  { id: 'n2', title: 'Turnamen Turf of The Year 2026 — pendaftaran dibuka', cat: 'Event', date: ago(2 * DAY), tag: 'Gangwar', hot: true, desc: 'Format 32 tim single-elimination, total hadiah 25 juta RC + VIP Supreme 30 hari untuk juara 1.', author: 'Event Team' },
  { id: 'n3', title: 'XGuard 3.4: deteksi aim snap & health lock makin ketat', cat: 'Anti-Cheat', date: ago(4 * DAY), tag: 'Fair Play', hot: false, desc: 'Model flag baru menurunkan false positive 41%. 128 akun dibanned pada pekan pertama rollout.', author: 'Security' },
  { id: 'n4', title: 'Rebalance ekonomi: pajak properti progresif', cat: 'Ekonomi', date: ago(7 * DAY), tag: 'RP', hot: false, desc: 'Rumah ke-3 dan seterusnya kena pajak +25%. Tujuan: mencegah penimbunan aset pasif.', author: 'Economy Dev' },
  { id: 'n5', title: 'Server Beginner dibuka 24 jam + staff pendamping', cat: 'Komunitas', date: ago(9 * DAY), tag: 'Newbie', hot: false, desc: 'Sesi pendampingan tiap 19:00–23:00 WIB untuk pemain baru belajar /command dasar dan etika RP.', author: 'Staff Team' },
  { id: 'n6', title: 'Recruitment LSPD & EMS gelombang 12', cat: 'Recruitment', date: ago(12 * DAY), tag: 'Faction', hot: false, desc: 'Pendaftaran dibuka untuk 40 posisi. Form lewat dasbor player → Whitelist → Lamaran Faction.', author: 'Recruitment' },
  { id: 'n7', title: 'Maintenance rutin DC Jakarta — selesai lebih cepat', cat: 'Maintenance', date: ago(15 * DAY), tag: 'Status', hot: false, desc: 'Pemindahan switch core 1 jam. Tidak ada rollback data, uptime bulan ini tetap 99,94%.', author: 'Infra' },
  { id: 'n8', title: 'Update peta zona Gangwar: +4 zona industri', cat: 'Update', date: ago(18 * DAY), tag: 'Gangwar', hot: false, desc: 'Zona baru memberi buff amunisi +10% untuk owner dan memicu konflik jalan tol timur.', author: 'Map Team' },
];

const STORE = {
  currency: 'RC',
  rate: '1 RC = Rp 100',
  packs: [
    { id: 'rc1', name: '500 RC', price: 49000, bonus: 0, popular: false, kind: 'RC' },
    { id: 'rc2', name: '1.200 RC', price: 99000, bonus: 12, popular: true, kind: 'RC' },
    { id: 'rc3', name: '3.000 RC', price: 229000, bonus: 25, popular: false, kind: 'RC' },
    { id: 'rc4', name: '8.000 RC', price: 549000, bonus: 40, popular: false, kind: 'RC' },
  ],
  items: [
    { id: 'vip1', name: 'VIP 30 Hari', price: 75000, old: 110000, type: 'Status', perks: ['Slot antrian prioritas', '+15% gaji kerja', '3 slot kendaraan ekstra', 'Prefix [VIP] di chat'], icon: '⭐' },
    { id: 'vip2', name: 'VIP+ 30 Hari', price: 149000, old: 210000, type: 'Status', perks: ['Semua benefit VIP', '+30% gaji & /fly di area privat', '6 slot kendaraan + 1 garasi', 'Channel voice khusus'], icon: '🌟', popular: true },
    { id: 'vip3', name: 'SUPREME 90 Hari', price: 399000, old: 550000, type: 'Status', perks: ['Semua benefit VIP+', 'Ganti nama karakter gratis 1x', '1 slot bisnis gratis', 'Badge profil animasi'], icon: '👑' },
    { id: 'car1', name: 'Vehicle Pack: Street', price: 45000, type: 'Item', perks: ['3 kendaraan sport kelas C', 'Plat custom XVAULT', 'Skin garasi'], icon: '🏎' },
    { id: 'house1', name: 'Extra House Slot', price: 60000, type: 'Slot', perks: ['+1 slot rumah', 'Bisa disewakan ke pemain lain'], icon: '🏠' },
    { id: 'rename1', name: 'Card Ganti Nama', price: 30000, type: 'Item', perks: ['Ganti nama karakter tanpa reset', 'Cooldown 30 hari'], icon: '📝' },
    { id: 'slot1', name: 'Slot Reservasi Faction', price: 25000, type: 'Slot', perks: ['Kunci slot faction 7 hari', 'Prioritas recruitment'], icon: '🎟' },
    { id: 'skin1', name: 'Skin Pack: Neon Night', price: 35000, type: 'Kosmetik', perks: ['12 outfit', 'Efek trail kendaraan', 'Tidak mengubah stat'], icon: '🎨' },
  ],
  methods: ['QRIS', 'BCA / BNI / Mandiri VA', 'DANA / OVO / GOPAY', 'SeaBank'],
};

const VOTE_SITES = [
  { name: 'SA-MP Monitor', url: 'https://samp-monitor.example/vote', reward: 40, cooldown: 12, last: 3 },
  { name: 'Top-Gameservers', url: '#', reward: 35, cooldown: 12, last: 1 },
  { name: 'GTA-MP List', url: '#', reward: 30, cooldown: 24, last: 0 },
  { name: 'Discord Bots.gg', url: '#', reward: 25, cooldown: 12, last: 5 },
];

/* ------------------------------------------------------------------ *
 * 9. Builder — Tiket, whitelist, log admin
 * ------------------------------------------------------------------ */

const TICKET_TYPES = ['Banding Ban', 'Lapor Bug', 'Lapor Pemain', 'Pertanyaan RP', 'Masalah Pembayaran', 'Permintaan Data', 'Lamaran Staff'];

function buildTickets(r = rng(4242), n = 16) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = PLAYERS[int(r, 0, PLAYERS.length - 1)];
    const type = pick(r, TICKET_TYPES);
    const created = int(r, 0, 60) * HOUR;
    out.push({
      id: `XV-${String(48210 - i * 7).padStart(5, '0')}`,
      subject: ({
        'Banding Ban': 'Banding sanksi RDM — karakter saya dibanned 7 hari',
        'Lapor Bug': 'Duplikasi item saat disconnect di /atm',
        'Lapor Pemain': 'Curiganya pakai aimbot di zona 17 (Gangwar)',
        'Pertanyaan RP': 'Bolehkah membalas provokasi tanpa saksi?',
        'Masalah Pembayaran': 'Top-up QRIS 149rb belum masuk RC',
        'Permintaan Data': 'Minta ekspor data karakter setelah server tutup',
        'Lamaran Staff': 'Lamaran Helper — availability 5 jam/malam',
      })[type],
      type,
      player: p.name,
      playerId: p.id,
      status: pick(r, ['open', 'open', 'in_progress', 'in_progress', 'waiting_user', 'resolved', 'closed']),
      priority: pick(r, ['low', 'normal', 'normal', 'high', 'urgent']),
      assignee: r() > 0.45 ? pick(r, ['KING', 'Naga', 'Sora', 'Zen', 'Rai']) + ' (Helper)' : null,
      server: pick(r, SERVERS).name,
      createdAt: ago(created),
      updatedAt: ago(Math.max(0, created - int(r, 1, 400) * 60000)),
      replies: int(r, 0, 6),
      evidence: r() > 0.3 ? ['clip_2026-10-12_21-04.mp4', 'screenshoot_01.png'] : [],
      lastMessage: pick(r, [
        'Terima kasih laporannya. Kami cek log server pada jam kejadian dan akan balas dalam 1x24 jam.',
        'Bukti video kurang 30 detik sebelum kejadian, mohon lampirkan ulang sesuai aturan R9.',
        'Sanksi sudah kami tinjau ulang. Keputusan: sanksi dikurangi menjadi 3 hari karena kesalahan identifikasi.',
        'Bug sudah direplikasi di staging dan sedang diperbaiki pada sprint ini. RC kompensasi dikirim.',
        'Kami butuh nomor rekening / snapshot saldo agar bisa rekonsiliasi dengan payment gateway.',
      ]),
    });
  }
  return out;
}

const TICKETS = buildTickets();

function buildWhitelistApps() {
  const r = rng(9182736);
  const charNames = ['Aditya_Ramadhan', 'Bagas_Wijaya', 'Nadya_Kusuma', 'Reno_Pratama', 'Gilang_Maulana', 'Vina_Anggara', 'Teguh_Setiawan', 'Farhan_Hakim', 'Laras_Nurhadi', 'Yusuf_Iskandar', 'Damar_Laksmana', 'Sinta_Mardianto'];
  return charNames.map((name, i) => {
    const score = int(r, 45, 98);
    return {
      id: `WL-${String(9120 + i).padStart(5, '0')}`,
      character: name,
      player: PLAYERS[int(r, 0, PLAYERS.length - 1)].name,
      accountId: 1000 + int(r, 0, 200),
      hours: int(r, 2, 1400),
      age: int(r, 17, 31),
      server: pick(r, SERVERS).name,
      status: score >= 80 ? 'approved' : score >= 62 ? 'pending' : 'rejected',
      reviewer: r() > 0.4 ? pick(r, ['KING', 'Naga', 'Sora']) : null,
      submittedAt: ago(int(r, 1, 260) * HOUR),
      aspects: {
        backstory: int(r, 40, 100),
        law_awareness: int(r, 35, 100),
        rp_vocabulary: int(r, 40, 100),
        rule_knowledge: int(r, 45, 100),
        maturity: int(r, 40, 100),
      },
      score,
      note: pick(r, [
        'Backstory panjang dan konsisten, paham fear RP. Diterima.',
        'Perlu memperbaiki /me deskriptif — terlalu singkat saat interaksi.',
        'Menyebutkan niat OOC di cerita karakter, mohon tulis ulang bagian itu.',
        'Pemahaman hukum baik, tapi belum jelas soal batasan powergaming.',
        'Kandidat kuat, disarankan langsung masuk faction EMS.',
      ]),
    };
  });
}

const WHITELIST_APPS = buildWhitelistApps();

function buildAdminLogs() {
  const r = rng(555123);
  const actions = [
    ['BAN', 'Cheating terdeteksi XGuard (aim snap 0.94)'],
    ['KICK', 'RDM tanpa alasan di zona 7'],
    ['FREEZE', 'Dugaan bug abuse /clip, menunggu review'],
    ['MUTE', 'Spam global chat 14x dalam 40 detik'],
    ['UNBAN', 'Banding diterima, sanksi dikurangi ke 3 hari'],
    ['MONEY_SET', 'Koreksi saldo setelah rekonsiliasi payment gateway'],
    ['HOUSE_SEIZE', 'Properti telat bayar pajak 6 cycle'],
    ['FACTION_KICK', 'Absen operasi 14 hari berturut-turut'],
    ['WHITELIST', 'Aplikasi RP disetujui setelah review 2 staff'],
    ['RESTART', 'Auto-restart terjadwal (06:00 WIB)'],
    ['IP_BAN', '3 akun terkait menggunakan IP sama + cheat'],
    ['WARNING', 'Meta-gaming dari rekaman Discord, teguran lisan'],
  ];
  const staff = ['KING', 'Naga', 'Sora', 'Zen', 'Rai', 'Arya', 'DevX'];
  const out = [];
  for (let i = 0; i < 60; i++) {
    const a = actions[int(r, 0, actions.length - 1)];
    const target = PLAYERS[int(r, 0, PLAYERS.length - 1)];
    out.push({
      id: 90000 - i * 13,
      action: a[0],
      reason: a[1],
      staff: `${pick(r, staff)} (lvl ${int(r, 2, 4)})`,
      target: target.name,
      targetId: target.id,
      server: pick(r, SERVERS).name,
      ts: ago(i * int(r, 4, 90) * 60000),
      result: r() > 0.08 ? 'sukses' : 'gagal',
    });
  }
  return out;
}

const ADMIN_LOGS = buildAdminLogs();

const SESSIONS = [
  { staff: 'KING', role: 'Owner', server: 'RP', since: ago(3 * HOUR), ip: '103.28.**.11', actions: 41, level: 5 },
  { staff: 'Naga', role: 'Head Admin', server: 'RP', since: ago(5 * HOUR + 20 * 60000), ip: '182.1.**.44', actions: 33, level: 4 },
  { staff: 'Sora', role: 'Moderator', server: 'Gangwar', since: ago(1 * HOUR + 12 * 60000), ip: '36.67.**.9', actions: 27, level: 3 },
  { staff: 'Zen', role: 'Helper', server: 'CnR', since: ago(46 * 60000), ip: '114.79.**.120', actions: 12, level: 2 },
  { staff: 'Rai', role: 'Helper', server: 'Beginner', since: ago(2 * HOUR + 5 * 60000), ip: '152.109.**.7', actions: 9, level: 2 },
];

const STAFF_TEAM = [
  { name: 'KING', role: 'Owner', since: 2019, focus: 'Arsitektur server, ekonomi, dan kebijakan komunitas', avatar: '#8b5cf6' },
  { name: 'DevX', role: 'Head Developer', since: 2020, focus: 'Pawn gamemode, XGuard anti-cheat, API situs', avatar: '#06b6d4' },
  { name: 'Naga', role: 'Head Admin', since: 2020, focus: 'Sanksi, banding, dan audit log', avatar: '#f97316' },
  { name: 'Sora', role: 'Moderator', since: 2022, focus: 'Patroli Gangwar, review rekaman', avatar: '#22c55e' },
  { name: 'Zen', role: 'Moderator', since: 2022, focus: 'Whitelist RP dan agenda DOJ', avatar: '#eab308' },
  { name: 'Rai', role: 'Helper', since: 2024, focus: 'Pendampingan pemain baru & tiket', avatar: '#ec4899' },
  { name: 'Arya', role: 'Event Manager', since: 2021, focus: 'Turnamen, giveaway, konten YouTube', avatar: '#a855f7' },
  { name: 'Laras', role: 'Graphic & Media', since: 2023, focus: 'Aset visual, thumbnail, dan media sosial', avatar: '#38bdf8' },
];

/* ------------------------------------------------------------------ *
 * 10. Profil dasbor player
 * ------------------------------------------------------------------ */

function buildAccountPlayer(handle = 'Bagas_Wijaya') {
  const r = rng(handle.split('').reduce((a, c) => a + c.charCodeAt(0), 11) * 977);
  const base =
    PLAYERS.find((p) => p.name === handle) ||
    PLAYERS.find((p) => p.name.toLowerCase().startsWith(handle.split('_')[0].toLowerCase())) ||
    PLAYERS[0];
  const faction = FACTION_DEFS.find((f) => f.id === base.factionId) || null;
  return {
    ...base,
    name: handle.replace(/[^A-Za-z0-9_.-]{1,24}/g, '').slice(0, 24) || base.name,
    email: `${handle.toLowerCase().replace(/[^a-z0-9]/g, '')}@xvaulthub.id`,
    discord: `${handle.toLowerCase().slice(0, 12)}#${int(r, 1000, 9999)}`,
    registeredAt: base.joinedAt,
    lastIp: `182.1.${int(r, 1, 254)}.${int(r, 1, 254)} (divault-masked)`,
    hwid: 'HWID-' + Math.abs(int(r, 100000, 999999)).toString(16).toUpperCase(),
    session24: Array.from({ length: 24 }, (_, i) => +(r() * (i > 17 ? 4.5 : 1.2)).toFixed(2)),
    faction: faction ? faction.short : null,
    factionId: faction ? faction.id : null,
    factionName: faction ? faction.name : 'Independen',
    rank: faction ? pick(r, faction.rank) : 'Civilian',
    license: { sim: 'A, C', weapon: r() > 0.6, bisnis: r() > 0.5 },
    wanted: r() > 0.85 ? int(r, 1, 3) : 0,
    warnings: int(r, 0, 3),
    statsExtra: {
      arrests: base.arrests,
      revives: int(r, 0, 320),
      taxes: Math.round(base.money * 0.03),
      playtimeWeek: +(base.playtime7d.reduce((a, b) => a + b, 0)).toFixed(1),
    },
    wallet: {
      balanceRC: int(r, 0, 4200),
      money: base.money,
      bank: base.bank,
      loans: int(r, 0, 1) ? int(r, 50000, 400000) : 0,
      history: Array.from({ length: 9 }, (_, i) => ({
        id: `TX-${int(r, 10000, 99999)}`,
        type: pick(r, ['Deposit RC', 'Pembelian VIP', 'Top-up Saldo', 'Transfer Masuk', 'Gaji Bisnis', 'Pajak Properti', 'Denda Tilang']),
        amount: int(r, -180000, 900000),
        at: ago(i * int(r, 4, 90) * HOUR),
        status: pick(r, ['success', 'success', 'success', 'pending']),
      })),
    },
    inventory: Array.from({ length: 12 }, () => {
      const item = pick(r, [
        { n: 'Pistol 9mm', slot: 'Senjata', q: 1, cond: int(r, 60, 100) },
        { n: 'AK-47', slot: 'Senjata', q: 1, cond: int(r, 40, 100) },
        { n: 'Body Armor', slot: 'Perlengkapan', q: int(r, 1, 4), cond: 100 },
        { n: 'Medikit', slot: 'Medis', q: int(r, 1, 6), cond: 100 },
        { n: 'Burger Shot Meal', slot: 'Konsumsi', q: int(r, 2, 9), cond: 100 },
        { n: 'Lockpick', slot: 'Ilegal', q: int(r, 0, 3), cond: int(r, 20, 90) },
        { n: 'Radio', slot: 'Elektronik', q: 1, cond: int(r, 50, 100) },
        { n: 'Candy Bar', slot: 'Konsumsi', q: int(r, 1, 8), cond: 100 },
        { n: 'Weed (pack)', slot: 'Ilegal', q: int(r, 0, 6), cond: 100 },
        { n: 'Tool Kit', slot: 'Profesi', q: int(r, 1, 3), cond: int(r, 40, 100) },
      ]);
      return { ...item, id: `IT-${int(r, 1000, 9999)}` };
    }),
    vehicles: Array.from({ length: clamp(base.vehicles, 1, 6) }, () => ({
      id: `VEH-${int(r, 100, 999)}`,
      model: pick(r, ['Sultan RS', 'Elegy RH8', 'Buffalo ST', 'Cheetah', ' Sanchez', 'Previon', 'Bravura', 'Boxville', 'Patriot']),
      plate: `XV ${pick(r, ['RP', 'FW', 'CN'])}-${int(r, 1000, 9999)}`,
      speed: int(r, 0, 240),
      engine: int(r, 35, 100),
      body: int(r, 40, 100),
      km: int(r, 200, 88000),
      garasi: pick(r, ['Garasi Grove', 'Garasi Vinewood', 'Garasi El Corona', 'Pending di LSC']),
      lock: r() > 0.5,
    })),
    houses: Array.from({ length: clamp(base.houses, 0, 2) }, () => ({
      id: `HS-${int(r, 100, 999)}`,
      address: `${int(r, 1, 99)} ${pick(r, ['Grove St', 'Vinewood Blvd', 'El Corona Ave', 'Rodeo Dr', 'Blueberry St', 'Willow St'])}`,
      price: int(r, 180000, 1400000),
      taxDue: int(r, 0, 4) * 12500,
      locked: r() > 0.3,
      vault: int(r, 0, 380000),
      items: int(r, 4, 32),
    })),
    businesses: Array.from({ length: clamp(base.businesses, 0, 3) }, () => ({
      id: `BZ-${int(r, 10, 99)}`,
      name: pick(r, ['Burger Shot', 'Cluckin Bell', 'Ammunation', 'LSC Garage', 'Pay \'n\' Spray', '24-7 Store']),
      revenue: int(r, 4000, 90000),
      staff: int(r, 0, 9),
      stock: int(r, 10, 100),
      rating: flt(r, 2.4, 5, 1),
    })),
    applications: [
      { id: 'WL-09123', type: 'Whitelist RP', status: 'approved', at: ago(40 * DAY), note: 'Diterima oleh Sora (lvl 3)' },
      { id: 'RC-00871', type: 'Lamaran Faction — LSPD', status: 'pending', at: ago(3 * DAY), note: 'Menunggu wawancara Senin 20:00 WIB' },
      { id: 'ST-00412', type: 'Lamaran Staff — Helper', status: 'draft', at: ago(1 * HOUR), note: 'Formulir belum dikirim. Sisa waktu edit 22 jam.' },
    ],
    badges: [
      { code: 'DRIFT_KING', unlocked: true },
      { code: 'MARATHON', unlocked: base.hours > 300 },
      { code: 'TURF_WAR', unlocked: base.turfWins > 20 },
      { code: 'LEGEND', unlocked: base.level > 150 },
      { code: 'FIRST_BLOOD', unlocked: true },
      { code: 'MEDIC_X', unlocked: base.deaths_medic > 90 },
      { code: 'TYCOON', unlocked: base.businesses >= 5 },
      { code: 'LAWYER', unlocked: base.arrests > 120 },
    ],
    security: {
      twoFA: r() > 0.5,
      linkDiscord: true,
      loginHistory: Array.from({ length: 5 }, (_, i) => ({
        at: ago(i * int(r, 2, 60) * HOUR),
        ip: `182.1.${int(r, 1, 254)}.${int(r, 1, 254)}`,
        device: pick(r, ['Chrome / Windows 11', 'Firefox / Windows 10', 'SA-MP Launcher 1.2', 'Edge / Windows 11']),
        ok: r() > 0.12,
      })),
      activeSessions: [
        { device: 'PC — GTA SA 1.0 US', at: 'sekarang', current: true },
        { device: 'Discord OAuth', at: ago(2 * DAY), current: false },
      ],
    },
  };
}

/* ------------------------------------------------------------------ *
 * 11. Akun demo untuk login
 * ------------------------------------------------------------------ */

const ACCOUNTS = [
  {
    username: 'Bagas_Wijaya',
    password: 'xvault',
    role: 'player',
    name: 'Bagas_Wijaya',
    avatarColor: '#8b5cf6',
  },
  {
    username: 'admin',
    password: 'xvault123',
    role: 'admin',
    name: 'KING',
    level: 5,
    avatarColor: '#f97316',
  },
  {
    username: 'moderator',
    password: 'xvault123',
    role: 'admin',
    name: 'Sora',
    level: 3,
    avatarColor: '#22c55e',
  },
];

/* ------------------------------------------------------------------ *
 * 12. Ekspor + agregasi
 * ------------------------------------------------------------------ */

const state = {
  brand: BRAND,
  servers: SERVERS,
  factions: FACTION_DEFS,
  players: PLAYERS,
  live30d: LIVE_30D,
  quality: QUALITY,
  systems: SYSTEM_CATEGORIES,
  rules: RULES,
  faq: FAQ,
  news: NEWS,
  store: STORE,
  vote: VOTE_SITES,
  tickets: TICKETS,
  whitelist: WHITELIST_APPS,
  logs: ADMIN_LOGS,
  sessions: SESSIONS,
  staff: STAFF_TEAM,
  achievements: ACHIEVEMENTS,
  accounts: ACCOUNTS,
  broadcasts: [
    { id: 'b1', text: 'Server akan restart otomatis pukul 18:00 WIB. Simpan progres Anda.', by: 'KING', at: ago(2 * HOUR), active: true },
    { id: 'b2', text: 'Event: Hunt Item dimulai di Los Santos! Hadiah 50.000 RC.', by: 'Arya', at: ago(5 * HOUR), active: false },
  ],
  stats: {
    registered: 48219,
    totalOnline: 0,
    totalSlots: SERVERS.reduce((a, s) => a + s.maxPlayers, 0),
    peakToday: 1345,
    allTimePeak: 2187,
    whitelistApproved: 21870,
    bans30d: 1842,
    ticketsSolved: 9614,
    discordMembers: 76540,
    youtubeSubs: 41200,
    tiktokFollowers: 88900,
    uptime: QUALITY.uptime30,
  },
};

/** Hitung jumlah online "saat ini" dari pola jam + noise. */
function liveCounts() {
  const r = rng(Math.floor(Date.now() / 30000));
  const hour = new Date(Date.now() + 7 * HOUR).getHours();
  const shape = HOUR_SHAPE[hour];
  const nextShape = HOUR_SHAPE[(hour + 1) % 24];
  const frac = (new Date(Date.now() + 7 * HOUR).getMinutes() || 0) / 60;
  const blend = shape + (nextShape - shape) * frac;
  return SERVERS.map((s) => {
    const online = clamp(Math.round(s.baseOnline * (0.55 + blend * 0.85) + (r() * 18 - 9)), 3, s.maxPlayers);
    return {
      id: s.id,
      online,
      ping: clamp(Math.round(s.basePing + (r() * 10 - 4)), 6, 210),
      playersMax: s.maxPlayers,
    };
  });
}

function onlineNames() {
  const on = state.players.filter((p) => p.status === 'online' && !p.banned);
  return on.map((p) => ({ name: p.name, level: p.level, ping: p.ping, server: pick(rng(p.id), SERVERS).name }));
}

function totals() {
  const live = liveCounts();
  const online = live.reduce((a, s) => a + s.online, 0);
  state.stats.totalOnline = online;
  return { online, perServer: live };
}

module.exports = {
  state,
  LIVE_30D,
  TICKET_TYPES,
  BRAND,
  SERVERS,
  FACTION_DEFS,
  PLAYERS,
  QUALITY,
  SYSTEM_CATEGORIES,
  RULES,
  FAQ,
  NEWS,
  STORE,
  VOTE_SITES,
  TICKETS,
  WHITELIST_APPS,
  ADMIN_LOGS,
  SESSIONS,
  STAFF_TEAM,
  ACHIEVEMENTS,
  ACCOUNTS,
  HOUR_SHAPE,
  liveCounts,
  onlineNames,
  totals,
  buildAccountPlayer,
  rng,
  int,
  flt,
  ago,
  loadCurve,
  serverCurve,
};
