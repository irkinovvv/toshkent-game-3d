import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { players, createPlayer, publicPlayer, privatePlayer } from './state.js';
import { JOBS, newTask, validateTask } from './jobs.js';
import { MIN_BET, MAX_BET, validBet, playSlot, playRoulette, ROULETTE_TYPES } from './casino.js';

const ORIGIN = process.env.CLIENT_ORIGIN || '*';
const app = express();
app.use(cors({ origin: ORIGIN }));
app.get('/', (_, res) => res.send('Black City RP server OK'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGIN } });

const NEAR_CHAT = 50;
const CASINO = { x: 0, z: -40 };
const num = (v, d = 0) => (Number.isFinite(v) ? Math.max(-500, Math.min(500, v)) : d);
const ang = (v) => (Number.isFinite(v) ? v : 0);
const push = (p) => io.to(p.id).emit('me', privatePlayer(p));
const nearCasino = (p) => Math.hypot(p.x - CASINO.x, p.z - CASINO.z) < 14;

io.on('connection', (socket) => {
  const me = () => players.get(socket.id);

  socket.on('join', ({ name } = {}) => {
    const clean = String(name || 'Player').replace(/[<>]/g, '').slice(0, 14) || 'Player';
    const p = createPlayer(socket.id, clean);
    players.set(socket.id, p);
    socket.emit('welcome', { you: privatePlayer(p), jobs: JOBS });
    io.emit('chat', { from: 'SERVER', text: `${clean} shaharga qo'shildi` });
  });

  socket.on('move', (m) => {
    const p = me(); if (!p || !m) return;
    p.x = num(m.x, p.x); p.z = num(m.z, p.z); p.ry = ang(m.ry);
    p.inCar = !!m.inCar;
    p.cx = num(m.cx, p.cx); p.cz = num(m.cz, p.cz); p.ch = ang(m.ch);
  });

  socket.on('peer', (id) => { const p = me(); if (p) p.peerId = String(id).slice(0, 64); });

  // Yaqin atrofdagi o'yinchilarga matnli chat
  socket.on('chat', (text) => {
    const p = me(); if (!p) return;
    text = String(text || '').replace(/[<>]/g, '').trim().slice(0, 120);
    if (!text) return;
    for (const q of players.values()) {
      if (Math.hypot(p.x - q.x, p.z - q.z) <= NEAR_CHAT) io.to(q.id).emit('chat', { from: p.name, text });
    }
  });

  // ---------- ISHLAR ----------
  socket.on('job:take', (jobId, cb = () => {}) => {
    const p = me(); const job = JOBS[jobId];
    if (!p || !job) return cb({ ok: false, error: 'Ish topilmadi' });
    const level = privatePlayer(p).level;
    if (level < job.minLevel) return cb({ ok: false, error: `Kamida LVL ${job.minLevel} kerak` });
    p.job = jobId; p.task = newTask(jobId, null, p);
    push(p); cb({ ok: true });
  });

  socket.on('job:quit', (cb = () => {}) => {
    const p = me(); if (!p) return;
    p.job = null; p.task = null; push(p); cb({ ok: true });
  });

  socket.on('job:complete', (cb = () => {}) => {
    const p = me(); if (!p || !p.job) return cb({ ok: false });
    const err = validateTask(p);
    if (err) return cb({ ok: false, error: err });
    const j = JOBS[p.job];
    const elapsed = (Date.now() - p.task.startedAt) / 1000;
    const bonus = elapsed <= p.task.par ? Math.round(j.pay * 0.25) : 0;   // tezlik bonusi
    p.money += j.pay + bonus; p.xp += j.xp; p.deliveries += 1;
    p.task = newTask(p.job, p.task, p);
    push(p); cb({ ok: true, pay: j.pay, bonus, xp: j.xp });
  });

  // ---------- KAZINO ----------
  const betError = `Stavka $${MIN_BET}–$${MAX_BET} oralig'ida va balansdan oshmasligi kerak`;

  socket.on('casino:slot', (bet, cb = () => {}) => {
    const p = me(); if (!p) return;
    if (!nearCasino(p)) return cb({ ok: false, error: 'Kazinoga yaqinlashing' });
    if (!validBet(bet, p.money)) return cb({ ok: false, error: betError });
    const r = playSlot(bet);
    p.money += r.win - bet; push(p);
    cb({ ok: true, ...r, money: p.money });
  });

  socket.on('casino:roulette', ({ bet, type, number } = {}, cb = () => {}) => {
    const p = me(); if (!p) return;
    if (!nearCasino(p)) return cb({ ok: false, error: 'Kazinoga yaqinlashing' });
    if (!validBet(bet, p.money)) return cb({ ok: false, error: betError });
    if (!ROULETTE_TYPES.includes(type)) return cb({ ok: false, error: "Noto'g'ri tikish turi" });
    if (type === 'number' && !(Number.isInteger(number) && number >= 0 && number <= 36))
      return cb({ ok: false, error: 'Raqam 0–36 bo‘lishi kerak' });
    const r = playRoulette(bet, type, number);
    p.money += r.win - bet; push(p);
    cb({ ok: true, ...r, money: p.money });
  });

  socket.on('disconnect', () => players.delete(socket.id));
});

// Holatni 15 Hz da yuborish
setInterval(() => io.emit('state', [...players.values()].map(publicPlayer)), 66);

// Soatlik maosh (demo uchun har 60 soniyada)
setInterval(() => {
  for (const p of players.values()) {
    if (!p.job) continue;
    const pay = JOBS[p.job].hourly;
    p.money += pay; push(p);
    io.to(p.id).emit('toast', `💵 Maosh: +$${pay}`);
  }
}, 60_000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server http://localhost:' + PORT));
