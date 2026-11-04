import * as THREE from 'three';

// Bitta sariq markaz: Ish markazi + Kazino (server CASINO koordinatasi bilan bir xil)
export const LOC = { hub: { x: 0, z: -40 } };
const BOXES = [];
const MOON_DIR = new THREE.Vector3(-0.4, 0.55, -0.7).normalize();

/* ---------------------------------------------------------------- utils */
export const lerpAngle = (a, b, t) => {
  const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a + d * t;
};

// Doira (radius r) va binolar to'qnashuvi + xarita chegarasi
export function resolve(pos, r) {
  let hit = false;
  for (const b of BOXES) {
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r; }
      else pos.x = b.minX - r;
    }
  }
  const L = 130;
  if (Math.abs(pos.x) > L || Math.abs(pos.z) > L) hit = true;
  pos.x = Math.max(-L, Math.min(L, pos.x));
  pos.z = Math.max(-L, Math.min(L, pos.z));
  return hit;
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function mkTex(c, { rx = 1, ry = 1, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeLabel(text, color = '#00e5ff', scale = 1) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 30px Arial'; x.textAlign = 'center';
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 8, 256, 48);
  x.fillStyle = color; x.fillText(text, 128, 44);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(4 * scale, 1 * scale, 1);
  return s;
}

