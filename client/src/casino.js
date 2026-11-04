const SYMS = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
const WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = (n) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');
const fmt = (n) => n.toLocaleString('en-US');
const rnd = () => SYMS[Math.floor(Math.random() * SYMS.length)];

export function renderCasino(el, ctx) {
  const { ui, socket, getMe, sfx, setBal } = ctx;
  let busy = false, game = 'slot', theta = 0, lastN = null;
  const sel = { type: 'red', number: null };
  const history = [];

  el.innerHTML = `
    <div class="subtabs"><button data-g="slot" class="on">🎰 Slot</button><button data-g="roul">🎡 Ruletka</button></div>

    <div class="betbar">
      ${[10, 50, 100, 500, 1000].map((v) => `<button class="chip" data-chip="${v}">${v}</button>`).join('')}
      <div class="betinput"><span>$</span><input id="bet" type="number" value="100" min="10" max="5000" step="10" /><button id="betMax">MAX</button></div>
    </div>

    <div id="g-slot">
      <div class="slot"><div class="reels"><div class="reel">🍒</div><div class="reel">🍋</div><div class="reel">🔔</div></div></div>
      <div class="paytable">🍒🍒🍒 ×3 · 🍋🍋🍋 ×4 · 🔔🔔🔔 ×6 · ⭐⭐⭐ ×10 · 7️⃣7️⃣7️⃣ ×20<br/>Ikkita bir xil — stavka qaytadi</div>
      <button id="spin" class="btn gold big">AYLANTIRISH</button>
    </div>

    <div id="g-roul" class="hidden">
      <div class="wheelwrap"><canvas id="wheel" width="250" height="250"></canvas></div>
      <div class="history" id="hist"></div>
      <div class="outside">
        <button class="obet red on" data-t="red">Qizil ×2</button><button class="obet black" data-t="black">Qora ×2</button>
        <button class="obet" data-t="even">Juft ×2</button><button class="obet" data-t="odd">Toq ×2</button>
      </div>
      <div class="numgrid">${Array.from({ length: 37 }, (_, n) => `<button class="num ${colorOf(n)}" data-n="${n}">${n}</button>`).join('')}</div>
      <button id="rspin" class="btn gold big">AYLANTIRISH</button>
    </div>

    <div id="result" class="result">Stavka qo'ying va omadingizni sinang 🍀</div>
  `;
  const $ = (s) => el.querySelector(s);
  const betInput = $('#bet');
  const getBet = () => parseInt(betInput.value, 10);
  const lock = (b) => el.querySelectorAll('button,input').forEach((x) => (x.disabled = b));
  const msg = (t, cls = 'lose') => { const r = $('#result'); r.className = 'result ' + cls; r.textContent = t; };

  el.querySelectorAll('[data-chip]').forEach((b) => (b.onclick = () => { if (busy) return; sfx.click(); betInput.value = b.dataset.chip; }));
  $('#betMax').onclick = () => { sfx.click(); betInput.value = Math.min(5000, Math.max(10, Math.floor(getMe().money / 10) * 10)); };
  el.querySelectorAll('.subtabs button').forEach((b) => (b.onclick = () => {
    if (busy) return; sfx.click(); game = b.dataset.g;
    el.querySelectorAll('.subtabs button').forEach((x) => x.classList.toggle('on', x === b));
    $('#g-slot').classList.toggle('hidden', game !== 'slot');
    $('#g-roul').classList.toggle('hidden', game !== 'roul');
    if (game === 'roul') draw(theta);
  }));

  function countUp(to) {
    const r = $('#result');
    r.innerHTML = `🎉 Yutdingiz <b>+$0</b>`;
    const b = r.querySelector('b'), t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 800);
      b.textContent = '+$' + fmt(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function showResult(win, stake) {
    const net = win - stake, r = $('#result');
    if (net > 0) { r.className = 'result win' + (win >= stake * 10 ? ' jackpot' : ''); countUp(net); ui.confetti(); sfx.win(); }
    else if (net === 0) { msg('↩️ Stavka qaytdi', 'push'); sfx.click(); }
    else { msg(`😢 Yutqazdingiz −$${fmt(stake)}`); sfx.lose(); }
  }
  const finish = (money) => { setBal(money); busy = false; ui.holdMe(false); lock(false); };

  /* ---------------- SLOT ---------------- */
  $('#spin').onclick = () => {
    if (busy) return;
    const stake = getBet();
    busy = true; ui.holdMe(true); lock(true); msg('');
    socket.emit('casino:slot', stake, (r) => {
      if (!r.ok) { busy = false; ui.holdMe(false); lock(false); return msg(r.error); }
      sfx.spin();
      const reels = [...el.querySelectorAll('.reel')];
      reels.forEach((x) => x.classList.remove('winp'));
      const timers = reels.map((x) => { x.classList.add('spinning'); return setInterval(() => (x.textContent = rnd()), 70); });
      [900, 1400, 1900].forEach((t, i) => setTimeout(() => {
        clearInterval(timers[i]);
        reels[i].classList.remove('spinning'); reels[i].textContent = r.reels[i];
        reels[i].classList.add('stop'); sfx.tick();
      }, t));
      setTimeout(() => {
        if (r.win > stake) reels.forEach((x) => x.classList.add('winp'));
        finish(r.money); showResult(r.win, stake);
      }, 2150);
    });
  };

  /* ---------------- RULETKA ---------------- */
  const cv = $('#wheel'), g = cv.getContext('2d'), W = cv.width, R = W / 2 - 6;
  function draw(th) {
    g.clearRect(0, 0, W, W);
    g.save(); g.translate(W / 2, W / 2);
    const step = (Math.PI * 2) / 37;
    for (let i = 0; i < 37; i++) {
      const n = WHEEL[i], c = colorOf(n);
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, th + i * step, th + (i + 1) * step); g.closePath();
      g.fillStyle = c === 'red' ? '#c81e3a' : c === 'green' ? '#1f9d55' : '#14161f'; g.fill();
      g.strokeStyle = 'rgba(255,215,120,.45)'; g.lineWidth = 1; g.stroke();
      g.save(); g.rotate(th + (i + 0.5) * step); g.translate(R * 0.82, 0); g.rotate(Math.PI / 2);
      g.fillStyle = '#fff'; g.font = 'bold 11px Arial'; g.textAlign = 'center'; g.fillText(n, 0, 4); g.restore();
    }
    g.beginPath(); g.arc(0, 0, R * 0.62, 0, 7); g.fillStyle = '#0d1020'; g.fill(); g.strokeStyle = '#ffc400'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.strokeStyle = '#ffc400'; g.lineWidth = 4; g.stroke();
    g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2 - 9, 2); g.lineTo(W / 2 + 9, 2); g.lineTo(W / 2, 24); g.closePath(); g.fill();
    g.textAlign = 'center'; g.font = 'bold 40px Arial';
    g.fillStyle = lastN === null ? '#8e97b5' : colorOf(lastN) === 'red' ? '#ff5a7a' : colorOf(lastN) === 'green' ? '#4dff88' : '#fff';
    g.fillText(lastN === null ? '?' : lastN, W / 2, W / 2 + 14);
  }
  draw(0);

  function spinTo(n, done) {
    const idx = WHEEL.indexOf(n), step = (Math.PI * 2) / 37;
    const from = theta;
    let to = -Math.PI / 2 - (idx + 0.5) * step;
    while (to > from - 6 * Math.PI) to -= Math.PI * 2;
    const dur = 4200, t0 = performance.now(); lastN = null;
    let lastTick = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
      theta = from + (to - from) * e; draw(theta);
      const slot = Math.floor(-theta / step);
      if (slot !== lastTick && t < 0.9) { lastTick = slot; if (slot % 2 === 0) sfx.tick(); }
      if (t < 1) requestAnimationFrame(tick);
      else { lastN = n; draw(theta); done(); }
    };
    requestAnimationFrame(tick);
  }

  const setSel = (type, number = null) => {
    sel.type = type; sel.number = number;
    el.querySelectorAll('.obet').forEach((x) => x.classList.toggle('on', type !== 'number' && x.dataset.t === type));
    el.querySelectorAll('.num').forEach((x) => x.classList.toggle('on', type === 'number' && +x.dataset.n === number));
  };
  el.querySelectorAll('.obet').forEach((b) => (b.onclick = () => { sfx.click(); setSel(b.dataset.t); }));
  el.querySelectorAll('.num').forEach((b) => (b.onclick = () => { sfx.click(); setSel('number', +b.dataset.n); }));

  function renderHistory() {
    $('#hist').innerHTML = history.slice(0, 10).map((n) => `<span class="hchip ${colorOf(n)}">${n}</span>`).join('');
  }

  $('#rspin').onclick = () => {
    if (busy) return;
    const stake = getBet();
    if (sel.type === 'number' && sel.number === null) return msg('Avval raqamni tanlang');
    busy = true; ui.holdMe(true); lock(true); msg(''); sfx.spin();
    socket.emit('casino:roulette', { bet: stake, type: sel.type, number: sel.number }, (r) => {
      if (!r.ok) { busy = false; ui.holdMe(false); lock(false); return msg(r.error); }
      spinTo(r.n, () => { history.unshift(r.n); renderHistory(); finish(r.money); showResult(r.win, stake); });
    });
  };
}
