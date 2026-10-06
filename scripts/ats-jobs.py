#!/usr/bin/env python3
# ats-jobs.py - lowongan dari API papan lowongan publik (Greenhouse, Lever, Workable) -> ListingItem LOWONGAN
#   python3 ats-jobs.py --probe     -> uji slug kandidat di scripts/ats-boards.txt (sekali / saat daftar ditambah)
#   python3 ats-jobs.py             -> ambil lowongan dari papan yang ditemukan (cron tiap 3 jam)
#   tambah --dry-run untuk melihat tanpa menyimpan
import sys, os, re, json, time, html as htmlmod, subprocess, datetime
import urllib.request, urllib.parse, urllib.robotparser, urllib.error

APP = '/var/www/pantau.in'
STATE_FILE = APP + '/scripts/ats-state.json'
BOARDS_FILE = APP + '/scripts/ats-boards.txt'
UA = 'Pantau.in/1.0 (+https://pantau.in)'
DELAY = 2.0
MAX_AGE_DAYS = 7
DRY = '--dry-run' in sys.argv
ID_LOC = re.compile(r'indonesia|jakarta|bandung|surabaya|yogyakarta|jogja|bali|denpasar|medan|semarang|tangerang|bekasi|depok|'
                    r'bogor|malang|makassar|batam|palembang|balikpapan|(remote|anywhere).{0,25}(asia|apac|sea|southeast)', re.I)
DEFAULT_SLUGS = """xendit ajaib flip pintu kredivo akulaku bukalapak tokopedia gojek traveloka tiket ruangguru zenius halodoc
alodokter efishery warungpintar sirclo mekari qoala pluang bibit stockbit investree amartha koinworks moladin tokocrypto
indodax dana ovo linkaja sayurbox astro segari kopikenangan payfazz brick durianpay rukita travelio pinhome glints kalibrr
kitabisa bobobox evermos superapp ula gudangada waresix kargo logisly deliveree shipper jenius blibli lionparcel paper
oyindonesia gotocompany bizzy fazz brankas finku lummo bukuwarung bukukas privy vida""".split()

def env():
    d = {}
    for l in open(APP + '/.env'):
        if '=' in l and not l.startswith('#'):
            k, v = l.strip().split('=', 1); d[k] = v
    return d
E = env()
def psql(sql):
    r = subprocess.run(['docker', 'exec', '-i', 'pantau_postgres', 'psql', '-U', E['POSTGRES_USER'], '-d', E['POSTGRES_DB'], '-At'],
                       input=sql, capture_output=True, text=True)
    return r.stdout.strip(), r.stderr.strip()
def q(s): return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"

def get_json(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read(15000000).decode('utf-8', 'ignore'))
    except urllib.error.HTTPError as e: return e.code, None
    except Exception: return 0, None
    finally: time.sleep(DELAY)

robots = {}
def allowed(url):
    p = urllib.parse.urlparse(url); base = p.scheme + '://' + p.netloc
    if base not in robots:
        try:
            with urllib.request.urlopen(urllib.request.Request(base + '/robots.txt', headers={'User-Agent': UA}), timeout=15) as r:
                body = r.read(300000).decode('utf-8', 'ignore')
            rp = urllib.robotparser.RobotFileParser(); rp.parse(body.splitlines()); robots[base] = rp
        except urllib.error.HTTPError as e: robots[base] = 'none' if e.code in (404, 410) else 'deny'
        except Exception: robots[base] = 'deny'
        time.sleep(DELAY)
    rp = robots[base]
    if rp == 'none': return True
    if rp == 'deny': return False
    return rp.can_fetch(UA, url)

def clean(s, n):
    s = htmlmod.unescape(re.sub(r'<[^>]+>', ' ', htmlmod.unescape(str(s or ''))))
    return re.sub(r'\s+', ' ', s).strip()[:n]
def dt(v):
    if v in (None, ''): return None
    try:
        if isinstance(v, (int, float)): return datetime.datetime.fromtimestamp(v / 1000, datetime.timezone.utc)
        d = datetime.datetime.fromisoformat(str(v).replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)
    except Exception: return None

# ---- adaptor per platform: kembalikan list dict {title, company, location, url, published, type, desc}
API = {
    'greenhouse': 'https://boards-api.greenhouse.io/v1/boards/%s/jobs?content=true',
    'lever': 'https://api.lever.co/v0/postings/%s?mode=json',
    'workable': 'https://apply.workable.com/api/v1/widget/accounts/%s',
}
def parse(platform, slug, data):
    out = []
    if platform == 'greenhouse' and isinstance(data, dict):
        for j in data.get('jobs', []):
            out.append({'title': j.get('title'), 'company': j.get('company_name') or slug.title(),
                        'location': (j.get('location') or {}).get('name', ''), 'url': j.get('absolute_url'),
                        'published': dt(j.get('first_published') or j.get('updated_at')), 'type': '',
                        'desc': clean(j.get('content'), 1500)})
    elif platform == 'lever' and isinstance(data, list):
        for j in data:
            c = j.get('categories') or {}
            out.append({'title': j.get('text'), 'company': slug.title(),
                        'location': ', '.join(c.get('allLocations') or [c.get('location') or '']), 'url': j.get('hostedUrl'),
                        'published': dt(j.get('createdAt')), 'type': c.get('commitment') or '',
                        'desc': clean(j.get('descriptionPlain') or j.get('description'), 1500)})
    elif platform == 'workable' and isinstance(data, dict):
        for j in data.get('jobs', []):
            out.append({'title': j.get('title'), 'company': data.get('name') or slug.title(),
                        'location': ', '.join(x for x in [j.get('city'), j.get('country')] if x), 'url': j.get('url') or j.get('shortlink'),
                        'published': dt(j.get('published_on') or j.get('created_at')), 'type': j.get('employment_type') or '',
                        'desc': clean(j.get('description'), 1500)})
    return [o for o in out if o['title'] and o['url']]

