#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Benteng — headless balance harness
//
// Runs full matches without a browser and reports the numbers the
// Fase 0 gate is written against (docs/RECONCILIATION_v0.1.md).
// Use it to measure a tuning change BEFORE asking a human to play.
//
//   node tools/benteng-sim.mjs                 # 24 matches, summary
//   node tools/benteng-sim.mjs --runs 40       # more samples
//   node tools/benteng-sim.mjs --csv out.csv   # dump raw rows
//   node tools/benteng-sim.mjs --per-match     # one line per match
//   node tools/benteng-sim.mjs --set ai.fleeRadius=3 --set nearMiss.distance=0.4
//   node tools/benteng-sim.mjs --sweep ai.fleeRadius=2.6,3.0,3.4,3.8
//
// --set / --sweep change dials in memory only. Nothing is written back;
// a value worth keeping goes into config.js by hand, with a comment.
//
// The sim core is deterministic (Math.random lives only in the
// renderer), so variation comes from the scripted player policies
// below — each one stands for a different kind of human.
// ═══════════════════════════════════════════════════════════════

import { writeFileSync } from 'node:fs';
import { BentengGame } from '../src/games/benteng/BentengGame.js';
import { BENTENG_CONFIG, TEAM, fortPosition } from '../src/games/benteng/config.js';
import { PLAYTEST_HEADERS } from '../src/games/benteng/PlaytestLogger.js';
import { ROLE } from '../src/games/benteng/BotDirector.js';
import { findRoute } from '../src/games/benteng/navigation.js';

const STEP = BENTENG_CONFIG.simulation.fixedStep;
const MAX_TICKS = Math.ceil((BENTENG_CONFIG.match.duration + 30) / STEP);

// ── Scripted player archetypes ────────────────────────────────
// Each returns a desired direction vector for the human slot (B0).
// They are intentionally simple: the point is to exercise the rules,
// not to play well.

function toward(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

const POLICIES = Object.freeze({
  // Never touches the controls — isolates pure bot-vs-bot behaviour.
  diam: () => ({ x: 0, y: 0 }),

  // Charges the enemy fort and ignores its own charge. The reckless newbie.
  nekat: (game) => toward(game.player.position, fortPosition(
    game.player.team === TEAM.BIRU ? TEAM.MERAH : TEAM.BIRU, game.config,
  )),

  // Refills whenever low, otherwise pushes out. The rule-following player.
  disiplin: (game) => {
    const own = fortPosition(game.player.team, game.config);
    const enemy = fortPosition(game.player.team === TEAM.BIRU ? TEAM.MERAH : TEAM.BIRU, game.config);
    return toward(game.player.position, game.player.charge < 35 ? own : enemy);
  },

  // Hunts whatever it can legally beat, else refills. The predator.
  pemburu: (game) => {
    const own = fortPosition(game.player.team, game.config);
    if (game.player.charge < 30) return toward(game.player.position, own);
    const prey = game.units
      .filter((u) => u.team !== game.player.team && !u.captured)
      .filter((u) => game.player.charge - u.charge > game.config.tag.tieThreshold)
      .sort((a, b) => Math.hypot(a.position.x - game.player.position.x, a.position.y - game.player.position.y)
        - Math.hypot(b.position.x - game.player.position.x, b.position.y - game.player.position.y))[0];
    return toward(game.player.position, prey ? prey.position : own);
  },

  // Player driven by the bot brain itself, so both teams are four bots.
  // This is the control run: any win skew left here is structural.
  //
  // It must think at the same rate as a real bot. Re-deciding every
  // frame instead of every ai.decisionInterval handed blue a 30x
  // faster reaction time and produced a "structural bias" that was
  // purely an artefact of this harness.
  bot: (game) => {
    const memo = botMemo(game);
    if (game.elapsed >= memo.nextDecisionAt) {
      memo.nextDecisionAt = game.elapsed + game.config.ai.decisionInterval;
      game.player.role = game.player.role || ROLE.PENYERANG;
      memo.target = game.director.chooseTarget(game.player, {
        units: game.units,
        elapsed: game.elapsed,
        prisonersOf: (team) => game.getPrisoners(team),
        chainEndOf: (team) => game.getChainEnd(team),
      }).target;
      // Bots walk a route around obstacles; the player slot steers
      // straight. The control has to path too, or blue simply corners
      // better than red and the run measures nothing.
      memo.route = findRoute(
        game.player.position, memo.target,
        game.config.arena.obstacles, game.config.arena.unitRadius,
      );
    }
    if (!memo.target) return { x: 0, y: 0 };
    while (memo.route?.length
      && Math.hypot(memo.route[0].x - game.player.position.x, memo.route[0].y - game.player.position.y) < 0.25) {
      memo.route.shift();
    }
    return toward(game.player.position, memo.route?.[0] || memo.target);
  },

  // Bermain normal tapi TIDAK PERNAH menekan tarik-rantai saat tertawan.
  // Pemain baru yang belum sadar tombolnya ada.
  pasrah: (game) => {
    const own = fortPosition(game.player.team, game.config);
    const enemy = fortPosition(game.player.team === TEAM.BIRU ? TEAM.MERAH : TEAM.BIRU, game.config);
    return toward(game.player.position, game.player.charge < 35 ? own : enemy);
  },

  // Wanders on a phase-shifted lissajous. Stands for aimless play.
  keliling: (game, tick, seed) => {
    const t = tick * STEP * 0.3 + seed;
    return { x: Math.cos(t), y: Math.sin(t * 1.3) };
  },
});

// Apakah policy ini menekan TARIK RANTAI saat tertawan?
// Awalnya SEMUA menarik, dan akibatnya gerbang "tawanan menganggur <= 25 s"
// lulus tanpa pernah bisa gagal — metriknya selalu 0,0 s. Seorang pemain
// yang tidak tahu harus menekan adalah kasus nyata, dan itulah yang
// gerbang ini sebenarnya ingin tangkap.
const POLICY_PULLS = { diam: false, pasrah: false };
const pullsChain = (policy) => POLICY_PULLS[policy] !== false;

const POLICY_NAMES = Object.keys(POLICIES);

// Per-match scratch space for the `bot` control policy.
const BOT_MEMO = new WeakMap();
function botMemo(game) {
  if (!BOT_MEMO.has(game)) BOT_MEMO.set(game, { nextDecisionAt: 0, target: null, route: [] });
  return BOT_MEMO.get(game);
}
const HARNESS_JITTER = 0.9; // metres of opening spread, seeded per match

// ── Config overrides ──────────────────────────────────────────
// BENTENG_CONFIG is deeply frozen on purpose, so a sweep works on an
// unfrozen deep copy. The real config file is never touched.

function thaw(value) {
  if (Array.isArray(value)) return value.map(thaw);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, thaw(v)]));
  }
  return value;
}

