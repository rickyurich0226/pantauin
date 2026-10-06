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
Deteksi sumber yang HTTP-nya sukses (200) tapi isinya BUKAN format RSS/XML
valid — kasus seperti situs yang berubah jadi HTML biasa tanpa error HTTP.
Ini TIDAK auto-disable apapun — cuma lapor ke Telegram untuk direview manual,
karena minggu lalu terbukti auto-disable berbasis "0 item" salah menangkap
source yang sehat tapi jarang produktif.
Jalan mingguan, Minggu jam 20:00 WIB.
"""
import subprocess, urllib.request

BOT = _TG_TOKEN
CID = '901470999'

def psql(q):
    return subprocess.run(
        ['docker','exec','pantau_postgres','psql','-U','pantau_user','-d','pantau_db','-t','-A','-F','\x1f','-c',q],
        capture_output=True, text=True
    ).stdout.strip()

def send_telegram(msg):
    subprocess.run([
        'curl','-s','-X','POST', f'https://api.telegram.org/bot{BOT}/sendMessage',
        '-d', f'chat_id={CID}', '-d', f'text={msg}', '-d', 'parse_mode=HTML'
    ], capture_output=True)

def is_valid_rss(text):
    head = text[:500].lower()
    return '<?xml' in head or '<rss' in head or '<feed' in head

def main():
    rows_raw = psql("""SELECT id, source, url FROM "ScraperJob"
        WHERE "isActive"=true AND status='idle' AND url LIKE 'http%'""")
    rows = []
    for line in rows_raw.splitlines():
        parts = line.split('\x1f')
        if len(parts) == 3:
            rows.append(parts)

    invalid = []
    for sid, source, url in rows:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
            with urllib.request.urlopen(req, timeout=10) as r:
                body = r.read(2000).decode('utf-8', errors='ignore')
                if not is_valid_rss(body):
                    invalid.append((source, url))
        except Exception:
            pass  # error jaringan biasa sudah tercakup circuit breaker, skip di sini

    if not invalid:
        print("Semua sumber format valid.")
        return

    msg = f'🔍 <b>Pantau.in — Sumber Format Tidak Valid</b>\n\n'
    msg += f'{len(invalid)} sumber HTTP sukses tapi isinya BUKAN RSS/XML (kemungkinan situs berubah format):\n\n'
    for source, url in invalid[:15]:
        msg += f'• {source}\n  {url[:70]}\n'
    if len(invalid) > 15:
        msg += f'\n... dan {len(invalid)-15} lainnya'
    msg += '\n\n<i>Tidak dinonaktifkan otomatis — perlu review manual.</i>'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
