// ============================================================
// VOLT RUSH — characters.js
// Eight original runners, every model assembled from primitives
// (boxes / spheres / cylinders / cones) with unique palettes.
// ============================================================

import * as THREE from 'three';

export const CHARACTERS = [
  {
    id: 'alex', name: 'Alex', price: 0, build: 'slim', style: 'cap',
    desc: { en: 'Street sprinter with a lucky cap. Balanced and fearless.', ru: 'Уличный спринтер с счастливой кепкой. Ровный и бесстрашный.' },
    c: { skin: 0xf2c49a, shirt: 0xff5a3c, pants: 0x2b3a67, shoes: 0xffd23f, hair: 0x3b2b20, accent: 0xffd23f },
  },
  {
    id: 'nova', name: 'Nova', price: 0, build: 'slim', style: 'visor',
    desc: { en: 'Hologram courier. Her visor maps every rail ahead.', ru: 'Курьер голограмм. Её визор прокладывает каждый путь впереди.' },
    c: { skin: 0xffd9b3, shirt: 0x7b5cff, pants: 0x171a2e, shoes: 0x35f0ff, hair: 0x4de3ff, accent: 0x35f0ff },
  },
  {
    id: 'zane', name: 'Zane', price: 0, build: 'stocky', style: 'mohawk',
    desc: { en: 'Rooftop drummer. Loud mohawk, louder landing.', ru: 'Барабанщик крыш. Ирокез громче, чем приземление.' },
    c: { skin: 0xc98b5e, shirt: 0x2ee56b, pants: 0x20242c, shoes: 0xb6ff3a, hair: 0xff2e88, accent: 0xb6ff3a },
  },
  {
    id: 'mia', name: 'Mia', price: 0, build: 'short', style: 'buns',
    desc: { en: 'Skate trickster who never misses a coin line.', ru: 'Мастер скейт-трюков, никогда не пропускающая цепочки монет.' },
    c: { skin: 0xf7d6c0, shirt: 0xff4fa3, pants: 0x32143c, shoes: 0xffe14f, hair: 0x7a3c12, accent: 0xffe14f },
  },
  {
    id: 'ray', name: 'Ray', price: 500, build: 'tall', style: 'beanie',
    desc: { en: 'Night-shift engineer. Knows every tunnel by heart.', ru: 'Инженер ночной смены. Знает каждый туннель наизусть.' },
    c: { skin: 0x8d5a3b, shirt: 0x29a8ff, pants: 0x16305c, shoes: 0x9dff4f, hair: 0x22262e, accent: 0x9dff4f },
  },
  {
    id: 'leo', name: 'Leo', price: 900, build: 'stocky', style: 'helmet',
    desc: { en: 'Speed trial champion. Helmet first, questions later.', ru: 'Чемпион скоростных заездов. Сначала шлем, потом вопросы.' },
    c: { skin: 0xe8b98a, shirt: 0xffb302, pants: 0x4a3200, shoes: 0xff4d00, hair: 0x141414, accent: 0xff4d00 },
  },
  {
    id: 'luna', name: 'Luna', price: 1500, build: 'slim', style: 'hood',
    desc: { en: 'Moonlit wanderer. Moves like a soft glow of neon.', ru: 'Лунная странница. Движется, как мягкое свечение неона.' },
    c: { skin: 0xf4c9a5, shirt: 0xa06bff, pants: 0x241442, shoes: 0xfff06a, hair: 0xe8e8ff, accent: 0xfff06a },
  },
  {
    id: 'max', name: 'Max', price: 2500, build: 'tall', style: 'antenna',
    desc: { en: 'Home-made runner bot. Charged with pure voltage.', ru: 'Самодельный беговой бот. Заряжен чистым напряжением.' },
    c: { skin: 0xd9a06b, shirt: 0xff2e63, pants: 0x101828, shoes: 0x00ffc6, hair: 0x555f6e, accent: 0x00ffc6 },
  },
];

export const CHAR_BY_ID = {};
CHARACTERS.forEach((ch) => { CHAR_BY_ID[ch.id] = ch; });

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough !== undefined ? opts.rough : 0.72,
    metalness: opts.metal !== undefined ? opts.metal : 0.08,
    emissive: opts.emissive !== undefined ? opts.emissive : 0x000000,
    emissiveIntensity: opts.ei !== undefined ? opts.ei : 1,
  });
}

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, material, seg = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
  m.castShadow = true;
  return m;
}

