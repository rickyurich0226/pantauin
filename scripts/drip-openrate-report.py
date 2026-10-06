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
Laporan open-rate drip email onboarding (Day 1-60).
Jalan mingguan, hari Senin jam 08:30 WIB.
"""
import subprocess
from datetime import datetime

BOT = _TG_TOKEN
CID = '901470999'

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
    now = datetime.now().strftime('%d %b %Y %H:%M')
    rows = psql("""SELECT action, COUNT(*) as total, COUNT(*) FILTER (WHERE "openedAt" IS NOT NULL) as opened
        FROM "AuditLog" WHERE action LIKE 'DRIP_EMAIL%'
        GROUP BY action ORDER BY action""")

    if not rows:
        print(f'{now}: Belum ada data drip email.')
        return

    msg = f'📬 <b>Pantau.in — Drip Email Open-Rate</b>\n{now}\n\n'
    for line in rows.splitlines():
        parts = line.split('|')
        if len(parts) == 3:
            action, total, opened = parts
            total, opened = int(total), int(opened)
            rate = round(opened/total*100) if total > 0 else 0
            label = action.replace('DRIP_EMAIL_', '')
            msg += f'• {label}: {opened}/{total} ({rate}%)\n'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
