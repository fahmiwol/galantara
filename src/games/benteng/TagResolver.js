import { BENTENG_CONFIG } from './config.js';

/** Satu-satunya tempat keputusan hasil tag dibuat. */
export function resolveTag(unitA, unitB, config = BENTENG_CONFIG) {
  if (!unitA || !unitB || unitA.team === unitB.team) return { type: 'none' };
  if (unitA.captured || unitB.captured) return { type: 'none' };

  const difference = Math.abs(unitA.charge - unitB.charge);
  if (difference < config.tag.tieThreshold) {
    return { type: 'bounce', difference };
  }

  const winner = unitA.charge > unitB.charge ? unitA : unitB;
  const loser = winner === unitA ? unitB : unitA;
  return { type: 'capture', winner, loser, difference };
}