function withOverrides(overrides) {
  const config = thaw(BENTENG_CONFIG);
  // A run of identical matches is one sample, not many. Spread the
  // opening line-up unless the caller says otherwise.
  config.match.startJitter = HARNESS_JITTER;
  for (const [path, raw] of overrides) {
    const keys = path.split('.');
    let node = config;
    for (const key of keys.slice(0, -1)) {
      if (!(key in node)) throw new Error(`dial tidak dikenal: ${path}`);
      node = node[key];
    }
    const leaf = keys.at(-1);
    if (!(leaf in node)) throw new Error(`dial tidak dikenal: ${path}`);
    node[leaf] = Number(raw);
  }
  return config;
}

// ── One match ─────────────────────────────────────────────────

function runMatch({ reverse, policy, seed, matchSeed, config = BENTENG_CONFIG }) {
  const game = new BentengGame({ config, seed: matchSeed });
  game.reset(reverse, matchSeed);
  game.start();

  const decide = POLICIES[policy];
  const states = new Map(); // aiState -> ticks, to see what bots actually do
  let playerCapturedTicks = 0;

  for (let tick = 0; tick < MAX_TICKS && !game.ended; tick += 1) {
    // A captured player can only tap the chain, not steer.
    if (game.player.captured) {
      playerCapturedTicks += 1;
      if (tick % 20 === 0 && pullsChain(policy)) game.pullPlayerChain();
      game.update(STEP, { x: 0, y: 0 });
    } else {
      game.update(STEP, decide(game, tick, seed));
    }
    if (tick % 30 === 0) {
      for (const unit of game.units) {
        if (unit.isPlayer) continue;
        const key = unit.aiState.startsWith('buru') ? 'buru' : unit.aiState;
        states.set(key, (states.get(key) || 0) + 1);
      }
    }
  }

  const row = game.logger.rows.at(-1);
  if (!row) throw new Error(`match did not finish: ${policy}/${reverse ? 'B' : 'A'}`);
  return {
    ...row,
    policy,
    playerCapturedSeconds: +(playerCapturedTicks * STEP).toFixed(1),
    aiStates: states,
  };
}

// ── Aggregation ───────────────────────────────────────────────

const num = (value) => Number(value);
const mean = (values) => values.reduce((a, b) => a + b, 0) / (values.length || 1);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const pad = (text, width) => String(text).padEnd(width);
const padLeft = (text, width) => String(text).padStart(width);

