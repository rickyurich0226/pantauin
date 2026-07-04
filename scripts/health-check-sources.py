#!/usr/bin/env python3
"""
health-check-sources.py - Pantau.in Source Health Monitor
Jalan otomatis setiap hari, cek kesehatan semua source aktif,
auto-disable yang error berkepanjangan, kirim laporan ke Telegram.
"""
import subprocess
import urllib.request
import urllib.parse
from datetime import datetime

BOT_TOKEN = "8979371607:AAGQXALkQKMX0laqtiF9BEQDGsq0zwROxAI"
CHAT_ID = "901470999"
LOG_FILE = "/var/www/pantau.in/scripts/health-check.log"


def psql(query):
    result = subprocess.run(
        ["docker", "exec", "pantau_postgres", "psql", "-U", "pantau_user", "-d", "pantau_db", "-t", "-A", "-c", query],
        capture_output=True, text=True
    )
    return result.stdout.strip()


def send_telegram(message):
    try:
        url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage"
        data = urllib.parse.urlencode({
            "chat_id": CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }).encode()
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print("[TELEGRAM ERROR] " + str(e))


def main():
    now = datetime.now().strftime("%d %b %Y %H:%M")

    summary_query = """
        SELECT category || '|' ||
               COUNT(*) FILTER (WHERE status='idle' AND "itemsFound" > 0) || '|' ||
               COUNT(*) FILTER (WHERE status='idle' AND "itemsFound" = 0) || '|' ||
               COUNT(*) FILTER (WHERE status='error')
        FROM "ScraperJob"
        WHERE "isActive" = true
        GROUP BY category ORDER BY category;
    """
    summary_raw = psql(summary_query)

    rows = []
    total_good = 0
    total_idle = 0
    total_error = 0
    for line in summary_raw.split("\n"):
        if not line.strip() or "|" not in line:
            continue
        parts = line.split("|")
        if len(parts) != 4:
            continue
        cat, good, idle, err = parts
        good = int(good)
        idle = int(idle)
        err = int(err)
        total_good += good
        total_idle += idle
        total_error += err
        rows.append((cat, good, idle, err))

    disabled_query = """
        UPDATE "ScraperJob" SET "isActive" = false, "updatedAt" = NOW()
        WHERE "errorCount" > 15 AND "isActive" = true
        RETURNING source || ' (' || category || ')';
    """
    disabled_raw = psql(disabled_query)
    disabled_list = [l.strip() for l in disabled_raw.split("\n") if l.strip() and "UPDATE" not in l]

    stale_query = """
        SELECT source || ' (' || category || ')'
        FROM "ScraperJob"
        WHERE "isActive" = true AND status = 'idle' AND "itemsFound" = 0
          AND "lastRunAt" IS NOT NULL AND "lastRunAt" < NOW() - INTERVAL '3 days'
        ORDER BY category, source
        LIMIT 15;
    """
    stale_raw = psql(stale_query)
    stale_list = [l.strip() for l in stale_raw.split("\n") if l.strip()]

    with open(LOG_FILE, "a") as f:
        f.write("\n[HEALTH CHECK " + now + "]\n")
        for cat, good, idle, err in rows:
            f.write(cat + ": " + str(good) + " OK, " + str(idle) + " belum ada data, " + str(err) + " error\n")
        if disabled_list:
            f.write("Dinonaktifkan (errorCount>15): " + str(len(disabled_list)) + "\n")
            for d in disabled_list:
                f.write("  - " + d + "\n")

    total_all = total_good + total_idle + total_error
    health_pct = round((total_good / total_all * 100), 1) if total_all > 0 else 0

    msg_lines = []
    msg_lines.append("\U0001F3E5 <b>Pantau.in - Laporan Kesehatan Sumber</b>")
    msg_lines.append("\U0001F4C5 " + now)
    msg_lines.append("")
    msg_lines.append("<b>Ringkasan:</b>")
    msg_lines.append("\u2705 Aktif & berhasil: <b>" + str(total_good) + "</b>")
    msg_lines.append("\u23F3 Belum ada data: " + str(total_idle))
    msg_lines.append("\u274C Error: " + str(total_error))
    msg_lines.append("\U0001F4CA Tingkat kesehatan: <b>" + str(health_pct) + "%</b>")
    msg_lines.append("")
    msg_lines.append("<b>Per kategori:</b>")
    for cat, good, idle, err in rows:
        msg_lines.append(cat + ": " + str(good) + "\u2705 / " + str(idle) + "\u23F3 / " + str(err) + "\u274C")

    if disabled_list:
        msg_lines.append("")
        msg_lines.append("\u26A0\uFE0F <b>" + str(len(disabled_list)) + " sumber dinonaktifkan</b> (error berulang >15x):")
        for d in disabled_list[:10]:
            msg_lines.append("  \u2022 " + d)
        if len(disabled_list) > 10:
            msg_lines.append("  ... dan " + str(len(disabled_list) - 10) + " lainnya")

    if stale_list:
        msg_lines.append("")
        msg_lines.append("\U0001F50D <b>" + str(len(stale_list)) + "+ sumber idle tanpa data 3 hari</b> (perlu dicek manual):")
        for s in stale_list[:8]:
            msg_lines.append("  \u2022 " + s)

    msg = "\n".join(msg_lines)
    send_telegram(msg)

    print("Health check selesai: " + str(total_good) + " OK, " + str(total_error) + " error, " + str(len(disabled_list)) + " dinonaktifkan")


if __name__ == "__main__":
    main()
