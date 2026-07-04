#!/usr/bin/env python3
"""
discover-tender-marketplace.py
Discovery khusus website tender/pengadaan & iklan jual beli Indonesia
Output: CSV report kandidat baru yang belum ada di pantau.in
"""
import subprocess, urllib.request, urllib.error, time, json
from datetime import datetime

LOG_FILE = "/var/www/pantau.in/scripts/discover-tender-marketplace.log"
OUT_FILE = "/var/www/pantau.in/scripts/tender-marketplace-candidates.txt"

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{ts}] {msg}\n")

def psql(query):
    r = subprocess.run(
        ["docker","exec","pantau_postgres","psql","-U","pantau_user","-d","pantau_db","-t","-c",query],
        capture_output=True, text=True
    )
    return r.stdout.strip()

def fetch(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; Pantau.in/1.0)"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(16384).decode("utf-8", errors="ignore")
    except Exception as e:
        return 0, str(e)

def check_rss(url):
    status, content = fetch(url)
    if status != 200:
        return False
    return "<rss" in content or "<feed" in content or "<channel>" in content

def domain_exists_in_db(domain):
    res = psql(f"SELECT COUNT(*) FROM \"MonitoringSource\" WHERE url ILIKE '%{domain}%'")
    try:
        return int(res.strip()) > 0
    except:
        return False

# ===== SEED LIST =====
# Tender/Pengadaan Pemerintah
TENDER_SEEDS = [
    # LPSE Nasional & Besar
    ("lpse.lkpp.go.id", "TENDER", "LPSE LKPP Nasional"),
    ("lpse.pu.go.id", "TENDER", "LPSE Kementerian PU"),
    ("lpse.kemenkeu.go.id", "TENDER", "LPSE Kemenkeu"),
    ("lpse.kominfo.go.id", "TENDER", "LPSE Kominfo"),
    ("lpse.kemkes.go.id", "TENDER", "LPSE Kemenkes"),
    ("lpse.kemendikbud.go.id", "TENDER", "LPSE Kemendikbud"),
    ("lpse.polri.go.id", "TENDER", "LPSE Polri"),
    ("lpse.tni.mil.id", "TENDER", "LPSE TNI"),
    ("lpse.bpk.go.id", "TENDER", "LPSE BPK"),
    ("lpse.bkn.go.id", "TENDER", "LPSE BKN"),
    ("lpse.bpkp.go.id", "TENDER", "LPSE BPKP"),
    ("lpse.bappenas.go.id", "TENDER", "LPSE Bappenas"),
    ("lpse.kemenag.go.id", "TENDER", "LPSE Kemenag"),
    ("lpse.kemendagri.go.id", "TENDER", "LPSE Kemendagri"),
    ("lpse.kementan.go.id", "TENDER", "LPSE Kementan"),
    ("lpse.esdm.go.id", "TENDER", "LPSE ESDM"),
    ("lpse.kemenhub.go.id", "TENDER", "LPSE Kemenhub"),
    # LPSE Provinsi
    ("lpse.jakarta.go.id", "TENDER", "LPSE DKI Jakarta"),
    ("lpse.jabarprov.go.id", "TENDER", "LPSE Jawa Barat"),
    ("lpse.jatengprov.go.id", "TENDER", "LPSE Jawa Tengah"),
    ("lpse.jatimprov.go.id", "TENDER", "LPSE Jawa Timur"),
    ("lpse.bali.go.id", "TENDER", "LPSE Bali"),
    ("lpse.sulsel.go.id", "TENDER", "LPSE Sulawesi Selatan"),
    ("lpse.sumut.go.id", "TENDER", "LPSE Sumatera Utara"),
    ("lpse.riau.go.id", "TENDER", "LPSE Riau"),
    ("lpse.kaltim.go.id", "TENDER", "LPSE Kalimantan Timur"),
    ("lpse.ntb.go.id", "TENDER", "LPSE NTB"),
    ("lpse.aceh.go.id", "TENDER", "LPSE Aceh"),
    # Portal Tender Swasta/Agregator
    ("tender-indonesia.com", "TENDER", "Tender Indonesia"),
    ("pengadaan.web.id", "TENDER", "Pengadaan Web ID"),
    ("bisnispengadaan.com", "TENDER", "Bisnis Pengadaan"),
    ("tenderdetail.com", "TENDER", "Tender Detail"),
    ("tenderpemerintah.com", "TENDER", "Tender Pemerintah"),
    ("infotender.id", "TENDER", "Info Tender ID"),
    ("e-tender.co.id", "TENDER", "E-Tender"),
    ("pengadaan.go.id", "TENDER", "SPSE Nasional"),
    ("sirup.lkpp.go.id", "TENDER", "SIRUP LKPP"),
    # BUMN
    ("lpse.pertamina.com", "TENDER", "LPSE Pertamina"),
    ("lpse.pln.co.id", "TENDER", "LPSE PLN"),
    ("lpse.telkom.co.id", "TENDER", "LPSE Telkom"),
    ("lpse.bulog.co.id", "TENDER", "LPSE Bulog"),
    ("lpse.kimia-farma.co.id", "TENDER", "LPSE Kimia Farma"),
    # Kota Besar
    ("lpse.bandung.go.id", "TENDER", "LPSE Bandung"),
    ("lpse.surabaya.go.id", "TENDER", "LPSE Surabaya"),
    ("lpse.medan.go.id", "TENDER", "LPSE Medan"),
    ("lpse.semarang.go.id", "TENDER", "LPSE Semarang"),
    ("lpse.makassar.go.id", "TENDER", "LPSE Makassar"),
    ("lpse.palembang.go.id", "TENDER", "LPSE Palembang"),
    ("lpse.depok.go.id", "TENDER", "LPSE Depok"),
    ("lpse.bogor.go.id", "TENDER", "LPSE Bogor"),
    ("lpse.tangerang.go.id", "TENDER", "LPSE Tangerang"),
    ("lpse.bekasi.go.id", "TENDER", "LPSE Bekasi"),
    ("lpse.yogyakarta.go.id", "TENDER", "LPSE Yogyakarta"),
    ("lpse.malang.go.id", "TENDER", "LPSE Malang"),
]