function summarise(rows) {
  const durations = rows.map((r) => num(r.durasi));
  const reasons = {};
  for (const row of rows) reasons[row.hasil] = (reasons[row.hasil] || 0) + 1;
  return {
    matches: rows.length,
    durasiRata2: mean(durations),
    durasiMedian: median(durations),
    durasiMin: Math.min(...durations),
    habisWaktu: rows.filter((r) => num(r.durasi) >= BENTENG_CONFIG.match.duration - 1).length,
    tag: mean(rows.map((r) => num(r.jumlah_tag_total))),
    tagTipis: mean(rows.map((r) => num(r.jumlah_tag_selisih_tipis))),
    nearMiss: mean(rows.map((r) => num(r.jumlah_near_miss))),
    rescue: mean(rows.map((r) => num(r.jumlah_penyelamatan_rantai))),
    rebutBenteng: mean(rows.map((r) => num(r.jumlah_percobaan_rebut_benteng))),
    pulangKritis: mean(rows.map((r) => num(r.persen_pulang_di_bawah_20_muatan))),
    tawananDiam: mean(rows.map((r) => num(r.waktu_menganggur_tawanan))),
    rantaiMaks: mean(rows.map((r) => num(r.panjang_rantai_maks))),
    diLuarBenteng: mean(rows.map((r) => num(r.waktu_rata2_di_luar_benteng))),
    reasons,
  };
}

// Gate thresholds from docs/RECONCILIATION_v0.1.md. A machine cannot
// judge "still wants to replay" — only the structural ones are checked.
function gate(all) {
  const duration = BENTENG_CONFIG.match.duration;
  return [
    {
      name: 'near-miss >= 3 per match',
      value: all.nearMiss.toFixed(2),
      pass: all.nearMiss >= 3,
    },
    {
      name: 'tawanan menganggur <= 25 s per match',
      value: `${all.tawananDiam.toFixed(1)} s`,
      pass: all.tawananDiam <= 25,
    },
    {
      name: 'match tidak selesai prematur (median >= 50% durasi)',
      value: `${all.durasiMedian.toFixed(0)} s / ${duration} s`,
      pass: all.durasiMedian >= duration * 0.5,
    },
    {
      name: 'keputusan kejar-vs-pulang nyata (pulang kritis 10-70%)',
      value: `${all.pulangKritis.toFixed(1)}%`,
      pass: all.pulangKritis >= 10 && all.pulangKritis <= 70,
    },
    {
      name: 'benteng bisa dipertahankan (bukan 100% rebut_benteng)',
      value: `${(((all.reasons.rebut_benteng || 0) / all.matches) * 100).toFixed(0)}% rebut`,
      pass: (all.reasons.rebut_benteng || 0) / all.matches < 0.9,
    },
  ];
}

function collect(runs, config, only = null) {
  const names = only ? [only] : POLICY_NAMES;
  const rows = [];
  for (let i = 0; i < runs; i += 1) {
    rows.push(runMatch({
      reverse: i % 2 === 1,
      policy: names[i % names.length],
      seed: i * 0.7,
      matchSeed: i + 1,
      config,
    }));
  }
  return rows;
}

/** One dial, several values, the gate metrics side by side. */
function sweep(args) {
  const { path, values } = args.sweep;
  console.log(`
SWEEP ${path}  —  ${args.runs} match per nilai
`);
  console.log(pad('nilai', 12) + ['durasi med', 'tag', 'near-miss', 'rescue', 'pulang<20%', 'rebut%'].map((h) => padLeft(h, 12)).join(''));
  console.log('-'.repeat(12 + 12 * 6));
  for (const value of values) {
    const rows = collect(args.runs, withOverrides([...args.set, [path, value]]), args.policy);
    const s = summarise(rows);
    console.log(
      pad(value, 12)
      + padLeft(s.durasiMedian.toFixed(0), 12)
      + padLeft(s.tag.toFixed(1), 12)
      + padLeft(s.nearMiss.toFixed(2), 12)
      + padLeft(s.rescue.toFixed(2), 12)
      + padLeft(s.pulangKritis.toFixed(1), 12)
      + padLeft((((s.reasons.biru_rebut_benteng || 0) + (s.reasons.merah_rebut_benteng || 0)) / s.matches * 100).toFixed(0), 12),
    );
  }
  console.log('');
  return 0;
}

