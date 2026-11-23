// ============================================================
// VOLT RUSH — menu.js
// All front-end screens: main menu, character select (with a live
// 3D preview), shop, missions, leaderboard, settings, pause and
// game over. The 3D world keeps running behind the menus.
// ============================================================

import * as THREE from 'three';
import {
  state, save, t, getLang, setLang, addCoins, spendCoins, MISSIONS,
  missionProgress, missionDone, claimMission, qualityProfile,
} from './settings.js';
import { CHARACTERS, CHAR_BY_ID, buildCharacter, animateCharacter, disposeCharacter } from './characters.js';
import { POWER_TYPES, POWER_INFO } from './powerups.js';
import { audio } from './audio.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const UNLOCK_COST = { jetpack: 800, superjump: 1200 };
const POWER_MAX = 3;
const UPGRADES = [
  { id: 'magnetTime', base: 400, max: 3, name: 'up_magnet', desc: 'up_magnet_d' },
  { id: 'shield', base: 500, max: 3, name: 'up_shield', desc: 'up_shield_d' },
  { id: 'startCoins', base: 300, max: 3, name: 'up_start', desc: 'up_start_d' },
];

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function avatarSVG(def) {
  const c = def.c;
  const hatShapes = {
    cap: `<path d="M32 30 Q50 12 68 30 L68 34 L32 34 Z" fill="${hex(c.hair)}"/><rect x="26" y="32" width="22" height="5" rx="2" fill="${hex(c.accent)}"/>`,
    visor: `<path d="M33 30 Q50 14 67 30 L67 33 L33 33 Z" fill="${hex(c.hair)}"/><rect x="36" y="30" width="28" height="6" rx="3" fill="${hex(c.accent)}"/>`,
    mohawk: `<path d="M44 20 L47 8 L50 20 L53 8 L56 20 Z" fill="${hex(c.hair)}"/><rect x="33" y="28" width="34" height="5" rx="2" fill="${hex(c.accent)}"/>`,
    buns: `<path d="M33 30 Q50 14 67 30 L67 34 L33 34 Z" fill="${hex(c.hair)}"/><circle cx="30" cy="26" r="7" fill="${hex(c.hair)}"/><circle cx="70" cy="26" r="7" fill="${hex(c.hair)}"/>`,
    beanie: `<path d="M33 31 Q50 12 67 31 L67 34 L33 34 Z" fill="${hex(c.hair)}"/><rect x="33" y="29" width="34" height="6" rx="3" fill="${hex(c.accent)}"/><circle cx="50" cy="14" r="5" fill="${hex(c.accent)}"/>`,
    helmet: `<path d="M31 32 Q50 10 69 32 L69 35 L31 35 Z" fill="${hex(c.accent)}"/><rect x="36" y="30" width="28" height="6" rx="3" fill="#101826"/>`,
    hood: `<path d="M31 34 Q50 10 69 34 L69 40 Q50 30 31 40 Z" fill="${hex(c.shirt)}"/><circle cx="50" cy="22" r="5" fill="none" stroke="${hex(c.accent)}" stroke-width="3"/>`,
    antenna: `<path d="M33 31 Q50 14 67 31 L67 34 L33 34 Z" fill="#9fb0c4"/><line x1="57" y1="20" x2="57" y2="8" stroke="#333a45" stroke-width="3"/><circle cx="57" cy="7" r="4" fill="${hex(c.accent)}"/>`,
  };
  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" class="avatar">
    <rect x="4" y="4" width="92" height="112" rx="12" fill="#12162a" stroke="${hex(c.accent)}" stroke-width="2"/>
    ${hatShapes[def.style] || ''}
    <circle cx="50" cy="36" r="15" fill="${hex(c.skin)}"/>
    <rect x="34" y="52" width="32" height="34" rx="7" fill="${hex(c.shirt)}"/>
    <rect x="38" y="58" width="24" height="5" rx="2" fill="${hex(c.accent)}"/>
    <rect x="24" y="54" width="10" height="28" rx="5" fill="${hex(c.shirt)}"/>
    <rect x="66" y="54" width="10" height="28" rx="5" fill="${hex(c.shirt)}"/>
    <rect x="37" y="84" width="11" height="24" rx="4" fill="${hex(c.pants)}"/>
    <rect x="52" y="84" width="11" height="24" rx="4" fill="${hex(c.pants)}"/>
    <rect x="35" y="105" width="15" height="7" rx="3" fill="${hex(c.shoes)}"/>
    <rect x="50" y="105" width="15" height="7" rx="3" fill="${hex(c.shoes)}"/>
  </svg>`;
}

export class Menu {
  constructor(opts) {
    this.ui = opts.ui;
    this.player = opts.player;
    this.callbacks = opts.callbacks || {};
    this.current = null;
    this.shopTab = 'power';
    this.selectedId = state.selected;
    this.initPreview();
    this.bindStatic();
    this.applyI18n();
  }

  // ---------- static bindings ----------------------------------------
  bindStatic() {
    $('#btn-play').addEventListener('click', () => { audio.play('select'); this.callbacks.onStart && this.callbacks.onStart(); });
    $('#btn-chars').addEventListener('click', () => { audio.play('ui'); this.show('characters'); });
    $('#btn-shop').addEventListener('click', () => { audio.play('ui'); this.show('shop'); });
    $('#btn-missions').addEventListener('click', () => { audio.play('ui'); this.show('missions'); });
    $('#btn-lb').addEventListener('click', () => { audio.play('ui'); this.show('leaderboard'); });
    $('#btn-settings').addEventListener('click', () => { audio.play('ui'); this.show('settings'); });
    $('#btn-pause').addEventListener('click', () => { audio.play('ui'); this.callbacks.onPause && this.callbacks.onPause(); });
    $('#btn-resume').addEventListener('click', () => { audio.play('ui'); this.callbacks.onResume && this.callbacks.onResume(); });
    $('#btn-pause-menu').addEventListener('click', () => { audio.play('ui'); this.callbacks.onToMenu && this.callbacks.onToMenu(); });
    $('#go-retry').addEventListener('click', () => { audio.play('select'); this.callbacks.onStart && this.callbacks.onStart(); });
    $('#go-chars').addEventListener('click', () => { audio.play('ui'); this.show('characters'); });
    $('#go-menu').addEventListener('click', () => { audio.play('ui'); this.callbacks.onToMenu && this.callbacks.onToMenu(); });

    $$('.btn-back').forEach((b) => b.addEventListener('click', () => {
      audio.play('ui');
      const from = b.dataset.from || 'menu';
      this.show(from);
    }));

    // shop tabs
    $('#tab-power').addEventListener('click', () => { this.shopTab = 'power'; audio.play('ui'); this.renderShop(); });
    $('#tab-upgrades').addEventListener('click', () => { this.shopTab = 'upgrades'; audio.play('ui'); this.renderShop(); });

    // settings controls
    $('#set-sound').addEventListener('click', () => {
      state.settings.sound = !state.settings.sound; save();
      audio.setSound(state.settings.sound);
      if (state.settings.sound) audio.play('select');
      this.renderSettings();
    });
    $('#set-music').addEventListener('click', () => {
      state.settings.music = !state.settings.music; save();
      audio.setMusic(state.settings.music);
      this.renderSettings();
    });
    $$('[data-q]').forEach((b) => b.addEventListener('click', () => {
      state.settings.quality = b.dataset.q; save();
      audio.play('ui');
      this.callbacks.onQuality && this.callbacks.onQuality(qualityProfile());
      this.renderSettings();
    }));
    $('#set-swipe').addEventListener('input', (e) => {
      state.settings.swipe = parseFloat(e.target.value); save();
      $('#swipe-val').textContent = state.settings.swipe.toFixed(1);
    });
    $$('[data-lang]').forEach((b) => b.addEventListener('click', () => {
      setLang(b.dataset.lang); save();
      audio.play('ui');
      this.applyI18n();
      this.refresh();
      this.callbacks.onLang && this.callbacks.onLang();
    }));
    $('#set-fs').addEventListener('click', () => {
      audio.play('ui');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      this.renderSettings();
    });

    // game over -> character screen keeps the run visible behind it
    this.selectedId = state.selected;
  }

  applyI18n() {
    this.ui.applyI18n();
    const lang = getLang();
    $$('[data-lang]').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  }

  // ---------- screen management ---------------------------------------
  show(name) {
    this.current = name;
    $$('.screen').forEach((s) => s.classList.add('hidden'));
    if (name) {
      const el = $('#screen-' + name);
      if (el) el.classList.remove('hidden');
    }
    if (name === 'characters') this.renderCharacters();
    if (name === 'shop') this.renderShop();
    if (name === 'missions') this.renderMissions();
    if (name === 'leaderboard') this.renderLeaderboard();
    if (name === 'settings') this.renderSettings();
    if (name === 'menu') this.updateCoins();
    if (this.preview) this.preview.active = name === 'characters';
  }

  hideAll() {
    this.current = null;
    $$('.screen').forEach((s) => s.classList.add('hidden'));
    if (this.preview) this.preview.active = false;
  }

  refresh() {
    if (this.current) this.show(this.current);
  }

  updateCoins() {
    ['#menu-coins', '#shop-coins', '#missions-coins', '#char-coins', '#lb-coins', '#set-coins'].forEach((sel) => {
      const el = $(sel);
      if (el) el.textContent = state.coins;
    });
  }

  // ---------- character screen ----------------------------------------
  initPreview() {
    const canvas = $('#char-preview');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    cam.position.set(0, 1.5, 4.6);
    cam.lookAt(0, 1.0, 0);
    scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x2a2140, 1.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(3, 6, 4);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xff5aa8, 1.1);
    rim.position.set(-4, 3, -3);
    scene.add(rim);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.4, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a2138, emissive: 0x35f0ff, emissiveIntensity: 0.5, roughness: 0.5 })
    );
    disc.position.y = -0.08;
    scene.add(disc);

    this.preview = { renderer, scene, cam, ch: null, active: false, canvas, phase: 0 };
  }

  setPreviewChar(id) {
    if (!this.preview) return;
    const def = CHAR_BY_ID[id] || CHAR_BY_ID.alex;
    if (this.preview.ch) {
      this.preview.scene.remove(this.preview.ch.root);
      disposeCharacter(this.preview.ch);
    }
    this.preview.ch = buildCharacter(def);
    this.preview.scene.add(this.preview.ch.root);
  }

  updatePreview(dt) {
    const p = this.preview;
    if (!p || !p.active || !p.ch) return;
    const w = p.canvas.clientWidth || 260;
    const h = p.canvas.clientHeight || 320;
    if (p.canvas.width !== Math.floor(w * p.renderer.getPixelRatio()) ||
        p.canvas.height !== Math.floor(h * p.renderer.getPixelRatio())) {
      p.renderer.setSize(w, h, false);
      p.cam.aspect = w / h;
      p.cam.updateProjectionMatrix();
    }
    p.phase += dt * 4;
    p.ch.root.rotation.y = Math.sin(performance.now() * 0.0006) * 0.6;
    animateCharacter(p.ch, p.phase, 'idle', dt);
    p.renderer.render(p.scene, p.cam);
  }

  renderCharacters() {
    this.updateCoins();
    this.selectedId = state.selected;
    const def = CHAR_BY_ID[state.selected] || CHAR_BY_ID.alex;
    if (!this.preview.ch || this.preview.ch.def.id !== def.id) this.setPreviewChar(def.id);

    $('#char-name').textContent = def.name;
    $('#char-desc').textContent = t(getLang() === 'ru' ? `desc_${def.id}` : `desc_${def.id}`);
    const owned = !!state.owned[def.id];
    const action = $('#char-action');
    if (owned) {
      const isSel = state.selected === def.id;
      action.textContent = isSel ? t('selected') : t('select');
      action.classList.toggle('primary', !isSel);
      action.disabled = isSel;
      $('#char-price').textContent = '';
    } else {
      action.textContent = t('buy');
      action.disabled = false;
      action.classList.add('primary');
      $('#char-price').textContent = `${t('price')}: ${def.price}`;
    }
    action.onclick = () => this.characterAction(def);

    const grid = $('#char-grid');
    grid.innerHTML = '';
    CHARACTERS.forEach((ch) => {
      const card = document.createElement('button');
      card.className = 'char-card' + (state.selected === ch.id ? ' active' : '');
      card.innerHTML = `${avatarSVG(ch)}
        <span class="char-card-name">${ch.name}</span>
        <span class="char-card-state">${state.owned[ch.id] ? (state.selected === ch.id ? '✓' : '★') : ch.price}</span>`;
      card.addEventListener('click', () => {
        audio.play('ui');
        this.selectedId = ch.id;
        this.setPreviewChar(ch.id);
        $('#char-name').textContent = ch.name;
        $('#char-desc').textContent = t(`desc_${ch.id}`);
        const isOwned = !!state.owned[ch.id];
        const act = $('#char-action');
        if (isOwned) {
          const isSel = state.selected === ch.id;
          act.textContent = isSel ? t('selected') : t('select');
          act.disabled = isSel;
          act.classList.toggle('primary', !isSel);
          $('#char-price').textContent = '';
        } else {
          act.textContent = t('buy');
          act.disabled = false;
          act.classList.add('primary');
          $('#char-price').textContent = `${t('price')}: ${ch.price}`;
        }
        act.onclick = () => this.characterAction(ch);
        $$('.char-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      });
      grid.appendChild(card);
    });
  }

  characterAction(def) {
    if (state.owned[def.id]) {
      state.selected = def.id;
      save();
      audio.play('select');
      this.player.setCharacter(def.id);
      this.ui.toast(`${def.name} ✓`, hex(def.c.accent));
      this.renderCharacters();
    } else {
      if (spendCoins(def.price)) {
        state.owned[def.id] = true;
        state.selected = def.id;
        save();
        audio.play('buy');
        this.player.setCharacter(def.id);
        this.ui.toast(t('bought'), '#b6ff3a');
        this.renderCharacters();
        this.updateCoins();
      } else {
        audio.play('error');
        this.ui.toast(t('notEnough'), '#ff4d6d');
      }
    }
  }

  // ---------- shop -----------------------------------------------------
  renderShop() {
    this.updateCoins();
    $('#tab-power').classList.toggle('active', this.shopTab === 'power');
    $('#tab-upgrades').classList.toggle('active', this.shopTab === 'upgrades');
    const list = $('#shop-list');
    list.innerHTML = '';

    if (this.shopTab === 'power') {
      POWER_TYPES.forEach((type) => {
        const info = state.pu[type];
        const level = info.l;
        const unlocked = info.u === 1;
        const color = hex(POWER_INFO[type].color);
        const cost = unlocked ? 350 * (level + 1) : (UNLOCK_COST[type] || 800);
        const maxed = unlocked && level >= POWER_MAX;
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.style.setProperty('--sc', color);
        card.innerHTML = `
          <div class="shop-icon">${type.slice(0, 2).toUpperCase()}</div>
          <div class="shop-body">
            <div class="shop-title">${t(POWER_INFO[type].label)}</div>
            <div class="shop-desc">${t('pu_' + type + '_d')}</div>
            <div class="shop-level">${[0, 1, 2].map((i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</div>
          </div>
          <div class="shop-side">
            ${unlocked ? '' : `<div class="shop-price">${cost}</div>`}
            <button class="btn small ${maxed ? '' : 'primary'}" ${maxed ? 'disabled' : ''}>
              ${maxed ? t('maxed') : (unlocked ? t('upgrade') : t('buy'))}
            </button>
          </div>`;
        const btn = card.querySelector('button');
        btn.addEventListener('click', () => {
          if (maxed) return;
          if (spendCoins(cost)) {
            audio.play('buy');
            if (!unlocked) info.u = 1;
            else info.l += 1;
            save();
            this.ui.toast(t('bought'), color);
            this.renderShop();
          } else {
            audio.play('error');
            this.ui.toast(t('notEnough'), '#ff4d6d');
          }
        });
        list.appendChild(card);
      });
    } else {
      UPGRADES.forEach((up) => {
        const level = state.up[up.id] || 0;
        const maxed = level >= up.max;
        const cost = up.base * (level + 1);
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.style.setProperty('--sc', '#35f0ff');
        card.innerHTML = `
          <div class="shop-icon">UP</div>
          <div class="shop-body">
            <div class="shop-title">${t(up.name)}</div>
            <div class="shop-desc">${t(up.desc)}</div>
            <div class="shop-level">${Array.from({ length: up.max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</div>
          </div>
          <div class="shop-side">
            ${maxed ? '' : `<div class="shop-price">${cost}</div>`}
            <button class="btn small ${maxed ? '' : 'primary'}" ${maxed ? 'disabled' : ''}>
              ${maxed ? t('maxed') : t('upgrade')}
            </button>
          </div>`;
        const btn = card.querySelector('button');
        btn.addEventListener('click', () => {
          if (maxed) return;
          if (spendCoins(cost)) {
            audio.play('buy');
            state.up[up.id] = level + 1;
            save();
            this.ui.toast(t('bought'), '#35f0ff');
            this.renderShop();
          } else {
            audio.play('error');
            this.ui.toast(t('notEnough'), '#ff4d6d');
          }
        });
        list.appendChild(card);
      });
    }
  }

  // ---------- missions -------------------------------------------------
  renderMissions() {
    this.updateCoins();
    const list = $('#mission-list');
    list.innerHTML = '';
    MISSIONS.forEach((m) => {
      const prog = missionProgress(m);
      const done = missionDone(m);
      const rec = state.missions[m.id] || { claimed: false };
      const pct = Math.round((prog / m.target) * 100);
      const row = document.createElement('div');
      row.className = 'mission-row' + (done ? ' done' : '');
      row.innerHTML = `
        <div class="mission-info">
          <div class="mission-title">${t('mission_' + m.id.replace('m_', ''))}</div>
          <div class="mission-bar"><i style="width:${pct}%"></i></div>
          <div class="mission-prog">${prog} / ${m.target}</div>
        </div>
        <div class="mission-reward">
          <div class="mission-coins">+${m.reward}</div>
          <button class="btn small ${done && !rec.claimed ? 'primary' : ''}"
            ${(!done || rec.claimed) ? 'disabled' : ''}>
            ${rec.claimed ? t('claimed') : t('claim')}
          </button>
        </div>`;
      const btn = row.querySelector('button');
      btn.addEventListener('click', () => {
        if (claimMission(m)) {
          audio.play('mission');
          this.ui.toast(`${t('reward')} +${m.reward}`, '#ffd23f');
          this.renderMissions();
        }
      });
      list.appendChild(row);
    });
  }

  // ---------- leaderboard ----------------------------------------------
  renderLeaderboard() {
    this.updateCoins();
    const tbody = $('#lb-body');
    tbody.innerHTML = '';
    if (!state.leaderboard.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4" class="lb-empty">${t('noRuns')}</td>`;
      tbody.appendChild(tr);
      return;
    }
    state.leaderboard.forEach((r, i) => {
      const tr = document.createElement('tr');
      if (i === 0) tr.className = 'first';
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${r.name}</td>
        <td>${r.score}</td>
        <td>${Math.floor(r.distance)} ${t('m_dist')}</td>`;
      tbody.appendChild(tr);
    });
  }

  // ---------- settings --------------------------------------------------
  renderSettings() {
    $('#set-sound').textContent = state.settings.sound ? 'ON' : 'OFF';
    $('#set-sound').classList.toggle('on', state.settings.sound);
    $('#set-music').textContent = state.settings.music ? 'ON' : 'OFF';
    $('#set-music').classList.toggle('on', state.settings.music);
    $$('[data-q]').forEach((b) => b.classList.toggle('active', b.dataset.q === state.settings.quality));
    $('#set-swipe').value = state.settings.swipe;
    $('#swipe-val').textContent = state.settings.swipe.toFixed(1);
    $$('[data-lang]').forEach((b) => b.classList.toggle('active', b.dataset.lang === getLang()));
    $('#set-fs').textContent = document.fullscreenElement ? t('exitFullscreen') : t('enterFullscreen');
  }

  // ---------- game over -------------------------------------------------
  showGameOver(stats) {
    $('#go-score').textContent = Math.floor(stats.score);
    $('#go-coins').textContent = stats.coins;
    $('#go-dist').textContent = Math.floor(stats.distance) + ' м';
    $('#go-best').textContent = Math.floor(stats.best);
    $('#go-newbest').classList.toggle('hidden', !stats.newBest);
    this.show('gameover');
  }
}
