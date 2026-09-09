export const TEAM = Object.freeze({ BIRU: 'biru', MERAH: 'merah' });

export const BENTENG_CONFIG = Object.freeze({
  simulation: Object.freeze({ fixedStep: 1 / 60, maxFrame: 0.1 }),
  arena: Object.freeze({
    width: 40,
    height: 24,
    wallPadding: 0.72,
    unitRadius: 0.52,
    obstacles: Object.freeze([
      Object.freeze({ x: 0, y: 0, width: 2.2, height: 7.2, kind: 'bambu' }),
      Object.freeze({ x: -6.2, y: -5.2, width: 4.2, height: 1.7, kind: 'gerobak' }),
      Object.freeze({ x: 6.2, y: 5.2, width: 4.2, height: 1.7, kind: 'gerobak' }),
    ]),
  }),
  // startJitter spreads the opening line-up by up to N metres using a
  // per-match seed. 0 keeps every match byte-identical (the old
  // behaviour); the balance harness raises it so a run of matches is
  // a real sample instead of the same trajectory repeated.
  match: Object.freeze({ duration: 180, teamSize: 4, startJitter: 0 }),
  muatan: Object.freeze({
    full: 100,
    fullDuration: 25,
    enemyFortDrainMultiplier: 3,
    freedCharge: 50,
  }),
  speed: Object.freeze({
    base: 5,
    reverseByDefault: true,
    emptySlowMultiplier: 0.85,
    desperateBonus: 0.08,
    accelerationTime: 0.15,
    decelerationTime: 0.12,
    exitBurstMultiplier: 1.35,
    exitBurstDuration: 0.5,
  }),
  tag: Object.freeze({
    radius: 0.6,
    tieThreshold: 5,
    pairCooldown: 1,
    bounceSpeed: 4.6,
    thinDifference: 15,
    rescueImmunity: 0.85,
  }),
  fort: Object.freeze({
    radius: 3,
    insetX: 4,
    captureDuration: 3,
  }),
  jail: Object.freeze({
    insetX: 9,
    y: 5.8,
    chainSpacing: 1.2,
    rescueRadius: 0.8,
    pullPerTap: 0.04,
    maxPullRatio: 0.15,
    pullIdleDelay: 1,
    pullDecay: 0.5,
    botPullRateMin: 2,
    botPullRateMax: 4,
    releasePushMultiplier: 0.35,
  }),
  nearMiss: Object.freeze({
    // 0.5 m, not 0.3. Tag radius is 0.6 m, so the old band was 0.6-0.9 m:
    // at 5 m/s a pass crossed it in ~60 ms, roughly 4 frames. Too short to
    // read, and it fired 2.2x per match against a gate of 3. At 0.5 the
    // band is ~100 ms and the rate is 3.6x. Measured in
    // docs/BENTENG_BALANCE_LOG.md.
    distance: 0.5,
    timeScale: 0.25,
    duration: 0.15,
    // Slow-motion adalah umpan balik, bukan hiasan: ia ada supaya momen
    // PEMAIN terasa mendarat. Diukur 40 match, 100% near-miss terjadi
    // antar-bot — menghentikan waktu untuk kejadian di pojok arena yang
    // tak dilihat pemain membuatnya terbaca sebagai tersendat, bukan hadiah.
    // Percikan dan kilau lokal tetap muncul untuk semua near-miss.
    slowOnlyForPlayer: true,
    noTagWindow: 0.5,
    unitCooldown: 1.5,
  }),
  ai: Object.freeze({
    decisionInterval: 0.5,
    huntRadius: 10,
    guardSearchRadius: 5,
    obstacleLookAhead: 1.25,
    // Defence. Roles are assigned per team every tick from the live
    // roster (BotDirector), never from unit ids.
    guardsPerTeam: 1,
    guardLeashRadius: 8,      // a guard chases no further than this from home
    guardStickiness: 2.5,     // metres of bias keeping the incumbent guard
    // Attack. A raid must pay for travel plus the capture channel.
    raidSafetyFactor: 1.15,
    // Flight. The chase-or-go-home decision the Fase 0 gate looks for.
    fleeRadius: 3.4,          // danger zone, not "an enemy exists somewhere"
    escapeConfidence: 0.85,   // run home only if home really is reachable first
    jukeDistance: 3.2,        // how far a cornered bot cuts across its chaser
    patrolReach: 0.22,        // patrol stays on own half of the arena
    profiles: Object.freeze([
      Object.freeze({ name: 'Waspada', returnBelow: 40, huntMargin: 20, attackAbove: 74 }),
      Object.freeze({ name: 'Seimbang', returnBelow: 25, huntMargin: 10, attackAbove: 62 }),
      Object.freeze({ name: 'Nekat', returnBelow: 12, huntMargin: 3, attackAbove: 48 }),
    ]),
  }),
  visual: Object.freeze({
    dprCap: 2,
    fieldMargin: 24,
    auraWidth: 8,
    particleLimit: 180,
    unitLabelOffset: 1.05,
    chargeLabelOffset: 0.83,
    screenShakeTag: 7,
    screenShakeRescue: 11,
    bannerDuration: 1.4,
    teamColors: Object.freeze({ biru: '#38bdf8', merah: '#fb7185' }),
    teamDark: Object.freeze({ biru: '#075985', merah: '#9f1239' }),
    aura: Object.freeze({
      high: '#fff7d6',
      medium: '#fde047',
      low: '#fb923c',
      empty: '#94a3b8',
    }),
  }),
});

export function otherTeam(team) {
  return team === TEAM.BIRU ? TEAM.MERAH : TEAM.BIRU;
}

export function fortPosition(team, config = BENTENG_CONFIG) {
  const x = config.arena.width / 2 - config.fort.insetX;
  return { x: team === TEAM.BIRU ? -x : x, y: 0 };
}

export function jailPosition(prisonerTeam, config = BENTENG_CONFIG) {
  const x = config.arena.width / 2 - config.jail.insetX;
  return {
    x: prisonerTeam === TEAM.BIRU ? x : -x,
    y: prisonerTeam === TEAM.BIRU ? config.jail.y : -config.jail.y,
  };
}