// ── CLI ───────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { runs: 24, csv: null, perMatch: false, set: [], sweep: null, policy: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--runs') args.runs = Number(argv[++i]);
    else if (argv[i] === '--csv') args.csv = argv[++i];
    else if (argv[i] === '--per-match') args.perMatch = true;
    else if (argv[i] === '--policy') args.policy = argv[++i];
    else if (argv[i] === '--set') {
      const [path, value] = argv[++i].split('=');
      args.set.push([path, value]);
    } else if (argv[i] === '--sweep') {
      const [path, values] = argv[++i].split('=');
      args.sweep = { path, values: values.split(',') };
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.sweep) return sweep(args);

  const rows = collect(args.runs, withOverrides(args.set), args.policy);

  const byVariant = {
    'A · sekarat': rows.filter((r) => r.varian_kecepatan === 'A'),
    'B · kepepet': rows.filter((r) => r.varian_kecepatan === 'B'),
  };

  console.log(`\nBENTENG — ${rows.length} match headless  (bot-driven, player = skrip)\n`);

  if (args.perMatch) {
    console.log(`${pad('policy', 10)}${pad('var', 5)}${padLeft('durasi', 8)}${padLeft('tag', 5)}${padLeft('near', 6)}${padLeft('resc', 6)}  hasil`);
    for (const row of rows) {
      console.log(
        pad(row.policy, 10) + pad(row.varian_kecepatan, 5)
        + padLeft(row.durasi, 8) + padLeft(row.jumlah_tag_total, 5)
        + padLeft(row.jumlah_near_miss, 6) + padLeft(row.jumlah_penyelamatan_rantai, 6)
        + '  ' + row.hasil,
      );
    }
    console.log('');
  }

  const metrics = [
    ['durasi rata2 (s)', 'durasiRata2', 1],
    ['durasi median (s)', 'durasiMedian', 1],
    ['durasi tersingkat (s)', 'durasiMin', 1],
    ['match habis waktu', 'habisWaktu', 0],
    ['tag / match', 'tag', 1],
    ['tag selisih tipis', 'tagTipis', 1],
    ['near-miss / match', 'nearMiss', 2],
    ['penyelamatan rantai', 'rescue', 2],
    ['percobaan rebut benteng', 'rebutBenteng', 2],
    ['pulang muatan <20 (%)', 'pulangKritis', 1],
    ['tawanan menganggur (s)', 'tawananDiam', 1],
    ['rantai maks', 'rantaiMaks', 2],
    ['detik di luar benteng', 'diLuarBenteng', 1],
  ];

  const columns = Object.entries(byVariant).map(([label, subset]) => ({
    label, summary: summarise(subset),
  }));
  const all = summarise(rows);

  console.log(pad('metrik', 26) + columns.map((c) => padLeft(c.label, 14)).join('') + padLeft('SEMUA', 14));
  console.log('─'.repeat(26 + 14 * (columns.length + 1)));
  for (const [label, key, digits] of metrics) {
    console.log(
      pad(label, 26)
      + columns.map((c) => padLeft(c.summary[key].toFixed(digits), 14)).join('')
      + padLeft(all[key].toFixed(digits), 14),
    );
  }

  console.log('\nsebab selesai:');
  for (const [reason, count] of Object.entries(all.reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pad(reason, 20)} ${padLeft(count, 3)}  (${((count / rows.length) * 100).toFixed(0)}%)`);
  }

  const aiTotals = new Map();
  for (const row of rows) {
    for (const [state, ticks] of row.aiStates) aiTotals.set(state, (aiTotals.get(state) || 0) + ticks);
  }
  const aiSum = [...aiTotals.values()].reduce((a, b) => a + b, 0) || 1;
  console.log('\nwaktu bot per peran:');
  for (const [state, ticks] of [...aiTotals].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pad(state, 20)} ${padLeft(((ticks / aiSum) * 100).toFixed(1), 6)}%`);
  }

  console.log('\ngate Fase 0 (yang bisa diukur mesin):');
  let failed = 0;
  for (const check of gate(all)) {
    if (!check.pass) failed += 1;
    console.log(`  ${check.pass ? 'LULUS' : 'GAGAL'}  ${pad(check.name, 50)} ${check.value}`);
  }
  console.log(`\n  ${failed === 0 ? 'Semua gate terukur lulus.' : `${failed} gate gagal.`}`);
  console.log('  Rasa seru dan "mau main lagi" tetap butuh manusia — ini hanya menyaring yang jelas rusak.\n');

  if (args.csv) {
    const lines = [PLAYTEST_HEADERS.concat('policy').join(',')];
    for (const row of rows) {
      lines.push(PLAYTEST_HEADERS.map((h) => row[h]).concat(row.policy).join(','));
    }
    writeFileSync(args.csv, `${lines.join('\n')}\n`);
    console.log(`CSV ditulis ke ${args.csv}\n`);
  }

  return failed;
}

process.exitCode = main() > 0 ? 1 : 0;
