// ============================================================
// VOLT RUSH — settings.js
// Persistent state (localStorage), i18n, missions, constants.
// ============================================================

export const GAME_VERSION = 1;
const STORAGE_KEY = 'voltrush_save_v1';

// --- Track constants -------------------------------------------------
export const LANES = [-2.4, 0, 2.4];
export const LANE_W = 2.4;
export const PLAYER_Z = 0;

// --- Default persistent state ---------------------------------------
function defaultState() {
  return {
    version: GAME_VERSION,
    best: 0,
    coins: 0,
    selected: 'alex',
    owned: { alex: true, nova: true, zane: true, mia: true },
    // power-ups: u = unlocked (0/1), l = upgrade level 0..3
    pu: {
      magnet: { u: 1, l: 0 },
      jetpack: { u: 0, l: 0 },
      shield: { u: 1, l: 0 },
      superjump: { u: 0, l: 0 },
      boost: { u: 1, l: 0 },
    },
    // permanent upgrades
    up: { magnetTime: 0, shield: 0, startCoins: 0 },
    stats: { coins: 0, distance: 0, jumps: 0, powerups: 0, streak: 0, runs: 0 },
    missions: {}, // id -> {claimed:bool}
    leaderboard: [], // {name, score, distance, coins, date}
    settings: {
      sound: true,
      music: true,
      quality: 'medium', // low | medium | high
      swipe: 1, // sensitivity multiplier 0.5..2
      lang: 'ru',
    },
  };
}

function mergeState(base, saved) {
  const out = base;
  if (!saved || typeof saved !== 'object') return out;
  const deep = (tgt, src) => {
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && tgt[k] && typeof tgt[k] === 'object' && !Array.isArray(tgt[k])) {
        deep(tgt[k], v);
      } else if (v !== undefined) {
        tgt[k] = v;
      }
    }
  };
  deep(out, saved);
  return out;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeState(defaultState(), JSON.parse(raw));
  } catch (e) { /* corrupted save -> fresh */ }
  return defaultState();
}

export const state = loadState();

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* storage full / private mode: game still works in-session */ }
}

export function addCoins(n) {
  state.coins += n;
  save();
}

export function spendCoins(n) {
  if (state.coins < n) return false;
  state.coins -= n;
  save();
  return true;
}

// --- Power-up durations (seconds) by upgrade level -------------------
export function powerDuration(type, level) {
  const lv = level || 0;
  switch (type) {
    case 'magnet': return 8 + lv * 4 + state.up.magnetTime * 2;
    case 'jetpack': return 6 + lv * 2.5;
    case 'shield': return 12 + lv * 4 + state.up.shield * 3;
    case 'superjump': return 9 + lv * 3;
    case 'boost': return 8 + lv * 3;
    default: return 8;
  }
}

// --- Missions --------------------------------------------------------
export const MISSIONS = [
  { id: 'm_coins', target: 100, reward: 100, stat: 'coins' },
  { id: 'm_dist500', target: 500, reward: 150, stat: 'distance' },
  { id: 'm_jumps', target: 20, reward: 80, stat: 'jumps' },
  { id: 'm_power', target: 3, reward: 120, stat: 'powerups' },
  { id: 'm_dist1000', target: 1000, reward: 250, stat: 'distance' },
  { id: 'm_streak', target: 500, reward: 300, stat: 'streak' },
];

export function missionProgress(m) {
  return Math.min(m.target, Math.floor(state.stats[m.stat] || 0));
}
export function missionDone(m) {
  return missionProgress(m) >= m.target;
}
export function claimMission(m) {
  if (!missionDone(m)) return false;
  const rec = state.missions[m.id] || (state.missions[m.id] = { claimed: false });
  if (rec.claimed) return false;
  rec.claimed = true;
  addCoins(m.reward);
  return true;
}

// --- Leaderboard -----------------------------------------------------
export function submitRun(entry) {
  state.leaderboard.push(entry);
  state.leaderboard.sort((a, b) => b.score - a.score);
  state.leaderboard = state.leaderboard.slice(0, 10);
  save();
}