MARKETPLACE_SEEDS = [
    # Marketplace Nasional
    ("tokopedia.com", "BISNIS", "Tokopedia"),
    ("bukalapak.com", "BISNIS", "Bukalapak"),
    ("shopee.co.id", "BISNIS", "Shopee Indonesia"),
    ("lazada.co.id", "BISNIS", "Lazada Indonesia"),
    ("blibli.com", "BISNIS", "Blibli"),
    ("jd.id", "BISNIS", "JD.ID"),
    ("orami.co.id", "BISNIS", "Orami"),
    # Iklan Baris
    ("olx.co.id", "BISNIS", "OLX Indonesia"),
    ("jualo.com", "BISNIS", "Jualo"),
    ("locanto.co.id", "BISNIS", "Locanto Indonesia"),
    ("berniaga.com", "BISNIS", "Berniaga"),
    ("kaskus.co.id", "BISNIS", "Kaskus FJB"),
    ("carousell.co.id", "BISNIS", "Carousell Indonesia"),
    # Bisnis B2B
    ("indonetwork.co.id", "BISNIS", "Indonetwork"),
    ("indotrading.com", "BISNIS", "Indotrading"),
    ("ecvv.com", "BISNIS", "ECVV Indonesia"),
    ("exportersindia.com", "BISNIS", "Exporters India ID"),
    ("tradekey.com", "BISNIS", "TradeKey Indonesia"),
    # Franchise & Bisnis
    ("franchisekey.com", "BISNIS", "Franchise Key"),
    ("infofranchiise.com", "BISNIS", "Info Franchise"),
    ("duniafranshise.com", "BISNIS", "Dunia Franchise"),
    ("bisniswaralaba.com", "BISNIS", "Bisnis Waralaba"),
    # Properti Komersial
    ("rumah.com", "PROPERTI", "Rumah.com"),
    ("lamudi.co.id", "PROPERTI", "Lamudi"),
    ("dotproperty.co.id", "PROPERTI", "Dot Property"),
    ("raywhite.co.id", "PROPERTI", "Ray White Indonesia"),
    ("era.id", "PROPERTI", "ERA Indonesia"),
    ("century21.co.id", "PROPERTI", "Century 21"),
    # Kendaraan
    ("mobil123.com", "KENDARAAN", "Mobil123"),
    ("oto.com", "KENDARAAN", "OTO.com"),
    ("mobilbekas.com", "KENDARAAN", "Mobilbekas"),
    ("carmudi.co.id", "KENDARAAN", "Carmudi Indonesia"),
    ("moladin.com", "KENDARAAN", "Moladin"),
    ("carro.id", "KENDARAAN", "Carro Indonesia"),
    ("garasi.id", "KENDARAAN", "Garasi.id"),
    ("autofun.co.id", "KENDARAAN", "Autofun Indonesia"),
    # Motor
    ("motormu.com", "KENDARAAN", "Motormu"),
    ("carijual.com", "KENDARAAN", "Cari Jual Motor"),
    ("seminue.com", "KENDARAAN", "Seminue"),
]

