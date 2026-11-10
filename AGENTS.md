# Panduan Interaktif Migrasi Data Temenos T24

## Project background
Panduan web interaktif untuk migrasi data core banking ke Temenos T24, disarikan dari dokumen "TEMENOS Data Migration Services — Managed Data Migration and Partner (V15, 2011)". Target pengguna: tim bank/partner yang mempelajari proses migrasi data ke T24. Tujuan: belajar per fase + bertanya via chatbot berbasis isi dokumen.

## Product shape
- **Category:** static Page (Vite + React + TS), build ke `dist/`.
- **Fitur:** navigasi 13 bagian — ringkasan; objektif & scope; tantangan; roadmap 5 fase TDM; pendekatan menyeluruh 7 tahap; **DM Tool teknis** (overview, riwayat versi/service mode, pre-requisite check & template yang bisa diklik dengan detail field, STP, AUTO.DMD.CREATION, 16 fitur tambahan expandable dengan langkah kerja); **simulasi interaktif 10 langkah** migrasi CUSTOMER (pre-req → translation → DMD → DM.PREREQUISITE → DMV → backup aplikasi → DSC load dengan record error yang bisa diperbaiki → extract recon → data compare → cleanup); peran R/P/S + Temenos vs Client; prasyarat & manfaat partner; glosarium; referensi; tentang — plus chatbot KB keyword-matching.
- **Sumber:** empat dokumen — TDM V15 (2011), "Data Migration Overall Approach" (training), "DM Tool User Guide" GPAC/R13 (308 hal), dan "T24 DMIG Reference Guide V1.3" (165 hal).
- **Bahasa UI:** Indonesia. Kontak: dm@temenos.com.
- **Scope:** tanpa backend, tanpa akun user, tanpa database — semua data statis di `src/data.ts`.
