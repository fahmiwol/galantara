import { BentengGame } from './BentengGame.js';
import { BentengInput } from './BentengInput.js';
import { BentengRenderer } from './BentengRenderer.js';
import { AudioDirector } from './AudioDirector.js';
import { BENTENG_CONFIG, TEAM } from './config.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#arena');
const renderer = new BentengRenderer(canvas, BENTENG_CONFIG);
const audio = new AudioDirector();
let bannerTimer = null;
let input = null;

function showBanner(message, tone = '') {
  const banner = $('#event-banner');
  banner.textContent = message;
  banner.className = `event-banner on ${tone}`.trim();
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => banner.classList.remove('on'), BENTENG_CONFIG.visual.bannerDuration * 1000);
}

function handleGameEvent(event) {
  renderer.emit(event);
  switch (event.type) {
    case 'start': showBanner(event.message, 'hero'); break;
    case 'tag':
      audio.tag();
      showBanner(`${event.winner.name.toUpperCase()} MENAWAN ${event.loser.name.toUpperCase()}!`, event.loser.isPlayer ? 'danger' : '');
      break;
    case 'nearMiss':
      audio.nearMiss();
      if (event.unit.isPlayer) showBanner('NYARIS! KAMU LOLOS TIPIS.', 'hero');
      break;
    case 'rescue':
      audio.rescue();
      showBanner(`${event.rescuer.name.toUpperCase()} MEMBEBASKAN ${event.count} TAWANAN!`, 'hero');
      break;
    case 'burst':
      if (event.unit.isPlayer) audio.burst();
      if (event.unit.isPlayer) showBanner('SEMBURAN PULANG — GAS!', 'hero');
      break;
    case 'refill':
      if (event.unit.isPlayer) audio.refill();
      if (event.unit.isPlayer) showBanner('MUATAN PENUH. PILIH RISIKOMU.', 'hero');
      break;
    case 'bounce':
      if (event.units.some((unit) => unit.isPlayer)) showBanner('SAMA KUAT — MENTAL!', '');
      break;
    default:
      break;
  }
}

const game = new BentengGame({
  callbacks: {
    onEvent: handleGameEvent,
    onFinish: showResult,
    onPlayerCaptured: (captured) => input?.setCaptured(captured),
    onVariantChange: updateVariantLabel,
  },
});

input = new BentengInput({
  joystick: $('#joystick'),
  knob: $('#joystick-knob'),
  pullButton: $('#pull-button'),
  onPull: () => game.pullPlayerChain(),
});

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function chargeColor(charge) {
  if (charge >= 80) return BENTENG_CONFIG.visual.aura.high;
  if (charge >= 40) return BENTENG_CONFIG.visual.aura.medium;
  if (charge > 0) return BENTENG_CONFIG.visual.aura.low;
  return BENTENG_CONFIG.visual.aura.empty;
}

function rosterHTML(units, reverse = false) {
  return units.map((unit) => {
    const name = `<div><div class="unit-name">${unit.captured ? '⛓ ' : ''}${unit.name}${unit.isPlayer ? '' : ' · BOT'}</div><div class="unit-meter"><i style="width:${unit.charge}%;background:${chargeColor(unit.charge)}"></i></div></div>`;
    const charge = `<span class="unit-charge">${Math.round(unit.charge)}</span>`;
    return `<div class="unit-row ${unit.captured ? 'capture' : ''}">${reverse ? charge + name : name + charge}</div>`;
  }).join('');
}

function updateVariantLabel(reverse) {
  $('#variant-button').textContent = reverse ? 'VARIAN B · KEPEPET' : 'VARIAN A · SEKARAT';
  $('#result-variant').textContent = reverse ? 'COBA VARIAN A' : 'COBA VARIAN B';
}

