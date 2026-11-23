// ============================================================
// VOLT RUSH — world.js
// Endlessly generated railway city: track segments with rails and
// sleepers, platforms, walls, tunnels, bridges, procedural
// buildings with windows, billboards, lamps, containers and a
// far skyline silhouette. Everything is pooled and recycled.
// ============================================================

import * as THREE from 'three';
import { LANES } from './settings.js';

const SEG_LEN = 24;
const POOL = 14;
const RECYCLE_Z = 36;

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function chance(p) { return Math.random() < p; }

// ---------- procedural textures --------------------------------------
function makeWindowTexture(base, lit, litChance) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 16) {
      if (Math.random() < litChance) {
        g.fillStyle = pick(lit);
        g.fillRect(x, y, 10, 12);
      } else {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y, 10, 12);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeBillboardTexture(text, c1, c2) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 144;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 144);
  grad.addColorStop(0, '#101026');
  grad.addColorStop(1, '#1d1040');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 144);
  g.strokeStyle = c1;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 244, 132);
  g.fillStyle = c2;
  g.font = 'bold 54px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = c1;
  g.shadowBlur = 18;
  g.fillText(text, 128, 70);
  g.shadowBlur = 0;
  g.fillStyle = c1;
  g.fillRect(40, 108, 176, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeAsphaltTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1b1e2b';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    const v = 20 + Math.random() * 30;
    g.fillStyle = `rgba(${v},${v + 4},${v + 14},0.6)`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  return tex;
}

// ---------- World -----------------------------------------------------
export class World {
  constructor(scene) {
    this.scene = scene;
    this.decor = 1;
    this.tunnelLeft = 0;
    this.time = 0;

    this.buildTextures();
    this.buildSky();
    this.buildGround();
    this.buildSegments();
    this.buildSkyline();
  }

  buildTextures() {
    this.windowTex = [
      makeWindowTexture('#141a2e', ['#ffe9a8', '#9fd8ff', '#ffd0ff'], 0.5),
      makeWindowTexture('#1a1430', ['#a8ffe0', '#ffe08a', '#8ab4ff'], 0.42),
      makeWindowTexture('#101828', ['#ffcf7a', '#7affd8', '#ffffff'], 0.55),
      makeWindowTexture('#241436', ['#ff9ad5', '#ffe98a', '#9ff0ff'], 0.46),
    ];
    this.boardTex = [
      makeBillboardTexture('VOLT', '#35f0ff', '#ffffff'),
      makeBillboardTexture('RUSH', '#ff3d81', '#ffe14f'),
      makeBillboardTexture('GO!', '#b6ff3a', '#ffffff'),
      makeBillboardTexture('NEON', '#a06bff', '#35f0ff'),
      makeBillboardTexture('RIDE', '#ffb302', '#ffffff'),
    ];
    this.asphaltTex = makeAsphaltTexture();
  }

