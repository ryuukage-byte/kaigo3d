// Logika grid untuk denah: rasterisasi zona ke sel, deteksi dinding,
// pengecekan tabrakan, dan validasi konektivitas. Tidak bergantung pada Three.js
// sehingga bisa diuji dengan `node --test`.

import { GRID_WIDTH, GRID_DEPTH, FLOORS, ZONE_TYPES } from './layout.js';

export const NO_ZONE = -1;

const NEIGHBOURS_8 = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Membuat grid sel untuk satu lantai.
// zoneAt[i]  → indeks zona di floor.zones, atau NO_ZONE
// isDoor[i]  → 1 jika sel adalah pintu
// isWall[i]  → 1 jika sel adalah dinding (non-zona yang bersebelahan dengan zona)
export function buildFloorGrid(floor, width = GRID_WIDTH, depth = GRID_DEPTH) {
  const size = width * depth;
  const zoneAt = new Int16Array(size).fill(NO_ZONE);
  const isDoor = new Uint8Array(size);
  const isWall = new Uint8Array(size);

  const inBounds = (x, z) => x >= 0 && z >= 0 && x < width && z < depth;

  floor.zones.forEach((zone, index) => {
    for (let z = zone.z; z < zone.z + zone.h; z++) {
      for (let x = zone.x; x < zone.x + zone.w; x++) {
        if (inBounds(x, z)) zoneAt[z * width + x] = index;
      }
    }
  });

  for (const door of floor.doors) {
    if (inBounds(door.x, door.z)) isDoor[door.z * width + door.x] = 1;
  }

  // Blok padat (mis. poros lift) yang dibangun sebagai dinding tetapi tidak bisa dilalui.
  const solidAt = new Uint8Array(size);
  for (const solid of floor.solids ?? []) {
    for (let z = solid.z; z < solid.z + solid.h; z++) {
      for (let x = solid.x; x < solid.x + solid.w; x++) {
        if (inBounds(x, z)) solidAt[z * width + x] = 1;
      }
    }
  }

  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (zoneAt[i] !== NO_ZONE || isDoor[i]) continue;
      if (solidAt[i]) {
        isWall[i] = 1;
        continue;
      }
      const touchesZone = NEIGHBOURS_8.some(([dx, dz]) => {
        const nx = x + dx;
        const nz = z + dz;
        return inBounds(nx, nz) && (zoneAt[nz * width + nx] !== NO_ZONE || solidAt[nz * width + nx]);
      });
      if (touchesZone) isWall[i] = 1;
    }
  }

  return { width, depth, zoneAt, isDoor, isWall };
}

export function isInside(grid, x, z) {
  return x >= 0 && z >= 0 && x < grid.width && z < grid.depth;
}

export function zoneIndexAt(grid, x, z) {
  if (!isInside(grid, x, z)) return NO_ZONE;
  return grid.zoneAt[z * grid.width + x];
}

export function isWalkableCell(grid, x, z) {
  if (!isInside(grid, x, z)) return false;
  const i = z * grid.width + x;
  return grid.zoneAt[i] !== NO_ZONE || grid.isDoor[i] === 1;
}

// Apakah lingkaran/kotak pemain dengan radius r di titik (wx, wz) (meter) bisa berada di sana.
// Empat sudut kotak harus berada di sel yang bisa dilalui.
export function canOccupy(grid, wx, wz, radius) {
  const corners = [
    [wx - radius, wz - radius],
    [wx + radius, wz - radius],
    [wx - radius, wz + radius],
    [wx + radius, wz + radius],
  ];
  return corners.every(([cx, cz]) => isWalkableCell(grid, Math.floor(cx), Math.floor(cz)));
}

// Semua indeks zona yang bisa dicapai dari sel awal (4-arah, melewati sel yang bisa dilalui).
export function reachableZones(grid, startX, startZ) {
  const reached = new Set();
  if (!isWalkableCell(grid, startX, startZ)) return reached;

  const seen = new Uint8Array(grid.width * grid.depth);
  const queue = [[startX, startZ]];
  seen[startZ * grid.width + startX] = 1;

  while (queue.length) {
    const [x, z] = queue.shift();
    const zone = zoneIndexAt(grid, x, z);
    if (zone !== NO_ZONE) reached.add(zone);

    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (!isWalkableCell(grid, nx, nz)) continue;
      const i = nz * grid.width + nx;
      if (seen[i]) continue;
      seen[i] = 1;
      queue.push([nx, nz]);
    }
  }
  return reached;
}

// Pusat zona dalam koordinat sel (bisa pecahan, misalnya 26.5).
export function zoneCenter(zone) {
  return { x: zone.x + zone.w / 2, z: zone.z + zone.h / 2 };
}