// --- head accessories (unique silhouette per character) ---------------
function buildHeadgear(style, head, c) {
  const hairMat = mat(c.hair, { rough: 0.85 });
  const accentMat = mat(c.accent, { emissive: c.accent, ei: 0.55, rough: 0.4 });
  const parts = [];
  switch (style) {
    case 'cap': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      cap.position.y = 0.06; cap.castShadow = true;
      const brim = box(0.34, 0.05, 0.22, mat(c.accent, { rough: 0.6 }));
      brim.position.set(0, 0.08, -0.24);
      head.add(cap, brim);
      parts.push(cap, brim);
      break;
    }
    case 'visor': {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.8), hairMat);
      hair.position.y = 0.05; hair.castShadow = true;
      const visor = box(0.44, 0.13, 0.1, accentMat);
      visor.position.set(0, 0.02, -0.24);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5, 8), mat(c.hair, { rough: 0.85 }));
      tail.position.set(0, 0.02, 0.3); tail.rotation.x = 1.1; tail.castShadow = true;
      head.add(hair, visor, tail);
      parts.push(hair, visor, tail);
      break;
    }
    case 'mohawk': {
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26 - Math.abs(i - 2) * 0.04, 6), hairMat);
        spike.position.set(0, 0.24, -0.18 + i * 0.09);
        spike.castShadow = true;
        head.add(spike);
        parts.push(spike);
      }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 18), accentMat);
      band.rotation.x = Math.PI / 2; band.position.y = 0.05;
      head.add(band); parts.push(band);
      break;
    }
    case 'buns': {
      const capS = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.9), hairMat);
      capS.position.y = 0.05; capS.castShadow = true;
      const bunL = sphere(0.13, hairMat, 10); bunL.position.set(-0.26, 0.14, 0.06);
      const bunR = sphere(0.13, hairMat, 10); bunR.position.set(0.26, 0.14, 0.06);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14), accentMat);
      tie.position.set(0, 0.24, 0); tie.rotation.x = Math.PI / 2;
      head.add(capS, bunL, bunR, tie);
      parts.push(capS, bunL, bunR, tie);
      break;
    }
    case 'beanie': {
      const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      beanie.position.y = 0.03; beanie.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 16), accentMat);
      rim.position.y = 0.03;
      const pom = sphere(0.08, accentMat, 8); pom.position.y = 0.3;
      head.add(beanie, rim, pom);
      parts.push(beanie, rim, pom);
      break;
    }
    case 'helmet': {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7), mat(c.accent, { rough: 0.35, metal: 0.5 }));
      helm.position.y = 0.02; helm.castShadow = true;
      const stripe = box(0.1, 0.05, 0.5, mat(0xffffff, { rough: 0.4 }));
      stripe.position.set(0, 0.24, -0.05);
      const glass = box(0.42, 0.14, 0.1, mat(0x101826, { emissive: 0x2244ff, ei: 0.5, rough: 0.2 }));
      glass.position.set(0, 0.0, -0.25);
      head.add(helm, stripe, glass);
      parts.push(helm, stripe, glass);
      break;
    }
    case 'hood': {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12, 0, Math.PI * 2, 0, Math.PI / 1.55), mat(c.shirt, { rough: 0.9 }));
      hood.position.set(0, 0.05, 0.07); hood.castShadow = true;
      const moon = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 14, Math.PI * 1.4), accentMat);
      moon.position.set(0, 0.24, -0.12); moon.rotation.z = 0.6;
      head.add(hood, moon);
      parts.push(hood, moon);
      break;
    }
    case 'antenna': {
      const capA = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9fb0c4, { metal: 0.7, rough: 0.35 }));
      capA.position.y = 0.05; capA.castShadow = true;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), mat(0x333a45, { metal: 0.6, rough: 0.4 }));
      stem.position.set(0.1, 0.34, 0);
      const bulb = sphere(0.06, accentMat, 8); bulb.position.set(0.1, 0.5, 0);
      const ear = box(0.08, 0.16, 0.16, mat(0x333a45, { metal: 0.6, rough: 0.4 }));
      ear.position.set(-0.27, 0, 0);
      head.add(capA, stem, bulb, ear);
      parts.push(capA, stem, bulb, ear);
      break;
    }
    default: break;
  }
  return parts;
}

