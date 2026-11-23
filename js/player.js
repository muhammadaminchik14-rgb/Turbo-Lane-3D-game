// ============================================================
// VOLT RUSH — player.js
// Runner controller: lane switching, jump, slide, power-up
// visuals and the AABB used for collision detection.
// ============================================================

import * as THREE from 'three';
import { LANES } from './settings.js';
import { buildCharacter, animateCharacter, disposeCharacter, CHAR_BY_ID } from './characters.js';

const GRAVITY = 34;
const JUMP_V = 11.4;
const SUPER_V = 15.2;
const SLIDE_TIME = 0.72;
const LANE_SPEED = 13;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.ch = null;
    this.group = new THREE.Group();
    scene.add(this.group);

    // --- runtime state ---
    this.lane = 1;
    this.targetX = LANES[1];
    this.x = LANES[1];
    this.y = 0;
    this.vy = 0;
    this.airborne = false;
    this.sliding = false;
    this.slideT = 0;
    this.alive = true;
    this.runPhase = 0;
    this.mode = 'run';

    // --- power-up timers (seconds left) ---
    this.powers = { magnet: 0, jetpack: 0, shield: 0, superjump: 0, boost: 0 };
    this.shieldUsed = false;

    this.buildFx();
    this.setCharacter('alex');
  }

  // ---------- visuals for power-ups ----------
  buildFx() {
    // shield bubble
    const bubbleGeo = new THREE.SphereGeometry(1.15, 20, 14);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0x49e6ff, transparent: true, opacity: 0.24,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    this.bubble.position.y = 1.0;
    this.bubble.visible = false;
    this.group.add(this.bubble);

    const ringGeo = new THREE.TorusGeometry(1.15, 0.035, 8, 40);
    this.bubbleRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0x9df4ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.bubbleRing.rotation.x = Math.PI / 2;
    this.bubbleRing.position.y = 0.35;
    this.bubbleRing.visible = false;
    this.group.add(this.bubbleRing);

    // magnet ring (orbits the runner)
    const magGeo = new THREE.TorusGeometry(0.75, 0.05, 8, 32);
    this.magnetRing = new THREE.Mesh(magGeo, new THREE.MeshBasicMaterial({
      color: 0xff4d6d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.magnetRing.rotation.x = Math.PI / 2;
    this.magnetRing.position.y = 1.0;
    this.magnetRing.visible = false;
    this.group.add(this.magnetRing);

    // super-jump glow under the feet
    this.jumpGlow = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 1.0, 10),
      new THREE.MeshBasicMaterial({
        color: 0xb6ff3a, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.jumpGlow.position.y = 0.5;
    this.jumpGlow.rotation.x = Math.PI;
    this.jumpGlow.visible = false;
    this.group.add(this.jumpGlow);

    // jetpack on the back
    this.jet = new THREE.Group();
    const canMat = new THREE.MeshStandardMaterial({ color: 0xc9d4e2, metalness: 0.7, roughness: 0.3 });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffa63d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    [-0.16, 0.16].forEach((ox) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), canMat);
      can.position.set(ox, 1.05, 0.32);
      this.jet.add(can);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), flameMat.clone());
      flame.position.set(ox, 0.7, 0.32);
      flame.rotation.x = Math.PI;
      flame.userData.isFlame = true;
      this.jet.add(flame);
    });
    this.jet.visible = false;
    this.group.add(this.jet);
  }

  // ---------- character ----------
  setCharacter(id) {
    const def = CHAR_BY_ID[id] || CHAR_BY_ID.alex;
    if (this.ch && this.ch.def.id === def.id) return;
    if (this.ch) {
      this.group.remove(this.ch.root);
      disposeCharacter(this.ch);
    }
    this.ch = buildCharacter(def);
    this.group.add(this.ch.root);
  }

  getCharacter() { return this.ch ? this.ch.def : CHAR_BY_ID.alex; }

  // ---------- run lifecycle ----------
  reset() {
    this.lane = 1;
    this.targetX = LANES[1];
    this.x = LANES[1];
    this.y = 0;
    this.vy = 0;
    this.airborne = false;
    this.sliding = false;
    this.slideT = 0;
    this.alive = true;
    this.runPhase = 0;
    this.powers = { magnet: 0, jetpack: 0, shield: 0, superjump: 0, boost: 0 };
    this.shieldUsed = false;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.updateFxVisibility();
  }

  // ---------- input actions ----------
  toLane(dir) {
    if (!this.alive) return false;
    const next = Math.max(0, Math.min(2, this.lane + dir));
    if (next === this.lane) return false;
    this.lane = next;
    this.targetX = LANES[next];
    return true;
  }

  jump() {
    if (!this.alive) return false;
    if (this.powers.jetpack > 0) return false;
    if (this.sliding) {
      this.sliding = false;
      this.slideT = 0;
    }
    if (this.airborne) return false;
    this.vy = this.powers.superjump > 0 ? SUPER_V : JUMP_V;
    this.airborne = true;
    return true;
  }

  slide() {
    if (!this.alive) return false;
    if (this.powers.jetpack > 0) return false;
    if (this.airborne) {
      // fast-fall into a slide
      this.vy = Math.min(this.vy, -14);
      return true;
    }
    if (this.sliding) return false;
    this.sliding = true;
    this.slideT = SLIDE_TIME;
    return true;
  }

  applyPower(type, duration) {
    this.powers[type] = Math.max(this.powers[type] || 0, duration);
    if (type === 'shield') this.shieldUsed = false;
    if (type === 'jetpack' && this.airborne) {
      // jetpack lifts off smoothly
      this.vy = Math.max(this.vy, 6);
    }
    this.updateFxVisibility();
  }

  consumeShield() {
    if (this.powers.shield > 0 && !this.shieldUsed) {
      this.shieldUsed = true;
      this.powers.shield = 0;
      this.updateFxVisibility();
      return true;
    }
    return false;
  }

  updateFxVisibility() {
    const p = this.powers;
    this.bubble.visible = p.shield > 0 && !this.shieldUsed;
    this.bubbleRing.visible = this.bubble.visible;
    this.magnetRing.visible = p.magnet > 0;
    this.jumpGlow.visible = p.superjump > 0;
    this.jet.visible = p.jetpack > 0;
  }

  // ---------- per-frame update ----------
  update(dt, speed) {
    if (!this.ch) return;

    // power timers
    let anyExpire = false;
    for (const k of Object.keys(this.powers)) {
      if (this.powers[k] > 0) {
        this.powers[k] -= dt;
        if (this.powers[k] <= 0) { this.powers[k] = 0; anyExpire = true; }
      }
    }
    if (anyExpire) this.updateFxVisibility();

    // horizontal lane lerp
    const dx = this.targetX - this.x;
    const step = LANE_SPEED * dt;
    if (Math.abs(dx) <= step) this.x = this.targetX;
    else this.x += Math.sign(dx) * step;
    const lean = Math.max(-0.3, Math.min(0.3, -dx * 0.16));

    // vertical movement
    if (this.powers.jetpack > 0) {
      const targetY = 6.4;
      this.y += (targetY - this.y) * Math.min(1, dt * 4.5);
      this.y += Math.sin(performance.now() * 0.004) * 0.02;
      this.vy = 0;
      this.airborne = true;
      this.sliding = false;
    } else {
      if (this.airborne) {
        this.vy -= GRAVITY * dt;
        this.y += this.vy * dt;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          this.airborne = false;
        }
      }
      // slide timing
      if (this.sliding) {
        this.slideT -= dt;
        if (this.slideT <= 0) this.sliding = false;
      }
    }

    // animation mode
    if (this.powers.jetpack > 0) this.mode = 'jetpack';
    else if (this.sliding) this.mode = 'slide';
    else if (this.airborne) this.mode = 'jump';
    else this.mode = 'run';

    const animMode = this.mode === 'jetpack' ? 'jump' : this.mode;
    if (animMode === 'run') {
      this.runPhase += dt * (6 + speed * 0.55);
    }
    animateCharacter(this.ch, this.runPhase, animMode, dt);

    // apply transform
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = lean;
    if (animMode === 'run') this.group.rotation.x = 0;
    else if (animMode === 'slide') this.group.rotation.x = 0;
    else this.group.rotation.x = 0;

    // power-up FX animation
    const time = performance.now() * 0.001;
    if (this.bubble.visible) {
      this.bubble.rotation.y = time * 0.8;
      const pulse = 1 + Math.sin(time * 6) * 0.04;
      this.bubble.scale.setScalar(pulse);
      this.bubbleRing.rotation.z = time * 1.6;
    }
    if (this.magnetRing.visible) {
      this.magnetRing.rotation.z = time * 3;
      this.magnetRing.position.y = 1.0 + Math.sin(time * 5) * 0.12;
    }
    if (this.jumpGlow.visible) {
      this.jumpGlow.scale.set(1, 1 + Math.sin(time * 14) * 0.18, 1);
      this.jumpGlow.position.y = this.y + 0.5;
      this.jumpGlow.visible = true;
    }
    if (this.jet.visible) {
      this.jet.children.forEach((child) => {
        if (child.userData.isFlame) {
          const f = 0.8 + Math.random() * 0.6;
          child.scale.set(1, f, 1);
        }
      });
    }
  }

  // ---------- collision box ----------
  getBox() {
    const h = this.sliding && this.powers.jetpack <= 0 ? 0.85 : 1.72;
    return {
      minX: this.x - 0.45, maxX: this.x + 0.45,
      minY: this.y + 0.03, maxY: this.y + h,
      minZ: -0.42, maxZ: 0.42,
    };
  }

  dispose() {
    if (this.ch) disposeCharacter(this.ch);
    this.scene.remove(this.group);
  }
}
