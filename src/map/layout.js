// Denah fasilitas kaigo 2 lantai (greybox).
//
// Satu satuan grid = 1 meter. Koordinat (x, z) adalah sudut kiri-atas sel.
// z = 0 berada di belakang gedung, z terbesar di depan (pintu masuk).
//
// Aturan penyusunan (dicek oleh grid.js → validateLayout):
// - Dua zona tidak boleh tumpang tindih.
// - Dua zona tidak boleh saling menempel tanpa dinding di antaranya.
// - Pintu adalah sel di celah dinding yang menghubungkan dua zona berseberangan.
// - Lift dan tangga memakai koordinat yang sama di kedua lantai.

export const GRID_WIDTH = 45;
export const GRID_DEPTH = 19;

export const FLOOR_HEIGHT = 3.2; // jarak antar lantai (m)
export const WALL_HEIGHT = 2.8; // tinggi dinding (m)

// Tipe ruang sesuai rancangan: action / transit / decor.
export const ZONE_TYPES = {
  action: { label: 'Action', color: 0x4a7fc1 },
  transit: { label: 'Transit', color: 0xb8b8b8 },
  decor: { label: 'Decorative', color: 0x7fb27f },
};

export const COLORS = {
  wall: 0x3c3f4a,
  door: 0xd9a441,
  vertical: 0xe07a5f,
  ground: 0x2e3b2e,
};