function updateHud(state) {
  $('#match-time').textContent = formatTime(state.remaining);
  $('#score-blue').textContent = state.scores[TEAM.BIRU];
  $('#score-red').textContent = state.scores[TEAM.MERAH];
  $('#roster-blue').innerHTML = rosterHTML(state.units.filter((unit) => unit.team === TEAM.BIRU));
  $('#roster-red').innerHTML = rosterHTML(state.units.filter((unit) => unit.team === TEAM.MERAH), true);
  const charge = state.player.charge;
  $('#player-charge-bar').style.width = `${charge}%`;
  $('#player-charge-bar').style.background = chargeColor(charge);
  $('#player-charge-text').textContent = `MUATAN ${Math.round(charge)}`;

  let mission = 'Baca aura. Pancing musuh, lalu pilih pulang atau menerobos.';
  if (state.player.captured) mission = 'TAP TARIK RANTAI — dekatkan ujung ke kawanmu!';
  else if (charge < 20) mission = state.reverseChargeSpeed
    ? 'Kamu redup tapi lebih gesit. Kabur dan isi ulang!'
    : 'Muatan kritis. Pulang sebelum langkahmu melemah!';
  else if (charge > 80) mission = 'Aura terang: kamu predator. Tekan sebelum nyala luruh.';
  else if (state.captureProgress[TEAM.BIRU] > 0) mission = `BERTAHAN! Rebut ${state.captureProgress[TEAM.BIRU].toFixed(1)} / ${state.config.fort.captureDuration} detik.`;
  $('#mission-text').textContent = mission;
}

function reasonText(result) {
  if (result.reason === 'rebut_benteng') return 'Benteng lawan direbut setelah channel 3 detik.';
  if (result.reason === 'total_tawan') return 'Seluruh tim lawan tertawan bersamaan.';
  if (result.reason === 'skor_waktu') return 'Waktu habis — menang dari jumlah tawanan bersih.';
  return 'Waktu habis dengan skor seimbang.';
}

function showResult(result) {
  const winnerLabel = result.winner ? `TIM ${result.winner.toUpperCase()} MENANG` : 'HASIL SERI';
  $('#result-title').textContent = winnerLabel;
  $('#result-title').style.color = result.winner
    ? BENTENG_CONFIG.visual.teamColors[result.winner]
    : BENTENG_CONFIG.visual.aura.medium;
  $('#result-reason').textContent = reasonText(result);
  const row = result.row;
  $('#result-metrics').innerHTML = `
    <div><b>${row.jumlah_tag_total}</b><span>TAG</span></div>
    <div><b>${row.jumlah_near_miss}</b><span>NEAR-MISS</span></div>
    <div><b>${row.jumlah_penyelamatan_rantai}</b><span>PENYELAMATAN</span></div>
    <div><b>${row.persen_pulang_di_bawah_20_muatan}%</b><span>PULANG KRITIS</span></div>
    <div><b>${row.panjang_rantai_maks}</b><span>RANTAI MAKS</span></div>
    <div><b>${row.waktu_menganggur_tawanan}s</b><span>TAWANAN DIAM</span></div>`;
  $('#result-overlay').classList.add('on');
  showBanner(winnerLabel, result.winner === TEAM.BIRU ? 'hero' : 'danger');
}

function startFresh(reverse = game.reverseChargeSpeed) {
  audio.unlock();
  game.reset(reverse);
  game.start();
  $('#onboarding').classList.remove('on');
  $('#result-overlay').classList.remove('on');
}

$('#start-button').addEventListener('click', () => startFresh());
$('#restart-button').addEventListener('click', () => startFresh());
$('#result-restart').addEventListener('click', () => startFresh());
$('#variant-button').addEventListener('click', () => startFresh(!game.reverseChargeSpeed));
$('#result-variant').addEventListener('click', () => startFresh(!game.reverseChargeSpeed));
$('#csv-button').addEventListener('click', () => game.logger.download());
$('#result-csv').addEventListener('click', () => game.logger.download());
$('#mute-button').addEventListener('click', () => {
  audio.setEnabled(!audio.enabled);
  $('#mute-button').textContent = audio.enabled ? '🔊' : '🔇';
});
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

let previous = performance.now();
let accumulator = 0;
let hudAccumulator = 0;
function frame(now) {
  const frameDelta = Math.min(BENTENG_CONFIG.simulation.maxFrame, (now - previous) / 1000);
  previous = now;
  accumulator += frameDelta;
  while (accumulator >= BENTENG_CONFIG.simulation.fixedStep) {
    game.update(BENTENG_CONFIG.simulation.fixedStep, input.vector());
    accumulator -= BENTENG_CONFIG.simulation.fixedStep;
  }
  const state = game.snapshot();
  renderer.render(state);
  hudAccumulator += frameDelta;
  if (hudAccumulator >= 0.08) {
    updateHud(state);
    hudAccumulator = 0;
  }
  window.requestAnimationFrame(frame);
}

updateHud(game.snapshot());
window.requestAnimationFrame(frame);
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') window._benteng = game;
