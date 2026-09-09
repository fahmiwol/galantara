import { clamp, distance } from './math.js';
import { calculateSpeed } from './SpeedModel.js';
import { fortPosition, otherTeam, TEAM } from './config.js';

// ═══════════════════════════════════════════════════════════════
// BotDirector — decides what a bot wants, and nothing else.
//
// Split out of BentengGame so bot behaviour can be measured and
// retuned (tools/benteng-sim.mjs) without touching the rule core.
// It reads world state and returns { target, state }; it never
// mutates the match. The only field it owns on a unit is `role`.
//
// Two ideas drive it:
//   1. Roles are assigned per team every tick, from the live roster.
//      No unit id is ever hardcoded — a team of any size still fields
//      a guard, and the guard rotates as the match moves.
//   2. A bot commits to the enemy fort only when its Muatan can pay
//      for the trip AND the capture channel. That single check is
//      what stops the opening from being an eight-unit suicide rush.
// ═══════════════════════════════════════════════════════════════

export const ROLE = Object.freeze({
  PENJAGA: 'penjaga',   // holds own fort, stays topped up
  PENYERANG: 'penyerang', // free to hunt, raid, and rescue
});

export class BotDirector {
  constructor(config, { reverseChargeSpeed = config.speed.reverseByDefault } = {}) {
    this.config = config;
    this.reverseChargeSpeed = reverseChargeSpeed;
  }

  /** Muatan lost per second while outside any fort. */
  get drainPerSecond() {
    return this.config.muatan.full / this.config.muatan.fullDuration;
  }

  // ── Roles ───────────────────────────────────────────────────
  //
  // Guard duty goes to whoever is already nearest to home among the
  // units that can still act. Nearest-to-home is deliberate: it is
  // the cheapest unit to keep home, and because it sits on the fort
  // it stays at full Muatan, which is exactly what a defender needs.
  //
  // Hysteresis: an incumbent guard keeps the job unless someone else
  // is clearly closer, so the role does not flap every decision tick.

  assignRoles(units, team) {
    const c = this.config;
    const roster = units.filter((unit) => unit.team === team && !unit.captured);
    for (const unit of roster) unit.role = ROLE.PENYERANG;
    if (!roster.length) return;

    // A team down to its last free unit must go free its mates,
    // otherwise it sits at home and loses by total_tawan.
    let wanted = roster.length <= 1 ? 0 : c.ai.guardsPerTeam;
    if (wanted <= 0) return;

    const ownFort = fortPosition(team, c);
    const ranked = [...roster].sort((a, b) => {
      const bias = (unit) => (unit.role === ROLE.PENJAGA ? -c.ai.guardStickiness : 0);
      return (distance(a.position, ownFort) + bias(a)) - (distance(b.position, ownFort) + bias(b));
    });

    // The human is never conscripted; players pick their own job.
    for (const unit of ranked) {
      if (wanted <= 0) break;
      if (unit.isPlayer) continue;
      unit.role = ROLE.PENJAGA;
      wanted -= 1;
    }
  }

  // ── Target ──────────────────────────────────────────────────

  /**
   * @param {object} unit  the bot deciding
   * @param {object} world { units, prisonersOf(team), chainEndOf(team) }
   * @returns {{ target: {x,y}, state: string }}
   */
  chooseTarget(unit, world) {
    const c = this.config;
    const profile = c.ai.profiles[unit.aggression] || c.ai.profiles[1];
    const ownFort = fortPosition(unit.team, c);
    const enemyFort = fortPosition(otherTeam(unit.team), c);
    const enemies = world.units.filter((u) => u.team !== unit.team && !u.captured);

    // 1. Guard duty outranks everything except its own survival.
    if (unit.role === ROLE.PENJAGA) {
      const guarded = this._guardTarget(unit, enemies, ownFort);
      if (guarded) return guarded;
    }

    // 2. Running on empty: home is both the refill and the safe place.
    if (unit.charge < profile.returnBelow) {
      return { target: ownFort, state: 'pulang' };
    }

    // 3. Something that beats me is closing in. Running home is only the
    //    right answer if home is actually reachable first; otherwise the
    //    move is to juke past it. Those close passes are the near-misses
    //    the Fase 0 gate is asking for, so the branch matters twice.
    const threat = this._nearestThreat(unit, enemies);
    if (threat && distance(unit.position, threat.position) < c.ai.fleeRadius) {
      return this._evade(unit, threat, ownFort);
    }

    // 4. Free the captured — a chain left alone is a lost match.
    const prisoners = world.prisonersOf(unit.team);
    if (prisoners.length) {
      const chainEnd = world.chainEndOf(unit.team);
      const nearestGuard = enemies
        .sort((a, b) => distance(a.position, chainEnd) - distance(b.position, chainEnd))[0];
      const canReach = !nearestGuard || unit.charge > nearestGuard.charge + c.tag.tieThreshold;
      if (canReach || prisoners.length >= c.match.teamSize - 1) {
        return { target: chainEnd, state: 'menolong' };
      }
    }

    // 5. Hunt someone this bot beats, if the profile is bold enough.
    const prey = enemies
      .filter((candidate) => unit.charge - candidate.charge > profile.huntMargin)
      .filter((candidate) => distance(unit.position, candidate.position) < c.ai.huntRadius)
      .sort((a, b) => distance(unit.position, a.position) - distance(unit.position, b.position))[0];
    if (prey) {
      return { target: { ...prey.position }, state: `buru ${prey.name}` };
    }

    // 6. Raid the enemy fort only when the Muatan budget survives the trip.
    if (unit.charge > profile.attackAbove && this._canAffordRaid(unit, enemyFort)) {
      return { target: enemyFort, state: 'serbu' };
    }

    // 7. Otherwise hold the middle and stay useful.
    return { target: this._patrolPoint(unit, world.elapsed), state: 'patroli' };
  }

