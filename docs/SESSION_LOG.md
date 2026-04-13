# Galantara — Session Log & Technical Notes
> Catatan cara kerja, flow, dan teknik yang dikuasai per sesi.
> Update terakhir: **2026-04-13**

---

## Sinkron dokumen (Claude → Cursor) · 2026-04-13

Percakaman panjang Claude sebelum limit sudah **disatukan** ke repo saat ini:

- **`SPRINT_LOG.md`** — Sprint 4 = deployed + polish chat/fog/WASD; urutan Sprint 5–7 diarahkan ke **Spot → wallet/lahan/booth → transaksi**; Known Issues disegarkan; commerce MVP **bukan** open question lagi.
- **`docs/ARCHITECTURE_ERD.md` §10** — dari “open questions” menjadi **keputusan terkunci** dengan pointer ke `supabase/migrations/`.
- **Migrations** — sudah ada di `supabase/migrations/` (15 file); langkah berikutnya operasional = **`supabase db push`** (bukan tulis ulang SQL).

Detail teknis chat sidebar / QA tetap di **Session 3** di bawah.

---

## Session 4 · 2026-04-13
**Scope:** Guest multiplayer (lihat player lain tanpa login), server hardening chat/WebRTC tamu, dokumentasi

### Apa yang Dikerjakan

| Task | Status | File |
|------|--------|------|
| Guest join Socket.io setelah `getSession` tanpa user | ✅ | `src/auth/auth.js` — opsi `onInitialNoUser` |
| Id & nama tamu persist `localStorage` | ✅ | `src/data/guestIdentity.js` |
| Reconnect bersih guest → user (disconnect sebelum connect baru) | ✅ | `src/multiplayer/Socket.js` — `setSpawnSnapshot`, emit `move` setelah `join` |
| Game: urutan init auth setelah handler MP + chat; logout → guest lagi | ✅ | `src/core/Game.js` |
| Server: flag `guest`, blok `chat` & relay WebRTC jika tamu terlibat | ✅ | `galantara-server/index.js` |
| UX: input chat disabled tamu, copy login-gate | ✅ | `index.html` |
| Orkestrasi npm root + lock server + `.gitignore` | ✅ | `package.json`, `galantara-server/package-lock.json`, `.gitignore` |

### Alur

1. `G_Auth.init(..., { onInitialNoUser })` — jika Supabase `getSession` **tanpa** user → `_connectGuestMultiplayer()`.
2. Tamu: `join` dengan `guest: true`, `id` = `guest:<uuid>` stabil dari `localStorage`, nama `Tamu ####`, warna abu `0x9ca3af`.
3. Setelah `join`, client emit sekali `move` dari posisi avatar (spawn snapshot) agar tidak stuck di `0,0`.
4. Login: `_onLogin` memutus socket lalu `join` dengan `user.id` Supabase, `guest: false`.
5. Logout: `disconnect` lalu tamu join lagi.

### Aturan produk

- Tamu **boleh** lihat avatar & counter online; **tidak** chat / voice (client + server).
- Voice: cek `!this.user` di `toggleVoice` (bukan hanya `!socket`).

### Catatan sisip — Mighan / wallet (belum dikerjakan)

- **Koin & wallet belum beres:** tidak ada perubahan kode ekonomi di sesi guest/deps; panel Token tetap placeholder.
- Claude/agent berikutnya: lihat **`CLAUDE_NOTES.md`** Known Issues (baris Mighan), **`TODO.md`** blok merah “Mighan Coin & wallet”, **`docs/GALANTARA_EKONOMI_KOIN.md`**, Sprint 7.

---

## Session 3 · 2026-04-12
**Scope:** Sprint 4 deploy, Chat sidebar, Voice chat, Ghost avatar fix, QA workflow

---

### Apa yang Dikerjakan

