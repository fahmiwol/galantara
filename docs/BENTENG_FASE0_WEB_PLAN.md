# Benteng Fase 0 — Web Execution Plan

**Tujuan tunggal:** membuktikan apakah Sistem Muatan terasa seru.

## Struktur

```text
benteng.html                         shell + HUD + kontrol
src/games/benteng/
  config.js                         seluruh konstanta dan varian
  SpeedModel.js                     satu-satunya kalkulasi speed
  TagResolver.js                    satu-satunya keputusan tag
  PlaytestLogger.js                 metrik + ekspor CSV 14 kolom
  BentengGame.js                    state match, AI, jail/chain, capture
  BentengRenderer.js                Canvas 2D + game feel
  BentengInput.js                   keyboard + joystick/pointer
  AudioDirector.js                  lima SFX sintetis tanpa asset
  main.js                            bootstrap dan UI binding
tests/benteng-core.test.mjs          unit test aturan inti
```

## Milestone eksekusi

1. Arena, movement, obstacle, input desktop/mobile.
2. Muatan, aura, benteng, SpeedModel A/B.
3. TagResolver, penjara, rantai, tarik, rescue.
4. Near-miss, burst, feedback audio/visual.
5. Capture, total tawan, timer, restart, toggle varian.
6. Bot tiga agresivitas dan 4v4 penuh.
7. Logger CSV 14 kolom, test otomatis, browser QA.

## Evolusi setelah gate

Logic core sengaja tidak bergantung pada DOM atau renderer. Jika lolos playtest,
lapisan yang sama dapat dipakai oleh `BentengRoomRuntime` Three.js dan kemudian
dipindahkan ke server-authoritative tanpa menulis ulang aturan tag/kecepatan.

