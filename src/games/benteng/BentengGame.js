import {
  BENTENG_CONFIG,
  TEAM,
  fortPosition,
  jailPosition,
  otherTeam,
} from './config.js';
import { calculateSpeed } from './SpeedModel.js';
import { resolveTag } from './TagResolver.js';
import {
  clamp,
  distance,
  expandedRectContains,
  insideCircle,
  moveToward,
  normalize,
} from './math.js';
import { PlaytestLogger } from './PlaytestLogger.js';
import { findRoute } from './navigation.js';
import { BotDirector } from './BotDirector.js';

const NOOP = () => {};

// Both teams field the same mix of bot temperaments. Deriving them from
// the unit index instead gave red an extra cautious bot and handed blue
// a measurable edge even when the human stood still.
const BOT_PROFILE_ORDER = Object.freeze([1, 0, 1, 2]);

/** Small deterministic PRNG — same seed, same match, every time. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pairKey(a, b) {
  return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
}

function makeUnit({ id, name, team, isPlayer = false, aggression = 1, x, y, config }) {
  const insideOwnFort = insideCircle({ x, y }, fortPosition(team, config), config.fort.radius);
  const seed = Number(id.replace(/\D/g, '')) + (team === TEAM.MERAH ? 5 : 1);
  return {
    id,
    name,
    team,
    isPlayer,
    aggression,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    desired: { x: 0, y: 0 },
    charge: config.muatan.full,
    captured: false,
    captureOrder: 0,
    immuneUntil: 0,
    burstRemaining: 0,
    wasInOwnFort: insideOwnFort,
    aiDecisionIn: 0,
    aiTarget: fortPosition(otherTeam(team), config),
    aiState: 'siap',
    botPullRate: config.jail.botPullRateMin
      + (seed % 5) / 4 * (config.jail.botPullRateMax - config.jail.botPullRateMin),
    botPullAccumulator: 0,
    lastPullAt: Number.NEGATIVE_INFINITY,
    channelTime: 0,
    route: [],
    seed,
  };
}

export class BentengGame {
  constructor({ config = BENTENG_CONFIG, callbacks = {}, seed = 1 } = {}) {
    this.config = config;
    this.seed = seed;
    this.callbacks = {
      onEvent: callbacks.onEvent || NOOP,
      onFinish: callbacks.onFinish || NOOP,
      onPlayerCaptured: callbacks.onPlayerCaptured || NOOP,
      onVariantChange: callbacks.onVariantChange || NOOP,
    };
    this.logger = new PlaytestLogger();
    this.director = new BotDirector(config);
    this.reverseChargeSpeed = config.speed.reverseByDefault;
    this.reset(this.reverseChargeSpeed);
  }

  reset(reverseChargeSpeed = this.reverseChargeSpeed, seed = this.seed) {
    const c0 = this.config;
    this.seed = seed;
    this.random = mulberry32(seed);
    this.reverseChargeSpeed = Boolean(reverseChargeSpeed);
    this.director.reverseChargeSpeed = this.reverseChargeSpeed;
    this.elapsed = 0;
    this.started = false;
    this.ended = false;
    this.result = null;
    this.timeScale = 1;
    this.nearSlowRemaining = 0;
    this.captureSequence = 0;
    this.units = this._createUnits();
    for (const unit of this.units) unit.aiDecisionIn = this.random() * c0.ai.decisionInterval * (c0.match.startJitter > 0 ? 1 : 0);
    this.player = this.units.find((unit) => unit.isPlayer);
    this.chains = {
      [TEAM.BIRU]: { extension: 0, lastPullAt: Number.NEGATIVE_INFINITY },
      [TEAM.MERAH]: { extension: 0, lastPullAt: Number.NEGATIVE_INFINITY },
    };
    this.captureProgress = { [TEAM.BIRU]: 0, [TEAM.MERAH]: 0 };
    this.captureWasActive = { [TEAM.BIRU]: false, [TEAM.MERAH]: false };
    this.pairCooldowns = new Map();
    this.previousDistances = new Map();
    this.lastNearMiss = new Map();
    // Assign roles before the first tick so the opening frame already has
    // a defender; waiting for the first update() left both forts nominally
    // unowned and made the pre-match state inconsistent with the HUD.
    for (const team of [TEAM.BIRU, TEAM.MERAH]) this.director.assignRoles(this.units, team);
    this.logger.reset(this.reverseChargeSpeed);
    this.callbacks.onPlayerCaptured(false);
    this.callbacks.onVariantChange(this.reverseChargeSpeed);
    return this.snapshot();
  }

  start() {
    if (this.ended) return;
    this.started = true;
    this.callbacks.onEvent({ type: 'start', message: 'JAGA NYALA. REBUT BENTENG.' });
  }

  toggleVariantAndRestart() {
    this.reset(!this.reverseChargeSpeed);
    this.start();
  }

  _createUnits() {
    const c = this.config;
    const blueFort = fortPosition(TEAM.BIRU, c);
    const redFort = fortPosition(TEAM.MERAH, c);
    const blueNames = ['Kamu', 'Kancil', 'Lentera', 'Rajawali'];
    const redNames = ['Bayang', 'Keris', 'Rimba', 'Guntur'];
    const offsets = [-1.7, -0.55, 0.55, 1.7];
    const result = [];
    const jitter = () => (this.random() - 0.5) * 2 * c.match.startJitter;

    for (let index = 0; index < c.match.teamSize; index += 1) {
      result.push(makeUnit({
        id: `B${index}`,
        name: blueNames[index] || `Biru ${index + 1}`,
        team: TEAM.BIRU,
        isPlayer: index === 0,
        aggression: BOT_PROFILE_ORDER[index],
        x: blueFort.x + 0.7 + jitter(),
        y: (offsets[index] || 0) + jitter(),
        config: c,
      }));
      result.push(makeUnit({
        id: `M${index}`,
        name: redNames[index] || `Merah ${index + 1}`,
        team: TEAM.MERAH,
        aggression: BOT_PROFILE_ORDER[index],
        x: redFort.x - 0.7 + jitter(),
        y: -(offsets[index] || 0) + jitter(),
        config: c,
      }));
    }
    return result;
  }

  update(realDelta, playerInput = { x: 0, y: 0 }) {
    if (!this.started || this.ended) return this.snapshot();
    const c = this.config;

    if (this.nearSlowRemaining > 0) {
      this.nearSlowRemaining = Math.max(0, this.nearSlowRemaining - realDelta);
      this.timeScale = this.nearSlowRemaining > 0 ? c.nearMiss.timeScale : 1;
    } else {
      this.timeScale = 1;
    }

    const delta = realDelta * this.timeScale;
    this.elapsed += delta;
    this._updateBotIntent(delta);
    this._moveUnits(delta, playerInput);
    this._updateMuatan(delta);
    this._resolveContacts();
    if (this.ended) return this.snapshot();
    this._updateChains(delta);
    this._checkRescues();
    this._updateCapture(delta);
    this._accumulateMetrics(delta);

    if (!this.ended && this.elapsed >= c.match.duration) this._finishByTime();
    return this.snapshot();
  }

  _updateBotIntent(delta) {
    for (const team of [TEAM.BIRU, TEAM.MERAH]) {
      this.director.assignRoles(this.units, team);
    }
    for (const unit of this.units) {
      if (unit.isPlayer || unit.captured) continue;
      unit.aiDecisionIn -= delta;
      if (unit.aiDecisionIn > 0) continue;
      unit.aiDecisionIn = this.config.ai.decisionInterval;
      this._chooseBotTarget(unit);
      unit.route = findRoute(unit.position, unit.aiTarget, this.config.arena.obstacles, this.config.arena.unitRadius);
    }
  }

  _chooseBotTarget(unit) {
    const { target, state } = this.director.chooseTarget(unit, {
      units: this.units,
      elapsed: this.elapsed,
      prisonersOf: (team) => this.getPrisoners(team),
      chainEndOf: (team) => this.getChainEnd(team),
    });
    unit.aiTarget = target;
    unit.aiState = state;
  }

  _moveUnits(delta, playerInput) {
    const c = this.config;
    for (const unit of this.units) {
      if (unit.captured) continue;

      while (unit.route.length && distance(unit.position, unit.route[0]) < 0.25) unit.route.shift();
      const target = unit.route[0] || unit.position;
      let desired = unit.isPlayer
        ? (Math.hypot(playerInput.x, playerInput.y) > 1 ? normalize(playerInput) : playerInput)
        : normalize({
          x: target.x - unit.position.x,
          y: target.y - unit.position.y,
        });
      unit.desired = desired;

      let speed = calculateSpeed(unit.charge, this.reverseChargeSpeed, c);
      if (unit.burstRemaining > 0) {
        speed *= c.speed.exitBurstMultiplier;
        unit.burstRemaining = Math.max(0, unit.burstRemaining - delta);
      }

      const moving = Math.hypot(desired.x, desired.y) > Number.EPSILON;
      const responseTime = moving ? c.speed.accelerationTime : c.speed.decelerationTime;
      const maxVelocityChange = (speed / responseTime) * delta;
      const targetX = moving ? desired.x * speed : 0;
      const targetY = moving ? desired.y * speed : 0;
      unit.velocity.x = moveToward(unit.velocity.x, targetX, maxVelocityChange);
      unit.velocity.y = moveToward(unit.velocity.y, targetY, maxVelocityChange);
      unit.position.x += unit.velocity.x * delta;
      unit.position.y += unit.velocity.y * delta;
      this._constrainToArena(unit);
      this._resolveObstacleCollisions(unit);
    }
    this._separateTeammates();
    for (const unit of this.units) if (!unit.captured) {
      this._constrainToArena(unit);
      this._resolveObstacleCollisions(unit);
    }
  }

  _steerAroundObstacles(unit, desired) {
    const c = this.config;
    if (!desired.x && !desired.y) return desired;
    const probe = {
      x: unit.position.x + desired.x * c.ai.obstacleLookAhead,
      y: unit.position.y + desired.y * c.ai.obstacleLookAhead,
    };
    const blocked = c.arena.obstacles.find((rect) =>
      expandedRectContains(probe, rect, c.arena.unitRadius),
    );
    if (!blocked) return desired;
    const side = unit.seed % 2 ? 1 : -1;
    return normalize({ x: -desired.y * side, y: desired.x * side });
  }

  _constrainToArena(unit) {
    const c = this.config;
    const halfW = c.arena.width / 2 - c.arena.wallPadding - c.arena.unitRadius;
    const halfH = c.arena.height / 2 - c.arena.wallPadding - c.arena.unitRadius;
    const nextX = clamp(unit.position.x, -halfW, halfW);
    const nextY = clamp(unit.position.y, -halfH, halfH);
    if (nextX !== unit.position.x) unit.velocity.x *= -0.25;
    if (nextY !== unit.position.y) unit.velocity.y *= -0.25;
    unit.position.x = nextX;
    unit.position.y = nextY;
  }

  _resolveObstacleCollisions(unit) {
    const c = this.config;
    const radius = c.arena.unitRadius;
    for (const rect of c.arena.obstacles) {
      if (!expandedRectContains(unit.position, rect, radius)) continue;
      const left = rect.x - rect.width / 2 - radius;
      const right = rect.x + rect.width / 2 + radius;
      const top = rect.y - rect.height / 2 - radius;
      const bottom = rect.y + rect.height / 2 + radius;
      const distances = [
        { edge: 'left', value: Math.abs(unit.position.x - left) },
        { edge: 'right', value: Math.abs(right - unit.position.x) },
        { edge: 'top', value: Math.abs(unit.position.y - top) },
        { edge: 'bottom', value: Math.abs(bottom - unit.position.y) },
      ].sort((a, b) => a.value - b.value);
      switch (distances[0].edge) {
        case 'left': unit.position.x = left; unit.velocity.x = Math.min(0, unit.velocity.x); break;
        case 'right': unit.position.x = right; unit.velocity.x = Math.max(0, unit.velocity.x); break;
        case 'top': unit.position.y = top; unit.velocity.y = Math.min(0, unit.velocity.y); break;
        default: unit.position.y = bottom; unit.velocity.y = Math.max(0, unit.velocity.y); break;
      }
    }
  }

  _separateTeammates() {
    const minDistance = this.config.arena.unitRadius * 1.45;
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i];
      if (a.captured) continue;
      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j];
        if (b.captured || a.team !== b.team) continue;
        const gap = distance(a.position, b.position);
        if (gap <= 0 || gap >= minDistance) continue;
        const away = normalize({ x: b.position.x - a.position.x, y: b.position.y - a.position.y });
        const push = (minDistance - gap) / 2;
        a.position.x -= away.x * push;
        a.position.y -= away.y * push;
        b.position.x += away.x * push;
        b.position.y += away.y * push;
      }
    }
  }

  _updateMuatan(delta) {
    const c = this.config;
    for (const unit of this.units) {
      if (unit.captured) continue;
      const ownFort = fortPosition(unit.team, c);
      const enemyFort = fortPosition(otherTeam(unit.team), c);
      const insideOwn = insideCircle(unit.position, ownFort, c.fort.radius);
      const insideEnemy = insideCircle(unit.position, enemyFort, c.fort.radius);

      if (insideOwn) {
        if (!unit.wasInOwnFort) {
          this.logger.recordReturn(unit.charge);
          this.callbacks.onEvent({ type: 'refill', unit });
        }
        unit.charge = c.muatan.full;
      } else {
        if (unit.wasInOwnFort) {
          unit.burstRemaining = c.speed.exitBurstDuration;
          this.callbacks.onEvent({ type: 'burst', unit });
        }
        const multiplier = insideEnemy ? c.muatan.enemyFortDrainMultiplier : 1;
        unit.charge = clamp(
          unit.charge - (c.muatan.full / c.muatan.fullDuration) * multiplier * delta,
          0,
          c.muatan.full,
        );
      }
      unit.wasInOwnFort = insideOwn;
    }
  }

  _resolveContacts() {
    const c = this.config;
    for (let i = 0; i < this.units.length; i += 1) {
      const a = this.units[i];
      if (a.captured) continue;
      for (let j = i + 1; j < this.units.length; j += 1) {
        const b = this.units[j];
        if (b.captured || a.team === b.team) continue;
        const key = pairKey(a, b);
        const currentDistance = distance(a.position, b.position);
        const previousDistance = this.previousDistances.get(key) ?? currentDistance;
        const lastContact = this.pairCooldowns.get(key) ?? Number.NEGATIVE_INFINITY;
        const canContact = this.elapsed - lastContact >= c.tag.pairCooldown;
        const immune = a.immuneUntil > this.elapsed || b.immuneUntil > this.elapsed;

        if (currentDistance <= c.tag.radius && canContact && !immune) {
          const outcome = resolveTag(a, b, c);
          this.pairCooldowns.set(key, this.elapsed);
          if (outcome.type === 'capture') {
            this.logger.recordTag(
              outcome.winner.charge,
              outcome.loser.charge,
              outcome.difference,
              c.tag.thinDifference,
            );
            this._capture(outcome.winner, outcome.loser, outcome.difference);
            this.previousDistances.set(key, currentDistance);
            if (this.ended) return;
            if (a.captured) break;
            continue;
          }
          if (outcome.type === 'bounce') this._bounce(a, b, outcome.difference);
        } else if (
          previousDistance <= c.tag.radius + c.nearMiss.distance
          && currentDistance > previousDistance
          && this.elapsed - lastContact > c.nearMiss.noTagWindow
          && !immune
        ) {
          const escaping = a.charge < b.charge ? a : b.charge < a.charge ? b : null;
          if (escaping) {
            const last = this.lastNearMiss.get(escaping.id) ?? Number.NEGATIVE_INFINITY;
            if (this.elapsed - last >= c.nearMiss.unitCooldown) {
              this.lastNearMiss.set(escaping.id, this.elapsed);
              this.nearSlowRemaining = c.nearMiss.duration;
              this.timeScale = c.nearMiss.timeScale;
              this.logger.recordNearMiss();
              this.callbacks.onEvent({ type: 'nearMiss', unit: escaping });
            }
          }
        }
        this.previousDistances.set(key, currentDistance);
      }
    }
  }

  _bounce(a, b, difference) {
    const direction = normalize(
      { x: b.position.x - a.position.x, y: b.position.y - a.position.y },
      { x: 1, y: 0 },
    );
    a.velocity.x = -direction.x * this.config.tag.bounceSpeed;
    a.velocity.y = -direction.y * this.config.tag.bounceSpeed;
    b.velocity.x = direction.x * this.config.tag.bounceSpeed;
    b.velocity.y = direction.y * this.config.tag.bounceSpeed;
    this.callbacks.onEvent({ type: 'bounce', units: [a, b], difference });
  }

  _capture(winner, loser, difference) {
    loser.captured = true;
    loser.captureOrder = ++this.captureSequence;
    loser.velocity.x = 0;
    loser.velocity.y = 0;
    loser.burstRemaining = 0;
    loser.channelTime = 0;
    loser.lastPullAt = this.elapsed;
    this._layoutPrisoners(loser.team);
    this.callbacks.onEvent({ type: 'tag', winner, loser, difference });
    if (loser.isPlayer) this.callbacks.onPlayerCaptured(true);

    if (this.getPrisoners(loser.team).length === this.config.match.teamSize) {
      this._finish(winner.team, 'total_tawan');
    }
  }

  _updateChains(delta) {
    const c = this.config;
    for (const team of Object.values(TEAM)) {
      const prisoners = this.getPrisoners(team);
      const chain = this.chains[team];
      if (!prisoners.length) {
        chain.extension = 0;
        continue;
      }

      for (const prisoner of prisoners) {
        if (prisoner.isPlayer) continue;
        prisoner.botPullAccumulator += delta * prisoner.botPullRate;
        while (prisoner.botPullAccumulator >= 1) {
          prisoner.botPullAccumulator -= 1;
          this.pullChain(team, prisoner);
        }
      }

      if (this.elapsed - chain.lastPullAt > c.jail.pullIdleDelay) {
        chain.extension = Math.max(0, chain.extension - c.jail.pullDecay * delta);
      }
      this._layoutPrisoners(team);
    }
  }

  pullPlayerChain() {
    if (!this.player?.captured) return false;
    return this.pullChain(this.player.team, this.player);
  }

  pullChain(team, actor) {
    if (!this.started || this.ended) return false;
    const prisoners = this.getPrisoners(team);
    if (!prisoners.length) return false;
    const chain = this.chains[team];
    const baseLength = this.config.jail.chainSpacing * prisoners.length;
    chain.extension = Math.min(
      baseLength * this.config.jail.maxPullRatio,
      chain.extension + this.config.jail.pullPerTap,
    );
    chain.lastPullAt = this.elapsed;
    if (actor?.captured && actor.team === team) actor.lastPullAt = this.elapsed;
    this._layoutPrisoners(team);
    this.callbacks.onEvent({ type: 'pull', team, extension: chain.extension });
    return true;
  }

  _layoutPrisoners(team) {
    const prisoners = this.getPrisoners(team);
    if (!prisoners.length) return;
    const c = this.config;
    const jail = jailPosition(team, c);
    const direction = team === TEAM.BIRU ? -1 : 1;
    const extension = this.chains[team].extension;
    prisoners.forEach((unit, index) => {
      const ratio = (index + 1) / prisoners.length;
      unit.position.x = jail.x + direction * (c.jail.chainSpacing * (index + 1) + extension * ratio);
      unit.position.y = jail.y;
    });
  }

  getPrisoners(team) {
    return this.units
      .filter((unit) => unit.team === team && unit.captured)
      .sort((a, b) => a.captureOrder - b.captureOrder);
  }

  getChainEnd(team) {
    const prisoners = this.getPrisoners(team);
    if (!prisoners.length) return jailPosition(team, this.config);
    return { ...prisoners[prisoners.length - 1].position };
  }

  getChainLength(team) {
    const prisoners = this.getPrisoners(team);
    if (!prisoners.length) return 0;
    return this.config.jail.chainSpacing * prisoners.length + this.chains[team].extension;
  }

  _checkRescues() {
    for (const team of Object.values(TEAM)) {
      const prisoners = this.getPrisoners(team);
      if (!prisoners.length) continue;
      const end = this.getChainEnd(team);
      const rescuer = this.units.find((unit) =>
        unit.team === team
        && !unit.captured
        && distance(unit.position, end) <= this.config.jail.rescueRadius,
      );
      if (rescuer) this._releaseTeam(team, rescuer);
    }
  }

  _releaseTeam(team, rescuer) {
    const c = this.config;
    const prisoners = this.getPrisoners(team);
    const ownFort = fortPosition(team, c);
    for (const prisoner of prisoners) {
      const away = normalize({
        x: ownFort.x - prisoner.position.x,
        y: ownFort.y - prisoner.position.y,
      });
      prisoner.captured = false;
      prisoner.charge = c.muatan.freedCharge;
      prisoner.immuneUntil = this.elapsed + c.tag.rescueImmunity;
      prisoner.velocity.x = away.x * c.speed.base * c.jail.releasePushMultiplier;
      prisoner.velocity.y = away.y * c.speed.base * c.jail.releasePushMultiplier;
      prisoner.wasInOwnFort = false;
    }
    this.chains[team].extension = 0;
    this.chains[team].lastPullAt = Number.NEGATIVE_INFINITY;
    this.logger.recordRescue();
    this.callbacks.onEvent({ type: 'rescue', team, rescuer, count: prisoners.length });
    if (team === this.player.team) this.callbacks.onPlayerCaptured(false);
  }

  _updateCapture(delta) {
    const c = this.config;
    for (const team of Object.values(TEAM)) {
      const targetFort = fortPosition(otherTeam(team), c);
      const attackers = this.units.filter((unit) => unit.team === team);
      for (const unit of attackers) {
        const inside = !unit.captured && insideCircle(unit.position, targetFort, c.fort.radius);
        if (inside && unit.channelTime === 0) this.logger.recordCaptureAttempt();
        unit.channelTime = inside ? unit.channelTime + delta : 0;
      }
      const active = attackers.some((unit) => unit.channelTime > 0);
      if (active) {
        this.captureProgress[team] = Math.max(...attackers.map((unit) => unit.channelTime));
        if (this.captureProgress[team] >= c.fort.captureDuration) {
          this._finish(team, 'rebut_benteng');
          return;
        }
      } else {
        this.captureProgress[team] = 0;
      }
      this.captureWasActive[team] = active;
    }
  }

  _accumulateMetrics(delta) {
    let outsideUnits = 0;
    let idlePrisoners = 0;
    for (const unit of this.units) {
      if (!unit.captured && !insideCircle(
        unit.position,
        fortPosition(unit.team, this.config),
        this.config.fort.radius,
      )) outsideUnits += 1;
      if (unit.captured) {
        if (this.elapsed - unit.lastPullAt > this.config.jail.pullIdleDelay) idlePrisoners += 1;
      }
    }
    const maxChain = Math.max(
      this.getChainLength(TEAM.BIRU),
      this.getChainLength(TEAM.MERAH),
    );
    this.logger.accumulate(outsideUnits * delta, idlePrisoners * delta, maxChain);
  }

  _finishByTime() {
    const blueScore = this.getPrisoners(TEAM.MERAH).length;
    const redScore = this.getPrisoners(TEAM.BIRU).length;
    if (blueScore === redScore) this._finish(null, 'seri_waktu');
    else this._finish(blueScore > redScore ? TEAM.BIRU : TEAM.MERAH, 'skor_waktu');
  }

  _finish(winner, reason) {
    if (this.ended) return;
    this.ended = true;
    this.started = false;
    this.timeScale = 1;
    this.nearSlowRemaining = 0;
    const result = winner ? `${winner}_${reason}` : reason;
    const row = this.logger.finish(
      Math.min(this.elapsed, this.config.match.duration),
      result,
      this.units.length,
    );
    this.result = { winner, reason, row };
    this.callbacks.onFinish(this.result);
  }

  scores() {
    return {
      [TEAM.BIRU]: this.getPrisoners(TEAM.MERAH).length,
      [TEAM.MERAH]: this.getPrisoners(TEAM.BIRU).length,
    };
  }

  snapshot() {
    return {
      config: this.config,
      units: this.units,
      player: this.player,
      elapsed: this.elapsed,
      remaining: Math.max(0, this.config.match.duration - this.elapsed),
      started: this.started,
      ended: this.ended,
      result: this.result,
      reverseChargeSpeed: this.reverseChargeSpeed,
      captureProgress: this.captureProgress,
      chains: this.chains,
      scores: this.scores(),
      timeScale: this.timeScale,
      forts: {
        [TEAM.BIRU]: fortPosition(TEAM.BIRU, this.config),
        [TEAM.MERAH]: fortPosition(TEAM.MERAH, this.config),
      },
      jails: {
        [TEAM.BIRU]: jailPosition(TEAM.BIRU, this.config),
        [TEAM.MERAH]: jailPosition(TEAM.MERAH, this.config),
      },
    };
  }
}
