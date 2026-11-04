import Peer from 'peerjs';

const RANGE = 35;       // shu masofada ovoz eshitiladi
const KEEP = RANGE + 8; // aloqa uzilishi uchun gisterezis

export class Voice {
  constructor() {
    this.calls = new Map();
    this.audios = new Map();
    this.peer = null;
    this.stream = null;
    this.onPeerId = () => {};
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      // Mikrofon bermasa ham boshqalarni eshita olish uchun jim oqim
      this.stream = new AudioContext().createMediaStreamDestination().stream;
    }
    this.setTalking(false);
    this.peer = new Peer(); // bepul PeerJS cloud signaling
    this.peer.on('open', (id) => this.onPeerId(id));
    this.peer.on('call', (call) => { call.answer(this.stream); this.bind(call); });
  }

  setTalking(on) { this.stream?.getAudioTracks().forEach((t) => (t.enabled = on)); }

  bind(call) {
    this.calls.set(call.peer, call);
    call.on('stream', (s) => {
      let a = this.audios.get(call.peer);
      if (!a) { a = new Audio(); a.autoplay = true; this.audios.set(call.peer, a); }
      a.srcObject = s; a.play().catch(() => {});
    });
    const drop = () => {
      this.calls.delete(call.peer);
      const a = this.audios.get(call.peer);
      if (a) { a.srcObject = null; this.audios.delete(call.peer); }
    };
    call.on('close', drop); call.on('error', drop);
  }

  update(others, me) {
    if (!this.peer?.id) return;
    const keep = new Set();
    for (const o of others) {
      if (!o.peerId) continue;
      const d = Math.hypot(o.x - me.x, o.z - me.z);
      if (d < KEEP) keep.add(o.peerId);
      if (d < RANGE && !this.calls.has(o.peerId) && this.peer.id < o.peerId) {
        this.bind(this.peer.call(o.peerId, this.stream)); // faqat bitta tomon qo'ng'iroq qiladi
      }
      const a = this.audios.get(o.peerId);
      if (a) a.volume = Math.max(0, Math.min(1, 1 - d / RANGE)); // masofaga qarab ovoz balandligi
    }
    for (const [pid, call] of this.calls) if (!keep.has(pid)) call.close();
  }
}
