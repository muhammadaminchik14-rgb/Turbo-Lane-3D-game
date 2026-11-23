// ============================================================
// VOLT RUSH — obstacles.js
// Barriers, crates, gates, walls, sweepers and trains.
// Everything is pooled; spawn rows always keep a passable path.
// ============================================================

import * as THREE from 'three';
import { LANES } from './settings.js';

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function chance(p) { return Math.random() < p; }

const TRAIN_COLORS = [0xff4d6d, 0x35f0ff, 0xffb302, 0xa06bff, 0x38d97a, 0xff7a45];

function stdMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough !== undefined ? opts.rough : 0.7,
    metalness: opts.metal !== undefined ? opts.metal : 0.15,
    emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
    emissiveIntensity: opts.ei !== undefined ? opts.ei : 1,
  });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- mesh builders --------------------------------------------
function buildBarrier() {
  const g = new THREE.Group();
  const white = stdMat(0xf4f6ff, { rough: 0.55 });
  const orange = stdMat(0xff7a1a, { emissive: 0xff5a00, ei: 0.45, rough: 0.5 });
  [-1.0, 1.0].forEach((x) => {
    g.add(box(0.14, 1.0, 0.14, stdMat(0x2b3145, { metal: 0.6, rough: 0.4 }), x, 0.5, 0));
    g.add(box(0.4, 0.1, 0.5, stdMat(0x1b2030, { rough: 0.9 }), x, 0.05, 0));
  });
  g.add(box(2.1, 0.2, 0.12, orange, 0, 0.86, 0));
  g.add(box(2.1, 0.2, 0.12, white, 0, 0.5, 0));
  g.add(box(2.1, 0.16, 0.1, orange, 0, 0.2, 0));
  return g;
}

function buildCrate() {
  const g = new THREE.Group();
  const wood = stdMat(0xc98a3c, { rough: 0.85 });
  const dark = stdMat(0x6b451d, { rough: 0.9 });
  g.add(box(1.7, 0.8, 1.5, wood, 0, 0.4, 0));
  g.add(box(1.75, 0.12, 1.55, dark, 0, 0.78, 0));
  g.add(box(1.15, 0.55, 1.0, wood, 0.1, 1.07, 0));
  g.add(box(1.2, 0.1, 1.05, dark, 0.1, 1.33, 0));
  const stripe = box(0.5, 0.06, 0.06, stdMat(0x35f0ff, { emissive: 0x35f0ff, ei: 1.4, rough: 0.4 }), 0.1, 1.36, 0.53);
  g.add(stripe);
  return g;
}

function buildGate() {
  const g = new THREE.Group();
  const metal = stdMat(0x333b55, { metal: 0.6, rough: 0.4 });
  const panel = stdMat(0x141a2c, { rough: 0.7 });
  const warn = stdMat(0xffd23f, { emissive: 0xffb300, ei: 0.9, rough: 0.5 });
  // posts sit outside the runner's body width
  [-1.18, 1.18].forEach((x) => g.add(box(0.16, 3.2, 0.16, metal, x, 1.6, 0)));
  // hanging panel (bottom edge at y = 1.15 -> must slide)
  g.add(box(2.45, 1.6, 0.24, panel, 0, 2.05, 0));
  g.add(box(2.45, 0.24, 0.26, warn, 0, 1.3, 0));
  g.add(box(2.45, 0.2, 0.26, warn, 0, 2.8, 0));
  for (let i = -1; i <= 1; i++) {
    const bar = box(0.3, 1.0, 0.06, warn, i * 0.8, 2.1, -0.15);
    bar.rotation.z = 0.5;
    g.add(bar);
  }
  return g;
}

function buildWall() {
  const g = new THREE.Group();
  const body = stdMat(0x1d2438, { rough: 0.85, metal: 0.2 });
  const glow = stdMat(0x0b1220, { emissive: 0xff3d81, ei: 1.6, rough: 0.4 });
  g.add(box(2.25, 3.2, 0.5, body, 0, 1.6, 0));
  g.add(box(2.3, 0.18, 0.56, glow, 0, 3.1, 0));
  g.add(box(2.3, 0.18, 0.56, glow, 0, 0.15, 0));
  const cross1 = box(1.8, 0.2, 0.56, glow, 0, 1.6, 0);
  cross1.rotation.z = 0.75;
  g.add(cross1);
  const cross2 = box(1.8, 0.2, 0.56, glow, 0, 1.6, 0);
  cross2.rotation.z = -0.75;
  g.add(cross2);
  return g;
}

function buildSweeper() {
  const g = new THREE.Group();
  const body = stdMat(0x232a42, { metal: 0.5, rough: 0.45 });
  const glow = stdMat(0x101628, { emissive: 0xb6ff3a, ei: 1.5, rough: 0.4 });
  g.add(box(1.9, 2.6, 0.7, body, 0, 1.3, 0));
  g.add(box(1.95, 0.3, 0.76, glow, 0, 2.45, 0));
  g.add(box(1.95, 0.3, 0.76, glow, 0, 0.3, 0));
  for (let i = -1; i <= 1; i++) {
    const bar = box(0.34, 1.4, 0.75, glow, i * 0.6, 1.3, 0);
    bar.rotation.z = 0.6;
    g.add(bar);
  }
  return g;
}