// --- i18n ------------------------------------------------------------
export const I18N = {
  en: {
    tagline: 'Run the neon rails',
    score: 'SCORE', best: 'BEST', coins: 'COINS', distance: 'DISTANCE',
    play: 'PLAY', characters: 'CHARACTERS', shop: 'SHOP', missions: 'MISSIONS',
    leaderboard: 'LEADERBOARD', settings: 'SETTINGS', back: 'BACK',
    pause: 'PAUSE', resume: 'RESUME', toMenu: 'MENU', retry: 'RETRY',
    gameOver: 'RUN OVER', newBest: 'NEW BEST!',
    sound: 'Sound', music: 'Music', quality: 'Graphics quality',
    qLow: 'Low', qMedium: 'Medium', qHigh: 'High',
    swipe: 'Swipe sensitivity', language: 'Language', fullscreen: 'Fullscreen',
    enterFullscreen: 'Enter fullscreen', exitFullscreen: 'Exit fullscreen',
    select: 'SELECT', buy: 'BUY', selected: 'SELECTED', owned: 'OWNED',
    price: 'Price', locked: 'LOCKED', upgrade: 'UPGRADE', maxed: 'MAX LEVEL',
    tabPower: 'POWER-UPS', tabUpgrades: 'UPGRADES',
    claim: 'CLAIM', claimed: 'CLAIMED', reward: 'Reward',
    noRuns: 'No runs yet. Be the first!',
    place: '#', runner: 'RUNNER', m_score: 'SCORE', m_dist: 'DIST',
    jumpHint: 'JUMP', slideHint: 'SLIDE', moveHint: 'MOVE',
    touchMove: 'swipe left / right', touchJump: 'swipe up', touchSlide: 'swipe down',
    mission_coins: 'Collect 100 coins',
    mission_dist500: 'Run a total of 500 m',
    mission_jumps: 'Perform 20 jumps',
    mission_power: 'Pick up 3 power-ups',
    mission_dist1000: 'Run a total of 1000 m',
    mission_streak: 'Run 500 m without a crash',
    loading: 'LOADING', paused: 'PAUSED',
    bought: 'Purchased!', notEnough: 'Not enough coins', done: 'Done!',
    missionReady: 'Mission complete — claim your reward!',
    magnet: 'MAGNET', jetpack: 'JETPACK', shield: 'SHIELD',
    superjump: 'SUPER JUMP', boost: 'SCORE BOOST',
    best2: 'Personal best',
    desc_alex: 'Street sprinter with a lucky cap. Balanced and fearless.',
    desc_nova: 'Hologram courier. Her visor maps every rail ahead.',
    desc_zane: 'Rooftop drummer. Loud mohawk, louder landing.',
    desc_mia: 'Skate trickster who never misses a coin line.',
    desc_ray: 'Night-shift engineer. Knows every tunnel by heart.',
    desc_leo: 'Speed trial champion. Helmet first, questions later.',
    desc_luna: 'Moonlit wanderer. Moves like a soft glow of neon.',
    desc_max: 'Home-made runner bot. Charged with pure voltage.',
    pu_magnet_d: 'Pulls every coin on the track towards you.',
    pu_jetpack_d: 'Blast above the rails and cruise over everything.',
    pu_shield_d: 'Absorbs one crash with a glowing bubble.',
    pu_superjump_d: 'Higher, longer jumps for a whole power-up window.',
    pu_boost_d: 'Doubles the score you earn from the run.',
    up_magnet: 'Magnet time', up_magnet_d: '+4s to every magnet pickup.',
    up_shield: 'Shield time', up_shield_d: '+4s before the bubble fades.',
    up_start: 'Start coins', up_start_d: '+50 coins added to every run.',
  },
  ru: {
    tagline: 'Беги по неоновым путям',
    score: 'СЧЁТ', best: 'РЕКОРД', coins: 'МОНЕТЫ', distance: 'ДИСТАНЦИЯ',
    play: 'ИГРАТЬ', characters: 'ПЕРСОНАЖИ', shop: 'МАГАЗИН', missions: 'ЗАДАНИЯ',
    leaderboard: 'РЕКОРДЫ', settings: 'НАСТРОЙКИ', back: 'НАЗАД',
    pause: 'ПАУЗА', resume: 'ПРОДОЛЖИТЬ', toMenu: 'МЕНЮ', retry: 'ЕЩЁ РАЗ',
    gameOver: 'ЗАБЕГ ОКОНЧЕН', newBest: 'НОВЫЙ РЕКОРД!',
    sound: 'Звук', music: 'Музыка', quality: 'Качество графики',
    qLow: 'Низкое', qMedium: 'Среднее', qHigh: 'Высокое',
    swipe: 'Чувствительность свайпов', language: 'Язык', fullscreen: 'Полный экран',
    enterFullscreen: 'Во весь экран', exitFullscreen: 'Выйти из экрана',
    select: 'ВЫБРАТЬ', buy: 'КУПИТЬ', selected: 'ВЫБРАН', owned: 'КУПЛЕН',
    price: 'Цена', locked: 'ЗАКРЫТ', upgrade: 'УЛУЧШИТЬ', maxed: 'МАКС. УР.',
    tabPower: 'ПАВЕР-АПЫ', tabUpgrades: 'АПГРЕЙДЫ',
    claim: 'ЗАБРАТЬ', claimed: 'ПОЛУЧЕНО', reward: 'Награда',
    noRuns: 'Забегов пока нет. Будьте первым!',
    place: '№', runner: 'БЕГУН', m_score: 'СЧЁТ', m_dist: 'ДИСТ.',
    jumpHint: 'ПРЫЖОК', slideHint: 'СКОЛЬЖЕНИЕ', moveHint: 'ПОЛОСЫ',
    touchMove: 'свайп влево / вправо', touchJump: 'свайп вверх', touchSlide: 'свайп вниз',
    mission_coins: 'Собрать 100 монет',
    mission_dist500: 'Пробежать суммарно 500 м',
    mission_jumps: 'Совершить 20 прыжков',
    mission_power: 'Подобрать 3 павер-апа',
    mission_dist1000: 'Пробежать суммарно 1000 м',
    mission_streak: 'Пробежать 500 м без столкновений',
    loading: 'ЗАГРУЗКА', paused: 'ПАУЗА',
    bought: 'Куплено!', notEnough: 'Не хватает монет', done: 'Готово!',
    missionReady: 'Задание выполнено — заберите награду!',
    magnet: 'МАГНИТ', jetpack: 'ДЖЕТПАК', shield: 'ЩИТ',
    superjump: 'СУПЕР ПРЫЖОК', boost: 'БОНУС ОЧКОВ',
    best2: 'Личный рекорд',
    desc_alex: 'Уличный спринтер с счастливой кепкой. Ровный и бесстрашный.',
    desc_nova: 'Курьер голограмм. Её визор прокладывает каждый путь впереди.',
    desc_zane: 'Барабанщик крыш. Ирокез громче, чем приземление.',
    desc_mia: 'Мастер скейт-трюков, никогда не пропускающая цепочки монет.',
    desc_ray: 'Инженер ночной смены. Знает каждый туннель наизусть.',
    desc_leo: 'Чемпион скоростных заездов. Сначала шлем, потом вопросы.',
    desc_luna: 'Лунная странница. Движется, как мягкое свечение неона.',
    desc_max: 'Самодельный беговой бот. Заряжен чистым напряжением.',
    pu_magnet_d: 'Притягивает все монеты на трассе к вам.',
    pu_jetpack_d: 'Взлёт над путями и полёт над всеми препятствиями.',
    pu_shield_d: 'Спасает от одного столкновения светящимся пузырём.',
    pu_superjump_d: 'Выше и дальше: усиленные прыжки всё время действия.',
    pu_boost_d: 'Удваивает очки, начисляемые за забег.',
    up_magnet: 'Время магнита', up_magnet_d: '+4 секунды к каждому магниту.',
    up_shield: 'Время щита', up_shield_d: '+4 секунды до исчезновения пузыря.',
    up_start: 'Стартовые монеты', up_start_d: '+50 монет в начале каждого забега.',
  },
};

let lang = state.settings.lang in I18N ? state.settings.lang : 'ru';

export function getLang() { return lang; }
export function setLang(l) {
  if (!(l in I18N)) return;
  lang = l;
  state.settings.lang = l;
  save();
}

export function t(key) {
  const d = I18N[lang];
  if (key in d) return d[key];
  if (key in I18N.en) return I18N.en[key];
  return key;
}

// --- Quality profiles ------------------------------------------------
export const QUALITY = {
  low: { fogNear: 30, fogFar: 105, pixelRatio: 1, shadows: false, decor: 0.5, shadowSize: 512, segments: 8 },
  medium: { fogNear: 40, fogFar: 165, pixelRatio: 1.5, shadows: true, decor: 0.8, shadowSize: 1024, segments: 11 },
  high: { fogNear: 55, fogFar: 235, pixelRatio: 2, shadows: true, decor: 1.0, shadowSize: 2048, segments: 14 },
};
export function qualityProfile() {
  return QUALITY[state.settings.quality] || QUALITY.medium;
}
