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
Laporan harian kesehatan sumber — deteksi dini kalau ada lonjakan error
mendadak (mis. insiden rate-limit berulang seperti 6-8 Sep 2026).
Jalan harian jam 07:00 WIB.
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

    new_errors = psql("""SELECT COUNT(*) FROM "ScraperJob"
        WHERE status='error' AND "updatedAt" > NOW() - INTERVAL '24 hours'""")
    new_errors = int(new_errors) if new_errors.isdigit() else 0

    new_disabled = psql("""SELECT COUNT(*) FROM "ScraperJob"
        WHERE status='disabled' AND "updatedAt" > NOW() - INTERVAL '24 hours'""")
    new_disabled = int(new_disabled) if new_disabled.isdigit() else 0

    rate_limit_errors = psql("""SELECT COUNT(*) FROM "ScraperJob"
        WHERE "updatedAt" > NOW() - INTERVAL '24 hours'
        AND ("lastError" LIKE '%503%' OR "lastError" LIKE '%429%')""")
    rate_limit_errors = int(rate_limit_errors) if rate_limit_errors.isdigit() else 0

    active = psql("""SELECT COUNT(*) FROM "ScraperJob" WHERE "isActive"=true""")

    # Cuma kirim alert kalau ada tanda masalah — jangan spam kalau semua sehat
    if new_errors < 20 and new_disabled == 0 and rate_limit_errors < 10:
        print(f'{now}: Sehat. Error baru: {new_errors}, disabled: {new_disabled}')
        return

    trend = '🚨' if rate_limit_errors >= 50 else '⚠️'
    msg = f'{trend} <b>Pantau.in — Source Health Alert</b>\n{now}\n\n'
    msg += f'Sumber aktif: {active}\n'
    msg += f'Error baru 24 jam: {new_errors}\n'
    msg += f'Dinonaktifkan 24 jam: {new_disabled}\n'
    msg += f'Kemungkinan rate-limit (503/429): {rate_limit_errors}\n'
    if rate_limit_errors >= 50:
        msg += '\n⚠️ Pola mirip insiden rate-limit sebelumnya — cek segera!'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