| Task | Status | File |
|------|--------|------|
| Deploy multiplayer server port 3005 | ✅ | `galantara-server/index.js` |
| nginx WebSocket proxy `/mp/` | ✅ | VPS nginx config |
| Ghost avatar bug fix | ✅ | `Socket.js`, `RemotePlayers.js`, server |
| Text chat panel → sidebar | ✅ | `Chat.js`, `index.html` |
| Proximity voice WebRTC | ✅ | `VoiceChat.js`, server relay |
| WASD input isolation (chat focused) | ✅ | `Chat.js` |
| Fog density reduction | ✅ | `Renderer.js` |
| Chat sidebar collapse dari atas | ✅ | `index.html`, `Chat.js` |
| QA via preview_eval sebelum deploy | ✅ | — |

---

### Cara Kerja: Chat Sidebar

**Konsep:** Panel chat di-anchor dari BAWAH (`bottom: 72px`), bukan dari atas. Ketika di-collapse, `height` berkurang → konten terpotong dari ATAS → yang tersisa di bawah (input + pesan terbaru) tetap terlihat.

```
Expanded (full):          Collapsed (148px):
┌─────────────────┐       
│ ▼ OOLA CHAT    │         
│ head label     │         (terpotong — tidak terlihat)
│ msg1           │         
│ msg2           │       ┌─────────────────┐
│ msg3           │       │ msg3 (terbaru)  │ ← 3 pesan bawah tetap
│ msg4 (terbaru) │       │ msg4            │    visible karena
├────────────────┤       ├─────────────────┤    bottom-anchored
│ 🎤 [input] ➤  │       │ 🎤 [input]  ➤  │
└────────────────┘       └─────────────────┘
                                 ↑ 72px dari bottom bar
```

**CSS kunci:**
```css
#chat-panel {
  position: fixed;
  bottom: 72px;        /* anchor di bawah */
  height: calc(100vh - 140px); /* full */
  overflow: hidden;    /* content terpotong saat collapse */
  transition: height .28s cubic-bezier(.4,0,.2,1);
}
#chat-panel.collapsed {
  height: 148px;       /* hanya input + ~3 pesan */
}
```

---

### Cara Kerja: WASD Input Isolation

**Problem:** Avatar.js pasang listener `window.addEventListener('keydown', ...)`. Saat user ketik di chat input, event keyboard bubbles up ke window → avatar bergerak.

**❌ Solusi Pertama (gagal):** Check `document.activeElement` di Avatar.js listener — tidak reliable di semua browser, terutama dengan WebGL canvas.

**✅ Solusi Final: `stopPropagation` di input**

```js
// Chat.js — dalam init()
this._input?.addEventListener('keydown', (e) => {
  e.stopPropagation(); // ← KUNCI: stop event sebelum mencapai window
  if (e.key === 'Enter') this._send();
});
```

**Cara kerja event propagation:**
```
User ketik 'A' di input
    ↓
input.keydown listener (Chat.js)
    → e.stopPropagation() dipanggil
    → event BERHENTI di sini
    
window.keydown listener (Avatar.js)  ← TIDAK PERNAH DIPANGGIL
```

**QA verification (via preview_eval):**
```js
let windowSawKey = false;
const spy = (e) => { if (e.code === 'KeyA') windowSawKey = true; };
window.addEventListener('keydown', spy);
input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true }));
window.removeEventListener('keydown', spy);
// windowSawKey === false → WASD blocked ✅
```

---

### Cara Kerja: Ghost Avatar Fix

**Problem:** Saat tab di-switch, Chrome throttle background tab → Socket.io heartbeat timeout → server anggap disconnect → saat tab aktif kembali, reconnect dengan socket.id BARU → server kirim data player lama + player baru = duplikat.

**Fix 3 lapis:**

