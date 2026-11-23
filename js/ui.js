// ============================================================
// VOLT RUSH — ui.js
// HUD, power-up timers, toasts, floating popups, i18n and the
// on-screen touch controls.
// ============================================================

import { t } from './settings.js';
import { POWER_TYPES, POWER_INFO } from './powerups.js';

const $ = (sel) => document.querySelector(sel);

export class UI {
  constructor(handlers = {}) {
    this.handlers = handlers; // {left,right,jump,slide}
    this.el = {
      hud: $('#hud'),
      score: $('#hud-score'),
      best: $('#hud-best'),
      coins: $('#hud-coins'),
      dist: $('#hud-dist'),
      timers: $('#power-timers'),
      toasts: $('#toasts'),
      popups: $('#popups'),
      touch: $('#touch-controls'),
      hints: $('#key-hints'),
    };
    this.timerBars = {};
    this.buildPowerTimers();
    this.bindTouchButtons();
  }

  buildPowerTimers() {
    POWER_TYPES.forEach((type) => {
      const wrap = document.createElement('div');
      wrap.className = 'ptimer';
      wrap.dataset.type = type;
      wrap.style.setProperty('--pc', '#' + POWER_INFO[type].color.toString(16).padStart(6, '0'));
      wrap.innerHTML = `<span class="ptimer-icon">${type.slice(0, 2).toUpperCase()}</span>
        <span class="ptimer-bar"><i></i></span>`;
      wrap.style.display = 'none';
      this.el.timers.appendChild(wrap);
      this.timerBars[type] = wrap;
    });
  }

  bindTouchButtons() {
    const press = (act) => (ev) => {
      ev.preventDefault();
      if (this.handlers[act]) this.handlers[act]();
    };
    document.querySelectorAll('[data-act]').forEach((btn) => {
      const act = btn.dataset.act;
      btn.addEventListener('touchstart', press(act), { passive: false });
      btn.addEventListener('mousedown', press(act));
    });
  }

  // ---------- i18n ----------------------------------------------------
  applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.documentElement.lang = document.documentElement.lang || 'ru';
  }

  // ---------- HUD -----------------------------------------------------
  showHUD(on) {
    this.el.hud.classList.toggle('hidden', !on);
  }

  setHUD(s) {
    this.el.score.textContent = Math.floor(s.score);
    this.el.best.textContent = Math.floor(s.best);
    this.el.coins.textContent = s.coins;
    this.el.dist.textContent = Math.floor(s.distance) + ' м';
  }

  setPowerTimers(powers, maxes) {
    POWER_TYPES.forEach((type) => {
      const wrap = this.timerBars[type];
      const left = powers[type] || 0;
      if (left <= 0) {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = 'flex';
      const max = (maxes && maxes[type]) || 1;
      wrap.querySelector('i').style.width = Math.max(4, Math.min(100, (left / max) * 100)) + '%';
    });
  }

  showTouch(on) {
    this.el.touch.classList.toggle('hidden', !on);
    this.el.hints.classList.toggle('hidden', on);
  }

  // ---------- floating messages ---------------------------------------
  toast(msg, color = '#35f0ff') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.borderColor = color;
    el.style.color = color;
    el.textContent = msg;
    this.el.toasts.appendChild(el);
    setTimeout(() => el.classList.add('show'), 20);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 2400);
  }

  popup(text, color = '#ffd23f') {
    const el = document.createElement('div');
    el.className = 'popup';
    el.style.color = color;
    el.textContent = text;
    // scatter a little so rapid pickups do not stack perfectly
    el.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
    this.el.popups.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
