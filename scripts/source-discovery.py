#!/usr/bin/env python3
# source-discovery.py - mesin penemu sumber Indonesia yang patuh aturan (fase 1)
#   python3 source-discovery.py            -> jalankan (daftarkan sumber yang lolos, maks 20/hari)
#   python3 source-discovery.py --dry-run  -> uji tanpa mendaftarkan apa pun
import sys, os, re, json, time, datetime, subprocess, email.utils
import urllib.request, urllib.parse, urllib.robotparser, urllib.error

APP = '/var/www/pantau.in'
STATE_FILE = APP + '/scripts/discovery-state.json'
SEEDS_FILE = APP + '/scripts/discovery-seeds.txt'
UA = 'Pantau.in/1.0 (+https://pantau.in)'
DELAY = 2.0
MAX_NEW_PER_DAY = 20
MAX_DOMAINS_PER_RUN = 40
MAX_REQUESTS_PER_RUN = 250
MAX_AGE_DAYS = 7
MIN_ITEMS = 3
RECHECK_DAYS = 30
DRY = '--dry-run' in sys.argv

EXCLUDE = re.compile(r'(^|\.)(google\.[a-z.]+|facebook\.com|twitter\.com|x\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com|'
                     r'whatsapp\.com|wa\.me|t\.me|linkedin\.com|bit\.ly|s\.id|cloudflare\.com|pantau\.in|wikipedia\.org|apple\.com|microsoft\.com|github\.com|pinterest\.com|reddit\.com|googletagmanager\.com|doubleclick\.net|gstatic\.com|googleapis\.com|amazon\.com|whatsapp\.net)$')
JUDOL = re.compile(r'\b(slot gacor|gacor|maxwin|slot88|slot online|situs slot|rtp slot|rtp live|scatter hitam|mahjong ways|deposit pulsa|togel online|bandar togel|link alternatif|sbobet|pragmatic play|bonus new member|akun pro)\b', re.I)
FEED_PATHS = ['/feed', '/rss', '/rss.xml', '/feed.xml', '/index.xml', '/atom.xml', '/feeds/posts/default?alt=rss']

LEXICON = {
    'TENDER': r'\b(tender|lelang|pengadaan|lpse|spse|e-katalog|hps|penyedia barang|kontrak pengadaan)\b',
    'LOWONGAN': r'\b(lowongan|loker|rekrutmen|recruitment|hiring|vacancy|job ?fair|bursa kerja|magang|internship|penerimaan (cpns|pppk|pegawai|karyawan|calon)|seleksi (cpns|pppk)|dibutuhkan segera)\b',
    'PROPERTI': r'\b(properti|perumahan|apartemen|kavling|kaveling|kpr|ruko|hunian|residence|residensial|cluster|klaster|townhouse|rumah (dijual|subsidi|murah)|dijual rumah|tanah dijual|dijual tanah)\b',
    'KENDARAAN': r'\b(mobil bekas|motor bekas|mobil second|motor second|dijual mobil|dijual motor|harga mobil|harga motor|lelang (mobil|motor|kendaraan)|dealer)\b',
    'BEASISWA': r'\b(beasiswa|scholarship|fellowship)\b',
    'BANTUAN': r'\b(bansos|bantuan sosial|blt|pkh|hibah|kur|bantuan (modal|usaha|langsung|pemerintah))\b',
    'INVESTASI': r'\b(saham|ihsg|reksa ?dana|obligasi|sukuk|sbn|dividen|ipo|kripto|crypto|bitcoin|emas antam|harga emas)\b',
    'KONSTRUKSI': r'\b(kontraktor|konstruksi|proyek (pembangunan|infrastruktur|jalan|jembatan|gedung))\b',
    'BISNIS': r'\b(peluang usaha|franchise|waralaba|kemitraan|umkm|reseller|dropship|modal usaha)\b',
}
LEX = {k: re.compile(v, re.I) for k, v in LEXICON.items()}

