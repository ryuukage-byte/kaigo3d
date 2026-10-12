import * as THREE from 'three';
import {
  FLOORS, FLOOR_HEIGHT, WALL_HEIGHT, ZONE_TYPES, COLORS, GRID_WIDTH, GRID_DEPTH,
} from './map/layout.js';
import { buildFloorGrid, canOccupy, zoneIndexAt, zoneCenter, NO_ZONE } from './map/grid.js';

const PLAYER_RADIUS = 0.3;
const EYE_HEIGHT = 1.6;
const WALK_SPEED = 2.2; // m/s
const RUN_SPEED = 4.0;
const MOUSE_SENSITIVITY = 0.0022;
const MINIMAP_CELL = 7; // px per sel

const canvas = document.getElementById('scene');
const roomLabel = document.getElementById('room');
const startOverlay = document.getElementById('start');
const mapCanvas = document.getElementById('map-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d232b);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
camera.rotation.order = 'YXZ';

scene.add(new THREE.HemisphereLight(0xffffff, 0x404858, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(20, 40, 30);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: COLORS.ground }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(GRID_WIDTH / 2, -0.02, GRID_DEPTH / 2);
scene.add(ground);

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: COLORS.wall }),
  door: new THREE.MeshStandardMaterial({ color: COLORS.door }),
  vertical: new THREE.MeshStandardMaterial({ color: COLORS.vertical }),
};
for (const [type, info] of Object.entries(ZONE_TYPES)) {
  materials[type] = new THREE.MeshStandardMaterial({ color: info.color });
}

function hex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function labelFor(zone) {
  return zone.variant ? `${zone.name} (Tipe ${zone.variant})` : zone.name;
}

// Tekstur nama ruangan, dibuat di atas bidang lantai dan dibaca dari atas.
function makeLabelTexture(text, widthM, heightM) {
  const pxPerMeter = Math.min(128, 2048 / Math.max(widthM, heightM));
  const el = document.createElement('canvas');
  el.width = Math.round(widthM * pxPerMeter);
  el.height = Math.round(heightM * pxPerMeter);
  const ctx = el.getContext('2d');

  let size = el.height * 0.4;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const measured = ctx.measureText(text).width;
  const maxWidth = el.width * 0.9;
  if (measured > maxWidth) {
    size *= maxWidth / measured;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  ctx.fillStyle = '#14181e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, el.width / 2, el.height / 2);

  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function flatPlane(width, height, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  return mesh;
}

// Peta kecil dua dimensi untuk memeriksa rute pemain.
function buildMinimapImage(floor, grid) {
  const el = document.createElement('canvas');
  el.width = GRID_WIDTH * MINIMAP_CELL;
  el.height = GRID_DEPTH * MINIMAP_CELL;
  const ctx = el.getContext('2d');
  for (let z = 0; z < grid.depth; z++) {
    for (let x = 0; x < grid.width; x++) {
      const i = z * grid.width + x;
      const zoneIndex = grid.zoneAt[i];
      let color = null;
      if (zoneIndex !== NO_ZONE) {
        const zone = floor.zones[zoneIndex];
        color = zone.vertical ? COLORS.vertical : ZONE_TYPES[zone.type].color;
      } else if (grid.isDoor[i]) {
        color = COLORS.door;
      } else if (grid.isWall[i]) {
        color = COLORS.wall;
      }
      if (color === null) continue;
      ctx.fillStyle = hex(color);
      ctx.fillRect(x * MINIMAP_CELL, z * MINIMAP_CELL, MINIMAP_CELL, MINIMAP_CELL);
    }
  }
  return el;
}

const floors = FLOORS.map((floor) => {
  const grid = buildFloorGrid(floor);
  const group = new THREE.Group();
  group.position.y = (floor.level - 1) * FLOOR_HEIGHT;
  scene.add(group);

  for (const zone of floor.zones) {
    const center = zoneCenter(zone);
    const material = zone.vertical ? materials.vertical : materials[zone.type];
    group.add(flatPlane(zone.w, zone.h, center.x, 0.01, center.z, material));

    const labelMaterial = new THREE.MeshBasicMaterial({
      map: makeLabelTexture(labelFor(zone), zone.w, zone.h),
      transparent: true,
      depthWrite: false,
    });
    group.add(flatPlane(zone.w, zone.h, center.x, 0.02, center.z, labelMaterial));
  }

  for (const door of floor.doors) {
    group.add(flatPlane(1, 1, door.x + 0.5, 0.012, door.z + 0.5, materials.door));
  }

  const wallCells = [];
  for (let i = 0; i < grid.isWall.length; i++) {
    if (grid.isWall[i]) wallCells.push(i);
  }
  const walls = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, WALL_HEIGHT, 1),
    materials.wall,
    wallCells.length,
  );
  const matrix = new THREE.Matrix4();
  wallCells.forEach((i, n) => {
    const x = i % grid.width;
    const z = Math.floor(i / grid.width);
    matrix.makeTranslation(x + 0.5, WALL_HEIGHT / 2, z + 0.5);
    walls.setMatrixAt(n, matrix);
  });
  walls.instanceMatrix.needsUpdate = true;
  group.add(walls);

  return { level: floor.level, data: floor, grid, group, minimap: buildMinimapImage(floor, grid) };
});

