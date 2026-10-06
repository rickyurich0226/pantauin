#!/usr/bin/env python3
# lpse-tender.py - adapter LPSE/INAPROC (via lib pyproc) -> ListingItem kategori TENDER
#   python3 lpse-tender.py --inspect   -> cetak field mentah 1 hasil pencarian (cek skema, tanpa simpan)
#   python3 lpse-tender.py --dry-run   -> tampilkan hasil yang akan disimpan tanpa simpan
#   python3 lpse-tender.py             -> jalankan sungguhan (cron)
import sys, os, json, time, hashlib, subprocess, datetime
from pyproc import Lpse

APP = '/var/www/pantau.in'
STATE_FILE = APP + '/scripts/lpse-state.json'
HOST = 'nasional'
DELAY = 2.0
MAX_NEW_PER_RUN = 60
DRY = '--dry-run' in sys.argv
INSPECT = '--inspect' in sys.argv

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

def active_tender_keywords():
    out, err = psql('''SELECT DISTINCT \"queryText\" FROM \"WatchQuery\" WHERE category = 'TENDER' AND \"isActive\" = true;''')
    kws = [l.strip() for l in out.splitlines() if l.strip()]
    return kws or ['tender pengadaan', 'tender konstruksi', 'lelang']

def ensure_job():
    out, _ = psql('''SELECT id FROM \"ScraperJob\" WHERE source = 'LPSE-INAPROC (pyproc)' LIMIT 1;''')
    if out: return out.splitlines()[0]
    if DRY or INSPECT: return 'DRY-RUN'
    out, err = psql(
        '''INSERT INTO \"ScraperJob\" (id, source, category, url, type, config, \"isActive\", \"intervalMinutes\", status, \"lastError\", \"createdAt\", \"updatedAt\") '''
        '''VALUES (gen_random_uuid()::text, 'LPSE-INAPROC (pyproc)', 'TENDER', 'https://spse.inaproc.id/''' + HOST + '''', 'JSON_API', '{}', false, 60, 'idle', 'Dikelola scripts/lpse-tender.py (bukan fetch-sources)', NOW(), NOW()) RETURNING id;''')
    return out.splitlines()[0] if out else None

def main():
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}
    seen = set(state.get('seen', []))
    keywords = active_tender_keywords()
    print('Keyword watch TENDER aktif:', keywords)
    lpse = Lpse(HOST, timeout=30)
    job = ensure_job() if not INSPECT else 'INSPECT'
    sql, saved = [], 0
    for kw in keywords:
        try:
            packages = lpse.get_paket_tender(start=0, length=25, search_keyword=kw)
        except Exception as e:
            print('GAGAL keyword \'%s\': %s' % (kw, str(e)[:200])); time.sleep(DELAY); continue
        data = packages.get('data') if isinstance(packages, dict) else packages
        data = data or []
        print('keyword \'%s\' -> %d hasil' % (kw, len(data)))
        if INSPECT and data:
            print(json.dumps(data[0], indent=2, ensure_ascii=False, default=str))
            return
        for row in data:
            rid = str(row.get('kd_tender') or row.get('id') or row.get('kode_tender') or json.dumps(row, sort_keys=True))
            ext = hashlib.sha256((HOST + '|' + rid).encode()).hexdigest()
            if ext in seen: continue
            title = str(row.get('nama_paket') or row.get('nama') or row.get('judul') or 'Tender ' + rid)[:200]
            instansi = str(row.get('instansi') or row.get('satker') or row.get('nama_klpd') or '')
            pagu = row.get('pagu') or row.get('nilai_pagu_paket')
            hps = row.get('hps') or row.get('nilai_hps_paket')
            tgl = row.get('tanggal') or row.get('tgl_paket') or row.get('tanggal_pembuatan')
            desc_parts = [p for p in [
                'Instansi: ' + instansi if instansi else '',
                'Pagu: ' + str(pagu) if pagu else '',
                'HPS: ' + str(hps) if hps else '',
                'Tanggal: ' + str(tgl) if tgl else '',
            ] if p]
            desc = ' | '.join(desc_parts) or json.dumps(row, ensure_ascii=False, default=str)[:1500]
            url = 'https://spse.inaproc.id/' + HOST + '/lelang/' + rid + '/pengumumanlelang'
            if len(sql if DRY else [None] * saved) >= MAX_NEW_PER_RUN: break
            if DRY:
                print('  + %s\n    %s' % (title, desc))
            else:
                sql.append(
                    '''INSERT INTO \"ListingItem\" (id, \"scraperJobId\", \"externalId\", title, description, url, category, \"publishedAt\", \"createdAt\") '''
                    '''VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, 'TENDER', NOW(), NOW()) ON CONFLICT DO NOTHING;'''
                    % (q(job), q(ext), q(title), q(desc), q(url)))
            seen.add(ext); saved += 1
        time.sleep(DELAY)
    if sql and not DRY:
        out, err = psql('\n'.join(sql))
        if err: print('peringatan DB:', err[:300])
    if not DRY and not INSPECT:
        state['seen'] = sorted(seen)
        json.dump(state, open(STATE_FILE, 'w'))
    print('selesai | tersimpan', saved)

if __name__ == '__main__':
    main()
