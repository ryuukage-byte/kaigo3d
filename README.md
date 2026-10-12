# Kaigo 3D — Denah Greybox Fasilitas Lansia

Greybox Three.js untuk simulasi kaigo: fasilitas hunian lansia 2 lantai dengan koridor, kamar penghuni, ruang staf, area layanan, dan lift/tangga. Denah dibangun dari data (`src/map/layout.js`), lalu dirender menjadi dinding, lantai, pintu, dan label ruangan. Tahap ini hanya mencakup navigasi dan denah; interaksi (tombol E), penghuni, dan sistem tugas belum dibuat.

## Menjalankan

```bash
npm install
npm start          # lalu buka http://localhost:8080/index.html
npm test           # validasi denah dan tes navigasi
```

Klik layar untuk mengunci kursor, lalu gunakan kontrol:

- `W A S D` — jalan
- `Shift` — lari
- Mouse — melihat sekitar
- `Esc` — melepas kontrol kursor
- Masuk ke **lift** atau **tangga** untuk pindah lantai (pemain muncul di sel yang sama di lantai lain)

Panel kanan atas menampilkan peta 2D lantai aktif beserta posisi pemain, untuk memeriksa rute.

## Isi denah

| Lantai | Ruang |
| --- | --- |
| 1F | Kamar 101–104, ruang makan & aktivitas, dapur, gudang linen, laundry, koridor utama, ruang konsultasi, kantor staf, ruang medis, lobi & resepsionis, ruang ganti, ruang mandi, lift, tangga, teras masuk (dekorasi), taman depan (dekorasi) |
| 2F | Kamar 201–206 (206 Tipe B), kamar 207–208 (208 Tipe C), ruang bersama, koridor hunian, toilet bersama, stasiun staf, ruang linen, ruang tenang, ruang utilitas, lift, tangga |

Total 12 kamar penghuni, sesuai target 10–14 di rancangan.

Tipe ruang mengikuti rancangan: **action** (bisa berinteraksi di tahap berikutnya), **transit** (berjalan dan pindah lantai), **decor** (suasana saja).

### Denah lantai 1

```
#############################################
#AAAA#AAAA#AAAA#AAAA#AAAAAAAAA#AAAA#AAA#AAAA#
#AAAA#AAAA#AAAA#AAAA#AAAAAAAAA#AAAA#AAA#AAAA#
#AAAA#AAAA#AAAA#AAAA#AAAAAAAAA+AAAA#AAA+AAAA#
#AAAA#AAAA#AAAA#AAAA#AAAAAAAAA#AAAA#AAA#AAAA#
#AAAA#AAAA#AAAA#AAAA#AAAAAAAAA#AAAA#AAA#AAAA#
##+####+####+####+#######+######+####+###+###
#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#
#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#
##+###+##+###+####+######+#######+######+####
#AAAA#TT#TT#AAAA#AAAA#AAAAAAAAA#AAAA#AAAAAAA#
#AAAA#TT#TT#AAAA#AAAA#AAAAAAAAA#AAAA#AAAAAAA#
#AAAA#######AAAA#AAAA#AAAAAAAAA#AAAA+AAAAAAA#
#AAAA#######AAAA#AAAA#AAAAAAAAA#AAAA#AAAAAAA#
#AAAA#######AAAA#AAAA#AAAAAAAAA#AAAA#AAAAAAA#
##########################+##################
              #DDDDDDD+DDDDDDD#
              #DDDDDDD#DDDDDDD#
              #################
```

### Denah lantai 2

```
#############################################
#AAAA#AAAA#AAAA#AAAAAAAAAA#AAAA#AAAA#AAAAAAA#
#AAAA#AAAA#AAAA#AAAAAAAAAA#AAAA#AAAA#AAAAAAA#
#AAAA#AAAA#AAAA#AAAAAAAAAA#AAAA#AAAA#AAAAAAA#
#AAAA#AAAA#AAAA#AAAAAAAAAA#AAAA#AAAA#AAAAAAA#
#AAAA#AAAA#AAAA#AAAAAAAAAA#AAAA#AAAA#AAAAAAA#
##+####+####+#######+#######+####+######+####
#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#
#TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT#
##+###+##+###+#####+####+####+####+#####+####
#AAAA#TT#TT#AAAAA#AAAA#AAAA#AAAA#TTTT#TTTTTT#
#AAAA#TT#TT#AAAAA#AAAA#AAAA#AAAA#TTTT#TTTTTT#
#AAAA#######AAAAA#AAAA#AAAA#AAAA#TTTT#TTTTTT#
#AAAA#######AAAAA#AAAA#AAAA#AAAA#TTTT#TTTTTT#
#AAAA#######AAAAA#AAAA#AAAA#AAAA#TTTT#TTTTTT#
#############################################



```

Legenda: `A` action · `T` transit · `D` decor · `+` pintu · `#` dinding. Lift dan tangga tampil sebagai `T` pada denah teks, tetapi berwarna oranye di 3D dan peta kecil.

## Aturan denah

`src/map/layout.js` adalah sumber kebenaran. Setiap perubahan dicek oleh `validateLayout()` dan `npm test`:

- Zona tidak boleh tumpang tindih atau menempel tanpa dinding di antaranya.
- Setiap pintu harus berada di celah dinding dan menghubungkan dua zona yang berseberangan.
- Semua zona harus bisa dicapai dari titik spawn (lantai 1) dan dari setiap titik pendaratan lift/tangga di kedua lantai.
- Lift dan tangga harus memakai koordinat yang sama di kedua lantai.
- Jumlah kamar penghuni harus 10–14 (dicek oleh `npm test`).

Satu satuan grid = 1 meter. Lebar koridor 2 m dan pintu 1 m; sesuaikan bila ingin ukuran yang lebih realistis untuk kursi roda.

## Struktur

```
index.html            halaman, HUD, peta kecil
src/main.js           render Three.js, kamera orang pertama, tabrakan, pindah lantai
src/map/layout.js     data denah (zona, pintu, blok padat, konstanta)
src/map/grid.js       rasterisasi grid, tabrakan, konektivitas, validasi, ASCII
test/layout.test.js   tes validasi dan navigasi
```

## Catatan

- Three.js dipasang lewat npm (`three@0.169.0`) dan dimuat dari `node_modules` melalui import map, jadi tidak ada CDN saat runtime.
- Dinding dibuat otomatis di sekeliling zona. Sel kosong yang terkurung dinding (mis. di bawah lift) didefinisikan eksplisit sebagai `solids` agar tidak tampil sebagai lubang.
- Lantai atas disembunyikan saat pemain berada di lantai bawah (potongan tampak atas).
- Ini masih denah konseptual, bukan denah konstruksi. Tidak memenuhi ketentuan bangunan atau keselamatan Jepang.
