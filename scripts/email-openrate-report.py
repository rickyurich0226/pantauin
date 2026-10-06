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
Laporan harian open-rate email — bandingkan notifikasi EMAIL yang terkirim
vs yang beneran dibuka (tracking pixel), dari notifikasi yang dikirim
SETELAH tracking pixel dipasang (05 Sep 2026).
Jalan harian jam 08:00 WIB.
"""
import subprocess
from datetime import datetime

BOT = _TG_TOKEN
CID = '901470999'
TRACKING_START = '2026-09-05 00:00:00'  # tanggal deploy tracking pixel

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

    total = psql(f"""SELECT COUNT(*) FROM "Notification"
        WHERE channel='EMAIL' AND status='SENT' AND "sentAt" >= '{TRACKING_START}'""")
    opened = psql(f"""SELECT COUNT(*) FROM "Notification"
        WHERE channel='EMAIL' AND status='SENT' AND "sentAt" >= '{TRACKING_START}'
        AND "emailOpenedAt" IS NOT NULL""")

    total = int(total) if total.isdigit() else 0
    opened = int(opened) if opened.isdigit() else 0

    if total == 0:
        print(f'{now}: Belum ada email terkirim sejak tracking dipasang.')
        return

    rate = round(opened / total * 100, 1)

    # Breakdown per user (siapa yang paling aktif buka email)
    per_user = psql(f"""SELECT u.email, COUNT(*) as total,
        COUNT(*) FILTER (WHERE n."emailOpenedAt" IS NOT NULL) as opened
        FROM "Notification" n JOIN "User" u ON u.id=n."userId"
        WHERE n.channel='EMAIL' AND n.status='SENT' AND n."sentAt" >= '{TRACKING_START}'
        GROUP BY u.email ORDER BY total DESC LIMIT 10""")

    msg = f'📧 <b>Pantau.in — Email Open-Rate Report</b>\n{now}\n\n'
    msg += f'Total email terkirim: <b>{total}</b>\n'
    msg += f'Dibuka: <b>{opened}</b> ({rate}%)\n\n'
    msg += 'Per user (top 10):\n'
    for line in per_user.splitlines():
        parts = line.split('|')
        if len(parts) == 3:
            email, t, o = parts
            t, o = int(t), int(o)
            r = round(o/t*100) if t > 0 else 0
            msg += f'• {email}: {o}/{t} ({r}%)\n'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
