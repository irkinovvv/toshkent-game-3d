# Black City RP — Demo Day prototipi

3D brauzer RP o'yini: Three.js + Socket.io + PeerJS.

## Lokal ishga tushirish
```bash
# 1-terminal
cd server && npm install && npm run dev

# 2-terminal
cd client && npm install && npm run dev     # http://localhost:5173
```
`client/.env` ichida: `VITE_SERVER_URL=http://localhost:3000`

## Boshqaruv
WASD — yurish · Shift — yugurish · Sichqoncha — kamera (canvas'ga bosing)
F — mashinaga o'tish/tushish · E — Kazino / Ish markazi · T — chat
V (bosib turing) — mikrofon · Space — qo'l tormozi

## Grafika (v2)
- Low-poly humanoid personaj + procedural idle/walk/run animatsiya (`client/src/player.js`)
- Tungi shahar: oy nuri + soyalar, ko'cha chiroqlari, neon belgilar, bloom, FogExp2, shader osmon, yomg'ir
- Asfalt/trotuar teksturalari, batafsil binolar, aylanuvchi 3D checkpoint (`Marker` klassi, `world.js`)
- Qo'shimcha tugmalar: **B** — bloom, **R** — yomg'ir
- Sekin ishlasa: B va R ni o'chiring yoki `main.js` da `PR` ni 1 ga, `world.js` da soya `mapSize` ni 1024 ga tushiring.

## Mexanikalar (v3)
- **Mashina:** yaqinlashib **F** — o'tirish (kamera ortga o'tadi, FOV tezlikka qarab kengayadi), W/A/S/D — haydash, Space — qo'l tormozi.
  Pastki o'ngda speedometer (km/h, vites, RPM). Dvigatel ovozi, tormoz chiroqlari, g'ildirak burilishi, kuzov og'ishi.
- **Sariq markaz** (shahar markazi): **E** — modal oyna: 💼 Ishlar (kuryer/taksi/quruvchi) va 🎰 Kazino (slot + ruletka).
- **Ish:** buyurtma qabul qilingach sariq 3D marker + mini-map/katta xarita (**M**) da marshrut. Tezroq yetkazsangiz +25% bonus.
- **Kazino:** stavka chiplari, slot reellari, ruletka g'ildiragi animatsiyasi, yutuq hisoblagichi va konfetti.
  Natija animatsiya tugaguncha HUD balansida ko'rinmaydi.
- Tugmalar: **M** — katta xarita, **N** — ovoz o'chirish.

## Deploy
- **Backend → Render/Railway:** Root Directory `server`, Build `npm install`, Start `npm start`.
  Env: `CLIENT_ORIGIN=https://<sizning-frontend>.vercel.app`
- **Frontend → Vercel/Netlify:** Root Directory `client`, Build `npm run build`, Output `dist`.
  Env: `VITE_SERVER_URL=https://<sizning-backend>.onrender.com`

## Eslatma
- Render bepul rejasi 15 daqiqadan keyin uxlaydi — demodan oldin serverni "uyg'oting".
- Mikrofon faqat HTTPS'da ishlaydi.
- Ma'lumotlar xotirada saqlanadi (server qayta ishga tushsa nolga tushadi).
