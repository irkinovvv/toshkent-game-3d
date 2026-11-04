import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildWorld, resolve, lerpAngle, makeLabel, Marker, LOC } from './world.js';
import { Player, makeCharacter, animateCharacter } from './player.js';
import { Car } from './car.js';
import { connect } from './network.js';
import { Voice } from './voice.js';
import { HUD, gearInfo } from './hud.js';
import { openHub } from './hub.js';
import { sfx, Engine } from './audio.js';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const $ = (id) => document.getElementById(id);
const JOB_LABEL = { courier: '📦 YETKAZISH', taxi: '🚖 YO‘LOVCHI', builder: '🧱 MATERIAL' };

// ---------- Three.js ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
const PR = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(PR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.3, 500);

const composer = new EffectComposer(renderer,
  new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(PR);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.5, 0.92));
composer.addPass(new OutputPass());
let bloomOn = true, rainOn = true;

const resize = () => {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
};
addEventListener('resize', resize); resize();

const world = buildWorld(scene);
const player = new Player(scene);
const myCar = new Car(scene, 0xff2d55, { headlights: true });
const taskMarker = new Marker(scene, 0xffe14d, { light: true, label: '📍 MANZIL' });
taskMarker.setVisible(false);

// ---------- Holat ----------
const keys = {};
let socket = null, me = null, jobs = {};
let inCar = false, uiOpen = false;
let yaw = 0, pitch = 0.35, camDist = 6, lastMouse = 0, completing = false;
let holdMe = false, pendingMe = null;
let taskKey = '', taskStartDist = 1, taskSince = 0;
const remotes = new Map();
const hud = new HUD();
const voice = new Voice();
const engine = new Engine();
const chatInput = $('chatInput');
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const active = () => (inCar ? myCar.pos : player.pos);

// ---------- Interfeys (modal) ----------
const ui = {
  refresh: null,
  open(html) {
    $('modalBody').innerHTML = html; $('modal').classList.remove('hidden');
    uiOpen = true; for (const k in keys) keys[k] = false; document.exitPointerLock?.();
    return $('modalBody');
  },
  close() { $('modal').classList.add('hidden'); uiOpen = false; ui.refresh = null; },
  toast: (t, kind) => hud.toast(t, kind),
  // Kazino animatsiyasi tugaguncha pul yangilanishini ushlab turadi (natija oldindan ko'rinmasligi uchun)
  holdMe(v) { holdMe = v; if (!v && pendingMe) { const p = pendingMe; pendingMe = null; applyMe(p); } },
  confetti() {
    const fx = $('fx'), cols = ['#00e5ff', '#ff2bd6', '#ffc400', '#4dff88', '#ffffff'];
    for (let i = 0; i < 56; i++) {
      const s = document.createElement('i');
      s.style.setProperty('--x', (Math.random() * 90 - 45) + 'vw');
      s.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
      s.style.setProperty('--c', cols[i % cols.length]);
      s.style.animationDelay = Math.random() * 0.25 + 's';
      fx.appendChild(s); setTimeout(() => s.remove(), 2400);
    }
  },
};
$('close').onclick = () => { sfx.click(); ui.close(); };
const hubCtx = () => ({ ui, socket, getMe: () => me, getJobs: () => jobs, sfx });

// ---------- Kirish ----------
const play = () => {
  const name = $('nick').value.trim() || 'Player' + Math.floor(Math.random() * 999);
  sfx.init(); engine.start();
  socket = connect(SERVER);
  wire(socket);
  socket.emit('join', { name });
  $('login').classList.add('hidden');
  $('hud').classList.remove('hidden');
  voice.onPeerId = (id) => socket.emit('peer', id);
  voice.start();
};
$('play').onclick = play;
$('nick').addEventListener('keydown', (e) => { if (e.code === 'Enter') play(); });

// ---------- Tarmoq ----------
function wire(s) {
  s.on('connect_error', () => hud.toast("Serverga ulanib bo'lmadi", 'err'));
  s.on('welcome', ({ you, jobs: j }) => { jobs = j; applyMe(you); });
  s.on('me', applyMe);
  s.on('toast', (t) => { hud.toast(t, 'ok'); sfx.cash(); });
  s.on('chat', (m) => hud.chat(`${m.from}: ${m.text}`));
  s.on('state', (list) => {
    const seen = new Set();
    for (const p of list) {
      if (p.id === s.id) continue;
      seen.add(p.id);
      let r = remotes.get(p.id);
      if (!r) { r = makeRemote(p); remotes.set(p.id, r); }
      r.data = p;
    }
    for (const [id, r] of remotes) if (!seen.has(id)) { scene.remove(r.g); scene.remove(r.car.group); remotes.delete(id); }
  });
}

