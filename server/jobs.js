export const JOBS = {
  courier: { id: 'courier', icon: '📦', title: 'Kuryer',  pay: 150, xp: 25, hourly: 60, minLevel: 1, label: 'Buyurtmani yetkazing' },
  taxi:    { id: 'taxi',    icon: '🚖', title: 'Taksi',   pay: 220, xp: 35, hourly: 90, minLevel: 2, label: "Yo'lovchini manzilga olib boring" },
  builder: { id: 'builder', icon: '🧱', title: 'Quruvchi', pay: 120, xp: 20, hourly: 50, minLevel: 1, label: 'Qurilish materialini olib boring' },
};

// Hammasi yo'l kesishmalarida (client'dagi yo'llar bilan mos)
const POINTS = [
  [40, 40], [-40, 40], [40, -40], [-40, -40],
  [80, 0], [-80, 0], [0, 80], [0, -80], [80, 80], [-80, -80],
];

// from — vazifa berilayotgan paytdagi o'yinchi joyi (tezlik bonusi uchun "par" vaqtini hisoblaydi)
export function newTask(jobId, prev, from) {
  let pt;
  do { pt = POINTS[Math.floor(Math.random() * POINTS.length)]; }
  while (prev && prev.x === pt[0] && prev.z === pt[1]);
  const dist = from ? Math.hypot(pt[0] - from.x, pt[1] - from.z) : 60;
  return {
    x: pt[0], z: pt[1], label: JOBS[jobId].label, startedAt: Date.now(),
    pay: JOBS[jobId].pay, par: Math.round(dist / 15 + 12),   // shu soniya ichida yetkazsa +25% bonus
  };
}

// Anti-cheat: manzilga yetganmi va juda tez bajarilmadimi
export function validateTask(p) {
  if (!p.task) return 'Vazifa yoq';
  if (Date.now() - p.task.startedAt < 3000) return 'Juda tez';
  if (Math.hypot(p.x - p.task.x, p.z - p.task.z) > 8) return 'Manzilga yetib bormadingiz';
  return null;
}
