// ============================================================
// VOLT RUSH — coins.js
// Pooled coins with several spawn patterns: lines, arcs, chains,
// fans and lines above obstacles. Supports magnet attraction.
// ============================================================

import * as THREE from 'three';
import { LANES } from './settings.js';

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

const POOL_SIZE = 110;

export class CoinManager {
  constructor(scene, obstacles) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.pool = [];
    this.collectedCount = 0;

    const geo = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 16);
    geo.rotateZ(Math.PI / 2); // faces point sideways -> nice flip while spinning
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd23f,
      emissive: 0xc07a00,
      emissiveIntensity: 0.85,
      metalness: 0.75,
      roughness: 0.25,
    });

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({ mesh, active: false, x: 0, y: 1, z: 0, spin: Math.random() * 6.28, magnetized: false });
    }
  }

  reset() {
    this.pool.forEach((c) => {
      c.active = false;
      c.mesh.visible = false;
      c.magnetized = false;
    });
    this.collectedCount = 0;
  }

  getFree() {
    for (const c of this.pool) if (!c.active) return c;
    return null;
  }

  place(x, y, z) {
    const c = this.getFree();
    if (!c) return null;
    // do not put coins inside solid geometry
    if (this.obstacles && this.isSolid(x, y, z)) return null;
    c.active = true;
    c.x = x; c.y = y; c.z = z;
    c.magnetized = false;
    c.mesh.visible = true;
    c.mesh.position.set(x, y, z);
    return c;
  }

  isSolid(x, y, z) {
    const cols = this.obstacles ? this.obstacles.colliders : [];
    const r = 0.4;
    for (const c of cols) {
      if (c.maxX < x - r || c.minX > x + r) continue;
      if (c.maxY < y - r || c.minY > y + r) continue;
      if (c.maxZ < z - r || c.minZ > z + r) continue;
      return true;
    }
    return false;
  }

  // ---------- patterns ------------------------------------------------
  spawnPattern(kind, z, lane) {
    const lx = LANES[lane];
    switch (kind) {
      case 'line': {
        const n = 5 + ((Math.random() * 4) | 0);
        for (let i = 0; i < n; i++) this.place(lx, 1.0, z - i * 2.1);
        break;
      }
      case 'arc': {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const y = 1.0 + Math.sin(t * Math.PI) * 1.7;
          this.place(lx, y, z - 6 + t * 12);
        }
        break;
      }
      case 'chain': {
        const other = lane === 1 ? pick([0, 2]) : 1;
        const n = 8;
        for (let i = 0; i < n; i++) {
          const useLane = i % 2 === 0 ? lane : other;
          this.place(LANES[useLane], 1.0 + (i % 2) * 0.35, z - i * 2.0);
        }
        break;
      }
      case 'fan': {
        for (let l = 0; l < 3; l++) {
          for (let i = 0; i < 4; i++) this.place(LANES[l], 1.0, z - i * 2.2);
        }
        break;
      }
      case 'high': {
        const n = 6;
        for (let i = 0; i < n; i++) this.place(lx, 2.4, z - i * 2.2);
        break;
      }
      default:
        this.place(lx, 1.0, z);
    }
  }

  // ---------- frame ---------------------------------------------------
  update(dt, speed, player, onCollect) {
    const px = player.x;
    const py = player.y + 0.9;
    const magnet = player.powers.magnet > 0;
    const spin = dt * 4.2;
    let collected = 0;

    for (const c of this.pool) {
      if (!c.active) continue;
      c.z += speed * dt;
      if (c.z > 14) {
        c.active = false;
        c.mesh.visible = false;
        continue;
      }

      // magnet attraction
      if (magnet) {
        const dx = px - c.x;
        const dy = py - c.y;
        const dz = -c.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 9) {
          const k = Math.min(1, dt * 6);
          c.x += dx * k;
          c.y += dy * k;
          c.z += dz * k * 1.2;
          c.magnetized = true;
        }
      }

      c.spin += spin;
      c.mesh.rotation.y = c.spin;
      c.mesh.position.set(c.x, c.y, c.z);

      // pickup
      const nearZ = Math.abs(c.z) < 1.0;
      const nearX = Math.abs(c.x - px) < 1.05;
      const nearY = c.y > player.y - 0.5 && c.y < player.y + 2.4;
      if (nearZ && nearX && nearY) {
        c.active = false;
        c.mesh.visible = false;
        collected++;
        if (onCollect) onCollect(c.x, c.y, c.z);
      }
    }
    return collected;
  }

  activeCount() {
    let n = 0;
    this.pool.forEach((c) => { if (c.active) n++; });
    return n;
  }
}
