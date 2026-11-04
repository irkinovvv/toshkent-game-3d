const $ = (id) => document.getElementById(id);
const lvlStart = (l) => (l - 1) ** 2 * 100;
const ARC = 377;
const fmt = (n) => n.toLocaleString('en-US');

// Tezlikdan vites va RPM hisoblash (arcade)
export function gearInfo(kmh, v) {
  if (Math.abs(v) < 0.3) return { gear: 'N', rpm: 0.18 };
  if (v < 0) return { gear: 'R', rpm: Math.min(1, 0.25 + kmh / 40) };
  const g = Math.min(6, 1 + Math.floor(kmh / 24));
  const inG = Math.min(1, (kmh - (g - 1) * 24) / 24);
  return { gear: String(g), rpm: 0.3 + inG * 0.7 };
}

// Umumiy xarita chizuvchi: yaw — kamera burilishi (minimap), 0 — shimol tepada (katta xarita)
function drawMap(c, S, k, cx, cz, yaw, e, circular, big) {
  c.clearRect(0, 0, S, S);
  c.save();
  if (circular) { c.beginPath(); c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); c.clip(); }
  c.fillStyle = 'rgba(8,10,18,.86)'; c.fillRect(0, 0, S, S);
  const h = S / 2, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const T = (x, z) => { const dx = x - cx, dz = z - cz; return [h + (dx * cs - dz * sn) * k, h + (dx * sn + dz * cs) * k]; };

  // kvartallar va yo'llar
  c.fillStyle = 'rgba(255,255,255,.035)';
  for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) {
    const [x1, y1] = T(i * 40 + 6, j * 40 + 6), [x2, y2] = T(i * 40 + 34, j * 40 + 34);
    c.save(); c.translate((x1 + x2) / 2, (y1 + y2) / 2); c.rotate(yaw); c.fillRect(-14 * k, -14 * k, 28 * k, 28 * k); c.restore();
  }
  c.strokeStyle = '#2c3142'; c.lineWidth = 12 * k;
  for (let i = -3; i <= 3; i++) {
    c.beginPath(); c.moveTo(...T(i * 40, -130)); c.lineTo(...T(i * 40, 130)); c.stroke();
    c.beginPath(); c.moveTo(...T(-130, i * 40)); c.lineTo(...T(130, i * 40)); c.stroke();
  }

  const R = h - 10;
  const pt = (x, z, clamp) => {
    let [a, b] = T(x, z);
    if (clamp && circular) { const dx = a - h, dy = b - h, d = Math.hypot(dx, dy); if (d > R) { a = h + dx / d * R; b = h + dy / d * R; } }
    return [a, b];
  };
  const dot = (x, z, col, r, clamp) => { const [a, b] = pt(x, z, clamp); c.fillStyle = col; c.beginPath(); c.arc(a, b, r, 0, 7); c.fill(); };

  // marshrut chizig'i
  if (e.task) {
    c.save(); c.setLineDash([6, 5]); c.strokeStyle = 'rgba(255,225,77,.75)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(...T(e.me.x, e.me.z)); c.lineTo(...pt(e.task.x, e.task.z, true)); c.stroke(); c.restore();
  }
  // Ish/Kazino markazi
  { const [a, b] = pt(e.hub.x, e.hub.z, true);
    c.fillStyle = '#ffc400'; c.beginPath(); c.arc(a, b, big ? 9 : 6, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,196,0,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(a, b, big ? 15 : 10, 0, 7); c.stroke();
    if (big) { c.fillStyle = '#fff'; c.font = '13px sans-serif'; c.textAlign = 'center'; c.fillText('Ish · Kazino', a, b - 20); } }
  if (e.task) { dot(e.task.x, e.task.z, '#ffe14d', big ? 8 : 6, true);
    if (big) { const [a, b] = pt(e.task.x, e.task.z); c.fillStyle = '#ffe14d'; c.font = '13px sans-serif'; c.textAlign = 'center'; c.fillText('Buyurtma', a, b - 14); } }
  for (const o of e.others) dot(o.x, o.z, '#4dff88', big ? 5 : 3.5, false);

  // o'zimiz (yo'nalish strelkasi)
  { const [a, b] = T(e.me.x, e.me.z);
    const fx = Math.sin(e.facing), fz = Math.cos(e.facing);
    const sx = fx * cs - fz * sn, sy = fx * sn + fz * cs, phi = Math.atan2(sx, -sy);
    c.save(); c.translate(a, b); c.rotate(phi);
    c.fillStyle = '#fff'; c.shadowColor = '#00e5ff'; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(0, big ? -11 : -9); c.lineTo(big ? -7 : -6, big ? 8 : 7); c.lineTo(big ? 7 : 6, big ? 8 : 7); c.closePath(); c.fill(); c.restore(); }
  c.restore();
}

