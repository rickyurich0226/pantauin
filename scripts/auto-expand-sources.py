#!/usr/bin/env python3
"""
Auto-expand sumber pantau.in - BROAD strategy.
Satu keyword broad cover seluruh Indonesia.
Jalan setiap hari jam 01:00 WIB via cron.
Max 50 sumber baru per run supaya DB tidak membengkak.
"""
import urllib.parse, subprocess, datetime

def psql(q):
    r = subprocess.run(['docker','exec','pantau_postgres','psql','-U','pantau_user','-d','pantau_db','-t','-c',q], capture_output=True, text=True)
    return r.stdout.strip()

def add(source, cat, kw):
    url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(kw) + "+when:7d&hl=id&gl=ID&ceid=ID:id"
    ue = url.replace("'","''"); se = source[:100].replace("'","''")
    if psql(f'SELECT COUNT(*) FROM "ScraperJob" WHERE url=\'{ue}\';').strip() != '0':
        return False
    psql(f'INSERT INTO "ScraperJob" (id,source,category,url,type,"isActive","intervalMinutes","updatedAt") VALUES (gen_random_uuid(),\'{se}\',\'{cat}\',\'{ue}\',\'RSS\',true,30,NOW());')
    return True

# BROAD keywords - cover seluruh Indonesia tanpa per-kota
# Diupdate otomatis setiap bulan dengan tambahan topik baru
BROAD = {
    'TENDER': [
        'tender pengadaan pemerintah Indonesia terbaru',
        'LPSE lelang proyek pemerintah daerah',
        'pengadaan barang jasa konstruksi APBD',
        'tender IT teknologi digitalisasi pemerintah',
        'lelang aset negara BUMN terbaru',
        'tender infrastruktur jalan jembatan Indonesia',
        'pengadaan alat kesehatan rumah sakit',
        'tender energi listrik PLN Indonesia',
        'proyek IKN Nusantara pengadaan 2026',
        'tender sekolah gedung pemerintah 2026',
        'pengadaan kendaraan dinas operasional',
        'tender smart city digitalisasi daerah',
    ],
    'PROPERTI': [
        'rumah dijual murah strategis Indonesia',
        'kavling tanah dijual SHM terbaik',
        'properti investasi return tinggi Indonesia',
        'KPR subsidi rumah murah DP ringan',
        'ruko dijual strategis pusat kota',
        'lelang properti bank murah Indonesia',
        'apartemen dijual harga terbaik Indonesia',
        'tanah industri kawasan strategis dijual',
        'perumahan baru ready stock KPR',
        'villa dijual investasi wisata Indonesia',
        'kost produktif dijual yield tinggi',
        'gudang logistik dijual sewa murah',
    ],
    'BISNIS': [
        'peluang bisnis franchise modal kecil Indonesia',
        'distributor agen resmi produk Indonesia',
        'UMKM naik kelas modal usaha 2026',
        'bisnis kuliner franchise kekinian',
        'peluang usaha online digital 2026',
        'waralaba minuman makanan laris',
        'bisnis agritech pertanian modern Indonesia',
        'ekspor produk UMKM peluang global',
        'bisnis jasa konstruksi peluang proyek',
        'startup bisnis pendanaan investor',
        'bisnis EV charging kendaraan listrik',
        'peluang bisnis kesehatan klinik Indonesia',
    ],
    'INVESTASI': [
        'rekomendasi saham beli terbaik Indonesia',
        'obligasi ORI SBR yield terbaik 2026',
        'reksadana return tertinggi terpilih',
        'investasi emas logam mulia antam',
        'saham dividen terbesar IHSG 2026',
        'IPO saham baru listing BEI',
        'investasi properti return menguntungkan',
        'P2P lending OJK terdaftar terbaik',
        'sukuk ritel pemerintah syariah',
        'ETF indeks saham Indonesia terbaik',
        'kripto bitcoin ethereum Indonesia legal',
        'deposito tabungan bunga tertinggi bank',
    ],
    'LOWONGAN': [
        'lowongan kerja BUMN terbaru Indonesia',
        'loker fresh graduate S1 S2 terbaru',
        'rekrutmen CPNS ASN 2026 Indonesia',
        'lowongan kerja remote WFH Indonesia',
        'loker IT developer engineer Indonesia',
        'rekrutmen startup tech unicorn Indonesia',
        'lowongan dokter tenaga kesehatan',
        'loker perbankan asuransi finance',
        'rekrutmen TNI Polri 2026',
        'lowongan guru dosen akademik',
        'loker data analyst machine learning AI',
        'lowongan pertambangan migas energi',
    ],
    'KENDARAAN': [
        'mobil bekas berkualitas harga terbaik',
        'motor bekas murah terawat Indonesia',
        'mobil baru promo diskon terbaik',
        'truk pickup bekas murah operasional',
        'mobil listrik EV terjangkau Indonesia',
        'lelang kendaraan murah BPKB resmi',
        'bus pariwisata bekas dijual murah',
        'forklift alat berat bekas murah',
        'kendaraan niaga komersial bekas',
        'motor trail adventure bekas murah',
    ],
    'BEASISWA': [
        'beasiswa luar negeri S1 S2 S3 2026',
        'beasiswa LPDP pemerintah Indonesia 2026',
        'beasiswa internasional Chevening Fulbright',
        'beasiswa perusahaan BUMN swasta 2026',
        'beasiswa kuliah gratis dalam negeri',
        'beasiswa Australia Awards DIKTI 2026',
        'beasiswa Jepang Monbukagakusho 2026',
        'beasiswa Eropa Erasmus program 2026',
        'beasiswa penelitian riset Indonesia',
        'beasiswa mahasiswa berprestasi daerah',
    ],
    'BANTUAN': [
        'bantuan modal UMKM pemerintah 2026',
        'KUR kredit usaha rakyat BRI BNI',
        'program Prakerja pelatihan 2026',
        'subsidi pemerintah Indonesia 2026',
        'bantuan sosial PKH sembako 2026',
        'hibah modal startup wirausaha muda',
        'program bedah rumah BSPS 2026',
        'bantuan nelayan petani 2026',
        'program beasiswa pesantren santri',
        'subsidi listrik air BPJS 2026',
    ],
}

