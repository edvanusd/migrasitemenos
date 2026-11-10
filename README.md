# Panduan Migrasi Data Temenos T24

Aplikasi web panduan interaktif untuk migrasi data core banking ke **Temenos T24** — mencakup 13 bagian: ringkasan, objektif & scope, tantangan, roadmap 5 fase, pendekatan menyeluruh 7 tahap, DM Tool teknis (12 template + 16 fitur dengan langkah detail), simulasi interaktif 10 langkah migrasi CUSTOMER, peran R/P/S, program partner, glosarium, dan chatbot tanya-jawab.

**Live:** https://ybbnvk6n.qwenwork.page/

## Sumber pengetahuan
- TEMENOS Data Migration Services — Managed Data Migration and Partner (V15, 2011)
- Data Migration Overall Approach (materi training)
- Data Migration Tool User Guide (GPAC/R13)
- T24 Data Migration Tool (DMIG) Reference Guide V1.3

## Stack
Vite + React + TypeScript (static page). Tanpa backend — semua data statis di `src/data.ts`.

## Menjalankan lokal
```bash
npm install
npm run dev      # development
npm run build    # build produksi ke dist/
npm test         # test build output
```

## Struktur
- `src/data.ts` — seluruh konten (fase, template DM Tool, simulasi, glosarium, KB chatbot)
- `src/App.tsx` — komponen UI (navigasi, roadmap, tabel RACI, chatbot)
- `AGENTS.md` — konteks produk
