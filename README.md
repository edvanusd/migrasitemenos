# Panduan Migrasi Data Temenos T24

Aplikasi web panduan interaktif untuk migrasi data core banking ke **Temenos T24** — mencakup 13 bagian: ringkasan, objektif & scope, tantangan, roadmap 5 fase, pendekatan menyeluruh 7 tahap, DM Tool teknis (12 template + 16 fitur dengan langkah detail), simulasi interaktif 10 langkah migrasi CUSTOMER, peran R/P/S, program partner, glosarium, dan chatbot tanya-jawab.

**Live:** https://ybbnvk6n.qwenwork.page/

## Sumber pengetahuan
- TEMENOS Data Migration Services — Managed Data Migration and Partner (V15, 2011)
- Data Migration Overall Approach (materi training)
- Data Migration Tool User Guide (GPAC/R13)
- T24 Data Migration Tool (DMIG) Reference Guide V1.3

## Stack
Vite + React + TypeScript (static page) + **three.js** untuk adegan 3D. Tanpa backend — semua data statis di `src/data.ts`.

## Adegan 3D
`src/MigrationScene.tsx` menampilkan perjalanan record: tiga sistem legacy (amber) → ring staging (putih) → grid T24 (hijau), dengan record gagal validasi berwarna merah. Adegan mengikuti fase yang dipilih dan dipakai di Ringkasan, Fase & Roadmap, serta Simulasi. Bisa diputar dengan drag, dan setiap kotak bisa di-hover/ketuk untuk melihat ID record dan statusnya. Modul ini dimuat terpisah (lazy) dan otomatis diganti tampilan statis bila WebGL tidak tersedia atau pengguna memilih reduced motion.

## Deploy ke GitHub Pages
`vite.config.ts` memakai `base: "./"` agar path asset relatif (wajib untuk project site di `/migrasitemenos/`). Hasil `npm run build` (folder `dist/`) dipublikasikan ke branch `gh-pages`.

## Menjalankan lokal
```bash
npm install
npm run dev      # development
npm run build    # build produksi ke dist/
npm test         # test build output
```

## Struktur
- `src/data.ts` — seluruh konten (fase, template DM Tool, simulasi, glosarium, KB chatbot)
- `src/App.tsx` — komponen UI (navigasi, hero, roadmap, tabel RACI, glosarium, chatbot)
- `src/MigrationScene.tsx` — adegan 3D three.js
- `AGENTS.md` — konteks produk