  // ── Pieces ──────────────────────────────────────────────────

  _guardTarget(unit, enemies, ownFort) {
    const c = this.config;
    const intruder = enemies
      .filter((enemy) => distance(enemy.position, ownFort) < c.fort.radius + c.ai.guardSearchRadius)
      .sort((a, b) => distance(a.position, ownFort) - distance(b.position, ownFort))[0];

    // Only chase an intruder this guard actually beats, and only as far
    // as the leash — a guard that follows a decoy has stopped guarding.
    if (intruder && unit.charge >= intruder.charge + c.tag.tieThreshold) {
      const leashed = distance(intruder.position, ownFort) <= c.ai.guardLeashRadius;
      if (leashed) return { target: { ...intruder.position }, state: 'jaga benteng' };
    }
    if (distance(unit.position, ownFort) > c.fort.radius * 0.5) {
      return { target: ownFort, state: 'bertahan' };
    }
    // Sitting on the fort keeps Muatan at full; that is the job.
    return { target: ownFort, state: 'bertahan' };
  }

  /**
   * Outrun it, or slip past it. Comparing time-to-home against
   * time-to-be-caught is what decides which; a bot that always ran home
   * simply never met anyone, and the arena went quiet.
   */
  _evade(unit, threat, ownFort) {
    const c = this.config;
    const mySpeed = calculateSpeed(unit.charge, this.reverseChargeSpeed, c);
    const theirSpeed = calculateSpeed(threat.charge, this.reverseChargeSpeed, c);
    const timeHome = distance(unit.position, ownFort) / Math.max(mySpeed, 0.1);
    const timeCaught = distance(unit.position, threat.position) / Math.max(theirSpeed, 0.1);

    if (timeHome < timeCaught * c.ai.escapeConfidence) {
      return { target: ownFort, state: 'kabur' };
    }

    // Cornered: cut across the chaser instead of feeding it a straight line.
    // Pick the side of the perpendicular that keeps more arena in front.
    const away = {
      x: unit.position.x - threat.position.x,
      y: unit.position.y - threat.position.y,
    };
    const length = Math.hypot(away.x, away.y) || 1;
    const perpendicular = { x: -away.y / length, y: away.x / length };
    // Pick the side that also carries the bot toward its own fort. Any
    // rule based on absolute position (e.g. "dodge if y >= 0") gives one
    // team a handedness the other does not have — the arena is
    // point-symmetric, so the tie-break has to be team-relative too.
    const home = {
      x: ownFort.x - unit.position.x,
      y: ownFort.y - unit.position.y,
    };
    const side = (perpendicular.x * home.x + perpendicular.y * home.y) >= 0 ? 1 : -1;
    const reach = c.ai.jukeDistance;
    return {
      target: {
        x: clamp(
          unit.position.x + (perpendicular.x * side + away.x / length * 0.6) * reach,
          -c.arena.width / 2 + 1, c.arena.width / 2 - 1,
        ),
        y: clamp(
          unit.position.y + (perpendicular.y * side + away.y / length * 0.6) * reach,
          -c.arena.height / 2 + 1, c.arena.height / 2 - 1,
        ),
      },
      state: 'elak',
    };
  }

  _nearestThreat(unit, enemies) {
    const c = this.config;
    return enemies
      .filter((enemy) => enemy.charge > unit.charge + c.tag.tieThreshold)
      .sort((a, b) => distance(unit.position, a.position) - distance(unit.position, b.position))[0] || null;
  }

  /**
   * Can this unit reach the enemy fort and still hold the capture channel?
   * Travel drains at the base rate; standing on the enemy fort drains
   * `enemyFortDrainMultiplier` times faster. If the sum exceeds what the
   * unit carries, the raid is a donation to the other team.
   */
  _canAffordRaid(unit, enemyFort) {
    const c = this.config;
    const travelSeconds = distance(unit.position, enemyFort) / c.speed.base;
    const channelSeconds = c.fort.captureDuration;
    const cost = this.drainPerSecond
      * (travelSeconds + channelSeconds * c.muatan.enemyFortDrainMultiplier);
    return unit.charge >= cost * c.ai.raidSafetyFactor;
  }

  _patrolPoint(unit, elapsed) {
    const c = this.config;
    const phase = elapsed * 0.38 + unit.seed * 1.31;
    // Patrol on your own half; drifting across the line is what turned
    // "patroli" into an accidental rush.
    const side = unit.team === TEAM.BIRU ? -1 : 1;
    return {
      x: side * Math.abs(Math.sin(phase)) * c.arena.width * c.ai.patrolReach,
      y: Math.cos(phase * 0.83) * c.arena.height * 0.3,
    };
  }
}
