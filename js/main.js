// ============================================================
// VOLT RUSH — main.js
// Bootstrap: renderer, scene, lights, input (keyboard + swipe),
// quality settings and the requestAnimationFrame loop.
// ============================================================

import * as THREE from 'three';
import { state, save, qualityProfile } from './settings.js';
import { audio } from './audio.js';
import { World } from './world.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { Menu } from './menu.js';
import { Game } from './game.js';

// ---------- renderer / scene / camera --------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x0b0f2e);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x3a2358, 40, 165);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 4.5, 11);
camera.lookAt(0, 1.5, -14);

// ---------- lights -----------------------------------------------------
const hemi = new THREE.HemisphereLight(0xa9c4ff, 0x2a1f4a, 0.85);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xffffff, 0.32);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2df, 1.55);
sun.position.set(28, 58, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0012;
scene.add(sun);
scene.add(sun.target);

const rimLight = new THREE.DirectionalLight(0xff5aa8, 0.55);
rimLight.position.set(-30, 24, -40);
scene.add(rimLight);

// ---------- world / player / UI ---------------------------------------
const world = new World(scene);
const player = new Player(scene);

const ui = new UI({
  left: () => game.actionLane(-1),
  right: () => game.actionLane(1),
  jump: () => game.actionJump(),
  slide: () => game.actionSlide(),
});

const menu = new Menu({
  ui,
  player,
  callbacks: {
    onStart: () => game.startRun(),
    onPause: () => game.pause(),
    onResume: () => game.resume(),
    onToMenu: () => game.toMenu(),
    onQuality: (profile) => applyQuality(profile),
    onLang: () => { /* texts re-applied inside the menu */ },
  },
});

const game = new Game({
  scene, camera, world, player, ui, menu, fogFar: qualityProfile().fogFar,
});

// ---------- quality ----------------------------------------------------
function applyQuality(profile) {
  const p = profile || qualityProfile();
  scene.fog.near = p.fogNear;
  scene.fog.far = p.fogFar;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
  renderer.shadowMap.enabled = p.shadows;
  sun.castShadow = p.shadows;
  sun.shadow.mapSize.set(p.shadowSize, p.shadowSize);
  if (sun.shadow.map) {
    sun.shadow.map.dispose();
    sun.shadow.map = null;
  }
  world.setQuality(p);
  game.setFog(p.fogFar);
  resize();
}
applyQuality(qualityProfile());

// ---------- resize -----------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

// ---------- audio unlock on first gesture ------------------------------
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audio.setSound(state.settings.sound);
  audio.setMusic(state.settings.music);
  audio.init();
}
window.addEventListener('pointerdown', unlockAudio, { once: false });
window.addEventListener('keydown', unlockAudio, { once: false });
window.addEventListener('touchstart', unlockAudio, { passive: true });

// ---------- keyboard ---------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'spacebar'].includes(k)) {
    e.preventDefault();
  }
  if (k === 'arrowleft' || k === 'a' || k === 'ф') game.actionLane(-1);
  else if (k === 'arrowright' || k === 'd' || k === 'в') game.actionLane(1);
  else if (k === 'arrowup' || k === 'w' || k === ' ' || k === 'spacebar' || k === 'ц') game.actionJump();
  else if (k === 'arrowdown' || k === 's' || k === 'ы') game.actionSlide();
  else if (k === 'escape' || k === 'p' || k === 'з') {
    if (game.mode === 'run') {
      if (game.paused) game.resume(); else game.pause();
    }
  }
});

// ---------- touch swipes ------------------------------------------------
let touchStart = null;
const app = document.getElementById('app');
app.addEventListener('touchstart', (e) => {
  if (!e.touches.length) return;
  const t0 = e.touches[0];
  touchStart = { x: t0.clientX, y: t0.clientY, time: performance.now() };
}, { passive: true });

app.addEventListener('touchend', (e) => {
  if (!touchStart || game.mode !== 'run' || game.paused) { touchStart = null; return; }
  const t1 = e.changedTouches[0];
  const dx = t1.clientX - touchStart.x;
  const dy = t1.clientY - touchStart.y;
  const sens = state.settings.swipe || 1;
  const threshold = 34 / sens;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < threshold) {
    game.actionJump(); // tap = jump
  } else if (absX > absY) {
    game.actionLane(dx > 0 ? 1 : -1);
  } else if (dy < 0) {
    game.actionJump();
  } else {
    game.actionSlide();
  }
  touchStart = null;
}, { passive: true });

app.addEventListener('touchmove', (e) => {
  if (game.mode === 'run') e.preventDefault();
}, { passive: false });

// ---------- fullscreen changes -----------------------------------------
document.addEventListener('fullscreenchange', () => {
  if (menu.current === 'settings') menu.renderSettings();
  setTimeout(resize, 60);
});

// ---------- main loop --------------------------------------------------
let last = performance.now();
let hidden = false;
document.addEventListener('visibilitychange', () => { hidden = document.hidden; });

function loop(now) {
  requestAnimationFrame(loop);
  if (hidden) { last = now; return; }
  let dt = (now - last) / 1000;
  last = now;
  if (!isFinite(dt) || dt < 0) dt = 0.016;
  dt = Math.min(dt, 0.05); // clamp to avoid huge steps after tab switch

  game.update(dt);
  menu.updatePreview(dt);
  renderer.render(scene, camera);
}

// ---------- start -------------------------------------------------------
menu.show('menu');
ui.showHUD(false);
ui.showTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
player.setCharacter(state.selected);
requestAnimationFrame(loop);

// expose a tiny hook for debugging (no gameplay effect)
window.__voltrush = { game, menu, state, renderer };
