import * as THREE from 'three';
import { resolve, lerpAngle } from './world.js';

/**
 * Low-poly humanoid personaj (bosh, bo'yin, gavda, qo'llar, oyoqlar, ryukzak).
 * Old tomoni = +Z, personajning chap tomoni = +X.
 * Agar GLTF model ishlatmoqchi bo'lsangiz: shu funksiyani GLTFLoader + AnimationMixer
 * bilan almashtirish kifoya (animateCharacter ham mixer.update(dt) ga almashadi).
 */
export function makeCharacter(color = 0x00e5ff, skin = 0xffcfa6) {
  const g = new THREE.Group();
  const mat = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: true });
  const clothes = mat(color), pants = mat(0x1b2133), skinM = mat(skin), hairM = mat(0x15110f);
  const dark = mat(0x0b0b0e), accent = mat(0x20242f);
  const box = (w, h, d, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = true; return o;
  };

  const root = new THREE.Group(); g.add(root);
  const upper = new THREE.Group(); upper.position.y = 0.95; root.add(upper);   // beldan yuqori qism

  upper.add(box(0.56, 0.64, 0.3, clothes, 0, 0.32, 0));        // gavda
  upper.add(box(0.58, 0.08, 0.32, dark, 0, 0.02, 0));          // kamar
  upper.add(box(0.4, 0.46, 0.18, accent, 0, 0.38, -0.24));     // ryukzak
  upper.add(box(0.12, 0.08, 0.12, skinM, 0, 0.68, 0));         // bo'yin

  const head = new THREE.Group(); head.position.set(0, 0.68, 0); upper.add(head);
  head.add(box(0.34, 0.36, 0.34, skinM, 0, 0.18, 0));
  head.add(box(0.37, 0.12, 0.37, hairM, 0, 0.35, 0));
  head.add(box(0.37, 0.3, 0.08, hairM, 0, 0.2, -0.15));
  head.add(box(0.05, 0.05, 0.02, dark, 0.08, 0.2, 0.171));
  head.add(box(0.05, 0.05, 0.02, dark, -0.08, 0.2, 0.171));

  const makeArm = (sx) => {
    const arm = new THREE.Group(); arm.position.set(0.37 * sx, 0.58, 0); upper.add(arm);
    arm.add(box(0.16, 0.32, 0.16, clothes, 0, -0.16, 0));
    const fore = new THREE.Group(); fore.position.y = -0.32; arm.add(fore);
    fore.add(box(0.14, 0.3, 0.14, skinM, 0, -0.15, 0));
    fore.add(box(0.12, 0.1, 0.12, skinM, 0, -0.33, 0));
    return { arm, fore };
  };
  const makeLeg = (sx) => {
    const leg = new THREE.Group(); leg.position.set(0.15 * sx, 0.95, 0); root.add(leg);
    leg.add(box(0.2, 0.46, 0.22, pants, 0, -0.23, 0));
    const shin = new THREE.Group(); shin.position.y = -0.46; leg.add(shin);
    shin.add(box(0.18, 0.44, 0.2, pants, 0, -0.22, 0));
    shin.add(box(0.2, 0.1, 0.32, dark, 0, -0.42, 0.05));       // poyabzal
    return { leg, shin };
  };
  const L = makeArm(1), R = makeArm(-1), lL = makeLeg(1), lR = makeLeg(-1);

  g.userData.rig = {
    root, upper, head,
    armL: L.arm, foreL: L.fore, armR: R.arm, foreR: R.fore,
    legL: lL.leg, shinL: lL.shin, legR: lR.leg, shinR: lR.shin,
  };
  return g;
}

/** Procedural idle/walk/run animatsiyasi. speed — hozirgi tezlik (birlik/soniya). */
export function animateCharacter(g, dt, speed) {
  const u = g.userData, r = u.rig; if (!r) return;
  u.t = (u.t || 0) + dt;
  const target = Math.min(speed / 5, 1.8);                         // 0 = kutish, 1 = yurish, ~1.8 = yugurish
  u.amt = (u.amt || 0) + (target - (u.amt || 0)) * Math.min(1, dt * 10);
  const a = u.amt, m = Math.min(a, 1.5), moving = a > 0.04 ? 1 : 0, idle = 1 - Math.min(a, 1);
  u.phase = (u.phase || 0) + dt * (3.2 + 4.0 * a) * moving;
  const s = Math.sin(u.phase), c = Math.cos(u.phase);

  r.legL.rotation.x = -s * 0.65 * m;
  r.legR.rotation.x = s * 0.65 * m;
  r.shinL.rotation.x = Math.max(0, c) * 0.95 * m + 0.04;
  r.shinR.rotation.x = Math.max(0, -c) * 0.95 * m + 0.04;
  r.armL.rotation.x = s * 0.7 * m;
  r.armR.rotation.x = -s * 0.7 * m;
  const elbow = -(0.12 + 0.55 * m);
  r.foreL.rotation.x = elbow; r.foreR.rotation.x = elbow;
  r.armL.rotation.z = 0.07 + Math.sin(u.t * 1.4) * 0.015 * idle;
  r.armR.rotation.z = -0.07 - Math.sin(u.t * 1.4 + 1) * 0.015 * idle;

  r.root.position.y = Math.abs(c) * 0.06 * m;                      // qadam tebranishi
  r.upper.rotation.x = 0.12 * Math.min(a, 1.8);                    // yugurganda oldinga engashish
  r.upper.rotation.y = s * 0.14 * m;                               // yelka burilishi
  r.upper.scale.y = 1 + Math.sin(u.t * 2.2) * 0.012 * idle;        // nafas olish
  r.head.rotation.y = Math.sin(u.t * 0.7) * 0.18 * idle - r.upper.rotation.y * 0.8;
}

export class Player {
  constructor(scene) {
    this.mesh = makeCharacter();
    this.mesh.position.set(0, 0, 3);
    this.speedNow = 0;
    scene.add(this.mesh);
  }
  get pos() { return this.mesh.position; }

  update(dt, keys, yaw) {
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let sp = 0;
    if (f || r) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);   // kamera oldinga
      const rx = Math.cos(yaw),  rz = -Math.sin(yaw);   // kamera o'ngga
      let dx = fx * f + rx * r, dz = fz * f + rz * r;
      const len = Math.hypot(dx, dz); dx /= len; dz /= len;
      sp = keys.ShiftLeft ? 9 : 5;
      this.mesh.position.x += dx * sp * dt;
      this.mesh.position.z += dz * sp * dt;
      resolve(this.mesh.position, 0.5);
      this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 12));
    }
    this.speedNow = sp;
    animateCharacter(this.mesh, dt, sp);
  }
}
