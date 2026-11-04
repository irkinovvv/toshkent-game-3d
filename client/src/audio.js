// Kichik WebAudio kutubxonasi: interfeys ovozlari + dvigatel ovozi (hech qanday fayl kerak emas)
let ac = null, master = null;
function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

export const sfx = {
  muted: false,
  init() { ctx(); },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.2, slide = 0) {
    if (this.muted) return;
    const a = ctx(), t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  },
  click() { this.tone(660, 0.06, 'triangle', 0.12); },
  tick() { this.tone(420, 0.08, 'square', 0.08); },
  spin() { this.tone(220, 0.6, 'sawtooth', 0.06, 420); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.18), i * 110)); },
  lose() { this.tone(190, 0.4, 'sawtooth', 0.09, -110); },
  cash() { [880, 1175].forEach((f, i) => setTimeout(() => this.tone(f, 0.15, 'sine', 0.18), i * 90)); },
  door() { this.tone(150, 0.12, 'square', 0.1, -60); setTimeout(() => this.tone(110, 0.1, 'square', 0.08), 90); },
};

export class Engine {
  start() {
    if (this.o1) return;
    const a = ctx();
    this.o1 = a.createOscillator(); this.o2 = a.createOscillator();
    this.f = a.createBiquadFilter(); this.g = a.createGain();
    this.o1.type = 'sawtooth'; this.o2.type = 'square';
    this.f.type = 'lowpass'; this.f.frequency.value = 500; this.g.gain.value = 0;
    this.o1.connect(this.f); this.o2.connect(this.f); this.f.connect(this.g); this.g.connect(master);
    this.o1.start(); this.o2.start();
  }
  // rpm: 0..1, throttle: 0|1, active: mashinada o'tirgan bo'lsa true
  update(rpm, throttle, active) {
    if (!this.o1) return;
    const t = ac.currentTime, f = 38 + rpm * 95 + throttle * 8;
    this.o1.frequency.setTargetAtTime(f, t, 0.05);
    this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.f.frequency.setTargetAtTime(350 + rpm * 900 + throttle * 300, t, 0.08);
    const vol = active && !sfx.muted ? 0.035 + rpm * 0.03 + throttle * 0.02 : 0;
    this.g.gain.setTargetAtTime(vol, t, 0.1);
  }
}
