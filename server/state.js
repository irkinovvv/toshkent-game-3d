export const players = new Map();

export const levelOf = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;

export function createPlayer(id, name) {
  return {
    id, name,
    x: 0, z: 3, ry: 0,
    inCar: false, cx: 6, cz: 0, ch: 0,
    peerId: null,
    money: 1000, xp: 0, deliveries: 0,
    job: null, task: null,
  };
}

// Hamma o'yinchilarga ko'rinadigan ma'lumot
export const publicPlayer = (p) => ({
  id: p.id, name: p.name, x: p.x, z: p.z, ry: p.ry,
  inCar: p.inCar, cx: p.cx, cz: p.cz, ch: p.ch, peerId: p.peerId,
});

// Faqat egasiga yuboriladigan ma'lumot
export const privatePlayer = (p) => ({
  id: p.id, name: p.name, money: p.money, xp: p.xp,
  level: levelOf(p.xp), job: p.job, deliveries: p.deliveries,
  task: p.task && { x: p.task.x, z: p.task.z, label: p.task.label, pay: p.task.pay, par: p.task.par },
});