/* ------------------------------------------------------ procedural textures */
function asphaltTexture() {
  const [c, g] = mkCanvas(512, 512);
  g.fillStyle = '#2b2d35'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = (40 + Math.random() * 50) | 0;
    g.fillStyle = `rgba(${v},${v},${v + 5},${0.3 + Math.random() * 0.4})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  g.strokeStyle = 'rgba(8,8,10,.55)'; g.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += rand(-30, 30); y += rand(-30, 30); g.lineTo(x, y); }
    g.stroke();
  }
  return mkTex(c, { rx: 26, ry: 26 });
}

function concreteTexture() {
  const [c, g] = mkCanvas(128, 128);
  g.fillStyle = '#4a4d57'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const v = (60 + Math.random() * 40) | 0;
    g.fillStyle = `rgba(${v},${v},${v + 4},.5)`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  g.fillStyle = '#2a2c33';
  g.fillRect(0, 0, 128, 2); g.fillRect(0, 0, 2, 128);
  g.fillRect(0, 63, 128, 1); g.fillRect(63, 0, 1, 128);
  return mkTex(c, { rx: 7, ry: 7 });
}

const FAC = [
  { wall: '#2b3144', trim: '#3d4764' },
  { wall: '#352f3d', trim: '#4c4360' },
  { wall: '#232d38', trim: '#34434f' },
];
const LIT = ['#ffcf7a', '#ffe9b0', '#ffd08a', '#8fd6ff', '#b9e6ff', '#ff8ad0'];

// Fasad: 4x4 deraza, bitta tile = 16 x 14 birlik
function makeFacade(v) {
  const S = 256;
  const [ca, a] = mkCanvas(S, S), [ce, e] = mkCanvas(S, S);
  a.fillStyle = v.wall; a.fillRect(0, 0, S, S);
  for (let i = 0; i < 1800; i++) {
    a.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    a.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  for (let row = 0; row < 4; row++) {
    a.fillStyle = v.trim; a.fillRect(0, row * 64 + 58, S, 5);          // pol karnizi
    for (let col = 0; col < 4; col++) {
      const x = col * 64 + 12, y = row * 64 + 10, w = 40, h = 40;
      a.fillStyle = v.trim; a.fillRect(x - 3, y - 3, w + 6, h + 6);
      a.fillStyle = '#080c16'; a.fillRect(x, y, w, h);
      a.fillStyle = 'rgba(120,160,255,.12)'; a.fillRect(x, y + h * 0.55, w, h * 0.45);
      a.fillStyle = v.trim; a.fillRect(x + w / 2 - 1, y, 2, h);
      if (Math.random() < 0.42) {
        const col2 = pick(LIT);
        e.globalAlpha = 0.55 + Math.random() * 0.45;
        const gr = e.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, col2); gr.addColorStop(1, col2);
        e.fillStyle = gr; e.fillRect(x, y, w, h);
        e.globalAlpha = 1;
        e.fillStyle = '#000'; e.fillRect(x + w / 2 - 1, y, 2, h);
        e.fillRect(x, y, w, Math.random() < 0.5 ? 6 : 0);                 // jalyuzi
      }
    }
  }
  return { map: mkTex(ca), emis: mkTex(ce) };
}

function shopTexture() {
  const [c, g] = mkCanvas(128, 64);
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = '#fff'; g.fillRect(6 + i * 41, 10, 34, 44);
    g.fillStyle = '#000'; g.fillRect(6 + i * 41 + 16, 10, 2, 44);
  }
  return mkTex(c);
}

const SIGNS = [['BAR', '#ff2bd6'], ['24/7', '#00e5ff'], ['HOTEL', '#ffd400'], ['PIZZA', '#ff5a36'],
  ['SUSHI', '#34ff9a'], ['TAXI', '#ffe14d'], ['CLUB', '#a855ff'], ['CAFE', '#ff9f1c'], ['BANK', '#4d9bff']];

function signTexture(text, color) {
  const [c, g] = mkCanvas(256, 96);
  g.clearRect(0, 0, 256, 96);
  g.lineWidth = 6; g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = 14;
  g.beginPath(); (g.roundRect || g.rect).call(g, 8, 8, 240, 80, 18); g.stroke();
  g.fillStyle = color; g.font = 'bold 50px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  return mkTex(c);
}

// Box UV'ni dunyo o'lchamiga moslash (tekstura qayta ishlatiladi, klonlash yo'q)
function scaleBoxUV(geo, w, h, d, tileW, tileH) {
  const uv = geo.attributes.uv, ox = Math.random();
  for (let f = 0; f < 6; f++) {
    let su = 1, sv = 1;
    if (f < 2) { su = d / tileW; sv = h / tileH; }
    else if (f >= 4) { su = w / tileW; sv = h / tileH; }
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * su + ox, uv.getY(k) * sv);
    }
  }
  uv.needsUpdate = true;
}

/* ----------------------------------------------------------------- shaders */
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime; varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 horizon = vec3(0.11, 0.07, 0.19);
        vec3 zenith  = vec3(0.008, 0.012, 0.04);
        vec3 col = mix(horizon, zenith, pow(h, 0.45));
        col += vec3(0.30, 0.10, 0.22) * pow(1.0 - h, 7.0) * 0.7;
        vec3 sp = floor(d * 160.0);
        float st = step(0.9972, hash(sp));
        col += vec3(st) * smoothstep(0.08, 0.45, h) * (0.55 + 0.45 * sin(uTime * 2.0 + hash(sp + 7.0) * 40.0));
        vec3 md = normalize(vec3(-0.4, 0.55, -0.7));
        float k = dot(d, md);
        col += vec3(0.85, 0.9, 1.0) * smoothstep(0.9988, 0.9994, k);
        col += vec3(0.15, 0.2, 0.45) * pow(max(k, 0.0), 80.0) * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), mat);
  m.frustumCulled = false; m.renderOrder = -1;
  return { mesh: m, mat };
}

function makeRain() {
  const N = 7000, size = 70, H = 36;
  const pos = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2), spd = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = Math.random() * size, y = Math.random() * H, z = Math.random() * size, s = 22 + Math.random() * 10;
    for (let k = 0; k < 2; k++) {
      const o = i * 2 + k;
      pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
      end[o] = k; spd[o] = s;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uSize: { value: size }, uH: { value: H } },
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute float aEnd; attribute float aSpeed;
      uniform float uTime; uniform vec3 uCenter; uniform float uSize; uniform float uH;
      varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y - uTime * aSpeed, uH);
        p.x = mod(p.x - uCenter.x + uSize * 0.5, uSize) - uSize * 0.5 + uCenter.x;
        p.z = mod(p.z - uCenter.z + uSize * 0.5, uSize) - uSize * 0.5 + uCenter.z;
        p += vec3(0.12, 1.0, 0.04) * aEnd * 0.8;
        vA = 1.0 - aEnd * 0.8;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying float vA;
      void main(){ gl_FragColor = vec4(0.7, 0.8, 1.0, 0.28 * vA); }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return { lines, mat };
}

/* ------------------------------------------- 3D aylanuvchi Checkpoint marker */
export class Marker {
  constructor(scene, color = 0xffd400, { label = null, light = false, size = 1 } = {}) {
    this.size = size;
    const c = new THREE.Color(color);
    this.group = new THREE.Group();

    // Suzuvchi va aylanuvchi kristall
    this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, metalness: 0.3, roughness: 0.25, flatShading: true }));
    this.gem.scale.set(0.9, 1.4, 0.9);
    this.wire = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0),
      new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.6 }));
    this.wire.scale.copy(this.gem.scale);
    this.float = new THREE.Group();
    this.float.add(this.gem, this.wire);
    this.float.position.y = 3.2;
    this.group.add(this.float);

    // Yerdagi halqalar
    const ringMat = new THREE.MeshBasicMaterial({ color: c });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 48), ringMat);
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.15;
    this.ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 40), ringMat);
    this.ring2.rotation.x = Math.PI / 2; this.ring2.position.y = 0.16;
    this.group.add(this.ring, this.ring2);

    // Yerdagi yorug'lik dog'i (shader)
    this.discMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: c }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(0.5)) * 2.0;
          float a = smoothstep(1.0, 0.0, d) * 0.55;
          a *= 0.75 + 0.25 * sin(uTime * 3.0 - d * 8.0);
          gl_FragColor = vec4(uColor * 1.4, a);
        }`,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), this.discMat);
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.08;
    this.group.add(disc);

    if (light) { this.light = new THREE.PointLight(c, 90, 22, 2); this.light.position.y = 3; this.group.add(this.light); }
    this.color = '#' + c.getHexString();
    this.labelSprite = null;
    if (label) this.setLabel(label);

    scene.add(this.group);
  }
  setLabel(text) {
    if (this.labelText === text) return;
    this.labelText = text;
    if (this.labelSprite) { this.group.remove(this.labelSprite); this.labelSprite.material.map.dispose(); this.labelSprite.material.dispose(); }
    this.labelSprite = makeLabel(text, this.color, 1.6);
    this.labelSprite.position.y = 7;
    this.group.add(this.labelSprite);
  }
  setVisible(v) { this.group.visible = v; }
  setPosition(x, z) { this.group.position.set(x, 0, z); }
  update(t, focus) {
    this.float.position.y = 3.2 + Math.sin(t * 1.6) * 0.35;      // sekin yuqori-pastga
    this.gem.rotation.y = t * 1.5;                                // aylanish
    this.wire.rotation.y = -t * 0.9; this.wire.rotation.x = t * 0.4;
    const pulse = 1 + Math.sin(t * 3) * 0.06;
    this.ring.scale.setScalar(pulse); this.ring2.scale.setScalar(2 - pulse);
    this.discMat.uniforms.uTime.value = t;
    // uzoqdan ham ko'rinishi uchun masofaga qarab kattalashadi
    const d = Math.hypot(this.group.position.x - focus.x, this.group.position.z - focus.z);
    this.group.scale.setScalar(this.size * Math.max(1, Math.min(2.6, d / 30)));
  }
}

