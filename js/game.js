// ============================================================
// VOLT RUSH — game.js
// Run state machine: demo mode (menu background), the run itself
// (speed curve, spawning, collisions, scoring, missions) and the
// game-over flow. Also owns the chase camera and particles.
// ============================================================

import * as THREE from 'three';
import {
  LANES, state, save, addCoins, submitRun, powerDuration,
  MISSIONS, missionDone, t,
} from './settings.js';
import { ObstacleManager } from './obstacles.js';
import { CoinManager } from './coins.js';
import { PowerupManager, POWER_TYPES, POWER_INFO } from './powerups.js';
import { audio } from './audio.js';

const SPAWN_AHEAD_EXTRA = 18;
const GRAVITY_FLOOR = 13;
const SPEED_TOP = 46;

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

// smooth, staged speed curve over run time (seconds)
export function speedAt(t) {
  if (t < 30) return 13 + (18 - 13) * (t / 30);
  if (t < 60) return 18 + (24 - 18) * ((t - 30) / 30);
  if (t < 120) return 24 + (32 - 24) * ((t - 60) / 60);
  return Math.min(SPEED_TOP, 32 + (t - 120) * 0.07);
}

// ---------- particles (single draw call, additive points) ------------
class ParticleSystem {
  constructor(scene, max = 320) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.base = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.34,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -500;
  }

  burst(x, y, z, color, count = 14, speed = 6, life = 0.7, up = 3, gravity = 14) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const el = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.35 + Math.random() * 0.9);
      this.vel[i * 3] = Math.cos(a) * Math.cos(el) * s;
      this.vel[i * 3 + 1] = Math.abs(Math.sin(el)) * s + up * Math.random();
      this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(el) * s;
      this.base[i * 3] = c.r;
      this.base[i * 3 + 1] = c.g;
      this.base[i * 3 + 2] = c.b;
      this.life[i] = life * (0.7 + Math.random() * 0.6);
      this.maxLife[i] = this.life[i];
      this.gravity[i] = gravity;
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -500;
        this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0;
        continue;
      }
      this.vel[i * 3 + 1] -= this.gravity[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = Math.max(0, this.life[i] / this.maxLife[i]);
      this.col[i * 3] = this.base[i * 3] * f;
      this.col[i * 3 + 1] = this.base[i * 3 + 1] * f;
      this.col[i * 3 + 2] = this.base[i * 3 + 2] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// ---------- Game ------------------------------------------------------
export class Game {
  constructor(opts) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.world = opts.world;
    this.player = opts.player;
    this.ui = opts.ui;
    this.menu = opts.menu;
    this.fogFar = opts.fogFar || 165;

    this.obstacles = new ObstacleManager(opts.scene);
    this.coins = new CoinManager(opts.scene, this.obstacles);
    this.powerups = new PowerupManager(opts.scene);
    this.particles = new ParticleSystem(opts.scene);

    this.mode = 'demo';
    this.paused = false;
    this.resetRunState();
    this.camX = 0;
    this.shake = 0;
    this.overTimer = 0;
    this.demoRowCd = 30;
    this.demoCoinCd = 15;
    this.maxPowers = {};
    this.fogSpawn = -(this.fogFar + SPAWN_AHEAD_EXTRA);
  }

  resetRunState() {
    this.time = 0;
    this.speed = GRAVITY_FLOOR;
    this.distance = 0;
    this.score = 0;
    this.runCoins = 0;
    this.runJumps = 0;
    this.runPowerups = 0;
    this.streak = 0;
    this.invuln = 0;
    this.rowCd = 45;
    this.coinCd = 20;
    this.powerCd = rand(22, 38);
    this.overTimer = 0;
    this.maxPowers = {};
  }

  // ---------- mode transitions ---------------------------------------
  toMenu() {
    this.mode = 'demo';
    this.paused = false;
    this.clearField();
    this.player.reset();
    this.resetRunState();
    this.demoRowCd = 25;
    this.demoCoinCd = 10;
    this.ui.showHUD(false);
    this.menu.show('menu');
  }

  startRun() {
    this.clearField();
    this.resetRunState();
    this.player.reset();
    if (state.up.startCoins > 0) {
      this.runCoins += 50 * state.up.startCoins;
    }
    this.mode = 'run';
    this.paused = false;
    this.invuln = 1.6;
    this.fogSpawn = -(this.fogFar + SPAWN_AHEAD_EXTRA);
    this.menu.hideAll();
    this.ui.showHUD(true);
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.ui.showTouch(isTouch);
    audio.play('select');
  }

  pause() {
    if (this.mode !== 'run') return;
    this.paused = true;
    this.menu.show('pause');
  }

  resume() {
    this.paused = false;
    this.menu.hideAll();
  }

  clearField() {
    this.obstacles.reset();
    this.coins.reset();
    this.powerups.reset();
  }

  // ---------- main update --------------------------------------------
  update(dt) {
    if (this.paused) {
      this.updateCamera(dt, true);
      return;
    }
    if (this.mode === 'demo') this.updateDemo(dt);
    else if (this.mode === 'run') this.updateRun(dt);
    else if (this.mode === 'over') this.updateOver(dt);

    this.particles.update(dt);
    this.updateCamera(dt, false);
  }

  updateDemo(dt) {
    const speed = 11;
    this.speed = speed;
    this.world.update(dt, speed, this.camera);
    this.obstacles.update(dt, speed);
    this.coins.update(dt, speed, this.player, null);
    this.powerups.update(dt, speed, this.player);
    this.player.update(dt, speed);

    // gentle auto-run for the menu backdrop
    this.demoRowCd -= speed * dt;
    if (this.demoRowCd <= 0) {
      this.demoRowCd = rand(26, 44);
      this.obstacles.spawnRow(this.fogSpawn, 0.15, { demo: true });
    }
    this.demoCoinCd -= speed * dt;
    if (this.demoCoinCd <= 0) {
      this.demoCoinCd = rand(16, 34);
      this.coins.spawnPattern(pick(['line', 'arc', 'chain', 'high']), this.fogSpawn, 1);
    }
  }

  updateRun(dt) {
    this.time += dt;
    this.speed = speedAt(this.time);
    const speed = this.speed;
    const worldSpeed = speed * dt;

    this.distance += speed * dt;
    this.streak += speed * dt;
    if (this.invuln > 0) this.invuln -= dt;

    // world & entities
    this.world.update(dt, speed, this.camera);
    const cols = this.obstacles.update(dt, speed);
    this.coins.update(dt, speed, this.player, (x, y, z) => this.onCoin(x, y, z));
    const pu = this.powerups.update(dt, speed, this.player);
    if (pu) this.applyPower(pu);
    this.player.update(dt, speed);

    // spawning
    this.rowCd -= worldSpeed;
    if (this.rowCd <= 0) {
      const diff = Math.min(1, Math.max(0, (this.time - 8) / 100));
      this.obstacles.spawnRow(this.fogSpawn, diff, {});
      this.rowCd = Math.max(20, speed * 1.55) + rand(0, 16);
    }
    this.coinCd -= worldSpeed;
    if (this.coinCd <= 0) {
      this.coins.spawnPattern(pick(['line', 'line', 'arc', 'chain', 'high']), this.fogSpawn, (Math.random() * 3) | 0);
      this.coinCd = Math.max(26, speed * 1.5) + rand(0, 40);
    }
    this.powerCd -= dt;
    if (this.powerCd <= 0) {
      this.powerCd = rand(32, 60);
      this.spawnPowerup();
    }

    // score: distance + coins + bonuses (boost doubles everything)
    const mult = this.player.powers.boost > 0 ? 2 : 1;
    this.score += speed * dt * mult;

    // collisions
    if (this.invuln <= 0 && this.player.alive) {
      const box = this.player.getBox();
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (box.minX < c.maxX && box.maxX > c.minX &&
            box.minY < c.maxY && box.maxY > c.minY &&
            box.minZ < c.maxZ && box.maxZ > c.minZ) {
          this.onHit(c);
          break;
        }
      }
    }

    // HUD
    this.ui.setHUD({
      score: this.score,
      best: Math.max(state.best, this.score),
      coins: this.runCoins,
      distance: this.distance,
    });
    this.ui.setPowerTimers(this.player.powers, this.maxPowers);
  }

  updateOver(dt) {
    // world keeps sliding to a halt for a dramatic finish
    const speed = this.speed * Math.max(0, 1 - dt * 3);
    this.speed = speed;
    this.world.update(dt, speed, this.camera);
    this.obstacles.update(dt, speed);
    this.coins.update(dt, speed, this.player, null);
    this.player.update(dt, speed);
    if (this.overTimer > 0) {
      this.overTimer -= dt;
      if (this.overTimer <= 0 && !this.gameOverShown) {
        this.gameOverShown = true;
        this.finishRun();
      }
    }
  }

  // ---------- events ---------------------------------------------------
  spawnPowerup() {
    const available = POWER_TYPES.filter((k) => state.pu[k] && state.pu[k].u === 1);
    if (!available.length) return;
    const type = pick(available);
    const z = this.fogSpawn;
    for (let attempt = 0; attempt < 3; attempt++) {
      const lane = (Math.random() * 3) | 0;
      if (!this.obstacles.laneBlockedAt(z, lane, 2)) {
        this.powerups.spawn(type, lane, z);
        return;
      }
    }
    this.powerups.spawn(type, 1, z);
  }

  onCoin(x, y, z) {
    this.runCoins++;
    const mult = this.player.powers.boost > 0 ? 2 : 1;
    this.score += 5 * mult;
    audio.play('coin');
    this.particles.burst(x, y, z, 0xffd23f, 7, 4.5, 0.5, 2.5, 10);
    if (this.runCoins % 5 === 0) this.ui.popup('+' + this.runCoins, '#ffd23f');
  }

  applyPower(type) {
    const level = (state.pu[type] && state.pu[type].l) || 0;
    const dur = powerDuration(type, level);
    this.player.applyPower(type, dur);
    this.maxPowers[type] = dur;
    this.runPowerups++;
    this.score += 50;
    const color = POWER_INFO[type].color;
    const p = this.player;
    this.particles.burst(p.x, p.y + 1.2, 0, color, 30, 8, 0.9, 5, 8);
    audio.play(type === 'magnet' ? 'magnet' : type === 'jetpack' ? 'jetpack' : 'power');
    this.ui.popup('+' + t(type === 'boost' ? 'boost' : type), '#' + color.toString(16).padStart(6, '0'));
  }

  onHit(col) {
    if (this.player.consumeShield()) {
      this.invuln = 0.9;
      this.streak = 0;
      this.shake = Math.max(this.shake, 0.45);
      audio.play('shieldHit');
      const p = this.player;
      this.particles.burst(p.x, p.y + 1, 0, 0x49e6ff, 26, 8, 0.7, 4, 8);
      this.ui.popup('SHIELD!', '#49e6ff');
      return;
    }
    this.die();
  }

  die() {
    if (this.mode !== 'run') return;
    this.mode = 'over';
    this.gameOverShown = false;
    this.overTimer = 1.15;
    this.player.alive = false;
    this.shake = 1.1;
    const p = this.player;
    this.particles.burst(p.x, p.y + 1, 0, 0xff5a3c, 44, 11, 1.0, 6, 16);
    this.particles.burst(p.x, p.y + 1, 0, 0xffd23f, 30, 8, 0.9, 5, 14);
    audio.play('crash');
  }

  finishRun() {
    const distance = this.distance;
    const coins = this.runCoins;
    const score = Math.floor(this.score);
    const newBest = score > state.best;
    if (newBest) state.best = score;

    // lifetime stats feed the missions
    state.stats.coins += coins;
    state.stats.distance += distance;
    state.stats.jumps += this.runJumps;
    state.stats.powerups += this.runPowerups;
    state.stats.runs += 1;
    state.stats.streak = Math.max(state.stats.streak || 0, this.streak);

    addCoins(coins);
    submitRun({
      name: this.player.getCharacter().name,
      score,
      distance: Math.floor(distance),
      coins,
      date: Date.now(),
    });
    save();

    // any mission that just became complete?
    let newMission = false;
    MISSIONS.forEach((m) => {
      const rec = state.missions[m.id];
      if (missionDone(m) && (!rec || !rec.notified)) {
        state.missions[m.id] = Object.assign({ claimed: false, notified: true }, rec || {});
        newMission = true;
      }
    });
    if (newMission) {
      save();
      this.ui.toast(t('missionReady'), '#b6ff3a');
      audio.play('mission');
    } else if (newBest) {
      audio.play('best');
    } else {
      audio.play('gameover');
    }

    this.menu.showGameOver({
      score, coins, distance, best: state.best, newBest,
    });
  }

  // ---------- jump / slide / lane hooks (called by input) -------------
  actionLane(dir) {
    if (this.mode !== 'run' || this.paused) return;
    if (this.player.toLane(dir)) audio.play('lane');
  }

  actionJump() {
    if (this.mode !== 'run' || this.paused) return;
    if (this.player.jump()) {
      this.runJumps++;
      audio.play(this.player.powers.superjump > 0 ? 'superjump' : 'jump');
      this.particles.burst(this.player.x, 0.2, 0, 0x9fe8ff, 8, 3, 0.45, 1.5, 12);
    }
  }

  actionSlide() {
    if (this.mode !== 'run' || this.paused) return;
    if (this.player.slide()) audio.play('slide');
  }

  // ---------- camera ---------------------------------------------------
  updateCamera(dt, frozen) {
    const cam = this.camera;
    const p = this.player;
    const speed = this.speed;
    const norm = Math.min(1, Math.max(0, (speed - GRAVITY_FLOOR) / (SPEED_TOP - GRAVITY_FLOOR)));

    let targetFov;
    if (this.mode === 'demo') {
      const sway = Math.sin(performance.now() * 0.00016) * 4.5;
      this.camX += (sway - this.camX) * Math.min(1, dt * 1.2);
      cam.position.set(this.camX, 4.8 + Math.sin(performance.now() * 0.0004) * 0.4, 11);
      cam.lookAt(this.camX * 0.3, 1.6, -16);
      targetFov = 55;
    } else {
      const targetX = p.x * 0.72;
      this.camX += (targetX - this.camX) * Math.min(1, dt * 6);
      const bob = Math.sin(p.runPhase * 2) * 0.07 * (0.5 + norm);
      const rise = p.y * 0.55;
      const back = this.mode === 'over' ? 5.6 : 7.6;
      cam.position.set(this.camX, 3.35 + bob + rise, back);
      cam.lookAt(p.x * 0.55, 1.55 + rise * 0.8, -9);
      targetFov = this.mode === 'over' ? 58 : 60 + norm * 17;
    }

    // speed-dependent FOV
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
    }

    // crash shake
    if (this.shake > 0.001) {
      const s = this.shake * 0.35;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      this.shake *= Math.max(0, 1 - dt * 4);
    }
  }

  setFog(far) {
    this.fogFar = far;
    this.fogSpawn = -(far + SPAWN_AHEAD_EXTRA);
  }
}
