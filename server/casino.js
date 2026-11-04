import crypto from 'crypto';

export const MIN_BET = 10;
export const MAX_BET = 5000;
const rnd = (n) => crypto.randomInt(n); // kriptografik random

export const validBet = (bet, money) =>
  Number.isInteger(bet) && bet >= MIN_BET && bet <= MAX_BET && bet <= money;

// ---------- SLOT ----------
const SYMS = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
const MULT = { '🍒': 3, '🍋': 4, '🔔': 6, '⭐': 10, '7️⃣': 20 };

export function playSlot(bet) {
  const reels = [rnd(5), rnd(5), rnd(5)].map((i) => SYMS[i]);
  let win = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) win = bet * MULT[reels[0]]; // 3 ta bir xil
  else if (new Set(reels).size === 2) win = bet;                                  // 2 ta bir xil = stavka qaytadi
  return { reels, win };
}

// ---------- RULETKA ----------
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const ROULETTE_TYPES = ['red', 'black', 'even', 'odd', 'number'];

export function playRoulette(bet, type, number) {
  const n = rnd(37);
  const color = n === 0 ? 'green' : RED.has(n) ? 'red' : 'black';
  let win = 0;
  if ((type === 'red' && color === 'red') || (type === 'black' && color === 'black')) win = bet * 2;
  else if ((type === 'even' && n > 0 && n % 2 === 0) || (type === 'odd' && n % 2 === 1)) win = bet * 2;
  else if (type === 'number' && n === number) win = bet * 36;
  return { n, color, win };
}
