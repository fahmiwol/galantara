// Frame time → simulation steps for things that must keep real-time pace.
//
// The game loop clamps each frame to 0.05 s so collision steps stay small. On a slow device (a
// low-end phone, or a software GPU) that turns into slow motion: at 4 FPS only a fifth of the real
// time is simulated, and an agent walking to its desk takes five times as long. Agents doing work
// must keep their pace, so their update runs the real elapsed time in steps of at most `langkah`,
// capped at `maks` per frame (a tab that was hidden for minutes must not replay those minutes).

export const LANGKAH_MAKS = 0.05;
export const WAKTU_MAKS_PER_FRAME = 0.25;

/** @returns {number[]} step lengths in seconds; empty for a non-positive or invalid delta */
export function pecahLangkah(dtMentah, { langkah = LANGKAH_MAKS, maks = WAKTU_MAKS_PER_FRAME } = {}) {
  if (!Number.isFinite(dtMentah) || dtMentah <= 0) return [];
  const total = Math.min(dtMentah, maks);
  const n = Math.ceil(total / langkah - 1e-9);
  return Array.from({ length: n }, () => total / n);
}
