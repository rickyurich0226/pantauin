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
Insight pasar mingguan — tren volume listing per kategori, minggu ini vs
minggu lalu. Dirancang jadi konten yang menarik dibagikan (bukan cuma laporan
internal), karena data tren lebih sering di-share orang daripada listing biasa.
Jalan tiap Senin jam 09:00 WIB.
"""
import subprocess
from datetime import datetime

BOT = _TG_TOKEN
CID = '901470999'

CAT_LABELS = {
    'TENDER': '📋 Tender', 'PROPERTI': '🏠 Properti', 'KENDARAAN': '🚗 Kendaraan',
    'BISNIS': '💼 Bisnis', 'INVESTASI': '📈 Investasi', 'LOWONGAN': '👔 Lowongan',
    'BEASISWA': '🎓 Beasiswa', 'BANTUAN': '🤝 Bantuan',
}

def psql(q):
    return subprocess.run(
        ['docker','exec','pantau_postgres','psql','-U','pantau_user','-d','pantau_db','-t','-A','-c',q],
        capture_output=True, text=True
    ).stdout.strip()

def send_telegram(msg):
    subprocess.run([
        'curl','-s','-X','POST', f'https://api.telegram.org/bot{BOT}/sendMessage',
        '-d', f'chat_id={CID}', '-d', f'text={msg}', '-d', 'parse_mode=HTML'
    ], capture_output=True)

def main():
    now = datetime.now().strftime('%d %b %Y')

    this_week = psql("""SELECT category, COUNT(*) FROM "ListingItem"
        WHERE "createdAt" > NOW() - INTERVAL '7 days'
        GROUP BY category""")
    last_week = psql("""SELECT category, COUNT(*) FROM "ListingItem"
        WHERE "createdAt" > NOW() - INTERVAL '14 days' AND "createdAt" <= NOW() - INTERVAL '7 days'
        GROUP BY category""")

    this_map = {}
    for line in this_week.splitlines():
        parts = line.split('|')
        if len(parts) == 2:
            this_map[parts[0]] = int(parts[1])

    last_map = {}
    for line in last_week.splitlines():
        parts = line.split('|')
        if len(parts) == 2:
            last_map[parts[0]] = int(parts[1])

    total_this = sum(this_map.values())
    total_last = sum(last_map.values())
    total_change = round((total_this - total_last) / total_last * 100) if total_last > 0 else 0
    arrow_total = '📈' if total_change > 0 else ('📉' if total_change < 0 else '➡️')

    msg = f'📊 <b>Pantau.in — Insight Pasar Mingguan</b>\n{now}\n\n'
    msg += f'{arrow_total} Total peluang baru minggu ini: <b>{total_this:,}</b> ({"+" if total_change>=0 else ""}{total_change}% dari minggu lalu)\n\n'
    msg += '<b>Per Kategori:</b>\n'

    # Urutkan dari kategori paling ramai
    sorted_cats = sorted(this_map.items(), key=lambda x: -x[1])
    for cat, count in sorted_cats:
        prev = last_map.get(cat, 0)
        change = round((count - prev) / prev * 100) if prev > 0 else 0
        arrow = '🔺' if change > 5 else ('🔻' if change < -5 else '▪️')
        label = CAT_LABELS.get(cat, cat)
        msg += f'{arrow} {label}: {count:,} ({"+" if change>=0 else ""}{change}%)\n'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
