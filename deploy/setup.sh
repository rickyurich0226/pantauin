#!/bin/bash
# Setup pantau.in di VPS. Jalankan dari dalam folder /var/www/pantau.in
set -e

echo "🔍 Mengecek file .env dan app-secrets.env..."
if [ ! -f .env ]; then
  echo "❌ File .env belum ada. Copy dari .env.example dulu, lalu isi nilainya:"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi
if [ ! -f app-secrets.env ]; then
  echo "❌ File app-secrets.env belum ada. Copy dari app-secrets.env.example dulu:"
  echo "   cp app-secrets.env.example app-secrets.env && nano app-secrets.env"
  exit 1
fi
if grep -q "GANTI_DENGAN" .env; then
  echo "❌ Masih ada placeholder 'GANTI_DENGAN...' di .env. Edit dulu sebelum lanjut:"
  echo "   nano .env"
  exit 1
fi

echo "🏗️  Build & jalankan container (ini bisa makan waktu beberapa menit)..."
docker compose build
docker compose up -d

echo "⏳ Menunggu Postgres siap..."
until docker compose exec -T pantau_postgres pg_isready -U "$(grep POSTGRES_USER .env | cut -d= -f2)" > /dev/null 2>&1; do
  sleep 2
done

echo "📦 Menerapkan struktur database (prisma db push)..."
docker compose exec -T pantau_web npx prisma db push

echo "🌱 Membuat akun Super Admin pertama..."
docker compose exec -T pantau_web npm run db:seed

echo ""
echo "✅ Selesai! pantau_web jalan di 127.0.0.1:3001 (internal)."
echo ""
echo "Langkah selanjutnya yang masih manual:"
echo "  1. Pasang config Nginx: deploy/pantau.in.nginx.conf → /etc/nginx/sites-available/"
echo "  2. Pastikan DNS pantau.in mengarah ke IP VPS ini"
echo "  3. Jalankan: sudo certbot --nginx -d pantau.in -d www.pantau.in"
echo "  4. Tambahkan jadwal cron dari deploy/crontab-pantauin.txt (crontab -e)"
echo "  5. Login pakai akun Super Admin dari .env (SUPERADMIN_EMAIL/PASSWORD)"
