import test from 'node:test';
import assert from 'node:assert/strict';
import { BentengGame } from '../src/games/benteng/BentengGame.js';
import { BENTENG_CONFIG as C, TEAM, fortPosition } from '../src/games/benteng/config.js';
import { calculateSpeed } from '../src/games/benteng/SpeedModel.js';
import { resolveTag } from '../src/games/benteng/TagResolver.js';
import { findRoute, clearSegment } from '../src/games/benteng/navigation.js';
import { PLAYTEST_HEADERS } from '../src/games/benteng/PlaytestLogger.js';
import { ROLE } from '../src/games/benteng/BotDirector.js';

const close = (a,b) => assert.ok(Math.abs(a-b)<1e-7, `${a} != ${b}`);
function setup() { const game = new BentengGame(); game.start(); return game; }

test('normative charge, tag, duration and variants', () => {
  assert.equal(C.tag.radius, .6);
  assert.equal(C.match.duration, 180);
  close(calculateSpeed(100,true,C),5);
  close(calculateSpeed(0,true,C),5.4);
  close(calculateSpeed(1,false,C),5);
  close(calculateSpeed(0,false,C),4.25);
  const g=setup(), p=g.player;
  p.position={x:-10,y:0}; p.wasInOwnFort=false; g._updateMuatan(1); close(p.charge,96);
  p.position=fortPosition(TEAM.MERAH,C); g._updateMuatan(1); close(p.charge,84);
  p.position=fortPosition(TEAM.BIRU,C); g._updateMuatan(1); close(p.charge,100);
});

test('tag strictly below five bounces, five captures; friendly and captive ignored', () => {
  const a={team:'biru',charge:50},b={team:'merah',charge:46};
  assert.equal(resolveTag(a,b,C).type,'bounce'); b.charge=45;
  assert.equal(resolveTag(a,b,C).winner,a);
  b.team='biru'; assert.equal(resolveTag(a,b,C).type,'none');
  b.team='merah'; b.captured=true; assert.equal(resolveTag(a,b,C).type,'none');
});

test('capture channel cannot stack or transfer; leaving resets own channel', () => {
  const g=setup(); const [a,b]=g.units.filter(u=>u.team==='biru');
  a.position=fortPosition('merah',C); g._updateCapture(2);
  a.position={x:-10,y:0}; b.position=fortPosition('merah',C); g._updateCapture(.5);
  close(g.captureProgress.biru,.5); assert.equal(g.ended,false);
  a.position=fortPosition('merah',C); g._updateCapture(1); close(g.captureProgress.biru,1.5);
  g._updateCapture(1.5); assert.equal(g.result.reason,'rebut_benteng');
});

test('chain cap, individual idle tracking, whole-chain rescue and charge fifty', () => {
  const g=setup(), reds=g.units.filter(u=>u.team==='merah'), blues=g.units.filter(u=>u.team==='biru');
  g._capture(reds[0],blues[0],20); g._capture(reds[0],blues[1],20);
  for(let i=0;i<100;i++) g.pullChain('biru',blues[1]);
  close(g.chains.biru.extension,2*1.2*.15);
  g.elapsed=2; g.pullChain('biru',blues[1]); g._accumulateMetrics(1);
  close(g.logger.prisonerIdleSeconds,1);
  blues[2].position=g.getChainEnd('biru'); g._checkRescues();
  assert.equal(g.getPrisoners('biru').length,0);
  close(blues[0].charge,50); close(blues[1].charge,50);
  assert.ok(blues[0].immuneUntil>g.elapsed);
});

test('chain decays after idle and post-match pulling cannot mutate', () => {
  const g=setup(); g._capture(g.units[1],g.player,20);
  for(let i=0;i<4;i++) g.pullPlayerChain();
  g.elapsed=2; g._updateChains(.1); close(g.chains.biru.extension,.11);
  g._finishByTime(); assert.equal(g.pullPlayerChain(),false);
});

test('total capture, time score, draw and restart preserve unique CSV rows', () => {
  const g=setup(); const reds=g.units.filter(u=>u.team==='merah');
  for(const u of reds) g._capture(g.player,u,20);
  assert.equal(g.result.reason,'total_tawan'); assert.equal(g.result.winner,'biru');
  const id=g.result.row.match_id; g.reset(false); g.start(); g._finishByTime();
  assert.equal(g.result.reason,'seri_waktu'); assert.notEqual(g.result.row.match_id,id);
  assert.equal(g.logger.rows.length,2); assert.equal(g.result.row.varian_kecepatan,'A');
  assert.equal(PLAYTEST_HEADERS.length,14);
  assert.ok(g.logger.toCSV().trim().split('\n').every(l=>l.split(',').length===14));
  g.reset(); g.start(); g._capture(g.player, g.units[1],20); g._finishByTime();
  assert.equal(g.result.reason,'skor_waktu'); assert.equal(g.result.winner,'biru');
});

test('navigation routes around all expanded obstacles without intersecting', () => {
  let p={x:-16,y:0}; const goal={x:16,y:0};
  const route=findRoute(p,goal,C.arena.obstacles,C.arena.unitRadius);
  assert.ok(route.length>1);
  for(const next of route) { assert.ok(clearSegment(p,next,C.arena.obstacles,C.arena.unitRadius)); p=next; }
  assert.deepEqual(p,goal);
});

