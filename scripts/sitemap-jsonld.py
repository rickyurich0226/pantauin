#!/usr/bin/env python3
# sitemap-jsonld.py - adapter generik: sitemap + JSON-LD (JobPosting) -> ListingItem (patuh robots.txt)
#   python3 sitemap-jsonld.py            -> jalankan (cron tiap 30 menit)
#   python3 sitemap-jsonld.py --dry-run  -> tampilkan hasil tanpa menyimpan
import sys, os, re, json, time, html as htmlmod, hashlib, subprocess, datetime
import urllib.request, urllib.parse, urllib.robotparser, urllib.error

APP = '/var/www/pantau.in'
STATE_FILE = APP + '/scripts/sitemap-state.json'
UA = 'Pantau.in/1.0 (+https://pantau.in)'
DELAY = 2.0
MAX_NEW_PER_RUN = 60
FIRST_RUN_BACKFILL = 30
MAX_POST_AGE_DAYS = 7  # lowongan lebih tua tidak disimpan (matching juga hanya menotifikasi yang <= 3 hari)
DRY = '--dry-run' in sys.argv

# Tambah portal baru = tambah satu entri di sini
TARGETS = [
    {'name': 'dealls.com', 'sitemap': 'https://dealls.com/sitemap-dynamic.xml',
     'pattern': r'^https://dealls\.com/loker/[^/]+~[^/]+/?$', 'category': 'LOWONGAN'},
]

def env():
    d = {}
    for l in open(APP + '/.env'):
        if '=' in l and not l.startswith('#'):
            k, v = l.strip().split('=', 1); d[k] = v
    return d
E = env()
def psql(sql):
    r = subprocess.run(['docker', 'exec', '-i', 'pantau_postgres', 'psql', '-U', E['POSTGRES_USER'], '-d', E['POSTGRES_DB'], '-At', '-v', 'ON_ERROR_STOP=0'],
                       input=sql, capture_output=True, text=True)
    return r.stdout.strip(), r.stderr.strip()
def q(s): return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"

def get(url, limit=3000000):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=20) as r:
            return r.status, r.read(limit).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e: return e.code, ''
    except Exception: return 0, ''
    finally: time.sleep(DELAY)

robots = {}
def allowed(url):
    p = urllib.parse.urlparse(url); base = p.scheme + '://' + p.netloc
    if base not in robots:
        st, body = get(base + '/robots.txt', 300000)
        if st == 200 and 'user-agent' in body.lower():
            rp = urllib.robotparser.RobotFileParser(); rp.parse(body.splitlines()); robots[base] = rp
        else: robots[base] = 'none' if st in (404, 410) else 'deny'
    rp = robots[base]
    if rp == 'none': return True
    if rp == 'deny': return False
    return rp.can_fetch(UA, url) and rp.can_fetch('*', url)

def jobposting(page):
    for b in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', page, re.S | re.I):
        try: d = json.loads(b.strip())
        except Exception: continue
        for x in (d if isinstance(d, list) else d.get('@graph', [d])):
            if isinstance(x, dict) and x.get('@type') == 'JobPosting': return x
    return None

def clean(s, n):
    s = htmlmod.unescape(re.sub(r'<[^>]+>', ' ', str(s or '')))
    return re.sub(r'\s+', ' ', s).strip()[:n]

def parse_dt(v):
    if not v: return None
    try:
        d = datetime.datetime.fromisoformat(str(v).replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)
    except Exception: return None

def location(jp):
    locs = jp.get('jobLocation') or []
    if isinstance(locs, dict): locs = [locs]
    out = []
    for l in locs:
        a = (l or {}).get('address') or {}
        if isinstance(a, dict):
            part = a.get('addressLocality') or a.get('addressRegion') or ''
            if part and part not in out: out.append(part)
    if jp.get('jobLocationType') == 'TELECOMMUTE': out.append('Remote')
    return ', '.join(out)[:200]

def emptype(v):
    m = {'FULL_TIME': 'Penuh waktu', 'PART_TIME': 'Paruh waktu', 'CONTRACTOR': 'Kontrak', 'TEMPORARY': 'Sementara',
         'INTERN': 'Magang', 'VOLUNTEER': 'Relawan', 'PER_DIEM': 'Harian', 'OTHER': 'Lainnya'}
    return ', '.join(m.get(str(x).upper(), str(x)) for x in (v if isinstance(v, list) else [v]))[:60]

def salary(jp):
    b = jp.get('baseSalary') or {}
    if not isinstance(b, dict): return ''
    v = b.get('value') or {}
    cur = b.get('currency', 'IDR')
    if isinstance(v, dict):
        lo, hi = v.get('minValue'), v.get('maxValue')
        unit = {'MONTH': '/bulan', 'YEAR': '/tahun', 'HOUR': '/jam', 'DAY': '/hari', 'WEEK': '/minggu'}.get(str(v.get('unitText', '')).upper(), '')
        fmt = lambda n: '{:,.0f}'.format(float(n)).replace(',', '.')
        try:
            if lo and hi: return '%s %s - %s%s' % (cur, fmt(lo), fmt(hi), unit)
            if lo or v.get('value'): return '%s %s%s' % (cur, fmt(lo or v.get('value')), unit)
        except Exception: return ''
    return ''

