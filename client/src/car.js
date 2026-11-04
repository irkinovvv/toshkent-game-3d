import * as THREE from 'three';
import { resolve } from './world.js';

function plateTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 40;
  const g = c.getContext('2d');
  g.fillStyle = '#f3f3f3'; g.fillRect(0, 0, 128, 40);
  g.strokeStyle = '#223'; g.lineWidth = 3; g.strokeRect(2, 2, 124, 36);
  g.fillStyle = '#1a2a6c'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BC 777 RP', 64, 21);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Low-poly sport sedan. Old tomoni = +Z.
 * Haydash: update(dt, keys, driven). Ish bo'yicha vizual: setJob('taxi' | 'courier' | 'builder').
 */
export class Car {
  constructor(scene, color = 0xff2d55, { headlights = false } = {}) {
    this.group = new THREE.Group();
    this.body = new THREE.Group();            // kuzov (og'ish/ko'tarilish animatsiyasi uchun)
    this.group.add(this.body);

    const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.28 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, metalness: 0.9, roughness: 0.08, emissive: 0x0a1020 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.7 });
    const addB = (m, cast = true) => { m.castShadow = cast; this.body.add(m); return m; };
    const box = (w, h, d, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return addB(m, cast); };

    box(2, 0.5, 4.4, paint, 0, 0.62, 0);                       // asosiy kuzov
    box(2.05, 0.12, 3.4, dark, 0, 0.36, 0);                    // pastki yubka
    const cabGeo = new THREE.CylinderGeometry(0.78, 1, 0.55, 4, 1); cabGeo.rotateY(Math.PI / 4);
    const cab = addB(new THREE.Mesh(cabGeo, glass)); cab.scale.set(1.25, 1, 1.45); cab.position.set(0, 1.17, -0.2);
    box(1.36, 0.05, 1.58, paint, 0, 1.47, -0.2);              // tom
    box(1.2, 0.18, 0.06, dark, 0, 0.58, 2.22);                 // radiator
    box(2.02, 0.25, 0.2, dark, 0, 0.38, 2.25); box(2.02, 0.25, 0.2, dark, 0, 0.38, -2.25);   // bamperlar
    for (const sx of [-1, 1]) {
      box(0.18, 0.12, 0.22, paint, sx * 1.05, 1.08, 0.6);       // oyna
      box(0.08, 0.25, 0.15, dark, sx * 0.6, 1.0, -2.0);         // spoyler tayanchi
    }
    box(1.9, 0.07, 0.45, paint, 0, 1.15, -2.1);                // spoyler

    const head = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.4) });
    this.tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.15, 0.15) });
    for (const x of [-0.68, 0.68]) {
      box(0.42, 0.14, 0.08, head, x, 0.7, 2.21, false);
      box(0.5, 0.12, 0.08, this.tailMat, x, 0.72, -2.21, false);
    }
    const plate = new THREE.MeshBasicMaterial({ map: plateTexture() });
    const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.19), plate); pf.position.set(0, 0.42, 2.36); this.body.add(pf);
    const pr = pf.clone(); pr.position.set(0, 0.42, -2.36); pr.rotation.y = Math.PI; this.body.add(pr);

    // ish vizuallari
    this.taxiSign = box(0.7, 0.17, 0.32, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 0.2) }), 0, 1.58, -0.2, false);
    this.cargo = box(1.1, 0.5, 0.6, new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 }), 0, 1.15, -1.58);
    this.taxiSign.visible = false; this.cargo.visible = false;

    // g'ildiraklar: steerPivot (burilish) > spin (aylanish)
    this.wheels = []; this.front = []; this.steerVis = 0;
    const tire = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 });
    const rim = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 0.9, roughness: 0.3 });
    for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.4, z);
      const spin = new THREE.Group();
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 18), tire); w.rotation.z = Math.PI / 2; w.castShadow = true;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 8), rim); r.rotation.z = Math.PI / 2;
      spin.add(w, r); pivot.add(spin); this.group.add(pivot);
      this.wheels.push(spin); if (z > 0) this.front.push(pivot);
    }

    // neon underglow
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4.8).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = 0.08; this.group.add(glow);

    if (headlights) {
      const s = new THREE.SpotLight(0xfff0cf, 350, 50, 0.5, 0.6, 2);
      s.position.set(0, 0.9, 2);
      const tg = new THREE.Object3D(); tg.position.set(0, 0.2, 14);
      this.group.add(s, tg); s.target = tg;
    }

    scene.add(this.group);
    this.speed = 0;
    this.heading = 0;
    this.setPose(6, 0, 0);
  }
  get pos() { return this.group.position; }

  setPose(x, z, h) {
    this.group.position.set(x, 0, z);
    this.heading = h;
    this.group.rotation.y = h;
  }

  setJob(job) {
    this.taxiSign.visible = job === 'taxi';
    this.cargo.visible = job === 'courier' || job === 'builder';
  }

  update(dt, keys, driven) {
    const prev = this.speed;
    let steer = 0, th = 0;
    if (driven) {
      th = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
      if (th !== 0) {
        const braking = this.speed !== 0 && Math.sign(th) !== Math.sign(this.speed);
        this.speed += th * (braking ? 35 : 18) * dt;
      } else this.speed -= this.speed * 1.2 * dt;           // dvigatel tormozi
      if (keys.Space) this.speed -= this.speed * 3 * dt;     // qo'l tormozi
      this.speed = Math.max(-10, Math.min(38, this.speed));
      steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
      this.heading += steer * 1.9 * dt * Math.max(-1, Math.min(1, this.speed / 8));
    } else {
      this.speed -= this.speed * 3 * dt;                     // haydovchi yo'q — to'xtaydi
    }
    this.group.position.x += Math.sin(this.heading) * this.speed * dt;
    this.group.position.z += Math.cos(this.heading) * this.speed * dt;
    if (resolve(this.group.position, 1.6)) this.speed *= -0.25;  // urilish
    this.group.rotation.y = this.heading;

    // vizual effektlar
    const k = Math.min(1, dt * 6);
    const accel = (this.speed - prev) / Math.max(dt, 1e-3);
    this.steerVis += (steer * 0.45 - this.steerVis) * Math.min(1, dt * 10);
    for (const p of this.front) p.rotation.y = this.steerVis;
    for (const w of this.wheels) w.rotation.x += (this.speed * dt) / 0.4;
    const roll = steer * (Math.min(Math.abs(this.speed), 38) / 38) * 0.06;
    const pitch = Math.max(-0.05, Math.min(0.05, -accel * 0.0025));
    this.body.rotation.z += (roll - this.body.rotation.z) * k;
    this.body.rotation.x += (pitch - this.body.rotation.x) * k;
    const br = driven && ((th < 0 && this.speed > 0.5) || (th > 0 && this.speed < -0.5) || keys.Space);
    this.tailMat.color.setRGB(br ? 5 : 2.5, br ? 0.25 : 0.15, br ? 0.25 : 0.15);   // tormoz chiroqlari
  }
}