/* ------------------------------------------------------------------ DUNYO */
export function buildWorld(scene) {
  const FOG = 0x140f26;
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.FogExp2(FOG, 0.009);

  // Yoritgichlar
  scene.add(new THREE.HemisphereLight(0x3a4a8a, 0x120f1c, 0.55));
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.95);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera;
  sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 300;
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);

  const sky = makeSky(); scene.add(sky.mesh);
  const rain = makeRain(); scene.add(rain.lines);

  // Zamin + asfalt
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(264, 264),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.42, metalness: 0.15 }));
  asphalt.rotation.x = -Math.PI / 2; asphalt.position.y = 0.02; asphalt.receiveShadow = true; scene.add(asphalt);

  const centers = [-100, -60, -20, 20, 60, 100];

  // Trotuarlar (yo'llar ularning orasida ochiq qoladi)
  const swGeo = new THREE.PlaneGeometry(28, 28).rotateX(-Math.PI / 2);
  const swMat = new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.8 });
  for (const cx of centers) for (const cz of centers) {
    const m = new THREE.Mesh(swGeo, swMat); m.position.set(cx, 0.06, cz); m.receiveShadow = true; scene.add(m);
  }

  // Yo'l chiziqlari va piyodalar o'tish joyi (instanced)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xcfd2dc, roughness: 0.6, emissive: 0x333640 });

  const dashes = [];
  for (let i = -3; i <= 3; i++) for (let z = -126; z <= 126; z += 4) {
    if (Math.abs(z - Math.round(z / 40) * 40) < 8) continue;
    dashes.push([i * 40, z, false], [z, i * 40, true]);
  }
  const dashMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.25, 2).rotateX(-Math.PI / 2), lineMat, dashes.length);
  dashes.forEach(([x, z, rot], k) => dashMesh.setMatrixAt(k, m4.compose(v.set(x, 0.065, z), rot ? qy : q.identity(), one)));
  scene.add(dashMesh);

  const stripes = [];
  for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cx = a * 40 + dx * 9, cz = b * 40 + dz * 9;
      if (Math.abs(cx) > 126 || Math.abs(cz) > 126) continue;
      for (let s = -5; s <= 5; s += 1.4) stripes.push(dx ? [cx, cz + s, true] : [cx + s, cz, false]);
    }
  }
  const cwMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 3).rotateX(-Math.PI / 2), lineMat, stripes.length);
  stripes.forEach(([x, z, rot], k) => cwMesh.setMatrixAt(k, m4.compose(v.set(x, 0.065, z), rot ? qy : q.identity(), one)));
  scene.add(cwMesh);

  // Binolar
  const facadeMats = FAC.map((f) => {
    const t = makeFacade(f);
    return new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emis, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.5, metalness: 0.15 });
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x15171e, roughness: 0.9 });
  const shopTex = shopTexture();
  const shopMats = [0xffd9a0, 0x8fe9ff, 0xff9ad5, 0xb7ffcf].map((c) =>
    new THREE.MeshStandardMaterial({ color: 0x15171f, emissive: c, emissiveMap: shopTex, emissiveIntensity: 0.9, roughness: 0.4 }));
  const acMat = new THREE.MeshStandardMaterial({ color: 0x2a2d36, roughness: 0.8 });
  const blinkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.05) });
  const bulbGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const sources = []; // dinamik PointLight uchun manbalar (chiroq, neon)

  for (const cx of centers) for (const cz of centers) {
    const w = 16 + Math.random() * 8, d = 16 + Math.random() * 8;
    const h = 10 + Math.pow(Math.random(), 1.6) * 55;

    const geo = new THREE.BoxGeometry(w, h, d); scaleBoxUV(geo, w, h, d, 16, 14);
    const fm = pick(facadeMats);
    const body = new THREE.Mesh(geo, [fm, fm, roofMat, roofMat, fm, fm]);
    body.position.set(cx, h / 2, cz); body.castShadow = true; body.receiveShadow = true; scene.add(body);
    BOXES.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });

    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), roofMat);
    slab.position.set(cx, h + 0.3, cz); slab.castShadow = true; scene.add(slab);

    for (let n = 0, cnt = 1 + Math.floor(Math.random() * 3); n < cnt; n++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(rand(1.5, 3), rand(0.8, 1.6), rand(1.5, 3)), acMat);
      ac.position.set(cx + rand(-w / 3, w / 3), h + 1.1, cz + rand(-d / 3, d / 3)); ac.castShadow = true; scene.add(ac);
    }
    if (h > 34 || Math.random() < 0.25) {
      const ah = rand(5, 12);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, ah, 6), acMat);
      const ax = cx + rand(-3, 3), az = cz + rand(-3, 3);
      ant.position.set(ax, h + 0.6 + ah / 2, az); scene.add(ant);
      const bulb = new THREE.Mesh(bulbGeo, blinkMat); bulb.position.set(ax, h + 0.7 + ah, az); scene.add(bulb);
    }

    // Birinchi qavat vitrinalari
    const bg = new THREE.BoxGeometry(w + 0.3, 3.2, d + 0.3); scaleBoxUV(bg, w + 0.3, 3.2, d + 0.3, 8, 3.2);
    const sm = pick(shopMats);
    const band = new THREE.Mesh(bg, [sm, sm, roofMat, roofMat, sm, sm]);
    band.position.set(cx, 1.6, cz); scene.add(band);

    // Neon belgi
    if (Math.random() < 0.6) {
      const [text, col] = pick(SIGNS);
      const [nx, nz] = pick(faces);
      const sw = 6, sh = sw * 96 / 256;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh),
        new THREE.MeshBasicMaterial({ map: signTexture(text, col), transparent: true, alphaTest: 0.05, color: new THREE.Color(1.8, 1.8, 1.8), side: THREE.DoubleSide }));
      const half = nx ? w / 2 : d / 2, y = rand(4.5, 9);
      sign.position.set(cx + nx * (half + 0.2), y, cz + nz * (half + 0.2));
      sign.rotation.y = Math.atan2(nx, nz);
      scene.add(sign);
      sources.push({ x: sign.position.x + nx * 2.5, y, z: sign.position.z + nz * 2.5, color: new THREE.Color(col), intensity: 45, dist: 22 });
    }
  }

  // Ko'cha chiroqlari (instanced) + dinamik yorug'lik manbalari
  const lampPos = [];
  for (let i = -3; i <= 3; i++) for (let j = 0; j < 6; j++) {
    const s = (i + j) % 2 === 0 ? 1 : -1, c = centers[j];
    lampPos.push({ x: i * 40 + 7 * s, z: c, hx: -s * 1.2, hz: 0 });
    lampPos.push({ x: c, z: i * 40 + 7 * s, hx: 0, hz: -s * 1.2 });
  }
  const metal = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.6, metalness: 0.5 });
  const lampBright = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 1.0) });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 6.2, 8).translate(0, 3.1, 0), metal, lampPos.length);
  const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.07, 0.07), metal, lampPos.length);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.14, 0.5), lampBright, lampPos.length);
  poles.castShadow = true;
  const warm = new THREE.Color(1.0, 0.72, 0.4);
  lampPos.forEach((l, k) => {
    poles.setMatrixAt(k, m4.compose(v.set(l.x, 0, l.z), q.identity(), one));
    arms.setMatrixAt(k, m4.compose(v.set(l.x + l.hx / 2, 6.15, l.z + l.hz / 2), l.hz ? qy : q.identity(), one));
    heads.setMatrixAt(k, m4.compose(v.set(l.x + l.hx, 6.1, l.z + l.hz), q.identity(), one));
    sources.push({ x: l.x + l.hx, y: 5.8, z: l.z + l.hz, color: warm, intensity: 70, dist: 30 });
  });
  scene.add(poles, arms, heads);

  // PointLight havuzi: o'yinchiga eng yaqin manbalarga ko'chib yuradi
  const POOL = 8, pool = [];
  for (let i = 0; i < POOL; i++) { const L = new THREE.PointLight(0xffffff, 0, 20, 2); scene.add(L); pool.push(L); }
  let poolT = 1;

  // Markazning sariq markeri (Ish + Kazino)
  const markers = [];
  const hub = new Marker(scene, 0xffc400, { label: '💼 ISH · 🎰 KAZINO', size: 1.25 });
  hub.setPosition(LOC.hub.x, LOC.hub.z);
  markers.push(hub);

  return {
    rainOn: true,
    setRain(on) { this.rainOn = on; rain.lines.visible = on; scene.fog.density = on ? 0.009 : 0.006; },
    update(t, dt, focus, camera) {
      sky.mat.uniforms.uTime.value = t;
      sky.mesh.position.copy(camera.position);
      rain.mat.uniforms.uTime.value = t;
      rain.mat.uniforms.uCenter.value.copy(camera.position);
      moon.position.copy(focus).addScaledVector(MOON_DIR, 120);
      moon.target.position.copy(focus);
      for (const m of markers) m.update(t, focus);
      const on = Math.sin(t * 3) > 0.6 ? 1 : 0.08;
      blinkMat.color.setRGB(3 * on, 0.1 * on, 0.05 * on);

      poolT += dt;
      if (poolT > 0.25) {
        poolT = 0;
        const arr = sources.map((s) => ({ s, d: (s.x - focus.x) ** 2 + (s.z - focus.z) ** 2 }));
        arr.sort((a, b) => a.d - b.d);
        for (let i = 0; i < POOL; i++) {
          const { s } = arr[i], L = pool[i];
          L.position.set(s.x, s.y, s.z); L.color.copy(s.color); L.intensity = s.intensity; L.distance = s.dist;
        }
      }
    },
  };
}