DEFAULT_SEEDS = """
antaranews.com kompas.com detik.com tempo.co tribunnews.com liputan6.com republika.co.id kontan.co.id bisnis.com
idntimes.com kumparan.com okezone.com suara.com merdeka.com sindonews.com jpnn.com cnnindonesia.com cnbcindonesia.com
beritasatu.com mediaindonesia.com rri.co.id katadata.co.id investor.id idxchannel.com jawapos.com pikiran-rakyat.com
solopos.com harianjogja.com suaramerdeka.com radarbandung.id jabar.tribunnews.com jatim.tribunnews.com bali.tribunnews.com
medan.tribunnews.com makassar.tribunnews.com ayobandung.com prokal.co balipost.com timesindonesia.co.id infopublik.id
indonesia.go.id kemnaker.go.id bkn.go.id lkpp.go.id pu.go.id bumn.go.id kemenkeu.go.id ojk.go.id bi.go.id
kemdikbud.go.id lpdp.kemenkeu.go.id kemenkopukm.go.id bappenas.go.id setkab.go.id menpan.go.id
pertamina.com pln.co.id telkom.co.id bri.co.id bni.co.id bankmandiri.co.id goletskerja.com
ui.ac.id ugm.ac.id itb.ac.id unpad.ac.id its.ac.id undip.ac.id unair.ac.id ipb.ac.id
"""

requests_used = 0
def env():
    d = {}
    for l in open(APP + '/.env'):
        if '=' in l and not l.startswith('#'):
            k, v = l.strip().split('=', 1); d[k] = v
    return d
E = env()

def psql(sql):
    r = subprocess.run(['docker', 'exec', '-i', 'pantau_postgres', 'psql', '-U', E['POSTGRES_USER'], '-d', E['POSTGRES_DB'], '-At', '-c', sql],
                       capture_output=True, text=True)
    return r.stdout.strip()
def q(s): return "'" + str(s).replace("'", "''") + "'"

def tg_token():
    t = os.environ.get('TG_BOT_TOKEN')
    if t: return t
    try:
        for l in open('/etc/pantau/telegram.env'):
            if l.startswith('TG_BOT_TOKEN='): return l.split('=', 1)[1].strip()
    except Exception: pass
    return ''
def telegram(msg):
    tok = tg_token()
    if not tok or DRY: print('[telegram]\n' + msg); return
    try:
        data = urllib.parse.urlencode({'chat_id': '901470999', 'text': msg, 'parse_mode': 'HTML', 'disable_web_page_preview': 'true'}).encode()
        urllib.request.urlopen(urllib.request.Request('https://api.telegram.org/bot' + tok + '/sendMessage', data=data), timeout=10)
    except Exception as e: print('[telegram gagal]', e)