```
Layer 1: connectionStateRecovery (Socket.io server)
  → Server simpan session selama 2 menit
  → Jika reconnect dalam 2 menit, socket.id SAMA

Layer 2: socket.recovered check (client)
  → Jika recovered: emit 'sync' (minta data teman, skip re-join)
  → Jika baru: emit 'join' (normal join)

Layer 3: addAll() clear dulu (RemotePlayers.js)
  → Sebelum populate dari server response, hapus SEMUA player dulu
  → Cegah akumulasi ghost
```

```js
// Socket.js — cek recovered saat connect
socket.on('connect', () => {
  if (socket.recovered) {
    socket.emit('sync', { room: this._room }); // tidak join ulang
  } else {
    socket.emit('join', { room, id, name, color });
  }
});

// RemotePlayers.js — clear dulu sebelum addAll
addAll(playersMap, mySocketId) {
  Object.keys(this._players).forEach(sid => this.remove({ socketId: sid }));
  Object.entries(playersMap).forEach(([sid, p]) => {
    if (sid !== mySocketId) this.add({ socketId: sid, ...p });
  });
}
```

---

### Cara Kerja: WebRTC Proximity Voice

**Architecture:** Pure P2P — server hanya relay sinyal, tidak proses audio sama sekali.

```
Player A                  Server (galantara-mp)          Player B
   |                            |                            |
   |── rtc_offer ──────────────→|── rtc_offer (forward) ───→|
   |                            |                            |
   |←─ rtc_answer ─────────────|←─ rtc_answer ─────────────|
   |                            |                            |
   |── rtc_ice ───────────────→|── rtc_ice (forward) ──────→|
   |←─ rtc_ice ────────────────|←─ rtc_ice ─────────────────|
   |                            |                            |
   |←═══════════ AudioStream (DIRECT P2P) ══════════════════|
   
   Server tidak pernah menyentuh audio stream
```

**Proximity logic (tiap 300ms):**
```js
const dist = Math.sqrt(dx*dx + dz*dz);
if (dist < VOICE_RADIUS) {           // 8 unit Three.js
  if (!this._peers[sid]) this._callPeer(sid);
  else this._setVolume(sid, 1 - dist/VOICE_RADIUS); // linear falloff
} else {
  if (this._peers[sid]) this._hangup(sid);
}
```

**Tiebreaker rule** (siapa yang initiate call):
```js
if (this._socket.id < sid) this._callPeer(sid); // ID lebih kecil = caller
```
→ Cegah kedua player saling call secara bersamaan.

---

### Cara Kerja: Fog Reduction

```js
// Renderer.js
// Before: terlalu tebal, world terlihat washed-out
this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.012);

// After: lebih tipis, object jauh tetap terlihat
this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.006);
```

**Formula FogExp2:** `opacity = 1 - e^(-density × distance)`
- Density 0.012, jarak 100: opacity ≈ 70% → terlalu tebal
- Density 0.006, jarak 100: opacity ≈ 45% → lebih natural

DayNight.js sync fog color ke skyColor tiap frame — fog otomatis ganti warna saat siang/malam.

---

### Flow Kerja (Development → Deploy)

```
1. EDIT lokal (D:\Projects\Galantara\)
        ↓
2. QA via preview_eval
   - preview_start "galantara"
   - preview_eval untuk cek DOM, CSS, JS behavior
   - Jangan rely pada screenshot (Three.js terlalu berat di preview)
        ↓
3. DEPLOY via scp dari PowerShell lokal
   scp file.js root@72.62.125.6:/path/
        ↓
4. Restart PM2 kalau server-side change
   pm2 restart galantara-mp
        ↓
5. Test di galantara.io (browser asli)
```

**Aturan scp:**
- Jalankan dari **PowerShell lokal** (bukan SSH terminal)
- Format: `scp D:\Projects\Galantara\src\... root@72.62.125.6:/www/wwwroot/galantara.io/src/...`
- VPS path: `/www/wwwroot/galantara.io/` (frontend), `/www/galantara-server/` (server)

---

### Skills & Techniques Baru

