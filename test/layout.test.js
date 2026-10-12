import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FLOORS, GRID_WIDTH, GRID_DEPTH, isResidentRoom } from '../src/map/layout.js';
import {
  buildFloorGrid,
  canOccupy,
  reachableZones,
  validateLayout,
  zoneIndexAt,
  toAscii,
} from '../src/map/grid.js';

test('denah valid: tanpa tumpang tindih, pintu tersambung, semua zona tercapai', () => {
  assert.deepEqual(validateLayout(FLOORS, GRID_WIDTH, GRID_DEPTH), []);
});

test('jumlah kamar penghuni berada dalam target 10–14', () => {
  const residents = FLOORS.flatMap((floor) => floor.zones).filter(isResidentRoom);
  assert.ok(residents.length >= 10 && residents.length <= 14, `jumlah kamar: ${residents.length}`);
});

test('lantai 1 dan 2 memiliki kamar 101–104 dan 201–208', () => {
  const ids = FLOORS.flatMap((floor) => floor.zones.map((zone) => zone.id));
  for (const id of ['101', '102', '103', '104', '201', '202', '203', '204', '205', '206', '207', '208']) {
    assert.ok(ids.includes(id), `kamar ${id} hilang`);
  }
});

test('setiap lantai memakai tiga tipe ruang: action, transit, decor', () => {
  const types = new Set(FLOORS.flatMap((floor) => floor.zones.map((zone) => zone.type)));
  assert.deepEqual([...types].sort(), ['action', 'decor', 'transit']);
});

test('lift dan tangga ada di kedua lantai dengan koordinat yang sama', () => {
  for (const key of ['lift', 'stairs']) {
    const rects = FLOORS.map((floor) => {
      const zone = floor.zones.find((z) => z.vertical === key);
      assert.ok(zone, `${key} tidak ada di lantai ${floor.level}`);
      return [zone.x, zone.z, zone.w, zone.h].join(',');
    });
    assert.equal(new Set(rects).size, 1, `${key} tidak sejajar: ${rects.join(' | ')}`);
  }
});

test('validasi menangkap pintu yang tidak menghubungkan dua zona', () => {
  const broken = structuredClone(FLOORS);
  broken[0].doors.push({ x: 3, z: 3 }); // di dalam zona 101 — harus gagal
  const problems = validateLayout(broken, GRID_WIDTH, GRID_DEPTH);
  assert.ok(problems.some((p) => p.includes('pintu di dalam zona')));
});

test('validasi menangkap dua zona yang menempel tanpa dinding', () => {
  const broken = structuredClone(FLOORS);
  broken[0].zones.find((z) => z.id === '102').x = 5; // menempel dengan 101
  const problems = validateLayout(broken, GRID_WIDTH, GRID_DEPTH);
  assert.ok(problems.some((p) => p.includes('menempel tanpa dinding') || p.includes('tumpang tindih')));
});

test('dinding dibuat di sekeliling zona, tetapi tidak di sel pintu', () => {
  const grid = buildFloorGrid(FLOORS[0]);
  const door = FLOORS[0].doors.find((d) => d.x === 2 && d.z === 6); // pintu kamar 101
  const i = door.z * grid.width + door.x;
  assert.equal(grid.isWall[i], 0);
  assert.equal(grid.isDoor[i], 1);
  // sel dinding di sebelah pintu (bukan pintu) harus menjadi dinding
  assert.equal(grid.isWall[(door.z) * grid.width + (door.x + 1)], 1);
});

test('kamar 101 tidak bisa dicapai tanpa lewat pintu', () => {
  const grid = buildFloorGrid(FLOORS[0]);
  const roomIndex = FLOORS[0].zones.findIndex((z) => z.id === '101');
  // Mulai dari lobi (di luar kamar) — kamar 101 tetap tercapai karena ada pintu.
  const lobby = FLOORS[0].zones.find((z) => z.id === 'lobby');
  assert.ok(reachableZones(grid, lobby.x, lobby.z).has(roomIndex));
  // Tanpa pintu ke 101, kamar 101 harus terisolasi.
  const noDoor = { ...FLOORS[0], doors: FLOORS[0].doors.filter((d) => !(d.x === 2 && d.z === 6)) };
  const isolated = buildFloorGrid(noDoor);
  assert.ok(!reachableZones(isolated, lobby.x, lobby.z).has(roomIndex));
});

test('tabrakan: pemain tidak bisa menembus dinding, tetapi bisa lewat pintu', () => {
  const grid = buildFloorGrid(FLOORS[0]);
  const spawn = FLOORS[0].spawn;
  assert.ok(canOccupy(grid, spawn.x + 0.5, spawn.z + 0.5, 0.3), 'spawn harus bisa ditempati');
  // Tembok di antara kamar 101 dan koridor (z = 6, x = 3)
  assert.ok(!canOccupy(grid, 3.5, 6.5, 0.3), 'dinding tidak boleh bisa dilalui');
  // Pintu kamar 101 (2, 6) bisa dilalui
  assert.ok(canOccupy(grid, 2.5, 6.5, 0.3), 'pintu harus bisa dilalui');
});

test('zona di lantai 1 dan 2 terbaca dengan benar pada titik pusat', () => {
  const grid = buildFloorGrid(FLOORS[0]);
  const lobbyIndex = FLOORS[0].zones.findIndex((z) => z.id === 'lobby');
  assert.equal(zoneIndexAt(grid, 26, 12), lobbyIndex);
  assert.equal(zoneIndexAt(grid, 0, 0), -1);
});

test('denah ASCII lantai 1 (untuk pengecekan visual)', () => {
  const art = toAscii(FLOORS[0]);
  assert.equal(art.split('\n').length, GRID_DEPTH);
});
