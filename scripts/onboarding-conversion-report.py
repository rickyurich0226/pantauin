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
Laporan mingguan: berapa % user baru (7 hari terakhir) yang berhasil
bikin watch query aktif — validasi berkelanjutan apakah onboarding flow
masih sehat (banner persisten dipasang 05 Sep 2026).
Jalan tiap Senin jam 09:15 WIB.
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
    now = datetime.now().strftime('%d %b %Y')

    total_new = psql("""SELECT COUNT(*) FROM "User" WHERE "createdAt" > NOW() - INTERVAL '7 days'""")
    total_new = int(total_new) if total_new.isdigit() else 0

    if total_new == 0:
        print(f'{now}: Tidak ada user baru minggu ini.')
        return

    with_watch = psql("""SELECT COUNT(*) FROM "User" u
        WHERE u."createdAt" > NOW() - INTERVAL '7 days'
        AND EXISTS (SELECT 1 FROM "WatchQuery" w WHERE w."userId"=u.id AND w."isActive"=true)""")
    with_watch = int(with_watch) if with_watch.isdigit() else 0

    avg_minutes = psql("""SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first_watch - u."createdAt"))/60)::numeric, 1)
        FROM "User" u
        JOIN (SELECT "userId", MIN("createdAt") as first_watch FROM "WatchQuery" GROUP BY "userId") w
        ON w."userId" = u.id
        WHERE u."createdAt" > NOW() - INTERVAL '7 days'""")

    rate = round(with_watch / total_new * 100) if total_new > 0 else 0
    trend = '✅' if rate >= 70 else ('⚠️' if rate >= 40 else '🚨')

    msg = f'🎯 <b>Pantau.in — Onboarding Conversion Report</b>\n{now}\n\n'
    msg += f'{trend} User baru 7 hari: <b>{total_new}</b>\n'
    msg += f'Bikin pantauan aktif: <b>{with_watch}/{total_new}</b> ({rate}%)\n'
    if avg_minutes and avg_minutes != '':
        msg += f'Rata-rata waktu ke pantauan pertama: <b>{avg_minutes} menit</b>\n'
    msg += '\n<i>Target sehat: minimal 70% user baru bikin pantauan aktif.</i>'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