function applyMe(p) {
  if (holdMe) { pendingMe = p; return; }
  const prev = me ? me.money : null;
  if (me && p.level > me.level) { hud.toast('⬆️ LEVEL UP! LVL ' + p.level, 'ok'); sfx.win(); }
  me = p;
  hud.setMe(me, jobs, prev);
  myCar.setJob(me.job);

  const key = me.task ? `${me.task.x},${me.task.z}` : '';
  if (key !== taskKey) {
    taskKey = key; taskSince = performance.now();
    if (me.task) taskStartDist = dist(active(), me.task);
  }
  taskMarker.setVisible(!!me.task);
  if (me.task) { taskMarker.setPosition(me.task.x, me.task.z); taskMarker.setLabel(JOB_LABEL[me.job] || '📍 MANZIL'); }
  ui.refresh?.(me);
}

function makeRemote(p) {
  const g = makeCharacter(0xff9f1c);
  const label = makeLabel(p.name, '#ffffff', 0.9); label.position.y = 2.6; g.add(label);
  g.position.set(p.x, 0, p.z); scene.add(g);
  const car = new Car(scene, 0x3a86ff); car.setPose(p.cx, p.cz, p.ch);
  return { g, car, data: p, lx: p.x, lz: p.z };
}

// ---------- Boshqaruv ----------
addEventListener('keydown', (e) => {
  if (document.activeElement === chatInput) {
    if (e.code === 'Enter') { const t = chatInput.value.trim(); if (t) socket.emit('chat', t); chatInput.value = ''; chatInput.blur(); }
    else if (e.code === 'Escape') chatInput.blur();
    return;
  }
  if (document.activeElement && document.activeElement.id === 'nick') return;
  if (!me) return;
  if (e.code === 'Escape') { $('bigmap').classList.add('hidden'); ui.close(); return; }
  if (e.code === 'KeyT' || e.code === 'Enter') {
    e.preventDefault(); for (const k in keys) keys[k] = false;
    chatInput.focus(); document.exitPointerLock?.(); return;
  }
  if (e.code === 'KeyM') { $('bigmap').classList.toggle('hidden'); sfx.click(); return; }
  if (e.code === 'KeyN') { sfx.muted = !sfx.muted; hud.toast('Ovoz: ' + (sfx.muted ? 'OFF' : 'ON')); return; }
  if (uiOpen) return;
  keys[e.code] = true;
  if (e.code === 'KeyF') toggleCar();
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyV') { voice.setTalking(true); hud.mic(true); }
  if (e.code === 'KeyB') { bloomOn = !bloomOn; hud.toast('Bloom: ' + (bloomOn ? 'ON' : 'OFF')); }
  if (e.code === 'KeyR') { rainOn = !rainOn; world.setRain(rainOn); hud.toast('Yomg‘ir: ' + (rainOn ? 'ON' : 'OFF')); }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'KeyV') { voice.setTalking(false); hud.mic(false); }
});
$('game').addEventListener('click', () => { if (me && !uiOpen) $('game').requestPointerLock(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== $('game')) return;
  yaw -= e.movementX * 0.003;
  pitch = Math.max(0.05, Math.min(1.2, pitch + e.movementY * 0.003));
  lastMouse = performance.now();
});

// F — mashinaga o'tirish / tushish
function toggleCar() {
  if (inCar) {
    if (Math.abs(myCar.speed) > 6) { hud.toast('Avval to‘xtang!', 'err'); return; }
    inCar = false;
    const p = myCar.pos;
    player.mesh.position.set(p.x + Math.cos(myCar.heading) * 3, 0, p.z - Math.sin(myCar.heading) * 3);
    resolve(player.mesh.position, 0.5);
    player.mesh.visible = true;
    sfx.door();
  } else if (dist(player.pos, myCar.pos) < 5) {
    inCar = true; player.mesh.visible = false;
    lastMouse = 0;                           // kamera darhol mashina ortiga o'tadi
    sfx.door(); hud.toast('🚗 Mashinaga o‘tirdingiz — W/A/S/D bilan haydang');
  }
}

// E — sariq markazda Ish / Kazino oynasi
function interact() {
  if (inCar) return;
  if (dist(player.pos, LOC.hub) < 7) { sfx.click(); openHub(hubCtx(), 'jobs'); }
}