export class HUD {
  constructor() {
    this.mm = $('minimap').getContext('2d');
    this.bm = $('bigmapCanvas').getContext('2d');
    this.name = '';
  }

  setMe(me, jobs, prevMoney) {
    $('pname').textContent = me.name;
    $('money').firstChild ? ($('money').firstChild.nodeValue = '$' + fmt(me.money)) : ($('money').textContent = '$' + fmt(me.money));
    $('lvl').textContent = 'LVL ' + me.level;
    const a = lvlStart(me.level), b = lvlStart(me.level + 1);
    $('xpbar').style.width = Math.round(((me.xp - a) / (b - a)) * 100) + '%';
    $('job').textContent = 'Ish: ' + (me.job && jobs[me.job] ? jobs[me.job].icon + ' ' + jobs[me.job].title : "yo'q");
    if (prevMoney != null && prevMoney !== me.money) this.moneyPop(me.money - prevMoney);
  }

  moneyPop(delta) {
    const d = document.createElement('span');
    d.className = 'pop ' + (delta > 0 ? 'plus' : 'minus');
    d.textContent = (delta > 0 ? '+$' : '−$') + fmt(Math.abs(delta));
    $('money').appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }

  speed(kmh, gear, rpm, inCar) {
    $('kmh').textContent = Math.round(kmh);
    $('gaugeVal').style.strokeDasharray = `${Math.min(1, kmh / 150) * ARC} 700`;
    $('gear').textContent = gear;
    $('rpm').style.width = Math.round(rpm * 100) + '%';
    $('speedo').classList.toggle('dim', !inCar);
  }

  task(me, dist, startDist, bonusLeft) {
    const t = $('task');
    t.classList.toggle('hidden', !me.task);
    if (!me.task) return;
    $('taskText').textContent = me.task.label;
    $('taskPay').textContent = '$' + me.task.pay;
    $('taskDist').textContent = Math.round(dist);
    $('taskPar').textContent = Math.round(bonusLeft);
    $('taskBar').style.width = Math.round(Math.max(0, Math.min(1, 1 - dist / Math.max(startDist, 1))) * 100) + '%';
  }

  hint(t) { if ($('hint').textContent !== t) $('hint').textContent = t; }
  mic(on) { $('mic').classList.toggle('on', on); $('mic').textContent = on ? '🎤 GAPIRYAPSIZ' : '🎤 V — gapirish'; }

  toast(text, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + kind; d.textContent = text;
    $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 3100);
  }

  chat(text) {
    const log = $('log');
    const d = document.createElement('div'); d.textContent = text;
    log.appendChild(d);
    while (log.children.length > 8) log.firstChild.remove();
  }

  minimap(me, yaw, facing, others, task, hub) {
    drawMap(this.mm, 170, 0.6, me.x, me.z, yaw, { me, facing, others, task, hub }, true, false);
  }
  bigMap(me, facing, others, task, hub) {
    drawMap(this.bm, 520, 520 / 290, 0, 0, 0, { me, facing, others, task, hub }, false, true);
  }
}
