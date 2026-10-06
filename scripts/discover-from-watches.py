#!/usr/bin/env python3
import subprocess, urllib.request, re, time
from datetime import datetime

LOG_FILE = "/var/www/pantau.in/scripts/discover-watches.log"

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def psql(query):
    r = subprocess.run(
        ["docker","exec","pantau_postgres","psql","-U","pantau_user","-d","pantau_db","-t","-c",query],
        capture_output=True, text=True
    )
    return r.stdout.strip()

def source_exists(url):
    res = psql(f"SELECT COUNT(*) FROM \"ScraperJob\" WHERE url = '{url}'")
    try:
        return int(res.strip()) > 0
    except:
        return False

def add_source(name, category, url, interval=30):
    name_e = name.replace("'","''")[:100]
    url_e = url.replace("'","''")
    psql(
        f"INSERT INTO \"ScraperJob\" (id,source,category,url,type,config,\"isActive\",\"intervalMinutes\",status,\"errorCount\",\"itemsFound\",\"createdAt\",\"updatedAt\") "
        f"VALUES (gen_random_uuid(),'{name_e}','{category}','{url_e}','RSS','{{}}',true,{interval},'idle',0,0,NOW(),NOW()) "
        f"ON CONFLICT DO NOTHING"
    )

def check_rss(url, timeout=6):
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (compatible; Pantau.in/1.0)"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            c = r.read(4096).decode("utf-8", errors="ignore")
            return r.status == 200 and ("<rss" in c or "<feed" in c or "<channel>" in c)
    except:
        return False

def query_to_gnews_url(query_text):
    clean = re.sub(r"[^\w\s]", " ", query_text.lower())
    words = [w for w in clean.split() if len(w) > 2][:6]
    if not words:
        return None
    q = "+".join(words)
    return f"https://news.google.com/rss/search?q={q}+indonesia+when:7d&hl=id&gl=ID&ceid=ID:id"

def discover_from_watches():
    log("=" * 50)
    log("BAGIAN 1: Discovery dari WatchQuery user")
    rows = psql('SELECT DISTINCT "queryText", category FROM "WatchQuery" WHERE "isActive"=true ORDER BY category')
    added = skipped = 0
    for line in rows.split("\n"):
        line = line.strip()
        if not line or "|" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2:
            continue
        query_text, category = parts[0], parts[1]
        if not query_text or not category:
            continue
        url = query_to_gnews_url(query_text)
        if not url:
            continue
        if source_exists(url):
            skipped += 1
            continue
        if check_rss(url):
            add_source(f"Auto-Watch: {query_text[:50]}", category, url, 30)
            log(f"  [+] {category} | {query_text[:60]}")
            added += 1
        time.sleep(0.5)
    log(f"Watch discovery: +{added} ditambahkan, {skipped} sudah ada")
    return added

def discover_from_listings():
    log("=" * 50)
    log("BAGIAN 2: Discovery domain baru dari ListingItem")
    q = (
        "SELECT DISTINCT regexp_replace(url, 'https?://([^/]+).*', '\\1') as domain, category "
        "FROM \"ListingItem\" "
        "WHERE url IS NOT NULL AND url != '' "
        "AND \"publishedAt\" > NOW() - INTERVAL '7 days' "
        "AND url NOT ILIKE '%google%' "
        "AND url NOT ILIKE '%facebook%' "
        "AND url NOT ILIKE '%twitter%' "
        "ORDER BY domain LIMIT 100"
    )
    rows = psql(q)
    added = checked = 0
    for line in rows.split("\n"):
        line = line.strip()
        if not line or "|" not in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2:
            continue
        domain, category = parts[0], parts[1]
        if not domain or len(domain) < 4:
            continue
        existing = psql(f"SELECT COUNT(*) FROM \"ScraperJob\" WHERE url ILIKE '%{domain}%'")
        try:
            if int(existing.strip()) > 0:
                continue
        except:
            continue
        checked += 1
        for rss_url in [
            f"https://{domain}/feed",
            f"https://{domain}/rss",
            f"https://{domain}/feed.xml",
            f"https://www.{domain}/feed",
            f"https://www.{domain}/rss",
        ]:
            if check_rss(rss_url):
                add_source(f"Auto-Domain: {domain}", category, rss_url, 60)
                log(f"  [+] {category} | {domain}")
                added += 1
                break
            time.sleep(0.2)
    log(f"Domain discovery: checked {checked}, +{added} ditambahkan")
    return added

def send_telegram(msg):
    import os
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "901470999")
    if not token:
        # Coba baca dari .env
        try:
            with open("/var/www/pantau.in/.env") as f:
                for line in f:
                    if line.startswith("TELEGRAM_BOT_TOKEN="):
                        token = line.strip().split("=",1)[1]
                    if line.startswith("TELEGRAM_CHAT_ID="):
                        chat_id = line.strip().split("=",1)[1]
        except:
            pass
    if not token:
        return
    try:
        import urllib.parse
        data = urllib.parse.urlencode({"chat_id": chat_id, "text": msg, "parse_mode": "HTML"}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=data, method="POST"
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        log(f"Telegram error: {e}")

if __name__ == "__main__":
    log(f"Autonomous Discovery -- {datetime.now().strftime('%Y-%m-%d %H:%M WIB')}")
    from_watches = discover_from_watches()
    from_listings = discover_from_listings()
    total = from_watches + from_listings
    count = psql('SELECT COUNT(*) FROM "ScraperJob" WHERE "isActive"=true')
    total_aktif = count.strip()
    log(f"Total source aktif: {total_aktif} | Ditambahkan sesi ini: +{total}")

    # Kirim report ke Telegram
    now = datetime.now().strftime("%d %b %Y %H:%M WIB")
    msg = (
        f"🔍 <b>Pantau.in — Discovery Report</b>\n"
        f"📅 {now}\n"
        f"✅ Source baru: <b>+{total}</b>\n"
        f"👤 Dari watch query: +{from_watches}\n"
        f"🌐 Dari domain baru: +{from_listings}\n"
        f"📊 Total source aktif: <b>{total_aktif}</b>"
    )
    send_telegram(msg)
    log("Report Telegram terkirim")
