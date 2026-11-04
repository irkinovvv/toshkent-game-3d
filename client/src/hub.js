import { renderJobs } from './jobs.js';
import { renderCasino } from './casino.js';

// Sariq marker: bitta modal ichida "Ishlar" va "Kazino" bo'limlari
export function openHub(ctx, start = 'jobs') {
  const { ui, getMe, sfx } = ctx;
  const fmt = (n) => n.toLocaleString('en-US');
  const body = ui.open(`
    <div class="hub-head">
      <div><h2>Shahar markazi</h2><p>Ish toping yoki omadingizni sinang</p></div>
      <div class="bal"><span>Balans</span><b id="hubBal">$${fmt(getMe().money)}</b></div>
    </div>
    <div class="tabs">
      <button class="tab" data-t="jobs">💼 Ishlar</button>
      <button class="tab" data-t="casino">🎰 Kazino</button>
    </div>
    <div id="tabBody"></div>
  `);
  const tb = body.querySelector('#tabBody');
  let tab = start;
  const ctx2 = { ...ctx, setBal: (m) => { const e = body.querySelector('#hubBal'); if (e) e.textContent = '$' + fmt(m); } };

  const show = (t) => {
    tab = t;
    body.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    tb.innerHTML = '';
    (t === 'jobs' ? renderJobs : renderCasino)(tb, ctx2);
  };
  body.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { sfx.click(); show(b.dataset.t); }));

  // server 'me' yuborganda (va stavka animatsiyasi tugaganda) chaqiriladi
  ui.refresh = (m) => { ctx2.setBal(m.money); if (tab === 'jobs') renderJobs(tb, ctx2); };
  show(start);
}