// Zona lantai: { id, name, type, x, z, w, h, vertical?, variant? }
// Pintu: { x, z } — sel di celah dinding.
export const FLOORS = [
  {
    level: 1,
    spawn: { x: 26, z: 12 },
    // Poros lift dan tangga: sel di bawah keduanya dibangun sebagai dinding padat
    solids: [{ x: 6, z: 12, w: 5, h: 3 }],
    zones: [
      // Baris utara: kamar penghuni dan area layanan
      { id: '101', name: 'Kamar 101', type: 'action', x: 1, z: 1, w: 4, h: 5 },
      { id: '102', name: 'Kamar 102', type: 'action', x: 6, z: 1, w: 4, h: 5 },
      { id: '103', name: 'Kamar 103', type: 'action', x: 11, z: 1, w: 4, h: 5 },
      { id: '104', name: 'Kamar 104', type: 'action', x: 16, z: 1, w: 4, h: 5 },
      { id: 'dining', name: 'Ruang makan & aktivitas', type: 'action', x: 21, z: 1, w: 9, h: 5 },
      { id: 'kitchen', name: 'Dapur', type: 'action', x: 31, z: 1, w: 4, h: 5 },
      { id: 'linen', name: 'Gudang linen', type: 'action', x: 36, z: 1, w: 3, h: 5 },
      { id: 'laundry', name: 'Laundry', type: 'action', x: 40, z: 1, w: 4, h: 5 },

      // Koridor utama
      { id: 'corridor1', name: 'Koridor utama', type: 'transit', x: 1, z: 7, w: 43, h: 2 },

      // Baris selatan: konsultasi, staf, layanan, lobi, mandi
      { id: 'consult', name: 'Ruang konsultasi', type: 'action', x: 1, z: 10, w: 4, h: 5 },
      { id: 'lift', name: 'Lift', type: 'transit', x: 6, z: 10, w: 2, h: 2, vertical: 'lift' },
      { id: 'stairs', name: 'Tangga', type: 'transit', x: 9, z: 10, w: 2, h: 2, vertical: 'stairs' },
      { id: 'office1', name: 'Kantor staf', type: 'action', x: 12, z: 10, w: 4, h: 5 },
      { id: 'medical', name: 'Ruang medis', type: 'action', x: 17, z: 10, w: 4, h: 5 },
      { id: 'lobby', name: 'Lobi & resepsionis', type: 'action', x: 22, z: 10, w: 9, h: 5 },
      { id: 'changing', name: 'Ruang ganti', type: 'action', x: 32, z: 10, w: 4, h: 5 },
      { id: 'bath', name: 'Ruang mandi', type: 'action', x: 37, z: 10, w: 7, h: 5 },

      // Area luar: taman dan teras masuk (dekorasi, bisa dilewati)
      { id: 'garden', name: 'Taman depan', type: 'decor', x: 15, z: 16, w: 7, h: 2 },
      { id: 'porch', name: 'Teras masuk', type: 'decor', x: 23, z: 16, w: 7, h: 2 },
    ],
    doors: [
      // Koridor ↔ baris utara (z = 6)
      { x: 2, z: 6 }, { x: 7, z: 6 }, { x: 12, z: 6 }, { x: 17, z: 6 },
      { x: 25, z: 6 }, { x: 32, z: 6 }, { x: 37, z: 6 }, { x: 41, z: 6 },
      // Antar ruang di baris utara
      { x: 30, z: 3 }, // ruang makan ↔ dapur
      { x: 39, z: 3 }, // gudang linen ↔ laundry
      // Koridor ↔ baris selatan (z = 9)
      { x: 2, z: 9 }, { x: 6, z: 9 }, { x: 9, z: 9 }, { x: 13, z: 9 },
      { x: 18, z: 9 }, { x: 25, z: 9 }, { x: 33, z: 9 }, { x: 40, z: 9 },
      // Antar ruang di baris selatan
      { x: 36, z: 12 }, // ruang ganti ↔ ruang mandi
      // Pintu masuk utama dan taman
      { x: 26, z: 15 }, // lobi ↔ teras
      { x: 22, z: 16 }, // teras ↔ taman
    ],
  },
  {
    level: 2,
    spawn: null,
    // Poros lift dan tangga: sel di bawah keduanya dibangun sebagai dinding padat
    solids: [{ x: 6, z: 12, w: 5, h: 3 }],
    zones: [
      // Baris utara: kamar penghuni dan ruang bersama
      { id: '201', name: 'Kamar 201', type: 'action', x: 1, z: 1, w: 4, h: 5 },
      { id: '202', name: 'Kamar 202', type: 'action', x: 6, z: 1, w: 4, h: 5 },
      { id: '203', name: 'Kamar 203', type: 'action', x: 11, z: 1, w: 4, h: 5 },
      { id: 'shared', name: 'Ruang bersama', type: 'action', x: 16, z: 1, w: 10, h: 5 },
      { id: '204', name: 'Kamar 204', type: 'action', x: 27, z: 1, w: 4, h: 5 },
      { id: '205', name: 'Kamar 205', type: 'action', x: 32, z: 1, w: 4, h: 5 },
      { id: '206', name: 'Kamar 206', type: 'action', x: 37, z: 1, w: 7, h: 5, variant: 'B' },

      // Koridor hunian
      { id: 'corridor2', name: 'Koridor hunian', type: 'transit', x: 1, z: 7, w: 43, h: 2 },

      // Baris selatan: toilet, lift, tangga, stasiun staf, dan kamar 207–208
      { id: 'toilet', name: 'Toilet bersama', type: 'action', x: 1, z: 10, w: 4, h: 5 },
      { id: 'lift', name: 'Lift', type: 'transit', x: 6, z: 10, w: 2, h: 2, vertical: 'lift' },
      { id: 'stairs', name: 'Tangga', type: 'transit', x: 9, z: 10, w: 2, h: 2, vertical: 'stairs' },
      { id: 'station', name: 'Stasiun staf', type: 'action', x: 12, z: 10, w: 5, h: 5 },
      { id: 'linen2', name: 'Ruang linen', type: 'action', x: 18, z: 10, w: 4, h: 5 },
      { id: '207', name: 'Kamar 207', type: 'action', x: 23, z: 10, w: 4, h: 5 },
      { id: '208', name: 'Kamar 208', type: 'action', x: 28, z: 10, w: 4, h: 5, variant: 'C' },
      { id: 'quiet', name: 'Ruang tenang', type: 'transit', x: 33, z: 10, w: 4, h: 5 },
      { id: 'utility', name: 'Ruang utilitas', type: 'transit', x: 38, z: 10, w: 6, h: 5 },
    ],
    doors: [
      // Koridor ↔ baris utara (z = 6)
      { x: 2, z: 6 }, { x: 7, z: 6 }, { x: 12, z: 6 }, { x: 20, z: 6 },
      { x: 28, z: 6 }, { x: 33, z: 6 }, { x: 40, z: 6 },
      // Koridor ↔ baris selatan (z = 9)
      { x: 2, z: 9 }, { x: 6, z: 9 }, { x: 9, z: 9 }, { x: 13, z: 9 },
      { x: 19, z: 9 }, { x: 24, z: 9 }, { x: 29, z: 9 }, { x: 34, z: 9 }, { x: 40, z: 9 },
    ],
  },
];

// Penamaan kamar penghuni (untuk ringkasan dan uji).
export function isResidentRoom(zone) {
  return /^\d{3}$/.test(zone.id);
}
