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
import subprocess, urllib.request, urllib.parse
from datetime import datetime
BOT = _TG_TOKEN
CID = '901470999'
def psql(q):
    return subprocess.run(['docker','exec','pantau_postgres','psql','-U','pantau_user','-d','pantau_db','-t','-A','-c',q],capture_output=True,text=True).stdout.strip()
def stg(m):
    try:
        urllib.request.urlopen(urllib.request.Request('https://api.telegram.org/bot'+BOT+'/sendMessage',urllib.parse.urlencode({'chat_id':CID,'text':m,'parse_mode':'HTML'}).encode()),timeout=10)
    except Exception as e:
        print(e)
def main():
    now = datetime.now().strftime('%d %b %Y %H:%M')
    q = """SELECT category||'|'||
        COUNT(*) FILTER (WHERE "lastRunAt" > NOW()-INTERVAL '2 hours')||'|'||
        COUNT(*) FILTER (WHERE "lastRunAt" IS NULL OR "lastRunAt"<=NOW()-INTERVAL '2 hours')||'|'||
        COUNT(*) FILTER (WHERE status='error')
        FROM "ScraperJob" WHERE "isActive"=true GROUP BY category ORDER BY category"""
    rows=[]; tgood=0; tstale=0; terr=0
    for line in psql(q).splitlines():
        p=line.strip().split('|')
        if len(p)!=4: continue
        try:
            cat,g,s,e=p; g,s,e=int(g),int(s),int(e)
            tgood+=g; tstale+=s; terr+=e; rows.append((cat,g,s,e))
        except: continue
    tot=tgood+tstale+terr
    pct=round(tgood/tot*100,1) if tot>0 else 0
    msg='Pantau.in Health Check ' + now + '\n'
    msg+='Aktif: '+str(tgood)+' | Stale: '+str(tstale)+' | Error: '+str(terr)+'\n'
    msg+='Health: '+str(pct)+'%\n\nPer kategori:'
    for cat,g,s,e in rows:
        msg+='\n'+cat+': '+str(g)+' ok / '+str(s)+' stale / '+str(e)+' err'
    msg+='\n\nTotal aktif: '+psql('SELECT COUNT(*) FROM "ScraperJob" WHERE "isActive"=true')
    print(msg)
    stg(msg)
if __name__=='__main__':
    main()