// A hired agent: one individual owned by one player, created from a species template.
//
// Species (template) = who the character is in the world, versioned and read-only, e.g. Sari the
// scout of Galantara. Individual (this contract) = the Sari a player hired: its own nickname,
// loadout, and progress. Two players who both hire Sari own two different agents.

import { ID, isPlainObject, nonEmptyString, secretErrors, checkLoadout } from './umum.js';

export const AGENT_SCHEMA = 'galantara.agen/v1';

// Instance ids carry a prefix so they can never be mistaken for a species id in a slot.
export const INSTANCE_ID = /^ag_[a-z0-9]{6,32}$/;

const NICKNAME_MAX = 24;

export function validateAgent(agent) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(agent)) {
    return { ok: false, errors: [{ path: '(root)', pesan: 'Agen harus berupa objek.' }], warnings };
  }
  errors.push(...secretErrors(agent));

  if (agent.schema !== AGENT_SCHEMA) errors.push({ path: 'schema', pesan: `Skema harus "${AGENT_SCHEMA}".` });
  if (!INSTANCE_ID.test(agent.instance_id ?? '')) errors.push({ path: 'instance_id', pesan: 'ID agen tidak sah (ag_…).' });
  if (!ID.test(agent.owner_id ?? '')) errors.push({ path: 'owner_id', pesan: 'Pemilik agen (owner_id) tidak sah.' });

  const t = agent.template;
  if (!isPlainObject(t) || !ID.test(t.id ?? '') || !Number.isInteger(t.versi) || t.versi < 1) {
    errors.push({ path: 'template', pesan: 'Spesies agen wajib diisi: {id, versi ≥ 1}.' });
  }
  if (agent.julukan !== undefined) {
    if (!nonEmptyString(agent.julukan) || agent.julukan.trim().length > NICKNAME_MAX) {
      errors.push({ path: 'julukan', pesan: `Julukan 1–${NICKNAME_MAX} karakter.` });
    }
  }
  checkLoadout(agent.loadout, 'loadout', agent.owner_id, errors, warnings);
  return { ok: errors.length === 0, errors, warnings };
}
