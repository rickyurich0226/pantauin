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
Deteksi anomali sistem pantau.in secara komprehensif — cek matching engine,
notifikasi, error rate sumber, dan backlog. Beda dari pantau-monitor.sh yang
fokus infrastruktur (disk/container), script ini fokus ke KESEHATAN DATA
dan ALUR KERJA (apakah pipeline fetch->match->dispatch beneran jalan lancar).
Jalan tiap 15 menit via cron.
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
    anomalies = []

    # 1. Matching engine — hanya hitung item dari kategori yang PUNYA watch aktif
    #    (kategori tanpa watch memang sengaja tidak diproses, itu bukan anomali)
    stale_categories = psql("""
        SELECT li.category, COUNT(*) FROM "ListingItem" li
        WHERE li."matchedAt" IS NULL
        AND EXISTS (SELECT 1 FROM "WatchQuery" w WHERE w.category = li.category AND w."isActive"=true)
        AND li."createdAt" < NOW() - INTERVAL '30 minutes'
        GROUP BY li.category
    """)
    if stale_categories:
        total_stale = sum(int(l.split('|')[1]) for l in stale_categories.splitlines() if '|' in l)
        if total_stale > 50:
            anomalies.append(f'🔴 Matching backlog: {total_stale} item (kategori ber-watch) belum diproses >30 menit')

    # 2. Notifikasi gagal tinggi (bukan SKIPPED biasa/quiet hours, tapi FAILED beneran)
    failed_1h = psql("""SELECT COUNT(*) FROM "Notification"
        WHERE status='FAILED' AND "sentAt" > NOW() - INTERVAL '1 hour'""")
    if failed_1h.isdigit() and int(failed_1h) > 20:
        anomalies.append(f'🔴 {failed_1h} notifikasi FAILED (bukan skip) dalam 1 jam terakhir')

    # 3. Error rate sumber melonjak (indikasi rate-limit/blokir seperti insiden sebelumnya)
    recent_errors = psql("""SELECT COUNT(*) FROM "ScraperJob"
        WHERE "updatedAt" > NOW() - INTERVAL '15 minutes'
        AND ("lastError" LIKE '%503%' OR "lastError" LIKE '%429%')""")
    if recent_errors.isdigit() and int(recent_errors) > 30:
        anomalies.append(f'🔴 {recent_errors} sumber kena error 503/429 dalam 15 menit — kemungkinan rate-limit')

    # 4. Fetch-sources tidak jalan lebih dari 15 menit
    last_fetch = psql("""SELECT EXTRACT(EPOCH FROM (NOW() - MAX("lastRunAt")))/60
        FROM "ScraperJob" WHERE "isActive"=true""")
    try:
        fetch_age = float(last_fetch)
        if fetch_age > 15:
            anomalies.append(f'🔴 Fetch sources terakhir jalan {round(fetch_age)} menit lalu (seharusnya tiap 5 menit)')
    except ValueError:
        pass

    # 5. Pipeline macet: tidak ada artikel diproses matching dalam 3 jam (jam aktif WIB). Bukan cek SENT: email kini via digest
    wib_hour = int(psql("""SELECT EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Jakarta'))""").split('.')[0] or 0)
    if 8 <= wib_hour <= 21:  # hanya cek saat jam aktif, hindari false alarm saat quiet hours
        sent_3h = psql("""SELECT COUNT(*) FROM "ListingItem"
            WHERE "matchedAt" > NOW() - INTERVAL '3 hours'""")
        if sent_3h.isdigit() and int(sent_3h) == 0:
            anomalies.append('🟡 Tidak ada artikel yang diproses matching dalam 3 jam terakhir (jam aktif): cek fetch-sources & run-matching')

    if not anomalies:
        print(f'{now}: Tidak ada anomali terdeteksi.')
        return

    msg = f'🚨 <b>Pantau.in — Anomaly Detected</b>\n{now}\n\n'
    msg += '\n'.join(anomalies)
    msg += '\n\n<i>Cek dashboard Super Admin > System Health untuk detail.</i>'

    print(msg)
    send_telegram(msg)

if __name__ == '__main__':
    main()
