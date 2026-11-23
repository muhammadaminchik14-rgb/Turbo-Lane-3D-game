// ============================================================
// VOLT RUSH — powerups.js
// Five power-ups with hand-built geometry, glowing beams,
// bobbing/spinning animation and pickup detection.
// ============================================================

import * as THREE from 'three';
import { LANES } from './settings.js';

export const POWER_TYPES = ['magnet', 'jetpack', 'shield', 'superjump', 'boost'];

export const POWER_INFO = {
  magnet: { color: 0xff4d6d, label: 'magnet' },
  jetpack: { color: 0xffa63d, label: 'jetpack' },
  shield: { color: 0x49e6ff, label: 'shield' },
  superjump: { color: 0xb6ff3a, label: 'superjump' },
  boost: { color: 0xffd23f, label: 'boost' },
};

function mat(color, ei = 1, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: ei,
    roughness: opts.rough !== undefined ? opts.rough : 0.35,
    metalness: opts.metal !== undefined ? opts.metal : 0.4,
  });
}

function buildModel(type) {
  const color = POWER_INFO[type].color;
  const g = new THREE.Group();
  const core = new THREE.Group();
  g.add(core);

  switch (type) {
    case 'magnet': {
      // horseshoe magnet
      const red = mat(0xff4d6d, 0.8, { metal: 0.5 });
      const steel = mat(0xdfe7f5, 1.1, { metal: 0.8, rough: 0.25 });
      const half = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 10, 22, Math.PI), red);
      half.rotation.z = Math.PI; // opening points down
      core.add(half);
      [-0.42, 0.42].forEach((x) => {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), steel);
        tip.position.set(x, 0.17, 0);
        core.add(tip);
      });
      break;
    }
    case 'jetpack': {
      const canMat = mat(0xc9d4e2, 0.4, { metal: 0.85, rough: 0.3 });
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffa63d, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      [-0.2, 0.2].forEach((x) => {
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 10), canMat);
        can.position.x = x;
        core.add(can);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 8), flameMat);
        flame.position.set(x, -0.55, 0);
        flame.rotation.x = Math.PI;
        flame.userData.flame = true;
        core.add(flame);
      });
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.3), mat(color, 1.4));
      band.position.y = 0.2;
      core.add(band);
      break;
    }
    case 'shield': {
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 0),
        new THREE.MeshStandardMaterial({
          color: 0x49e6ff, emissive: 0x49e6ff, emissiveIntensity: 1.1,
          transparent: true, opacity: 0.5, roughness: 0.2, metalness: 0.3,
          wireframe: true,
        })
      );
      core.add(shell);
      const inner = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 14, 10),
        new THREE.MeshBasicMaterial({
          color: 0x9df4ff, transparent: true, opacity: 0.65,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      core.add(inner);
      break;
    }
    case 'superjump': {
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 10), mat(0xb6ff3a, 1.3));
      arrow.position.y = 0.18;
      core.add(arrow);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 8), mat(0xb6ff3a, 1.0));
      stem.position.y = -0.3;
      core.add(stem);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 8, 24), mat(0xffffff, 1.6));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.48;
      core.add(ring);
      break;
    }
    case 'boost': {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), mat(0xffd23f, 1.4));
      core.add(star);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 26), mat(0xffffff, 1.5));
      ring.rotation.x = Math.PI / 2.4;
      core.add(ring);
      const ring2 = ring.clone();
      ring2.rotation.x = -Math.PI / 2.4;
      core.add(ring2);
      break;
    }
    default: break;
  }

  // shared: light beam + ground glow so pickups read from a distance
  const beamColor = new THREE.Color(color);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 7, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: beamColor, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  beam.position.y = 2.6;
  g.add(beam);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 20),
    new THREE.MeshBasicMaterial({
      color: beamColor, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.06;
  g.add(glow);

  g.userData.core = core;
  return g;
}

export class PowerupManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    POWER_TYPES.forEach((type) => {
      const mesh = buildModel(type);
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ type, mesh, active: false, x: 0, y: 1.3, z: 0, phase: Math.random() * 6.28 });
    });
  }

  reset() {
    this.items.forEach((it) => {
      it.active = false;
      it.mesh.visible = false;
    });
  }

  spawn(type, lane, z) {
    const it = this.items.find((i) => i.type === type && !i.active);
    if (!it) return false;
    it.active = true;
    it.x = LANES[lane];
    it.y = 1.4;
    it.z = z;
    it.mesh.visible = true;
    it.mesh.position.set(it.x, it.y, z);
    return true;
  }

  // returns the collected power-up type (or null)
  update(dt, speed, player) {
    let collected = null;
    const t = performance.now() * 0.001;
    for (const it of this.items) {
      if (!it.active) continue;
      it.z += speed * dt;
      if (it.z > 14) {
        it.active = false;
        it.mesh.visible = false;
        continue;
      }
      it.phase += dt * 2.4;
      const bob = Math.sin(it.phase) * 0.22;
      it.mesh.position.set(it.x, it.y + bob, it.z);
      const core = it.mesh.userData.core;
      core.rotation.y += dt * 2.2;
      core.rotation.x = Math.sin(it.phase * 0.7) * 0.25;
      core.children.forEach((ch) => {
        if (ch.userData.flame) ch.scale.set(1, 0.7 + Math.random() * 0.7, 1);
      });

      if (!collected) {
        const nearZ = Math.abs(it.z) < 1.2;
        const nearX = Math.abs(it.x - player.x) < 1.15;
        const nearY = Math.abs(it.y + bob - (player.y + 1.0)) < 2.2;
        if (nearZ && nearX && nearY) {
          collected = it.type;
          it.active = false;
          it.mesh.visible = false;
        }
      }
    }
    return collected;
  }
}