CITIES = [
    'Jakarta','Bandung','Surabaya','Medan','Semarang','Makassar','Palembang',
    'Tangerang','Depok','Bekasi','Bogor','Malang','Yogyakarta','Solo','Denpasar',
    'Balikpapan','Samarinda','Pekanbaru','Batam','Padang','Manado','Pontianak',
    'Banjarmasin','Jambi','Mataram','Kupang','Ambon','Jayapura','Palu','Ternate',
    'Sorong','Kendari','Gorontalo','Karawang','Cikarang','Cirebon','Sukabumi',
    'Tasikmalaya','Purwokerto','Kediri','Madiun','Sidoarjo','Gresik','Jember',
    'Banyuwangi','Lampung','Palangkaraya','Bengkulu','Cilegon','Serang','Tegal',
    'Pekalongan','Magelang','Salatiga','Klaten','Blitar','Probolinggo',
    'Pasuruan','Mojokerto','Lumajang','Bojonegoro','Tuban','Ngawi','Ponorogo',
    'Tulungagung','Bangkalan','Sumenep','Cianjur','Sumedang','Garut','Kuningan',
    'Indramayu','Majalengka','Purwakarta','Subang','Banjar','Pangandaran',
    'Kebumen','Purworejo','Wonosobo','Cilacap','Banjarnegara','Batang','Rembang',
    'Pati','Kudus','Jepara','Demak','Grobogan','Boyolali','Wonogiri','Karanganyar',
    'Sragen','Sukoharjo','Bantul','Sleman','Kulon Progo','Gunungkidul',
]
TEMPLATES = {
    'TENDER': ['tender pengadaan {c}', 'lelang proyek pemerintah {c}', 'tender konstruksi {c}'],
    'PROPERTI': ['rumah dijual {c}', 'tanah kavling dijual {c}', 'ruko dijual {c}'],
    'BISNIS': ['peluang usaha {c}', 'franchise murah {c}', 'distributor agen {c}'],
    'INVESTASI': ['investasi properti {c}', 'peluang investasi {c}'],
    'LOWONGAN': ['lowongan kerja {c}', 'loker terbaru {c}'],
    'KENDARAAN': ['mobil bekas {c}', 'motor bekas {c}'],
    'BEASISWA': ['beasiswa kuliah {c}'],
    'BANTUAN': ['bantuan UMKM {c}', 'KUR usaha {c}'],
}
for cat, templates in TEMPLATES.items():
    for tmpl in templates:
        for city in CITIES:
            BROAD.setdefault(cat, []).append(tmpl.format(c=city))
MAX_ADD = 50  # Maksimal 50 sumber baru per run
added = skipped = 0

# Tambah tahun ke beberapa keyword supaya fresh setiap tahun
year = datetime.datetime.now().year

for cat, keywords in BROAD.items():
    for kw in keywords:
        if added >= MAX_ADD:
            break
        if add(f"Broad-{cat}", cat, kw): added += 1
        else: skipped += 1
    if added >= MAX_ADD:
        break

total = psql('SELECT COUNT(*) FROM "ScraperJob" WHERE "isActive"=true;').strip()
rows = psql('SELECT category, COUNT(*) FROM "ScraperJob" WHERE "isActive"=true GROUP BY category ORDER BY COUNT(*) DESC;')
print(f"Selesai: +{added} added, {skipped} skipped. Total: {total}")
print(rows)

try:
    import urllib.request
    token = [l.split('=',1)[1].strip().strip('"') for l in open('/var/www/pantau.in/.env') if l.startswith('TELEGRAM_BOT_TOKEN=')][0]
    if added > 0:
        msg = f"📡 Auto-expand sumber\n+{added} sumber baru (broad)\nTotal aktif: {total}"
        data = urllib.parse.urlencode({'chat_id':'901470999','text':msg}).encode()
        urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data, timeout=10)
except: pass
