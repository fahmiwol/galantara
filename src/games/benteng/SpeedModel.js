import { BENTENG_CONFIG } from './config.js';

/** Satu-satunya tempat perhitungan kecepatan unit. */
export function calculateSpeed(
  charge,
  reverseChargeSpeed,
  config = BENTENG_CONFIG,
) {
  const safeCharge = Math.max(0, Math.min(config.muatan.full, Number(charge) || 0));
  const { base, emptySlowMultiplier, desperateBonus } = config.speed;

  if (reverseChargeSpeed) {
    return base * (1 + (1 - safeCharge / config.muatan.full) * desperateBonus);
  }

  return safeCharge <= 0 ? base * emptySlowMultiplier : base;
}