#### CSS

| Teknik | Use Case | Contoh |
|--------|----------|--------|
| **Height transition untuk collapse** | Panel yang grow/shrink dari satu sisi | `height: 148px; transition: height .28s` |
| **Bottom-anchoring panel** | Panel yang expands ke atas | `position:fixed; bottom:72px` |
| **overflow:hidden + height transition** | Content clip saat collapse | Content terpotong dari atas secara smooth |
| **CSS transition timing function** | Smooth natural feel | `cubic-bezier(.4,0,.2,1)` (Material Design) |

#### JavaScript / Event System

| Teknik | Use Case | Kode |
|--------|----------|------|
| **`stopPropagation`** | Isolate input dari global keydown listener | `e.stopPropagation()` di input listener |
| **Event propagation phases** | Debugging event flow (capture vs bubble) | `addEventListener(fn, true)` = capture phase |
| **`preview_eval` untuk QA** | Test behavior tanpa deploy | DOM check, CSS verify, JS simulation |
| **Event simulation** | Test event handling tanpa user interaction | `new KeyboardEvent('keydown', {...})` |

#### Socket.io / WebRTC

| Teknik | Use Case |
|--------|----------|
| **`connectionStateRecovery`** | Reconnect dengan session ID sama → no ghost |
| **`socket.recovered`** | Branch logic: sync vs join saat reconnect |
| **Grace period pattern** | Buffer 8s sebelum player dianggap pergi |
| **Socket.io sebagai signaling relay** | WebRTC offer/answer/ICE tanpa server audio processing |
| **AudioContext gainNode per peer** | Volume control per player (proximity audio) |
| **Tiebreaker dengan socket ID** | Cegah double-call di WebRTC P2P |

#### QA Workflow

| Tool | Kapan Dipakai |
|------|---------------|
| `preview_snapshot` | Cek struktur DOM, element existence |
| `preview_eval` | Cek CSS computed style, simulate events, JS state |
| `preview_screenshot` | Jarang — timeout kalau ada WebGL |
| `preview_console_logs` | Debug runtime errors |

---

### Arsitektur File Galantara (Per Hari Ini)

```
src/
├── core/
│   ├── Game.js          ← Orchestrator: game loop, semua modul terikat
│   ├── Renderer.js      ← Three.js setup, fog, lights
│   └── Camera.js        ← Orbital camera + lerp
├── world/
│   ├── World.js         ← Oola island scene
│   ├── DayNight.js      ← Siang/malam cycle + stars
│   └── Zones.js         ← Proximity zone detection
├── entities/
│   ├── Avatar.js        ← Player chibi + movement + WASD listener
│   └── NPC.js           ← NPC manager + patrol
├── multiplayer/
│   ├── Socket.js        ← Socket.io client wrapper (reconnect + recovery)
│   ├── RemotePlayers.js ← Render + LERP avatar orang lain
│   └── VoiceChat.js     ← WebRTC P2P proximity voice
├── ui/
│   ├── Chat.js          ← Sidebar chat (stopPropagation, collapse)
│   ├── HUD.js           ← Top bar, hamburger menu
│   ├── Toast.js         ← Notifikasi popup
│   ├── LoginModal.js    ← Supabase OAuth modal
│   └── Panels.js        ← Profile, settings panels
├── auth/
│   └── auth.js          ← G_Auth singleton (Supabase)
└── data/
    └── config.js        ← Constants (SPEED, ISLAND_R, AV_PRESETS)

galantara-server/
└── index.js             ← Socket.io server (port 3005, PM2 id:12)

docs/
├── SESSION_LOG.md       ← File ini
├── HOW_IT_WORKS.md      ← (coming soon)
├── CTO_ARCHITECTURE_PROPOSAL.md
└── GALANTARA_EKONOMI_KOIN.md
```

---

*Tambahkan sesi baru di bawah dengan format yang sama.*