def sitemap_urls(t):
    st, xml = get(t['sitemap'])
    if st != 200: return None
    out = []
    for m in re.finditer(r'<url>(.*?)</url>', xml, re.S):
        loc = re.search(r'<loc>\s*(.*?)\s*</loc>', m.group(1)); lm = re.search(r'<lastmod>\s*(.*?)\s*</lastmod>', m.group(1))
        if loc and re.match(t['pattern'], loc.group(1).strip()):
            out.append((loc.group(1).strip(), lm.group(1).strip() if lm else ''))
    return sorted(out, key=lambda x: x[1], reverse=True)

def ensure_job(t):
    out, _ = psql('SELECT id FROM "ScraperJob" WHERE url = %s LIMIT 1;' % q(t['sitemap']))
    if out: return out.splitlines()[0]
    if DRY: return 'DRY-RUN'
    out, err = psql('INSERT INTO "ScraperJob" (id, source, category, url, type, config, "isActive", "intervalMinutes", status, "lastError", "createdAt", "updatedAt") '
                    "VALUES (gen_random_uuid()::text, %s, %s, %s, 'RSS', '{}', false, 30, 'idle', 'Dikelola scripts/sitemap-jsonld.py (bukan fetch-sources)', NOW(), NOW()) RETURNING id;"
                    % (q('Sitemap - ' + t['name']), q(t['category']), q(t['sitemap'])))
    return out.splitlines()[0] if out else None

def run_target(t, state):
    seen = set(state.get(t['name'], []))
    urls = sitemap_urls(t)
    if urls is None: print('%s: sitemap gagal diambil' % t['name']); return
    first = not seen
    fresh = [u for u in urls if u[0] not in seen]
    todo = fresh[:FIRST_RUN_BACKFILL] if first else fresh[:MAX_NEW_PER_RUN]
    job = ensure_job(t)
    if not job: print('%s: gagal membuat ScraperJob' % t['name']); return
    now = datetime.datetime.now(datetime.timezone.utc)
    sql, saved, skipped = [], 0, {}
    for url, lm in todo:
        if not allowed(url): skipped['robots'] = skipped.get('robots', 0) + 1; seen.add(url); continue
        st, page = get(url)
        if st != 200: skipped['HTTP %s' % st] = skipped.get('HTTP %s' % st, 0) + 1; continue
        jp = jobposting(page)
        if not jp: skipped['tanpa JobPosting'] = skipped.get('tanpa JobPosting', 0) + 1; seen.add(url); continue
        vt = parse_dt(jp.get('validThrough'))
        if vt and vt < now: skipped['sudah tutup'] = skipped.get('sudah tutup', 0) + 1; seen.add(url); continue
        org = (jp.get('hiringOrganization') or {}).get('name', '') if isinstance(jp.get('hiringOrganization'), dict) else ''
        title = clean(jp.get('title'), 200) + (' - ' + clean(org, 100) if org else '')
        loc, sal = location(jp), salary(jp)
        meta = ' | '.join(x for x in ['Lokasi: ' + loc if loc else '', 'Gaji: ' + sal if sal else '',
                                       'Tipe: ' + emptype(jp.get('employmentType')) if jp.get('employmentType') else '',
                                       'Batas: ' + vt.strftime('%d %b %Y') if vt else ''] if x)
        desc = (meta + '\n' if meta else '') + clean(jp.get('description'), 1500)
        pub = parse_dt(jp.get('datePosted')) or parse_dt(lm) or now
        if (now - pub).days > MAX_POST_AGE_DAYS:
            k = 'terbit > %d hari' % MAX_POST_AGE_DAYS; skipped[k] = skipped.get(k, 0) + 1; seen.add(url); continue
        ext = url if len(url) <= 300 else hashlib.sha256(url.encode()).hexdigest()
        if DRY: print('  + %s\n    %s\n    terbit %s | %s' % (title, meta, pub.date(), url))
        sql.append('INSERT INTO "ListingItem" (id, "scraperJobId", "externalId", title, description, url, category, "publishedAt", location, "createdAt") '
                   'VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, NOW()) ON CONFLICT DO NOTHING;'
                   % (q(job), q(ext), q(title), q(desc), q(url), q(t['category']), q(pub.strftime('%Y-%m-%d %H:%M:%S')), q(loc or None)))
        seen.add(url); saved += 1
    if sql and not DRY:
        out, err = psql('\n'.join(sql))
        if err: print('%s: peringatan DB: %s' % (t['name'], err[:200]))
    if first and not DRY: seen.update(u for u, _ in urls)
    state[t['name']] = sorted(seen)
    print('%s: sitemap %d | baru %d | diproses %d | tersimpan %d%s | dilewati %s' % (
        t['name'], len(urls), len(fresh), len(todo), saved, ' (run pertama: sisanya ditandai sudah dilihat)' if first else '',
        ', '.join('%s=%d' % kv for kv in skipped.items()) or '-'))

def main():
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}
    for t in TARGETS:
        try: run_target(t, state)
        except Exception as e: print('%s: ERROR %s' % (t['name'], str(e)[:120]))
    if not DRY: json.dump(state, open(STATE_FILE, 'w'))
    print(datetime.datetime.now().strftime('%F %T'), 'selesai' + (' (DRY-RUN)' if DRY else ''))

if __name__ == '__main__':
    main()