// ---------- O'yin sikli ----------
const clock = new THREE.Clock();
let sendT = 0, voiceT = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (me) {
    const k = uiOpen ? {} : keys;
    myCar.update(dt, inCar ? k : {}, inCar);
    if (inCar) player.mesh.position.copy(myCar.pos);
    else player.update(dt, k, yaw);

    const act = active();
    const others = [...remotes.values()].map((r) => r.data);

    // Masofaviy o'yinchilar (silliqlash + animatsiya)
    for (const r of remotes.values()) {
      const d = r.data, s = Math.min(1, dt * 10);
      r.g.visible = !d.inCar;
      r.g.position.x += (d.x - r.g.position.x) * s;
      r.g.position.z += (d.z - r.g.position.z) * s;
      r.g.rotation.y = lerpAngle(r.g.rotation.y, d.ry, s);
      r.car.group.position.x += (d.cx - r.car.group.position.x) * s;
      r.car.group.position.z += (d.cz - r.car.group.position.z) * s;
      r.car.group.rotation.y = lerpAngle(r.car.group.rotation.y, d.ch, s);
      const spd = dt > 0 ? Math.hypot(r.g.position.x - r.lx, r.g.position.z - r.lz) / dt : 0;
      r.lx = r.g.position.x; r.lz = r.g.position.z;
      animateCharacter(r.g, dt, d.inCar ? 0 : spd);
    }

    // Kamera: mashinada ortga o'tadi, masofa va FOV tezlikka qarab o'zgaradi
    camDist += ((inCar ? 9.5 : 6) - camDist) * Math.min(1, dt * 3.5);
    if (inCar && performance.now() - lastMouse > 1200) {
      yaw = lerpAngle(yaw, myCar.heading + Math.PI, Math.min(1, dt * (Math.abs(myCar.speed) > 1 ? 2.4 : 1.2)));
    }
    const fovT = 65 + (inCar ? (Math.min(Math.abs(myCar.speed), 38) / 38) * 16 : 0);
    camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
    camera.position.set(
      act.x + Math.sin(yaw) * Math.cos(pitch) * camDist,
      1.4 + Math.sin(pitch) * camDist,
      act.z + Math.cos(yaw) * Math.cos(pitch) * camDist);
    camera.lookAt(act.x, 1.4, act.z);
    world.update(t, dt, act, camera);
    taskMarker.update(t, act);

    // Buyurtmani yakunlash
    if (me.task && !completing && dist(act, me.task) < 5) {
      completing = true;
      socket.emit('job:complete', (r) => {
        if (r.ok) {
          hud.toast(`✅ Yetkazildi! +$${r.pay}${r.bonus ? ' + $' + r.bonus + ' tezlik bonusi' : ''} · +${r.xp} XP`, 'ok');
          sfx.cash();
        }
        setTimeout(() => (completing = false), 1200);
      });
    }

    // Ko'rsatmalar
    let hint = '';
    if (!uiOpen) {
      if (inCar) hint = dist(act, LOC.hub) < 9 ? 'Ish va Kazino uchun mashinadan tushing (F)' : 'F — mashinadan tushish';
      else if (dist(player.pos, LOC.hub) < 7) hint = 'E — Ish va Kazino';
      else if (dist(player.pos, myCar.pos) < 5) hint = 'F — mashinaga o‘tish';
    }
    hud.hint(hint);

    // Speedometer + dvigatel
    const kmh = Math.abs(myCar.speed) * 3.6;
    const gi = gearInfo(kmh, myCar.speed);
    hud.speed(kmh, gi.gear, gi.rpm, inCar);
    engine.update(gi.rpm, inCar && !uiOpen && keys.KeyW ? 1 : 0, inCar);

    // Vazifa paneli va xaritalar
    if (me.task) hud.task(me, dist(act, me.task), taskStartDist, Math.max(0, me.task.par - (performance.now() - taskSince) / 1000));
    else hud.task(me, 0, 1, 0);
    const facing = inCar ? myCar.heading : player.mesh.rotation.y;
    hud.minimap(act, yaw, facing, others, me.task, LOC.hub);
    if (!$('bigmap').classList.contains('hidden')) hud.bigMap(act, facing, others, me.task, LOC.hub);

    // Serverga holat yuborish (15 Hz)
    sendT += dt;
    if (sendT > 0.066) {
      sendT = 0;
      socket.emit('move', { x: act.x, z: act.z, ry: player.mesh.rotation.y, inCar,
        cx: myCar.pos.x, cz: myCar.pos.z, ch: myCar.heading });
    }

    // Ovoz (har 0.5 s)
    voiceT += dt;
    if (voiceT > 0.5) { voiceT = 0; voice.update(others, act); }
  }
  if (bloomOn) composer.render(); else renderer.render(scene, camera);
}
loop();
