// ═══════════════════════════════════════════════════════
// spotVisualRegistry.js — Spot dengan scene 3D POC terpisah dari Oola
// ═══════════════════════════════════════════════════════

import { BogorSpotRuntime } from './spots/BogorSpotRuntime.js';
import { MonasSpotRuntime } from './spots/MonasSpotRuntime.js';
import { MalioboroSpotRuntime } from './spots/MalioboroSpotRuntime.js';
import { LosariSpotRuntime } from './spots/LosariSpotRuntime.js';
import { KutaSpotRuntime } from './spots/KutaSpotRuntime.js';
import { BragaSpotRuntime } from './spots/BragaSpotRuntime.js';

/** Spot `id` (config) → kelas runtime visual POC. */
export const SPOT_VISUAL_RUNTIME = {
  bogor: BogorSpotRuntime,
  monas: MonasSpotRuntime,
  malioboro: MalioboroSpotRuntime,
  losari: LosariSpotRuntime,
  kuta: KutaSpotRuntime,
  braga: BragaSpotRuntime,
};

/** @param {string | null | undefined} spotId */
export function getVisualSpotRuntimeClass(spotId) {
  if (!spotId || !Object.prototype.hasOwnProperty.call(SPOT_VISUAL_RUNTIME, spotId)) {
    return null;
  }
  return SPOT_VISUAL_RUNTIME[spotId];
}