// Gambar teks sederhana untuk README: # dinding, + pintu, A/T/D tipe zona, spasi = kosong.
export function toAscii(floor) {
  const grid = buildFloorGrid(floor);
  const letters = { action: 'A', transit: 'T', decor: 'D' };
  const rows = [];
  for (let z = 0; z < grid.depth; z++) {
    let row = '';
    for (let x = 0; x < grid.width; x++) {
      const i = z * grid.width + x;
      const zone = grid.zoneAt[i];
      if (zone !== NO_ZONE) row += letters[floor.zones[zone].type];
      else if (grid.isDoor[i]) row += '+';
      else if (grid.isWall[i]) row += '#';
      else row += ' ';
    }
    rows.push(row.replace(/\s+$/, ''));
  }
  return rows.join('\n');
}

function overlapsOrTouches(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapZ = Math.max(b.z - (a.z + a.h), a.z - (b.z + b.h));
  if (gapX < 0 && gapZ < 0) return 'overlap';
  if ((gapX === 0 && gapZ < 0) || (gapZ === 0 && gapX < 0)) return 'touch';
  return null;
}

// Mengembalikan daftar masalah. Daftar kosong berarti denah valid.
export function validateLayout(floors = FLOORS, width = GRID_WIDTH, depth = GRID_DEPTH) {
  const problems = [];
  const grids = floors.map((floor) => buildFloorGrid(floor, width, depth));

  floors.forEach((floor, fi) => {
    const label = `Lantai ${floor.level}`;
    const grid = grids[fi];
    const ids = new Set();

    floor.zones.forEach((zone) => {
      if (ids.has(zone.id)) problems.push(`${label}: id zona ganda "${zone.id}"`);
      ids.add(zone.id);
      if (!ZONE_TYPES[zone.type]) problems.push(`${label}: tipe tidak dikenal pada "${zone.id}"`);
      if (zone.x < 1 || zone.z < 1 || zone.x + zone.w > width - 1 || zone.z + zone.h > depth - 1) {
        problems.push(`${label}: "${zone.id}" di luar area dalam grid`);
      }
    });

    for (let a = 0; a < floor.zones.length; a++) {
      for (let b = a + 1; b < floor.zones.length; b++) {
        const kind = overlapsOrTouches(floor.zones[a], floor.zones[b]);
        if (kind) {
          problems.push(`${label}: "${floor.zones[a].id}" dan "${floor.zones[b].id}" ${kind === 'overlap' ? 'tumpang tindih' : 'menempel tanpa dinding'}`);
        }
      }
    }

    const seenDoors = new Set();
    floor.doors.forEach((door) => {
      const key = `${door.x},${door.z}`;
      if (seenDoors.has(key)) problems.push(`${label}: pintu ganda di ${key}`);
      seenDoors.add(key);

      if (!isInside(grid, door.x, door.z)) {
        problems.push(`${label}: pintu di luar grid (${key})`);
        return;
      }
      if (grid.zoneAt[door.z * width + door.x] !== NO_ZONE) {
        problems.push(`${label}: pintu di dalam zona (${key})`);
        return;
      }
      const horizontal = zoneIndexAt(grid, door.x - 1, door.z) !== NO_ZONE
        && zoneIndexAt(grid, door.x + 1, door.z) !== NO_ZONE;
      const vertical = zoneIndexAt(grid, door.x, door.z - 1) !== NO_ZONE
        && zoneIndexAt(grid, door.x, door.z + 1) !== NO_ZONE;
      if (!horizontal && !vertical) {
        problems.push(`${label}: pintu di ${key} tidak menghubungkan dua zona berseberangan`);
      }
    });

    // Setiap zona harus bisa dicapai dari setiap titik pendaratan vertikal (lift/tangga) di lantai ini.
    const landings = floor.zones.filter((zone) => zone.vertical);
    const starts = landings.map((zone) => ({ id: zone.id, ...zoneCenter(zone) }));
    if (floor.spawn) {
      if (!isWalkableCell(grid, floor.spawn.x, floor.spawn.z)) {
        problems.push(`${label}: titik spawn tidak bisa dilalui`);
      }
      starts.unshift({ id: 'spawn', x: floor.spawn.x + 0.5, z: floor.spawn.z + 0.5 });
    }

    starts.forEach((start) => {
      const reached = reachableZones(grid, Math.floor(start.x), Math.floor(start.z));
      floor.zones.forEach((zone, zi) => {
        if (!reached.has(zi)) problems.push(`${label}: "${zone.id}" tidak tercapai dari ${start.id}`);
      });
    });
  });

  // Lift dan tangga harus memakai koordinat yang sama di setiap lantai.
  const verticalKeys = new Set(floors.flatMap((floor) => floor.zones.filter((z) => z.vertical).map((z) => z.vertical)));
  for (const key of verticalKeys) {
    const rects = floors
      .map((floor) => floor.zones.find((zone) => zone.vertical === key))
      .map((zone) => (zone ? `${zone.x},${zone.z},${zone.w},${zone.h}` : null));
    if (rects.some((rect) => rect === null) || new Set(rects).size !== 1) {
      problems.push(`vertikal "${key}" tidak sama koordinatnya di semua lantai`);
    }
  }

  return problems;
}