function buildTrain() {
  const g = new THREE.Group();
  const color = pick(TRAIN_COLORS);
  const bodyMat = stdMat(color, { rough: 0.45, metal: 0.35 });
  const roofMat = stdMat(0xe8ecf6, { rough: 0.5, metal: 0.3 });
  const dark = stdMat(0x141726, { rough: 0.8 });
  const glass = stdMat(0x0e1b30, { emissive: 0x9fe8ff, ei: 1.1, rough: 0.2, metal: 0.4 });

  // unit length 1 -> scaled on Z for long / short trains
  const body = box(2.15, 3.2, 1, bodyMat, 0, 2.0, 0);
  body.geometry.translate(0, 0, 0);
  g.add(body);
  g.add(box(2.0, 0.5, 1, roofMat, 0, 3.7, 0));          // roof cap
  g.add(box(2.2, 0.7, 1, dark, 0, 0.35, 0));            // skirt
  g.add(box(2.18, 0.7, 0.99, glass, 0, 2.7, 0));        // window band both sides
  g.add(box(1.9, 0.3, 1.01, stdMat(color, { emissive: color, ei: 0.7, rough: 0.4 }), 0, 1.1, 0));
  // nose + headlights (front = -Z)
  const nose = box(1.8, 1.4, 0.35, dark, 0, 1.6, -0.66);
  g.add(nose);
  const headMat = stdMat(0xfff6d0, { emissive: 0xfff2b0, ei: 3, rough: 0.2 });
  [-0.6, 0.6].forEach((x) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), headMat);
    h.position.set(x, 1.2, -0.7);
    g.add(h);
  });
  const tailMat = stdMat(0xff3b3b, { emissive: 0xff2222, ei: 2.4, rough: 0.3 });
  [-0.6, 0.6].forEach((x) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), tailMat);
    h.position.set(x, 1.4, 0.7);
    g.add(h);
  });
  return g;
}