# Google News RSS untuk tender Indonesia
GNEWS_TENDER_FEEDS = [
    ("https://news.google.com/rss/search?q=tender+pengadaan+indonesia&hl=id&gl=ID&ceid=ID:id", "TENDER", "GNews Tender Pengadaan"),
    ("https://news.google.com/rss/search?q=lelang+LPSE+pemerintah&hl=id&gl=ID&ceid=ID:id", "TENDER", "GNews Lelang LPSE"),
    ("https://news.google.com/rss/search?q=pengadaan+barang+jasa+pemerintah&hl=id&gl=ID&ceid=ID:id", "TENDER", "GNews Pengadaan Pemerintah"),
    ("https://news.google.com/rss/search?q=jual+beli+bisnis+indonesia&hl=id&gl=ID&ceid=ID:id", "BISNIS", "GNews Jual Beli Bisnis"),
    ("https://news.google.com/rss/search?q=lelang+aset+properti+indonesia&hl=id&gl=ID&ceid=ID:id", "PROPERTI", "GNews Lelang Aset"),
    ("https://news.google.com/rss/search?q=tender+konstruksi+infrastruktur&hl=id&gl=ID&ceid=ID:id", "TENDER", "GNews Tender Konstruksi"),
    ("https://news.google.com/rss/search?q=LPSE+e-procurement+indonesia&hl=id&gl=ID&ceid=ID:id", "TENDER", "GNews LPSE e-Procurement"),
]

def main():
    log("="*60)
    log("DISCOVERY: Tender & Marketplace Indonesia")
    log(f"Total seed: {len(TENDER_SEEDS)+len(MARKETPLACE_SEEDS)} domain + {len(GNEWS_TENDER_FEEDS)} GNews feed")

    results = []
    new_count = 0
    existing_count = 0

    # Cek seed list
    all_seeds = TENDER_SEEDS + MARKETPLACE_SEEDS
    for domain, category, name in all_seeds:
        in_db = domain_exists_in_db(domain)
        status = "EXISTING" if in_db else "NEW"
        if not in_db:
            new_count += 1
        else:
            existing_count += 1
        results.append((domain, category, name, status))
        log(f"  [{status}] {domain} ({category})")
        time.sleep(0.1)

    # Cek GNews feeds
    log("\nCek Google News RSS feeds...")
    gnews_results = []
    for url, category, name in GNEWS_TENDER_FEEDS:
        ok = check_rss(url)
        status = "RSS_OK" if ok else "RSS_FAIL"
        gnews_results.append((url, category, name, status))
        log(f"  [{status}] {name}")
        time.sleep(0.5)

    # Tulis output
    with open(OUT_FILE, "w") as f:
        f.write(f"# Discovery Report: Tender & Marketplace Indonesia\n")
        f.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# Total domain: {len(all_seeds)} | NEW: {new_count} | EXISTING: {existing_count}\n")
        f.write("\n")
        f.write("## DOMAIN SEEDS (NEW = belum ada di DB)\n")
        f.write("STATUS|DOMAIN|CATEGORY|NAME\n")
        for domain, category, name, status in results:
            f.write(f"{status}|{domain}|{category}|{name}\n")
        f.write("\n## GOOGLE NEWS RSS FEEDS\n")
        f.write("STATUS|URL|CATEGORY|NAME\n")
        for url, category, name, status in gnews_results:
            f.write(f"{status}|{url}|{category}|{name}\n")

    # Summary
    new_domains = [r for r in results if r[3]=="NEW"]
    log("\n" + "="*60)
    log(f"SUMMARY:")
    log(f"  Total domain dicek: {len(all_seeds)}")
    log(f"  Sudah ada di DB: {existing_count}")
    log(f"  BARU (belum di DB): {new_count}")
    log(f"  GNews feeds OK: {sum(1 for r in gnews_results if r[3]=='RSS_OK')}/{len(gnews_results)}")
    log(f"  Output: {OUT_FILE}")

    if new_domains:
        log("\nDomain BARU yang bisa ditambahkan:")
        for domain, category, name, _ in new_domains:
            log(f"  + {domain} [{category}] - {name}")

if __name__ == "__main__":
    main()
