#!/usr/bin/env python3
# [pantau-tg] token terpusat di /etc/pantau/telegram.env
import os as _tg_os
def _tg_token():
    t = _tg_os.environ.get("TG_BOT_TOKEN")
    if t:
        return t
    try:
        for _l in open("/etc/pantau/telegram.env"):
            if _l.startswith("TG_BOT_TOKEN="):
                return _l.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return ""
_TG_TOKEN = _tg_token()
"""
auto-discover-rss.py — Pantau.in Source Discovery Bot
Fitur:
- robots.txt checker
- ToS/legal keyword filter  
- RSS feed validator
- Audit trail per sumber
- Auto-disable error sources
- Daily Telegram report
"""
import subprocess, urllib.request, urllib.error, urllib.parse, xml.etree.ElementTree as ET
from datetime import datetime
YEAR = datetime.now().year
YEAR_STR = str(YEAR)

CANDIDATES_FILE = "/var/www/pantau.in/scripts/rss-candidates.txt"
LOG_FILE        = "/var/www/pantau.in/scripts/auto-discover.log"
AUDIT_FILE      = "/var/www/pantau.in/scripts/audit-trail.log"
BOT_TOKEN       = _TG_TOKEN
CHAT_ID         = "901470999"

# Keyword yang menandakan larangan crawling/scraping
LEGAL_BLACKLIST = [
    "no automated crawling", "no scraping", "no crawling",
    "automated access is prohibited", "ai indexing prohibited",
    "do not scrape", "scraping is not allowed", "bots are not allowed",
    "dilarang crawling", "dilarang scraping", "tidak boleh di-crawl",
    "all rights reserved", "reproduction prohibited",
]

def psql(query):
    result = subprocess.run(
        ["docker", "exec", "pantau_postgres", "psql", "-U", "pantau_user", "-d", "pantau_db", "-t", "-c", query],
        capture_output=True, text=True
    )
    return result.stdout.strip()