  buildSky() {
    // gradient sky dome (shader, no extra dependencies)
    const geo = new THREE.SphereGeometry(620, 32, 18);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x070a22) },
        midColor: { value: new THREE.Color(0x4b1b74) },
        botColor: { value: new THREE.Color(0xff8a4a) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 botColor;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = h > 0.0
            ? mix(midColor, topColor, smoothstep(0.0, 0.6, h))
            : mix(midColor, botColor, smoothstep(0.0, 0.3, -h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // pale sun disc near the horizon
    this.sun = new THREE.Mesh(
      new THREE.CircleGeometry(46, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false, transparent: true, opacity: 0.9, depthWrite: false })
    );
    this.sun.position.set(-240, 60, -540);
    this.sun.frustumCulled = false;
    this.scene.add(this.sun);
  }

  buildGround() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ color: 0x0d1020, roughness: 1 })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.56;
    g.receiveShadow = true;
    this.scene.add(g);
    this.ground = g;
  }

  // ---------- track segments -----------------------------------------
  buildSegments() {
    const asphaltMat = new THREE.MeshStandardMaterial({
      map: this.asphaltTex, color: 0xffffff, roughness: 0.95, metalness: 0,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x9fb0c4, roughness: 0.3, metalness: 0.85,
      emissive: 0x16324a, emissiveIntensity: 0.6,
    });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x2c2436, roughness: 0.95 });
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x272c40, roughness: 0.9 });
    const trimCyan = new THREE.MeshStandardMaterial({
      color: 0x0b2530, emissive: 0x35f0ff, emissiveIntensity: 1.1, roughness: 0.4,
    });
    const trimPink = new THREE.MeshStandardMaterial({
      color: 0x300b22, emissive: 0xff3d81, emissiveIntensity: 1.1, roughness: 0.4,
    });

    this.segments = [];
    for (let i = 0; i < POOL; i++) {
      const seg = new THREE.Group();

      // road slab
      const road = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, SEG_LEN), asphaltMat);
      road.position.y = -0.25;
      road.receiveShadow = true;
      seg.add(road);

      // glowing lane dividers
      [-1.2, 1.2].forEach((x) => {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, SEG_LEN), i % 2 ? trimCyan : trimPink);
        d.position.set(x, 0.03, 0);
        seg.add(d);
      });

      // rails (instanced): 2 per lane
      const railGeo = new THREE.BoxGeometry(0.1, 0.14, SEG_LEN);
      const rails = new THREE.InstancedMesh(railGeo, railMat, 6);
      const m = new THREE.Matrix4();
      let idx = 0;
      LANES.forEach((lx) => {
        [-0.72, 0.72].forEach((off) => {
          m.makeTranslation(lx + off, 0.07, 0);
          rails.setMatrixAt(idx++, m);
        });
      });
      rails.instanceMatrix.needsUpdate = true;
      rails.receiveShadow = true;
      seg.add(rails);

      // sleepers (instanced): 30 pieces
      const slGeo = new THREE.BoxGeometry(2.1, 0.12, 0.55);
      const sleepers = new THREE.InstancedMesh(slGeo, sleeperMat, 30);
      idx = 0;
      LANES.forEach((lx) => {
        for (let k = 0; k < 10; k++) {
          const z = -SEG_LEN / 2 + 1.4 + k * 2.4;
          m.makeTranslation(lx, 0.04, z);
          sleepers.setMatrixAt(idx++, m);
        }
      });
      sleepers.instanceMatrix.needsUpdate = true;
      sleepers.receiveShadow = true;
      seg.add(sleepers);

      // side platforms + neon trim
      [-1, 1].forEach((s) => {
        const plat = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, SEG_LEN), platformMat);
        plat.position.set(s * 6.7, 0.25, 0);
        plat.castShadow = true;
        plat.receiveShadow = true;
        seg.add(plat);
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, SEG_LEN), s < 0 ? trimPink : trimCyan);
        trim.position.set(s * 4.28, 1.02, 0);
        seg.add(trim);
      });

      // --- randomizable slots ---
      seg.userData = {
        buildings: [],
        clutterL: null,
        clutterR: null,
        tunnel: null,
        bridge: null,
      };

      // buildings (always present, re-randomized)
      [-1, 1].forEach((s) => {
        const bmat = new THREE.MeshStandardMaterial({
          color: 0xffffff, roughness: 0.85, metalness: 0.05,
          emissive: 0xffffff, emissiveIntensity: 0.22,
        });
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bmat);
        b.castShadow = true;
        b.receiveShadow = true;
        seg.add(b);
        seg.userData.buildings.push(b);
      });

      // clutter groups (created once, toggled per recycle)
      seg.userData.clutterPool = {
        lampL: this.buildLamp(-1), lampR: this.buildLamp(1),
        boardL: this.buildBillboard(-1), boardR: this.buildBillboard(1),
        boxL: this.buildContainer(-1), boxR: this.buildContainer(1),
        wallL: this.buildWall(-1), wallR: this.buildWall(1),
      };
      Object.values(seg.userData.clutterPool).forEach((g) => { g.visible = false; seg.add(g); });

      seg.userData.tunnel = this.buildTunnel();
      seg.userData.tunnel.visible = false;
      seg.add(seg.userData.tunnel);

      seg.userData.bridge = this.buildBridge();
      seg.userData.bridge.visible = false;
      seg.add(seg.userData.bridge);

      seg.position.z = 12 - i * SEG_LEN;
      this.scene.add(seg);
      this.segments.push(seg);
      this.randomizeSegment(seg, true);
    }
  }

  // ---------- clutter builders ---------------------------------------
  buildLamp(side) {
    const g = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x39415a, metalness: 0.6, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 6, 8), poleMat);
    pole.position.y = 4;
    pole.castShadow = true;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), poleMat);
    arm.position.set(-side * 0.7, 6.9, 0);
    g.add(arm);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe9a8, emissiveIntensity: 2.2, roughness: 0.3 })
    );
    head.position.set(-side * 1.35, 6.8, 0);
    g.add(head);
    g.position.set(side * 4.9, 1, 0);
    return g;
  }

  buildBillboard(side) {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2c3350, metalness: 0.5, roughness: 0.5 });
    [-1.6, 1.6].forEach((oz) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5, 8), postMat);
      post.position.set(0, 2.5, oz);
      g.add(post);
    });
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 3.4),
      new THREE.MeshStandardMaterial({
        map: pick(this.boardTex), emissive: 0xffffff, emissiveIntensity: 0.55,
        roughness: 0.6, side: THREE.DoubleSide,
      })
    );
    board.position.set(0, 6, 0);
    board.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    board.castShadow = true;
    g.add(board);
    g.position.set(side * 8.4, 1, 0);
    return g;
  }

  buildContainer(side) {
    const g = new THREE.Group();
    const colors = [0xff4d4d, 0x2fa8ff, 0x38d97a, 0xffb302, 0xa06bff];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.6, 6.4),
      new THREE.MeshStandardMaterial({ color: pick(colors), roughness: 0.7, metalness: 0.25 })
    );
    body.position.y = 1.3;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.16, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x141726, roughness: 0.8 })
      );
      rib.position.set(0, 1.3, i * 1.3);
      g.add(rib);
    }
    g.position.set(side * 7, 1, 0);
    return g;
  }

  buildWall(side) {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 3.6, SEG_LEN),
      new THREE.MeshStandardMaterial({ color: 0x1e2438, roughness: 0.9 })
    );
    wall.position.y = 1.8;
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.14, SEG_LEN),
      new THREE.MeshStandardMaterial({
        color: 0x11131f, emissive: side < 0 ? 0xff3d81 : 0x35f0ff, emissiveIntensity: 1.4, roughness: 0.4,
      })
    );
    strip.position.y = 3.65;
    g.add(strip);
    g.position.set(side * 5.6, 1, 0);
    return g;
  }

  buildTunnel() {
    const g = new THREE.Group();
    const concrete = new THREE.MeshStandardMaterial({ color: 0x1a2033, roughness: 0.95 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, SEG_LEN), concrete);
    roof.position.y = 8.4;
    roof.castShadow = true;
    g.add(roof);
    [-1, 1].forEach((s) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.4, SEG_LEN), concrete);
      pillar.position.set(s * 11, 4.2, 0);
      pillar.castShadow = true;
      g.add(pillar);
    });
    for (let i = -1; i <= 1; i++) {
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.16, 4.2),
        new THREE.MeshStandardMaterial({ color: 0x0d1220, emissive: 0x66f0ff, emissiveIntensity: 2.4, roughness: 0.3 })
      );
      light.position.set(0, 7.7, i * 7.4);
      g.add(light);
    }
    return g;
  }

  buildBridge() {
    const g = new THREE.Group();
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(32, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x252c44, roughness: 0.85, metalness: 0.2 })
    );
    deck.position.y = 10;
    deck.castShadow = true;
    g.add(deck);
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x141726, emissive: 0xffb302, emissiveIntensity: 0.9, roughness: 0.5 })
    );
    rail.position.set(0, 10.95, 2.9);
    g.add(rail);
    const rail2 = rail.clone();
    rail2.position.z = -2.9;
    g.add(rail2);
    [-13, 13].forEach((ox) => {
      [-2, 2].forEach((oz) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10, 1.4),
          new THREE.MeshStandardMaterial({ color: 0x1d2338, roughness: 0.9 }));
        col.position.set(ox, 5, oz);
        col.castShadow = true;
        g.add(col);
      });
    });
    return g;
  }

  // ---------- far skyline silhouette ---------------------------------
  buildSkyline() {
    const count = 70;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    this.skyline = new THREE.InstancedMesh(geo, mat, count);
    this.skyline.frustumCulled = false;
    this.skyItems = [];
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const item = {
        x: rand(-420, 420),
        y: rand(8, 60),
        z: rand(-650, 60),
        w: rand(16, 48),
        h: rand(18, 95),
        d: rand(16, 46),
      };
      this.skyItems.push(item);
      dummy.position.set(item.x, item.h / 2 - 4, item.z);
      dummy.scale.set(item.w, item.h, item.d);
      dummy.updateMatrix();
      this.skyline.setMatrixAt(i, dummy.matrix);
      col.setHSL(rand(0.62, 0.76), rand(0.3, 0.6), rand(0.06, 0.14));
      this.skyline.setColorAt(i, col);
    }
    this.skyline.instanceMatrix.needsUpdate = true;
    if (this.skyline.instanceColor) this.skyline.instanceColor.needsUpdate = true;
    this.scene.add(this.skyline);
    this._dummy = dummy;
  }

  // ---------- per-segment randomization ------------------------------
  randomizeSegment(seg, initial = false) {
    const d = seg.userData;
    const p = this.decor;

    // buildings
    d.buildings.forEach((b, i) => {
      const side = i === 0 ? -1 : 1;
      const h = rand(9, 30);
      const w = rand(6, 12);
      const dp = rand(7, 13);
      b.scale.set(w, h, dp);
      b.position.set(side * rand(13.5, 21), h / 2 - 0.56, rand(-5, 5));
      const tex = pick(this.windowTex);
      b.material.map = tex;
      b.material.emissiveMap = tex;
      b.material.color.setHSL(rand(0.55, 0.78), rand(0.1, 0.35), rand(0.35, 0.6));
      b.material.needsUpdate = true;
    });

    // clutter: one kind per side
    const pool = d.clutterPool;
    Object.values(pool).forEach((g) => { g.visible = false; });
    const sideTypes = ['lamp', 'board', 'container', 'wall'];
    const weights = [0.75 * p, 0.35 * p, 0.3 * p, 0.22 * p];
    [-1, 1].forEach((side) => {
      const key = side < 0 ? 'L' : 'R';
      let chosen = null;
      const total = weights.reduce((a, b2) => a + b2, 0);
      let r = Math.random() * total;
      for (let i = 0; i < sideTypes.length; i++) {
        r -= weights[i];
        if (r <= 0) { chosen = sideTypes[i]; break; }
      }
      if (chosen) {
        const map = { lamp: 'lamp', board: 'board', container: 'box', wall: 'wall' };
        const g = pool[map[chosen] + key];
        if (g) {
          g.visible = true;
          if (chosen === 'board') {
            const board = g.children.find((c) => c.isMesh && c.geometry.type === 'PlaneGeometry');
            if (board) {
              board.material.map = pick(this.boardTex);
              board.material.needsUpdate = true;
            }
          }
          if (chosen === 'container') {
            const body = g.children[0];
            body.material.color.setHex(pick([0xff4d4d, 0x2fa8ff, 0x38d97a, 0xffb302, 0xa06bff]));
          }
        }
      }
    });

    // tunnel runs (keep consecutive segments consistent)
    if (!initial) {
      if (this.tunnelLeft > 0) {
        this.tunnelLeft--;
      } else if (chance(0.07)) {
        this.tunnelLeft = 2 + ((Math.random() * 3) | 0);
      }
    } else if (chance(0.07)) {
      this.tunnelLeft = 2 + ((Math.random() * 3) | 0);
    }
    d.tunnel.visible = this.tunnelLeft > 0;
    if (d.tunnel.visible) {
      // inside a tunnel hide the clutter that would clip through
      Object.values(pool).forEach((g) => { g.visible = false; });
    }

    d.bridge.visible = !d.tunnel.visible && chance(0.1);
  }

  // ---------- frame update -------------------------------------------
  update(dt, speed, camera) {
    this.time += dt;
    const move = speed * dt;

    // recycle segments that passed behind the camera
    for (const seg of this.segments) {
      seg.position.z += move;
      if (seg.position.z > RECYCLE_Z) {
        seg.position.z -= POOL * SEG_LEN;
        this.randomizeSegment(seg);
      }
    }

    // sky follows the camera
    if (camera) {
      this.sky.position.copy(camera.position);
      this.sun.position.z = camera.position.z - 540;
      this.sun.position.x = camera.position.x - 240;
      this.ground.position.z = camera.position.z - 40;
    }

    // parallax skyline
    const skylineMove = move * 0.09;
    const dummy = this._dummy;
    let dirty = false;
    for (let i = 0; i < this.skyItems.length; i++) {
      const it = this.skyItems[i];
      it.z += skylineMove;
      if (it.z > 80) {
        it.z -= 740;
        it.x = rand(-420, 420);
        dirty = true;
      }
      dummy.position.set(it.x, it.h / 2 - 4, it.z);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.updateMatrix();
      this.skyline.setMatrixAt(i, dummy.matrix);
    }
    this.skyline.instanceMatrix.needsUpdate = true;
    if (dirty) { /* positions refreshed every frame anyway */ }
  }

  setQuality(profile) {
    this.decor = profile.decor;
    // re-roll decorations for the visible range so density applies at once
    this.segments.forEach((s, i) => { if (i < profile.segments) this.randomizeSegment(s, true); });
  }
}
