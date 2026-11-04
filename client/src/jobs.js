const START = { courier: 'Kuryerlikni boshlash', taxi: 'Taksi smenasini boshlash', builder: 'Qurilishga chiqish' };
const DESC = {
  courier: 'Yuklarni xaritadagi manzilga yetkazing. Mashinada tezroq!',
  taxi: "Yo'lovchini belgilangan manzilga olib boring.",
  builder: 'Qurilish materiallarini obyektga olib boring.',
};
const fmt = (n) => n.toLocaleString('en-US');

export function renderJobs(el, ctx) {
  const { ui, socket, getMe, getJobs, sfx } = ctx;
  const me = getMe(), jobs = getJobs();
  const cur = me.job ? jobs[me.job] : null;

  el.innerHTML = `
    <div class="stat-row">
      <div class="stat"><span>Daraja</span><b>LVL ${me.level}</b></div>
      <div class="stat"><span>Yetkazmalar</span><b>${me.deliveries}</b></div>
      <div class="stat"><span>Hozirgi ish</span><b>${cur ? cur.icon + ' ' + cur.title : '—'}</b></div>
    </div>
    ${me.task ? `
      <div class="order">
        <div>📍 <b>Faol buyurtma</b><br/>
          <small>${me.task.label} · <span class="green">$${fmt(me.task.pay)}</span> · ⏱ ${me.task.par} s ichida +25%</small></div>
        <button class="btn danger sm" id="quit">Ishdan chiqish</button>
      </div>` : ''}
    <div class="jobs">
      ${Object.values(jobs).map((j) => {
        const locked = me.level < j.minLevel, on = me.job === j.id;
        return `
        <div class="job-card ${on ? 'on' : ''}">
          <div class="job-ico">${j.icon}</div>
          <div class="job-info">
            <b>${j.title}</b>
            <div>${DESC[j.id] || ''}</div>
            <div class="chip-row">
              <span class="pill g">$${fmt(j.pay)} / vazifa</span>
              <span class="pill c">+${j.xp} XP</span>
              <span class="pill y">Soatlik $${fmt(j.hourly)}</span>
              ${j.minLevel > 1 ? `<span class="pill">LVL ${j.minLevel}+</span>` : ''}
            </div>
          </div>
          <button class="btn sm ${on ? 'ghost' : ''}" data-id="${j.id}" ${locked || on ? 'disabled' : ''}>
            ${on ? '✔ Ishlayapsiz' : locked ? '🔒 LVL ' + j.minLevel : START[j.id] || 'Boshlash'}
          </button>
        </div>`;
      }).join('')}
    </div>
    <p class="note">Ishni boshlagach, xaritada (<b>M</b>) va mini-mapda sariq nuqta belgilanadi. Marshrutga ergashing, manzilga yetib borsangiz pul va XP avtomatik beriladi.</p>
  `;

  el.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => {
    sfx.click();
    socket.emit('job:take', b.dataset.id, (r) => {
      if (r.ok) { sfx.cash(); ui.toast('Buyurtma qabul qilindi — sariq nuqtaga boring!', 'ok'); ui.close(); }
      else ui.toast(r.error || 'Xatolik', 'err');
    });
  }));
  el.querySelector('#quit')?.addEventListener('click', () => {
    sfx.click();
    socket.emit('job:quit', () => ui.toast('Ishdan chiqdingiz'));
  });
}