def fetch_url(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Pantau.in/1.0; +https://pantau.in)"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(8192).decode("utf-8", errors="ignore")
    except Exception as e:
        return 0, str(e)

# Domain whitelist untuk robots.txt — sudah proven aman digunakan
ROBOTS_WHITELIST = [
    "news.google.com",
    "google.com",
    "detik.com",
    "kompas.com",
    "tempo.co",
    "cnbcindonesia.com",
    "kontan.co.id",
    "bisnis.com",
    "antaranews.com",
    "liputan6.com",
    "okezone.com",
    "kumparan.com",
    "tirto.id",
    "republika.co.id",
    "bareksa.com",
    "dailysocial.id",
    "rmol.id",
    "medcom.id",
    "gatra.com",
    "merdeka.com",
    "jpnn.com",
    "sindonews.com",
]

def check_robots_txt(url):
    """Cek robots.txt apakah crawling diizinkan. Return (allowed, reason)"""
    try:
        parsed = urllib.parse.urlparse(url)
        
        # Skip robots check untuk domain whitelist
        domain = parsed.netloc.lower()
        for wd in ROBOTS_WHITELIST:
            if wd in domain:
                return True, f"robots.txt: domain whitelist ({wd})"
        
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        status, content = fetch_url(robots_url, timeout=5)
        if status != 200:
            return True, "robots.txt tidak ditemukan (diizinkan)"
        
        content_lower = content.lower()
        # Cek apakah ada Disallow: / untuk semua bot atau bot kita
        lines = content_lower.split("\n")
        user_agent_all = False
        for line in lines:
            line = line.strip()
            if line.startswith("user-agent: *"):
                user_agent_all = True
            elif user_agent_all and line.startswith("disallow: /"):
                return False, "robots.txt: Disallow semua path untuk semua bot"
            elif user_agent_all and line.startswith("user-agent:"):
                user_agent_all = False  # reset ke bot agent berikutnya
        
        return True, "robots.txt: Crawling diizinkan"
    except Exception as e:
        return True, f"robots.txt error (skip check): {str(e)[:50]}"

# Domain yang sudah proven aman — skip ToS check
TOS_WHITELIST = [
    "news.google.com",
    "google.com",
    "detik.com",
    "kompas.com",
    "tempo.co",
    "cnbcindonesia.com",
    "kontan.co.id",
    "bisnis.com",
    "antara.news",
    "antaranews.com",
    "liputan6.com",
    "okezone.com",
    "kumparan.com",
    "tirto.id",
    "republika.co.id",
    "bareksa.com",
    "dailysocial.id",
]

def check_tos(url):
    """Cek homepage/ToS untuk keyword larangan. Return (allowed, reason)"""
    try:
        parsed = urllib.parse.urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        # Skip ToS check untuk domain whitelist
        domain = parsed.netloc.lower()
        for wd in TOS_WHITELIST:
            if wd in domain:
                return True, f"ToS: domain whitelist ({wd})"
        
        status, content = fetch_url(base_url, timeout=6)
        if status != 200:
            return True, "Tidak bisa akses homepage"
        
        content_lower = content.lower()
        for keyword in LEGAL_BLACKLIST:
            if keyword in content_lower:
                return False, f"ToS mengandung larangan: '{keyword}'"
        
        return True, "ToS tidak ada larangan eksplisit"
    except Exception as e:
        return True, f"ToS check error (skip): {str(e)[:50]}"

def validate_rss(url):
    """Validasi apakah URL adalah RSS feed valid. Return (valid, item_count, reason)"""
    try:
        status, content = fetch_url(url, timeout=8)
        if status != 200:
            return False, 0, f"HTTP {status}"
        
        content_lower = content.lower()
        
        # Cek cepat: apakah ada tanda RSS/Atom di konten
        if "<rss" in content_lower or "<feed" in content_lower or "<channel>" in content_lower:
            # Hitung items dengan string matching (lebih robust dari XML parser)
            item_count = content_lower.count("<item>") or content_lower.count("<entry>")
            if item_count == 0:
                # Coba XML parser sebagai fallback
                try:
                    # Strip namespace agar ET tidak error
                    clean = content.replace(' xmlns:', ' xmlnsx:').replace('xmlns=', 'xmlnsx=')
                    root = ET.fromstring(clean)
                    items = root.findall(".//item") + root.findall(".//entry")
                    item_count = len(items)
                except:
                    item_count = 1  # ada konten RSS tapi parser gagal, tetap valid
            return True, item_count, f"RSS valid, {item_count} item ditemukan"
        
        # Cek Atom feed
        if 'application/atom' in content_lower or '<feed' in content_lower:
            return True, 1, "Atom feed valid"
            
        return False, 0, "Bukan format RSS/Atom"
    except Exception as e:
        return False, 0, f"Error: {str(e)[:50]}"

def url_exists_in_db(url):
    result = psql(f"SELECT COUNT(*) FROM \"ScraperJob\" WHERE url = \'{url}\';")
    return result.strip() != "0"

def insert_source(url, category, source_name):
    psql(f"""
        INSERT INTO "ScraperJob" (id, source, category, url, type, config, "isActive", "intervalMinutes", status, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, \'{source_name}\', \'{category}\', \'{url}\', \'RSS\', \'{{}}\', true, 5, \'idle\', NOW(), NOW())
        ON CONFLICT DO NOTHING;
    """)

def auto_disable_errored():
    result = psql("""
        UPDATE "ScraperJob" SET "isActive" = false, "updatedAt" = NOW()
        WHERE "errorCount" > 10 AND "isActive" = true
          AND coalesce("lastError",'') !~* '(503|429)'
          AND EXISTS (SELECT 1 FROM "ScraperJob" j2 WHERE j2.status = 'idle' AND j2."lastError" IS NULL AND j2."lastRunAt" > NOW() - INTERVAL '1 hour')
        RETURNING source;
    """)
    return result

def get_total_sources():
    result = psql("SELECT COUNT(*) FROM \"ScraperJob\" WHERE \"isActive\" = true;")
    return result.strip()

def send_telegram(message):
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        data = urllib.parse.urlencode({
            "chat_id": CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }).encode()
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")

def write_audit(entries):
    now = datetime.now().strftime("%d %b %Y %H:%M")
    with open(AUDIT_FILE, "a") as f:
        f.write(f"\n[AUDIT {now}]\n")
        for entry in entries:
            f.write(entry + "\n")


def load_existing_urls():
    """Baca semua URL yang sudah ada di candidates file."""
    existing = set()
    try:
        with open(CANDIDATES_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("|")
                    if parts:
                        existing.add(parts[0].strip())
    except:
        pass
    return existing

def discover_candidates():
    """
    Auto-generate kandidat baru ke rss-candidates.txt.
    Hanya menambah yang belum ada — tidak mengubah entry existing.
    Return: jumlah kandidat baru yang ditambahkan.
    """
    BASE = "https://news.google.com/rss/search?q={q}+when:7d&hl=id&gl=ID&ceid=ID:id"
    existing_urls = load_existing_urls()
    new_entries = []

    def make(q, cat, name):
        url = BASE.format(q=q)
        if url not in existing_urls:
            new_entries.append(f"{url}|{cat}|{name}")
            existing_urls.add(url)

    for kota in ["Palembang","Pekanbaru","Balikpapan","Samarinda","Manado",
                 "Padang","Banjarmasin","Pontianak","Jambi","Mataram",
                 "Kupang","Ambon","Jayapura","Batam","Lampung","Palu",
                 "Ternate","Sorong","Kendari","Gorontalo"]:
        make(f"tender+pengadaan+{kota}", "TENDER", f"Google News — Tender {kota}")
        make(f"lelang+proyek+{kota}", "TENDER", f"Google News — Lelang {kota}")

    for q, name in [
        ("tender+teknologi+informasi+pemerintah", "Tender IT Pemerintah"),
        ("tender+konstruksi+jembatan+jalan", "Tender Konstruksi Jalan"),
        ("tender+alat+kesehatan+pemerintah", "Tender Alkes"),
        ("pengadaan+seragam+dinas+"+YEAR_STR, "Pengadaan Seragam Dinas"),
        ("tender+makan+bergizi+gratis+"+YEAR_STR, "Tender MBG "+YEAR_STR),
    ]:
        make(q, "TENDER", f"Google News — {name}")

    for kota in ["Surabaya","Semarang","Palembang","Balikpapan","Batam",
                 "Tangerang","Cikarang","Karawang","Malang","Denpasar"]:
        make(f"properti+dijual+{kota}", "PROPERTI", f"Google News — Properti {kota}")
        make(f"tanah+dijual+{kota}", "PROPERTI", f"Google News — Tanah {kota}")

    for q, name in [
        ("lelang+rumah+bank+BTN+"+YEAR_STR, "Lelang Rumah BTN"),
        ("KPR+subsidi+FLPP+"+YEAR_STR, "KPR FLPP "+YEAR_STR),
        ("rumah+dijual+bawah+500+juta", "Rumah di Bawah 500 Juta"),
        ("properti+dijual+pinggir+tol", "Properti Pinggir Tol"),
    ]:
        make(q, "PROPERTI", f"Google News — {name}")

    for q, name in [
        ("motor+bekas+murah+"+YEAR_STR, "Motor Bekas Murah"),
        ("lelang+kendaraan+dinas+pemerintah", "Lelang Kendaraan Dinas"),
        ("truk+bekas+dijual+Indonesia", "Truk Bekas"),
        ("alat+berat+bekas+dijual", "Alat Berat Bekas"),
        ("bus+bekas+dijual+Indonesia", "Bus Bekas"),
        ("pickup+bekas+murah", "Pickup Bekas Murah"),
        ("motor+listrik+murah+"+YEAR_STR, "Motor Listrik Murah"),
        ("mobil+listrik+bekas+Indonesia", "Mobil Listrik Bekas"),
    ]:
        make(q, "KENDARAAN", f"Google News — {name}")

    for q, name in [
        ("franchise+murah+modal+kecil+"+YEAR_STR, "Franchise Murah "+YEAR_STR),
        ("peluang+usaha+modal+kecil+menguntungkan", "Usaha Modal Kecil"),
        ("distributor+reseller+produk+FMCG", "Distributor FMCG"),
        ("UMKM+binaan+pemerintah+"+YEAR_STR, "UMKM Pemerintah"),
        ("agen+tunggal+produk+indonesia", "Agen Tunggal"),
        ("jualan+online+dropship+"+YEAR_STR, "Dropship "+YEAR_STR),
        ("bisnis+ekspor+UMKM+indonesia", "Ekspor UMKM"),
    ]:
        make(q, "BISNIS", f"Google News — {name}")

    for q, name in [
        ("obligasi+ritel+ORI+pemerintah+"+YEAR_STR, "ORI "+YEAR_STR),
        ("IPO+saham+perdana+"+YEAR_STR+"+Indonesia", "IPO Saham "+YEAR_STR),
        ("reksa+dana+terbaik+return+tinggi", "Reksa Dana Terbaik"),
        ("deposito+bunga+tinggi+"+YEAR_STR, "Deposito Bunga Tinggi"),
        ("P2P+lending+legal+OJK+"+YEAR_STR, "P2P Lending OJK"),
        ("sukuk+tabungan+pemerintah+"+YEAR_STR, "Sukuk Tabungan"),
        ("saham+dividen+"+YEAR_STR+"+IDX", "Saham Dividen IDX"),
    ]:
        make(q, "INVESTASI", f"Google News — {name}")

    for q, name in [
        ("lowongan+kerja+startup+teknologi+indonesia", "Loker Startup Tech"),
        ("magang+mahasiswa+berbayar+"+YEAR_STR, "Magang Berbayar "+YEAR_STR),
        ("lowongan+kerja+Kalimantan+Timur", "Loker Kalimantan"),
        ("lowongan+kerja+Papua+Sulawesi", "Loker Papua Sulawesi"),
        ("rekrutmen+BUMN+"+YEAR_STR, "Rekrutmen BUMN"),
        ("lowongan+kerja+remote+WFH+indonesia", "Loker Remote WFH"),
        ("lowongan+freelance+proyek+indonesia", "Freelance Proyek"),
    ]:
        make(q, "LOWONGAN", f"Google News — {name}")

    if new_entries:
        from datetime import datetime
        now = datetime.now().strftime("%d %b %Y %H:%M")
        with open(CANDIDATES_FILE, "a") as f:
            f.write("\n\n# ============================================\n")
            f.write(f"# AUTO-GENERATED {now}: {len(new_entries)} kandidat baru\n")
            f.write("# ============================================\n")
            for entry in new_entries:
                f.write(entry + "\n")

    return len(new_entries)

def main():
    new_candidates = discover_candidates()
    if new_candidates > 0:
        print(f"[DISCOVER] +{new_candidates} kandidat baru ditambahkan")

    log = []
    audit = []
    added = 0
    skipped = 0
    failed_access = 0
    blocked_legal = 0
    blocked_rss = 0
    disabled_list = []

    # Auto-disable sumber bermasalah
    disabled = auto_disable_errored()
    if disabled:
        disabled_list = [line.strip() for line in disabled.split("\n") if line.strip() and "UPDATE" not in line]

    # Proses kandidat
    with open(CANDIDATES_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) != 3:
                continue
            url, category, source_name = parts[0].strip(), parts[1].strip(), parts[2].strip()

            # Skip jika sudah ada di DB
            if url_exists_in_db(url):
                skipped += 1
                audit.append(f"SKIP | {source_name} | sudah terdaftar")
                continue

            # 1. Cek robots.txt
            robots_ok, robots_reason = check_robots_txt(url)
            if not robots_ok:
                blocked_legal += 1
                audit.append(f"BLOCKED_ROBOTS | {source_name} | {robots_reason}")
                continue

            # 2. Cek ToS
            tos_ok, tos_reason = check_tos(url)
            if not tos_ok:
                blocked_legal += 1
                audit.append(f"BLOCKED_TOS | {source_name} | {tos_reason}")
                continue

            # 3. Validasi RSS
            rss_ok, item_count, rss_reason = validate_rss(url)
            if not rss_ok:
                failed_access += 1
                audit.append(f"INVALID_RSS | {source_name} | {rss_reason}")
                continue

            # Semua check passed — insert
            insert_source(url, category, source_name)
            log.append(f"✅ {source_name} ({category}) — {item_count} items")
            audit.append(f"ADDED | {source_name} | {robots_reason} | {tos_reason} | {rss_reason}")
            added += 1

    # Tulis audit trail
    write_audit(audit)

    total = get_total_sources()
    now = datetime.now().strftime("%d %b %Y %H:%M")

    # Tulis log
    with open(LOG_FILE, "a") as f:
        f.write(f"\n[{now}]\n")
        f.write("\n".join(log) + "\n")
        f.write(f"=== +{added} added, {skipped} skipped, {failed_access} invalid RSS, {blocked_legal} blocked legal ===\n")

    # Kirim laporan Telegram
    if added > 0:
        added_text = "\n".join(log[:10])
        if added > 10:
            added_text += f"\n... dan {added-10} sumber lainnya"
        msg = f"""📡 <b>Pantau.in — Laporan Sumber Harian</b>
🗓 {now}

➕ <b>{added} sumber baru ditambahkan:</b>
{added_text}

📊 Total sumber aktif: <b>{total}</b>
⏭ Sudah terdaftar: {skipped}
❌ RSS tidak valid: {failed_access}
🚫 Diblokir legal: {blocked_legal}"""
    else:
        msg = f"""📡 <b>Pantau.in — Laporan Sumber Harian</b>
🗓 {now}

✅ Tidak ada sumber baru hari ini
📊 Total sumber aktif: <b>{total}</b>
⏭ Sudah terdaftar: {skipped}
❌ RSS tidak valid: {failed_access}
🚫 Diblokir legal: {blocked_legal}"""

    if disabled_list:
        msg += f"\n\n⚠️ {len(disabled_list)} sumber dinonaktifkan (error > 10x)"

    send_telegram(msg)
    print(f"Selesai: +{added} added, {skipped} skipped, {failed_access} invalid, {blocked_legal} blocked. Total: {total}")

if __name__ == "__main__":
    main()