// --- full character ---------------------------------------------------
export function buildCharacter(def) {
  const c = def.c;
  const scale = def.build === 'tall' ? 1.07 : def.build === 'short' ? 0.9 : 1;
  const wide = def.build === 'stocky' ? 1.16 : 1;

  const root = new THREE.Group();
  const body = new THREE.Group(); // animated as a whole (slide / lean)
  root.add(body);

  const skinMat = mat(c.skin, { rough: 0.8 });
  const shirtMat = mat(c.shirt, { rough: 0.75 });
  const pantsMat = mat(c.pants, { rough: 0.8 });
  const shoeMat = mat(c.shoes, { rough: 0.55 });
  const accentMat = mat(c.accent, { emissive: c.accent, ei: 0.5, rough: 0.45 });

  // torso
  const torso = box(0.6 * wide, 0.66, 0.36 * wide, shirtMat);
  torso.position.y = 0.95;
  body.add(torso);
  // glowing chest stripe
  const stripe = box(0.44 * wide, 0.08, 0.03, accentMat);
  stripe.position.set(0, 1.08, -0.19 * wide);
  body.add(stripe);
  // hips
  const hips = box(0.5 * wide, 0.2, 0.34 * wide, pantsMat);
  hips.position.y = 0.63;
  body.add(hips);
  // backpack
  const pack = box(0.4, 0.44, 0.2, mat(c.pants, { rough: 0.85 }));
  pack.position.set(0, 0.98, 0.27 * wide);
  body.add(pack);
  const packLight = box(0.22, 0.07, 0.03, accentMat);
  packLight.position.set(0, 1.1, 0.38 * wide);
  body.add(packLight);

  // head
  const head = new THREE.Group();
  head.position.y = 1.44;
  const skull = sphere(0.26, skinMat, 16);
  skull.scale.set(1, 1.05, 0.95);
  head.add(skull);
  buildHeadgear(def.style, head, c);
  body.add(head);

  // arms (pivot at shoulder)
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (0.31 * wide + 0.04), 1.2, 0);
    const upper = box(0.16, 0.52, 0.17, shirtMat);
    upper.position.y = -0.26;
    pivot.add(upper);
    const hand = sphere(0.1, skinMat, 10);
    hand.position.y = -0.55;
    pivot.add(hand);
    const wrist = box(0.17, 0.07, 0.18, accentMat);
    wrist.position.y = -0.46;
    pivot.add(wrist);
    body.add(pivot);
    return pivot;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // legs (pivot at hip)
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.16 * wide, 0.6, 0);
    const upper = box(0.2, 0.56, 0.22, pantsMat);
    upper.position.y = -0.28;
    pivot.add(upper);
    const shoe = box(0.22, 0.14, 0.34, shoeMat);
    shoe.position.set(0, -0.6, -0.05);
    pivot.add(shoe);
    body.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  root.scale.setScalar(scale);

  return {
    def,
    root,
    parts: { root, body, torso, head, armL, armR, legL, legR, accentMat },
  };
}

// --- animation --------------------------------------------------------
// mode: 'run' | 'jump' | 'slide' | 'idle'
export function animateCharacter(ch, phase, mode, dt = 0.016) {
  const p = ch.parts;
  const s = Math.sin(phase);
  if (mode === 'run') {
    p.legL.rotation.x = s * 1.0;
    p.legR.rotation.x = -s * 1.0;
    p.armL.rotation.x = -s * 0.9;
    p.armR.rotation.x = s * 0.9;
    p.armL.rotation.z = 0.14;
    p.armR.rotation.z = -0.14;
    p.body.position.y = Math.abs(Math.sin(phase)) * 0.07;
    p.body.rotation.x = -0.1;
    p.body.rotation.z = Math.sin(phase) * 0.03;
    p.head.rotation.x = Math.sin(phase * 2) * 0.05;
    p.head.rotation.z = -Math.sin(phase) * 0.05;
  } else if (mode === 'jump') {
    p.legL.rotation.x = -0.85;
    p.legR.rotation.x = -0.3;
    p.armL.rotation.x = -2.3;
    p.armR.rotation.x = -2.1;
    p.armL.rotation.z = 0.3;
    p.armR.rotation.z = -0.3;
    p.body.position.y = 0.05;
    p.body.rotation.x = -0.18;
    p.body.rotation.z = 0;
    p.head.rotation.x = -0.15;
    p.head.rotation.z = 0;
  } else if (mode === 'slide') {
    p.legL.rotation.x = 0.75;
    p.legR.rotation.x = 0.45;
    p.armL.rotation.x = 1.5;
    p.armR.rotation.x = 1.3;
    p.armL.rotation.z = 0.25;
    p.armR.rotation.z = -0.25;
    p.body.position.y = -0.3;
    p.body.rotation.x = -1.0;
    p.body.rotation.z = 0;
    p.head.rotation.x = 0.5;
    p.head.rotation.z = 0;
  } else { // idle / menu preview
    const b = Math.sin(performance.now() * 0.002) * 0.05;
    p.legL.rotation.x = 0;
    p.legR.rotation.x = 0;
    p.armL.rotation.x = b;
    p.armR.rotation.x = -b;
    p.armL.rotation.z = 0.12;
    p.armR.rotation.z = -0.12;
    p.body.position.y = b * 0.4;
    p.body.rotation.x = 0;
    p.body.rotation.z = 0;
    p.head.rotation.x = 0;
    p.head.rotation.z = 0;
  }
}

// Dispose every geometry/material of a character (prevents leaks).
export function disposeCharacter(ch) {
  ch.root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
}