def fetch(url, limit=1500000):
    """GET sopan: jeda, identitas jelas, batas ukuran & jumlah request per run."""
    global requests_used
    if requests_used >= MAX_REQUESTS_PER_RUN: raise RuntimeError('kuota request run habis')
    requests_used += 1
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/xml,application/rss+xml,application/atom+xml,*/*;q=0.5'})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.geturl(), r.read(limit).decode('utf-8', 'ignore')
    finally:
        time.sleep(DELAY)

robots = {}
def allowed(url):
    p = urllib.parse.urlparse(url); base = p.scheme + '://' + p.netloc
    if base not in robots:
        try:
            st, _, body = fetch(base + '/robots.txt', 300000)
            rp = urllib.robotparser.RobotFileParser(); rp.parse(body.splitlines()); robots[base] = rp
        except urllib.error.HTTPError as e:
            robots[base] = 'none' if e.code in (404, 410) else 'deny'
        except Exception:
            robots[base] = 'deny'
    rp = robots[base]
    if rp == 'none': return True
    if rp == 'deny': return False
    return rp.can_fetch(UA, url) and rp.can_fetch('*', url)

def is_id_domain(d):
    # semua TLD diterima sebagai kandidat; situs non-.id wajib lolos cek bahasa Indonesia di check_domain
    return bool(d) and '.' in d and not EXCLUDE.search(d)

def domain_of(url):
    try:
        d = urllib.parse.urlparse(url).netloc.lower().split(':')[0]
        return d[4:] if d.startswith('www.') else d
    except Exception: return ''

def feed_links(html, base):
    out = []
    for tag in re.findall(r'<link\b[^>]*>', html, re.I):
        if re.search(r'rel=["\']?alternate', tag, re.I) and re.search(r'type=["\']?application/(rss|atom)\+xml', tag, re.I):
            m = re.search(r'href=["\']([^"\']+)["\']', tag, re.I)
            if m: out.append(urllib.parse.urljoin(base, m.group(1)))
    return out

def parse_feed(body):
    if not re.search(r'<rss|<feed|<rdf:RDF', body[:3000], re.I): return None
    titles = [re.sub(r'<!\[CDATA\[|\]\]>|<[^>]+>', '', t).strip() for t in re.findall(r'<title[^>]*>(.*?)</title>', body, re.S | re.I)][1:]
    ds = []
    for v in re.findall(r'<pubDate>\s*(.*?)\s*</pubDate>', body, re.S | re.I):
        try: ds.append(email.utils.parsedate_to_datetime(v))
        except Exception: pass
    for v in re.findall(r'<(?:updated|published|dc:date)>\s*(.*?)\s*</(?:updated|published|dc:date)>', body, re.S | re.I):
        try: ds.append(datetime.datetime.fromisoformat(v.replace('Z', '+00:00')))
        except Exception: pass
    ds = [d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc) for d in ds]
    items = len(re.findall(r'<item[\s>]|<entry[\s>]', body, re.I))
    return {'items': items, 'titles': titles, 'newest': max(ds) if ds else None}

def classify(title):
    best, score = None, 0
    for cat, rx in LEX.items():
        s = len(rx.findall(title)) * 3
        if s > score: best, score = cat, s
    return best if score >= 3 else None

def guess_category(titles):
    votes = {}
    for t in titles:
        c = classify(t)
        if c: votes[c] = votes.get(c, 0) + 1
    if titles and votes:
        cat, n = max(votes.items(), key=lambda x: x[1])
        if n / len(titles) >= 0.4: return 'TENDER' if cat == 'KONSTRUKSI' else cat
    return 'BISNIS'

def judol_ratio(texts):
    if not texts: return 0.0
    return sum(1 for t in texts if JUDOL.search(t)) / len(texts)

def check_domain(d):
    """Return (status, reason, [ (url, category, items) ])"""
    base = 'https://' + d
    if not allowed(base + '/'): return 'rejected', 'robots.txt / akses ditolak', []
    try:
        st, final, html = fetch(base + '/')
    except urllib.error.HTTPError as e: return 'rejected', 'halaman depan HTTP %d' % e.code, []
    except Exception as e: return 'rejected', 'halaman depan gagal: ' + str(e)[:40], []
    if domain_of(final) and domain_of(final) != d and not domain_of(final).endswith('.' + d):
        return 'rejected', 'dialihkan ke ' + domain_of(final), []
    if not d.endswith('.id') and not (re.search(r'<html[^>]*\blang=["\']?id', html[:3000], re.I) or len(re.findall(r'\b(yang|dengan|untuk|dari|tidak|akan|adalah)\b', html[:200000], re.I)) >= 40):
        return 'rejected', 'bukan situs berbahasa Indonesia', []
    home_suspect = len(JUDOL.findall(html[:300000])) >= 3  # hanya kecurigaan; vonis ditentukan isi feed
    cands = []
    for u in feed_links(html, final) + [base + p for p in FEED_PATHS]:
        if u not in cands and domain_of(u).endswith(d): cands.append(u)
    found = []
    for u in cands[:6]:
        if len(found) >= 1 or requests_used >= MAX_REQUESTS_PER_RUN: break
        if psql('SELECT count(*) FROM "ScraperJob" WHERE url = %s;' % q(u)) not in ('', '0'): continue
        if not allowed(u): continue
        try:
            st, fu, body = fetch(u, 3000000)
        except Exception: continue
        if domain_of(fu) and not domain_of(fu).endswith(d): continue
        f = parse_feed(body)
        if not f or f['items'] < MIN_ITEMS or not f['newest']: continue
        if (datetime.datetime.now(datetime.timezone.utc) - f['newest']).days > MAX_AGE_DAYS: continue
        if judol_ratio(f['titles']) > 0.2: return 'spam', 'judul feed berisi judol', []
        found.append((u, guess_category(f['titles']), f['items']))
    if not found: return ('spam', 'judol di halaman depan & tanpa feed bersih', []) if home_suspect else ('rejected', 'tidak ada feed aktif yang diizinkan', [])
    return 'added', 'feed ditemukan', found

def main():
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {'domains': {}}
    doms = state['domains']
    if not os.path.exists(SEEDS_FILE):
        open(SEEDS_FILE, 'w').write('# satu domain per baris; boleh ditambah kapan saja\n' + '\n'.join(DEFAULT_SEEDS.split()) + '\n')
    seeds = [l.strip().lower() for l in open(SEEDS_FILE) if l.strip() and not l.startswith('#')]
    now = datetime.datetime.now(datetime.timezone.utc)
    def due(d):
        e = doms.get(d)
        if not e: return True
        if e['status'] in ('added', 'spam'): return False
        return (now - datetime.datetime.fromisoformat(e['checked'])).days >= RECHECK_DAYS

    # Kandidat 1: benih. Kandidat 2 (belajar): domain .id yang ditautkan artikel dari sumber yang menghasilkan notifikasi 7 hari.
    cand = [d for d in seeds if due(d)]
    rows = psql('SELECT l.url FROM "ListingItem" l JOIN "ScraperJob" s ON s.id=l."scraperJobId" '
                'WHERE s."isActive" AND s.url NOT ILIKE \'%news.google.com%\' AND l."createdAt" > now()-interval \'3 days\' '
                'AND EXISTS (SELECT 1 FROM "Notification" n JOIN "ListingItem" l2 ON l2.id=n."sourceId" WHERE l2."scraperJobId"=s.id AND n."sentAt" > now()-interval \'7 days\') '
                'ORDER BY random() LIMIT 15;').splitlines()
    learned = 0
    for art in rows:
        if len(cand) >= MAX_DOMAINS_PER_RUN * 2 or not art.startswith('http') or not allowed(art): continue
        try:
            _, _, html = fetch(art, 800000)
        except Exception: continue
        for href in re.findall(r'href=["\'](https?://[^"\'#]+)', html, re.I):
            d = domain_of(href)
            if is_id_domain(d) and d != domain_of(art) and d not in cand and due(d): cand.append(d); learned += 1

    added_today = int(psql('SELECT count(*) FROM "ScraperJob" WHERE source LIKE \'Auto - %\' AND "createdAt" > date_trunc(\'day\', now());') or 0)
    report = {'added': [], 'rejected': 0, 'spam': 0}
    reasons = {}
    for d in cand[:MAX_DOMAINS_PER_RUN]:
        if added_today >= MAX_NEW_PER_DAY or requests_used >= MAX_REQUESTS_PER_RUN: break
        try:
            status, reason, feeds = check_domain(d)
        except Exception as e:
            status, reason, feeds = 'rejected', 'error: ' + str(e)[:40], []
        for (u, cat, n) in feeds:
            if added_today >= MAX_NEW_PER_DAY: break
            if not DRY:
                psql('INSERT INTO "ScraperJob" (id, source, category, url, type, config, "isActive", "intervalMinutes", status, "createdAt", "updatedAt") '
                     "VALUES (gen_random_uuid()::text, %s, %s, %s, 'RSS', '{}', true, 60, 'idle', NOW(), NOW());" % (q('Auto - ' + d), q(cat), q(u)))
            added_today += 1; report['added'].append('%s (%s, %d artikel)' % (d, cat, n))
        if status == 'spam': report['spam'] += 1
        elif status == 'rejected': report['rejected'] += 1; reasons[reason] = reasons.get(reason, 0) + 1
        doms[d] = {'status': status, 'reason': reason, 'checked': now.isoformat()}
        print('%-32s %-8s %s' % (d, status, reason))

    if not DRY: json.dump(state, open(STATE_FILE, 'w'), indent=1)
    total = psql('SELECT count(*) FROM "ScraperJob" WHERE "isActive";')
    top = ', '.join('%s: %d' % (k, v) for k, v in sorted(reasons.items(), key=lambda x: -x[1])[:3]) or '-'
    msg = ('<b>Pantau.in - Penemu Sumber</b>%s\n' % (' (DRY-RUN)' if DRY else '') +
           'Domain dicek: %d (dari tautan artikel: %d)\n' % (min(len(cand), MAX_DOMAINS_PER_RUN), learned) +
           'Sumber baru: %d\n%s\n' % (len(report['added']), '\n'.join('+ ' + a for a in report['added'][:10])) +
           'Ditolak: %d (%s)\nSpam judol diblokir: %d\n' % (report['rejected'], top, report['spam']) +
           'Request dipakai: %d/%d | Sumber aktif: %s' % (requests_used, MAX_REQUESTS_PER_RUN, total))
    telegram(msg)


TENDER_FILE = APP + '/scripts/tender-candidates.json'
MAX_TENDER_PER_RUN = 30
MAX_TENDER_NEW_PER_DAY = 10

def tender_main():
    """Pemburu sumber tender harian: tambang domain pengadaan dari artikel tersimpan, cek patuh aturan,
    daftarkan yang punya feed, catat kandidat adapter SPSE (tanpa RSS tapi robots.txt mengizinkan)."""
    st = json.load(open(TENDER_FILE)) if os.path.exists(TENDER_FILE) else {}
    now = datetime.datetime.now(datetime.timezone.utc)
    rows = psql("SELECT DISTINCT lower(m[1]) FROM (SELECT coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(url,'') AS t "
                "FROM \"ListingItem\" WHERE (coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(url,'')) ~* '(lpse|spse|eproc|inaproc)') x, "
                "regexp_matches(x.t, '((?:[a-z0-9-]+\\.)*(?:lpse|spse|eproc|inaproc)[a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:go\\.id|id))', 'gi') AS m;")
    found = sorted(set(d.strip().lstrip('.').replace('www.', '', 1) for d in rows.splitlines() if d.strip()))
    def due(d):
        e = st.get(d)
        return not e or (now - datetime.datetime.fromisoformat(e['checked'])).days >= RECHECK_DAYS
    todo = [d for d in found if due(d)][:MAX_TENDER_PER_RUN]
    added_today = int(psql('SELECT count(*) FROM "ScraperJob" WHERE source LIKE \'Auto Tender - %\' AND "createdAt" > date_trunc(\'day\', now());') or 0)
    added, adapter, rejected, reasons = [], [], 0, {}
    for d in todo:
        if requests_used >= MAX_REQUESTS_PER_RUN: break
        try:
            status, reason, feeds = check_domain(d)
        except Exception as e:
            status, reason, feeds = 'rejected', 'error: ' + str(e)[:40], []
        rec = {'checked': now.isoformat(), 'status': status, 'reason': reason, 'adapter_candidate': False}
        for (u, cat, n) in feeds:
            if added_today >= MAX_TENDER_NEW_PER_DAY: break
            if not DRY:
                psql('INSERT INTO "ScraperJob" (id, source, category, url, type, config, "isActive", "intervalMinutes", status, "createdAt", "updatedAt") '
                     "VALUES (gen_random_uuid()::text, %s, 'TENDER', %s, 'RSS', '{}', true, 60, 'idle', NOW(), NOW());" % (q('Auto Tender - ' + d), q(u)))
            added_today += 1; added.append('%s (%d artikel)' % (d, n))
        if not feeds and reason == 'tidak ada feed aktif yang diizinkan' and re.search(r'lpse|spse|eproc', d) \
                and allowed('https://' + d + '/eproc4/lelang'):
            rec['adapter_candidate'] = True; adapter.append(d)
        if status != 'added' and not rec['adapter_candidate']:
            rejected += 1; reasons[reason] = reasons.get(reason, 0) + 1
        st[d] = rec
        print('%-40s %-8s %s%s' % (d, status, reason, ' [KANDIDAT ADAPTER]' if rec['adapter_candidate'] else ''))
    if not DRY: json.dump(st, open(TENDER_FILE, 'w'), indent=1)
    total_adapter = sum(1 for v in st.values() if v.get('adapter_candidate'))
    top = ', '.join('%s: %d' % (k, v) for k, v in sorted(reasons.items(), key=lambda x: -x[1])[:3]) or '-'
    telegram('<b>Pantau.in - Pemburu Sumber Tender</b>%s\n' % (' (DRY-RUN)' if DRY else '') +
             'Domain pengadaan ditemukan di data: %d (dicek run ini: %d)\n' % (len(found), len(todo)) +
             'Feed tender didaftarkan: %d\n%s\n' % (len(added), '\n'.join('+ ' + a for a in added[:10])) +
             'Kandidat adapter SPSE baru: %d (total terkumpul: %d)\n' % (len(adapter), total_adapter) +
             'Ditolak: %d (%s)\nRequest dipakai: %d/%d' % (rejected, top, requests_used, MAX_REQUESTS_PER_RUN))

if __name__ == '__main__':
    tender_main() if '--tender' in sys.argv else main()
