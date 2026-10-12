# Panduan Kontribusi

Terima kasih sudah mau ikut mengerjakan Kaigo 3D. Panduan ini berisi langkah singkat supaya kamu bisa mulai tanpa bertanya-tanya.

## Siapkan lingkungan

Butuh Node.js 18 atau lebih baru.

```bash
git clone https://github.com/ryuukage-byte/kaigo3d.git
cd kaigo3d
npm install
npm test           # harus lulus sebelum dan sesudah perubahanmu
npm start          # lalu buka http://localhost:8080/index.html
```

Kamera dan kontrol ada di README. Untuk menguji rute, gunakan peta kecil di pojok kanan atas.

## Peta ada di mana

| Yang ingin diubah | File |
| --- | --- |
| Ruangan, pintu, lift/tangga, blok padat | `src/map/layout.js` |
| Aturan validasi dan logika grid | `src/map/grid.js` |
| Tampilan 3D, kontrol, HUD, peta kecil | `src/main.js` |
| Tes | `test/layout.test.js` |

Mengubah denah cukup dilakukan di `layout.js`. Aturan berikut dicek otomatis oleh `validateLayout()` dan `npm test`:

- Zona tidak boleh tumpang tindih atau menempel tanpa dinding.
- Setiap pintu harus berada di celah dinding dan menghubungkan dua zona yang berseberangan.
- Semua zona harus bisa dicapai dari spawn dan dari setiap titik pendaratan lift/tangga.
- Lift dan tangga harus memakai koordinat yang sama di semua lantai.
- Jumlah kamar penghuni harus 10–14.

Setelah mengubah denah, jalankan `npm test`. Jika ada yang gagal, pesan kesalahannya menyebut zona atau pintu yang bermasalah.

## Alur kerja

1. Buat branch dari branch utama: `git checkout -b nama-fitur-kamu`.
2. Buat perubahan kecil dan fokus. Satu PR sebaiknya untuk satu hal.
3. Pastikan `npm test` lulus.
4. Commit dengan pesan yang menjelaskan apa dan kenapa, misalnya `Tambah ruang tunggu keluarga di lantai 1`.
5. Buka pull request sebagai draft, lalu jelaskan perubahanmu dan cara mengujinya.

## Gaya kode

- Modul memakai ES module (`import`/`export`), tanpa langkah build.
- Nama identifier dalam bahasa Inggris. Label dan teks yang tampil ke pengguna dalam bahasa Indonesia.
- Komentar singkat, hanya jika menjelaskan alasan yang tidak jelas dari kode.
- Logika yang tidak butuh Three.js ditaruh di `src/map/`, supaya bisa diuji dengan `node --test`.

## Melaporkan masalah

Buka issue dan sertakan:

- Langkah untuk mengulangi masalah.
- Apa yang kamu harapkan dan apa yang terjadi.
- Browser dan sistem operasi yang dipakai.
- Jika terkait denah, sebutkan id zona atau koordinatnya (misalnya `kitchen` atau x 31, z 1).
