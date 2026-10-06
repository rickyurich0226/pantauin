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
Belajar dari feedback user (v2, Okt 2026). Jalan harian via cron.

Perbedaan dengan v1:
- v1 menambahkan SETIAP kata yang muncul di >=2 judul 'Tidak Relevan' ke filters.exclude (blokir permanen).
  Akibatnya kata umum (perumahan, juta, nego, lantai, dekat, siap huni...) ikut diblokir dan watch nyaris mati.
- v2 membandingkan kata di judul 'Tidak Relevan' dengan judul lain yang dikirim ke watch yang sama dan TIDAK dikomplain
  (plus yang ditandai 'Relevan'). Kata baru dipelajari hanya bila jelas lebih sering muncul di judul negatif,
  disimpan di filters.learned sebagai PENALTI LUNAK (mengurangi skor matching), bukan blokir. filters.exclude milik user tidak diubah.
"""
import subprocess, json, re, math
from datetime import datetime

BOT = _TG_TOKEN
CID = '901470999'

MIN_NEG_TITLES = 3      # minimal judul negatif unik yang memuat kata
MIN_RATIO = 3.0         # kata harus >= 3x lebih sering di judul negatif dibanding judul lain
MAX_LEARNED = 8         # maksimal kata dipelajari per watch
PENALTY = 0.15          # pengurang skor per kata (total penalti dibatasi 0,3 di matching)

STOP_WORDS = set("""yang dan di ke dari ini itu atau juga dengan untuk pada adalah akan ada tidak dalam oleh sebagai tersebut
dapat saya kamu kami mereka anda carikan tolong mohon bisa sudah telah sedang belum paling sangat lebih punya
hari bulan tahun lagi saja hanya baru mau maka karena""".split())
# Kata umum per domain: tidak boleh dipelajari sebagai sinyal negatif (terlalu sering di iklan yang benar)
GENERIC = set("""dijual jual beli harga murah luas tanah rumah perumahan properti kavling kaveling hunian lahan unit juta ribu miliar
nego lantai kamar dekat siap huni strategis lokasi jalan raya selatan utara barat timur pusat kota kabupaten mulai bebas mewah
lowongan kerja loker rekrutmen lulusan posisi daftar tender lelang pengadaan proyek paket saham dividen investasi bisnis usaha
peluang franchise mitra mobil motor bekas dealer kredit indonesia terbaru hari tahun""".split())


def psql(q):
    return subprocess.run(
        ['docker', 'exec', 'pantau_postgres', 'psql', '-U', 'pantau_user', '-d', 'pantau_db', '-t', '-A', '-F', '\x1f', '-c', q],
        capture_output=True, text=True
    ).stdout.strip()


def tokenize(s):
    s = re.sub(r'&#?\w+;', ' ', s.lower())
    return [w for w in re.findall(r'[a-z]+', s) if len(w) > 3 and w not in STOP_WORDS]


def send_telegram(msg):
    if not BOT:
        return
    subprocess.run(['curl', '-s', '-X', 'POST', f'https://api.telegram.org/bot{BOT}/sendMessage',
                    '-d', f'chat_id={CID}', '-d', f'text={msg}', '-d', 'parse_mode=HTML'], capture_output=True)


def get_watches_with_feedback():
    q = '''SELECT w.id, w.name, w."queryText", w.filters FROM "WatchQuery" w
        WHERE EXISTS (SELECT 1 FROM "Notification" n WHERE n."watchId" = w.id AND n.feedback = 'NOT_RELEVANT')'''
    rows = []
    for line in psql(q).splitlines():
        parts = line.split('\x1f')
        if len(parts) == 4:
            rows.append({'id': parts[0], 'name': parts[1], 'queryText': parts[2], 'filters': parts[3]})
    return rows


def titles(watch_id, cond):
    q = f'''SELECT DISTINCT n.title FROM "Notification" n
        WHERE n."watchId" = '{watch_id}' AND n.status = 'SENT' AND {cond}
          AND n."sentAt" > now() - interval '60 days' '''
    return [l for l in psql(q).splitlines() if l.strip()]


def learn(w):
    neg = titles(w['id'], "n.feedback = 'NOT_RELEVANT'")
    if len(neg) < MIN_NEG_TITLES:
        return []
    other = titles(w['id'], "(n.feedback IS NULL OR n.feedback = 'RELEVANT')")
    query_words = set(tokenize(w['queryText']))
    neg_c, oth_c = {}, {}
    for t in neg:
        for x in set(tokenize(t)):
            neg_c[x] = neg_c.get(x, 0) + 1
    for t in other:
        for x in set(tokenize(t)):
            oth_c[x] = oth_c.get(x, 0) + 1
    cands = []
    for x, c in neg_c.items():
        if c < MIN_NEG_TITLES or x in query_words or x in GENERIC:
            continue
        neg_rate = c / len(neg)
        oth_rate = (oth_c.get(x, 0) + 1) / (len(other) + 2)      # smoothing
        ratio = neg_rate / oth_rate
        if ratio >= MIN_RATIO:
            cands.append((ratio * math.log(1 + c), x))
    cands.sort(reverse=True)
    return [x for _, x in cands[:MAX_LEARNED]]


def save_learned(w, words):
    try:
        filters = json.loads(w['filters']) if w['filters'] else {}
    except Exception:
        filters = {}
    learned = filters.get('learned') or {}
    before = dict(learned)
    for x in words:
        learned[x] = PENALTY
    # batasi total kata yang dipelajari (simpan yang terbaru)
    if len(learned) > MAX_LEARNED:
        learned = dict(list(learned.items())[-MAX_LEARNED:])
    if learned == before:
        return False
    filters['learned'] = learned
    esc = json.dumps(filters).replace("'", "''")
    psql(f'''UPDATE "WatchQuery" SET filters = '{esc}'::jsonb WHERE id = '{w['id']}' ''')
    return True


def main():
    now = datetime.now().strftime('%d %b %Y %H:%M')
    watches = get_watches_with_feedback()
    if not watches:
        print(f'{now}: Tidak ada feedback baru untuk dipelajari.')
        return
    report = []
    for w in watches:
        words = learn(w)
        if words and save_learned(w, words):
            report.append(f"• <b>{w['name']}</b>: penalti lunak +{', '.join(words)}")
            print(f"{now}: Watch '{w['name']}' - learned (penalti lunak): {words}")
    if report:
        msg = f'🧠 <b>Pantau.in — Auto-Learning v2</b>\n{now}\n\n' + '\n'.join(report)
        msg += '\n\n<i>Kata ini menurunkan skor matching (bukan blokir), dipelajari dari perbandingan feedback "Tidak Relevan" vs notifikasi lain.</i>'
        send_telegram(msg)
    else:
        print(f'{now}: Ada feedback tapi belum cukup pola yang jelas untuk dipelajari.')


if __name__ == '__main__':
    main()