// ---------- manager ---------------------------------------------------
export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.colliders = [];
    this.lastTrainZ = -9999;
    this.makePools();
  }

  makePools() {
    const defs = [
      { type: 'barrier', count: 10, hw: 1.05, hh: 0.5, h: 1.0, hd: 0.3 },
      { type: 'crate', count: 10, hw: 0.9, hh: 0.68, h: 1.36, hd: 0.8 },
      { type: 'gate', count: 10, hw: 1.2, hh: 0.92, h: 1.84, hd: 0.3, yBottom: 1.15 },
      { type: 'wall', count: 8, hw: 1.12, hh: 1.6, h: 3.2, hd: 0.3 },
      { type: 'sweeper', count: 4, hw: 0.95, hh: 1.3, h: 2.6, hd: 0.4 },
      { type: 'train', count: 12, hw: 1.08, hh: 1.9, h: 3.8, hd: 1 },
    ];
    defs.forEach((d) => {
      for (let i = 0; i < d.count; i++) {
        const mesh = d.type === 'train' ? buildTrain() : this.builderFor(d.type)();
        mesh.visible = false;
        this.scene.add(mesh);
        this.pool.push({
          type: d.type,
          mesh,
          hw: d.hw, hh: d.hh, h: d.h, hd: d.hd, yBottom: d.yBottom || 0,
          active: false,
          x: 0, z: 0, lane: 1,
          vz: 0, vx: 0, vxMin: 0, vxMax: 0,
        });
      }
    });
  }

  builderFor(type) {
    switch (type) {
      case 'barrier': return buildBarrier;
      case 'crate': return buildCrate;
      case 'gate': return buildGate;
      case 'wall': return buildWall;
      case 'sweeper': return buildSweeper;
      default: return buildBarrier;
    }
  }

  getFree(type) {
    for (const o of this.pool) {
      if (!o.active && o.type === type) return o;
    }
    return null;
  }

  reset() {
    this.pool.forEach((o) => {
      o.active = false;
      o.mesh.visible = false;
      o.vz = 0;
      o.vx = 0;
    });
    this.colliders.length = 0;
    this.lastTrainZ = -9999;
  }

  place(o, lane, z, extra = {}) {
    o.active = true;
    o.lane = lane;
    o.x = LANES[lane] + (extra.dx || 0);
    o.z = z;
    o.vz = extra.vz || 0;
    o.vx = extra.vx || 0;
    if (extra.vxMin !== undefined) { o.vxMin = extra.vxMin; o.vxMax = extra.vxMax; }
    o.mesh.visible = true;
    o.mesh.position.set(o.x, 0, z);
    if (extra.vz) o.mesh.rotation.y = extra.vz > 0 ? Math.PI : 0; // oncoming faces the runner
    else o.mesh.rotation.y = 0;
  }

  spawnObstacle(type, lane, z) {
    const o = this.getFree(type);
    if (!o) return null;
    this.place(o, lane, z);
    return o;
  }

  spawnTrain(z, opts = {}) {
    const o = this.getFree('train');
    if (!o) return null;
    const lane = opts.lane !== undefined ? opts.lane : (Math.random() * 3) | 0;
    const length = opts.length || pick([16, 22, 44]);
    const kind = opts.kind || pick(['stop', 'stop', 'oncoming', 'same']);
    o.mesh.scale.set(1, 1, length);
    o.hd = length / 2;
    o.hw = 1.08;
    o.hh = 1.9;
    o.h = 3.8;
    const vz = kind === 'oncoming' ? rand(14, 20) : kind === 'same' ? -rand(8, 13) : 0;
    this.place(o, lane, z, { vz });
    this.lastTrainZ = z;
    return o;
  }

  // A row of obstacles. Guarantees at least one fully free lane or a
  // single action class (all jump / all slide) when all 3 lanes fill.
  spawnRow(z, diff, opts = {}) {
    if (Math.random() < 0.16 && Math.abs(z - this.lastTrainZ) > 75) {
      // dedicated train row: one or two lanes blocked at most
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
      const count = diff > 0.4 && chance(0.4) ? 2 : 1;
      for (let i = 0; i < count; i++) {
        this.spawnTrain(z, {
          lane: lanes[i],
          length: pick([16, 22, 44]),
          kind: pick(['stop', 'stop', 'oncoming', 'same']),
        });
      }
      return;
    }

    const demo = !!opts.demo;
    let lanePool = demo ? [0, 2] : [0, 1, 2];
    let blocked = 1 + Math.floor(Math.random() * (1 + diff * 2));
    if (demo) blocked = Math.min(blocked, 2);
    blocked = Math.min(blocked, lanePool.length);

    const chosen = lanePool.slice().sort(() => Math.random() - 0.5).slice(0, blocked);

    if (!demo && blocked === 3) {
      // full block must share one action class so it stays passable
      const cls = chance(0.5) ? 'jump' : 'slide';
      chosen.forEach((lane) => {
        const type = cls === 'jump'
          ? pick(['barrier', 'crate'])
          : 'gate';
        this.spawnObstacle(type, lane, z);
      });
      return;
    }

    chosen.forEach((lane, i) => {
      let type;
      const r = Math.random();
      if (!demo && r < 0.1 && blocked === 1) {
        type = 'sweeper';
      } else if (!demo && r < 0.34 && Math.abs(z - this.lastTrainZ) > 75) {
        this.spawnTrain(z, { lane, length: pick([16, 22, 44]), kind: pick(['stop', 'oncoming', 'same']) });
        return;
      } else if (r < 0.55) {
        type = 'barrier';
      } else if (r < 0.75) {
        type = 'crate';
      } else if (r < 0.88) {
        type = 'gate';
      } else {
        type = 'wall';
      }
      this.spawnObstacle(type, lane, z);
    });

    // demo mode: keep the centre lane clear, sweepers never spawn
    if (demo) {
      this.pool.forEach((o) => {
        if (o.active && o.lane === 1 && o.z === z) {
          o.active = false;
          o.mesh.visible = false;
        }
      });
    }
  }

  // ---------- per-frame ----------------------------------------------
  update(dt, speed) {
    const cols = this.colliders;
    cols.length = 0;
    for (const o of this.pool) {
      if (!o.active) continue;
      o.z += (speed + o.vz) * dt;
      if (o.vx) {
        o.x += o.vx * dt;
        if (o.x < o.vxMin) { o.x = o.vxMin; o.vx = Math.abs(o.vx); }
        if (o.x > o.vxMax) { o.x = o.vxMax; o.vx = -Math.abs(o.vx); }
      }
      if (o.z - o.hd > 22) {
        o.active = false;
        o.mesh.visible = false;
        continue;
      }
      o.mesh.position.set(o.x, 0, o.z);

      const cy = o.yBottom + o.hh; // gate hangs, others sit on the ground
      cols.push({
        minX: o.x - o.hw, maxX: o.x + o.hw,
        minY: o.yBottom, maxY: o.yBottom + o.h,
        minZ: o.z - o.hd, maxZ: o.z + o.hd,
        type: o.type,
      });
    }
    return cols;
  }

  // Used by the coin spawner to avoid placing coins inside solid objects.
  laneBlockedAt(z, lane, radius = 1.2) {
    const cx = LANES[lane];
    for (const c of this.colliders) {
      if (c.maxX < cx - radius || c.minX > cx + radius) continue;
      if (c.maxZ < z - radius || c.minZ > z + radius) continue;
      return true;
    }
    return false;
  }
}