def load_slugs():
    if not os.path.exists(BOARDS_FILE):
        open(BOARDS_FILE, 'w').write('# satu slug per baris (contoh: xendit) atau platform:slug (contoh: lever:xendit)\n' + '\n'.join(DEFAULT_SLUGS) + '\n')
    return [l.strip().lower() for l in open(BOARDS_FILE) if l.strip() and not l.startswith('#')]

def probe(state):
    boards = state.setdefault('boards', {})
    for entry in load_slugs():
        plats, slug = ([entry.split(':', 1)[0]], entry.split(':', 1)[1]) if ':' in entry else (list(API), entry)
        for p in plats:
            key = p + ':' + slug
            if key in boards: continue
            url = API[p] % urllib.parse.quote(slug)
            if not allowed(url): boards[key] = {'status': 'robots'}; continue
            st, data = get_json(url)
            jobs = parse(p, slug, data) if st == 200 else []
            idn = [j for j in jobs if ID_LOC.search(j['location'] or '')]
            boards[key] = {'status': 'ok' if st == 200 else 'none', 'jobs': len(jobs), 'indonesia': len(idn)}
            if st == 200: print('DITEMUKAN %-28s lowongan %4d | lokasi Indonesia %d' % (key, len(jobs), len(idn)))
    found = [k for k, v in boards.items() if v.get('status') == 'ok']
    print('Papan ditemukan: %d (%s)' % (len(found), ', '.join(found) or '-'))

def ensure_job(platform):
    src = 'ATS - ' + platform.title()
    out, _ = psql('SELECT id FROM "ScraperJob" WHERE source = %s LIMIT 1;' % q(src))
    if out: return out.splitlines()[0]
    if DRY: return 'DRY-RUN'
    out, _ = psql('INSERT INTO "ScraperJob" (id, source, category, url, type, config, "isActive", "intervalMinutes", status, "lastError", "createdAt", "updatedAt") '
                  "VALUES (gen_random_uuid()::text, %s, 'LOWONGAN', %s, 'RSS', '{}', false, 180, 'idle', 'Dikelola scripts/ats-jobs.py (bukan fetch-sources)', NOW(), NOW()) RETURNING id;"
                  % (q(src), q(API[platform].split('%s')[0])))
    return out.splitlines()[0] if out else None

def fetch(state):
    seen = state.setdefault('seen', {}); now = datetime.datetime.now(datetime.timezone.utc)
    boards = [k for k, v in state.get('boards', {}).items() if v.get('status') == 'ok']
    sql, stats = [], {'papan': len(boards), 'lowongan': 0, 'indonesia': 0, 'baru': 0, 'lama': 0}
    for key in boards:
        p, slug = key.split(':', 1)
        st, data = get_json(API[p] % urllib.parse.quote(slug))
        if st != 200: print('%s: HTTP %s' % (key, st)); continue
        job = ensure_job(p)
        for j in parse(p, slug, data):
            stats['lowongan'] += 1
            if not ID_LOC.search(j['location'] or ''): continue
            stats['indonesia'] += 1
            if j['url'] in seen: continue
            seen[j['url']] = now.isoformat()
            pub = j['published'] or now
            if (now - pub).days > MAX_AGE_DAYS: stats['lama'] += 1; continue
            title = clean(j['title'], 200) + ' - ' + clean(j['company'], 100)
            meta = ' | '.join(x for x in ['Lokasi: ' + clean(j['location'], 120) if j['location'] else '', 'Tipe: ' + clean(j['type'], 40) if j['type'] else ''] if x)
            stats['baru'] += 1
            if DRY: print('  + %s\n    %s | terbit %s\n    %s' % (title, meta, pub.date(), j['url']))
            sql.append('INSERT INTO "ListingItem" (id, "scraperJobId", "externalId", title, description, url, category, "publishedAt", location, "createdAt") '
                       "VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, 'LOWONGAN', %s, %s, NOW()) ON CONFLICT DO NOTHING;"
                       % (q(job), q(j['url'][:300]), q(title), q((meta + '\n' if meta else '') + j['desc']), q(j['url']),
                          q(pub.strftime('%Y-%m-%d %H:%M:%S')), q(clean(j['location'], 200) or None)))
    if sql and not DRY:
        _, err = psql('\n'.join(sql))
        if err: print('peringatan DB: ' + err[:200])
    cutoff = (now - datetime.timedelta(days=120)).isoformat()
    state['seen'] = {k: v for k, v in seen.items() if v > cutoff}
    print('papan %(papan)d | lowongan %(lowongan)d | lokasi Indonesia %(indonesia)d | baru disimpan %(baru)d | lama dilewati %(lama)d' % stats)

def main():
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}
    probe(state) if '--probe' in sys.argv else fetch(state)
    if not DRY: json.dump(state, open(STATE_FILE, 'w'))
    print(datetime.datetime.now().strftime('%F %T'), 'selesai' + (' (DRY-RUN)' if DRY else ''))

if __name__ == '__main__':
    main()
