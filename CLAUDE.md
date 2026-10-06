# pantau.in — baca dulu sebelum mengubah

Sebelum mengubah apa pun di project/server ini, baca aturan di `/root/.claude/CLAUDE.md` dan catatan perubahan terbaru
`/root/CATATAN_PERUBAHAN_*.md` (terakhir: `/root/CATATAN_PERUBAHAN_2026-10-05_PANTAU_MATCHING_V2.md` — matching v2 & learning v2).

Inti: matching ada di `src/lib/matching-v2.ts` (dipanggil dari `src/lib/matching.ts`); learning di `scripts/learn-from-feedback.py`
(penalti lunak di `filters.learned`, tidak menyentuh `filters.exclude`). Jangan kembalikan ke versi lama tanpa persetujuan pemilik.