test('near miss is cooled down per escaping unit and slowdown expires in real time', () => {
  const g=setup(); g.units=g.units.slice(0,2); const [a,b]=g.units;
  a.position={x:-10,y:0}; b.position={x:-9.2,y:0}; a.charge=20; b.charge=50;
  g._resolveContacts(); b.position.x=-9.15; g._resolveContacts();
  assert.equal(g.logger.nearMisses,1); b.position.x=-9.1; g._resolveContacts();
  assert.equal(g.logger.nearMisses,1);
  for(let i=0;i<11;i++) g.update(1/60);
  assert.equal(g.timeScale,1);
});

test('twenty automated A/B scenarios finish with finite bounded state (not human playtests)', () => {
  for(let run=0;run<20;run++) {
    const g=setup(); g.reset(run%2===1); g.start();
    for(let tick=0;tick<15000 && !g.ended;tick++) {
      const t=tick/60; const input=run%3===0 ? {x:0,y:0} : {x:Math.cos(t*.3+run),y:Math.sin(t*.4+run)};
      g.update(1/60,input);
      for(const u of g.units) {
        assert.ok(Number.isFinite(u.position.x)&&Number.isFinite(u.position.y));
        assert.ok(u.charge>=0&&u.charge<=100);
        assert.ok(Math.abs(u.position.x)<=20&&Math.abs(u.position.y)<=12);
      }
    }
    assert.equal(g.ended,true,`run ${run} did not finish`);
    assert.equal(g.logger.rows.length,1);
  }
});

// ── BotDirector ──────────────────────────────────────────────
// Roles used to be hardcoded to unit ids ('B1' / 'M0'), which broke as
// soon as the roster changed and left both forts open in practice.

test('every team fields exactly one guard, and it is never the player', () => {
  const g = setup();
  for (const team of [TEAM.BIRU, TEAM.MERAH]) {
    const roster = g.units.filter((u) => u.team === team && !u.captured);
    const guards = roster.filter((u) => u.role === ROLE.PENJAGA);
    assert.equal(guards.length, 1, `${team} harus punya tepat satu penjaga`);
    assert.equal(guards[0].isPlayer, false, 'pemain tidak boleh dijadikan penjaga');
  }
});

test('guard duty rotates by proximity, and the last free unit stops guarding', () => {
  const g = setup();
  const blues = g.units.filter((u) => u.team === TEAM.BIRU && !u.isPlayer);
  const fort = fortPosition(TEAM.BIRU, C);
  // Park one bot on the fort and push the others far away.
  blues[0].position = { x: 15, y: 9 };
  blues[1].position = { x: 14, y: -9 };
  blues[2].position = { ...fort };
  g.director.assignRoles(g.units, TEAM.BIRU);
  assert.equal(blues[2].role, ROLE.PENJAGA);

  // Down to one free unit: it must go rescue, not sit at home.
  blues[0].captured = true;
  blues[1].captured = true;
  g.player.captured = true;
  g.director.assignRoles(g.units, TEAM.BIRU);
  assert.equal(blues[2].role, ROLE.PENYERANG);
});

test('a raid is only attempted when Muatan pays for travel plus the channel', () => {
  const g = setup();
  const enemyFort = fortPosition(TEAM.MERAH, C);
  const scout = g.units.find((u) => u.team === TEAM.BIRU && !u.isPlayer);
  scout.position = { x: enemyFort.x - 1, y: 0 };

  // Standing next to the fort, the cost is essentially the 3 s channel
  // at triple drain = 36 Muatan, plus the safety factor.
  scout.charge = 100;
  assert.equal(g.director._canAffordRaid(scout, enemyFort), true);
  scout.charge = 20;
  assert.equal(g.director._canAffordRaid(scout, enemyFort), false);

  // From across the arena the same charge no longer covers the trip.
  scout.position = { x: -18, y: 0 };
  scout.charge = 60;
  assert.equal(g.director._canAffordRaid(scout, enemyFort), false);
});

test('a cornered bot cuts across its chaser instead of running home', () => {
  const g = setup();
  const ownFort = fortPosition(TEAM.BIRU, C);
  const runner = g.units.find((u) => u.team === TEAM.BIRU && !u.isPlayer);
  const chaser = g.units.find((u) => u.team === TEAM.MERAH);

  // Far from home with the chaser right behind: home is unreachable.
  runner.position = { x: 12, y: 0 };
  runner.charge = 40;
  chaser.position = { x: 13, y: 0 };
  chaser.charge = 90;
  assert.equal(g.director._evade(runner, chaser, ownFort).state, 'elak');

  // Sitting on its own doorstep, the same bot should just go home.
  runner.position = { x: ownFort.x + 0.5, y: 0 };
  assert.equal(g.director._evade(runner, chaser, ownFort).state, 'kabur');
});

test('evasion is team-relative, so neither side gets a handedness edge', () => {
  const g = setup();
  const blue = g.units.find((u) => u.team === TEAM.BIRU && !u.isPlayer);
  const red = g.units.find((u) => u.team === TEAM.MERAH);
  const blueFort = fortPosition(TEAM.BIRU, C);
  const redFort = fortPosition(TEAM.MERAH, C);

  // Mirror the pair through the origin; the escape routes must mirror too.
  blue.position = { x: 4, y: 2 }; blue.charge = 30;
  red.position = { x: 5, y: 2.5 }; red.charge = 90;
  const blueMove = g.director._evade(blue, red, blueFort);

  const redRunner = { ...red, team: TEAM.MERAH, position: { x: -4, y: -2 }, charge: 30 };
  const blueChaser = { ...blue, team: TEAM.BIRU, position: { x: -5, y: -2.5 }, charge: 90 };
  const redMove = g.director._evade(redRunner, blueChaser, redFort);

  assert.equal(blueMove.state, redMove.state);
  close(blueMove.target.x, -redMove.target.x);
  close(blueMove.target.y, -redMove.target.y);
});