const spawn = FLOORS[0].spawn;
const player = {
  x: spawn.x + 0.5,
  z: spawn.z + 0.5,
  level: FLOORS[0].level,
  yaw: 0,
  pitch: 0,
  // Tautan lift/tangga yang sedang dipijak; mencegah pindah lantai berulang
  // sebelum pemain keluar dari sel vertikal.
  lockLink: null,
};

function floorState(level) {
  return floors.find((f) => f.level === level);
}

function showLevel(level) {
  for (const f of floors) f.group.visible = f.level === level;
}
showLevel(player.level);

function currentZone() {
  const f = floorState(player.level);
  const zi = zoneIndexAt(f.grid, Math.floor(player.x), Math.floor(player.z));
  return zi === NO_ZONE ? null : { index: zi, zone: f.data.zones[zi] };
}

function tryMove(dx, dz) {
  const f = floorState(player.level);
  const nx = player.x + dx;
  const nz = player.z + dz;
  if (canOccupy(f.grid, nx, nz, PLAYER_RADIUS)) {
    player.x = nx;
    player.z = nz;
  }
}

// Masuk ke lift/tangga → pindah ke lantai lain pada koordinat yang sama.
function updateVerticalTransit() {
  const hit = currentZone();
  if (!hit || !hit.zone.vertical) {
    player.lockLink = null;
    return;
  }
  const link = hit.zone.vertical;
  if (player.lockLink === link) return;

  const other = FLOORS.find((floor) => floor.level !== player.level
    && floor.zones.some((zone) => zone.vertical === link));
  if (!other) return;

  const landing = zoneCenter(other.zones.find((zone) => zone.vertical === link));
  player.level = other.level;
  player.x = landing.x;
  player.z = landing.z;
  player.lockLink = link;
  showLevel(player.level);
}

const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.code));
window.addEventListener('keyup', (e) => keys.delete(e.code));

let pointerLocked = false;
startOverlay.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  startOverlay.classList.toggle('hidden', pointerLocked);
});
document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  player.yaw -= e.movementX * MOUSE_SENSITIVITY;
  player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch - e.movementY * MOUSE_SENSITIVITY));
});

function update(dt) {
  const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  if (forward || strafe) {
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = (running ? RUN_SPEED : WALK_SPEED) * dt;
    const length = Math.hypot(forward, strafe);
    const f = (forward / length) * speed;
    const s = (strafe / length) * speed;
    // Vektor depan dan kanan kamera di bidang datar (XZ).
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    const rx = Math.cos(player.yaw);
    const rz = -Math.sin(player.yaw);
    // Sumbu dipisah agar pemain meluncur di sepanjang dinding.
    tryMove(fx * f + rx * s, 0);
    tryMove(0, fz * f + rz * s);
  }
  updateVerticalTransit();
}

function updateCamera() {
  camera.position.set(player.x, (player.level - 1) * FLOOR_HEIGHT + EYE_HEIGHT, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

let lastRoomText = '';
function updateHud() {
  const hit = currentZone();
  const text = `Lantai ${player.level} · ${hit ? hit.zone.name : '—'}`;
  if (text !== lastRoomText) {
    roomLabel.textContent = text;
    lastRoomText = text;
  }
}

const mapCtx = mapCanvas.getContext('2d');
mapCanvas.width = GRID_WIDTH * MINIMAP_CELL;
mapCanvas.height = GRID_DEPTH * MINIMAP_CELL;
function drawMinimap() {
  const f = floorState(player.level);
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.drawImage(f.minimap, 0, 0);

  const px = player.x * MINIMAP_CELL;
  const pz = player.z * MINIMAP_CELL;
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  mapCtx.strokeStyle = '#ffffff';
  mapCtx.lineWidth = 2;
  mapCtx.beginPath();
  mapCtx.moveTo(px, pz);
  mapCtx.lineTo(px + fx * 12, pz + fz * 12);
  mapCtx.stroke();
  mapCtx.fillStyle = '#ff3b3b';
  mapCtx.beginPath();
  mapCtx.arc(px, pz, 3.5, 0, Math.PI * 2);
  mapCtx.fill();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  updateCamera();
  updateHud();
  drawMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
