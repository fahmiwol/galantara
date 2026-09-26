// Party: which hired agents a player carries, at most four. Shared by the world (Galantara) and
// the markas (Mighan dashboard); both validate against this module, and so does the runtime.
//
// v2 (ADR-0005): slots hold agent instance ids. The loadout lives on the agent (agen.js), so an
// agent keeps its brain and equipment when it moves between parties.

import { INSTANCE_ID } from './agen.js';
import { ID, isPlainObject, nonEmptyString, secretErrors } from './umum.js';

export const SCHEMA = 'galantara.party/v2';

// Four roles keep coordination legible (Codex UI copy: "Empat peran maksimal agar koordinasi
// tetap jelas"). Enforced here so the server rejects a fifth member, not just the UI.
export const MAX_SLOTS = 4;

// Returns { ok, errors, warnings }. Errors block saving; messages are Indonesian because they
// reach players. When `agents` (instance_id → agent, object or Map) is given, every slot must
// point at an agent that exists and belongs to the same owner.
export function validateParty(party, { agents } = {}) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(party)) {
    return { ok: false, errors: [{ path: '(root)', pesan: 'Party harus berupa objek.' }], warnings };
  }
  errors.push(...secretErrors(party));

  if (party.schema !== SCHEMA) errors.push({ path: 'schema', pesan: `Skema harus "${SCHEMA}".` });
  if (!nonEmptyString(party.id) || !ID.test(party.id)) errors.push({ path: 'id', pesan: 'ID party tidak sah.' });
  if (!nonEmptyString(party.owner_id) || !ID.test(party.owner_id)) {
    errors.push({ path: 'owner_id', pesan: 'Pemilik party (owner_id) tidak sah.' });
  }
  if (!Array.isArray(party.slots)) {
    errors.push({ path: 'slots', pesan: 'Slots harus berupa daftar.' });
    return { ok: false, errors, warnings };
  }
  if (party.slots.length > MAX_SLOTS) {
    errors.push({ path: 'slots', pesan: `Party maksimal ${MAX_SLOTS} agen; ada ${party.slots.length} slot.` });
  }

  const seen = new Set();
  party.slots.forEach((slot, i) => {
    const p = `slots[${i}]`;
    if (slot === null) return; // "Slot kosong"
    if (typeof slot !== 'string' || !INSTANCE_ID.test(slot)) {
      errors.push({ path: p, pesan: 'Slot harus kosong (null) atau berisi ID agen (ag_…).' });
      return;
    }
    if (seen.has(slot)) {
      errors.push({ path: p, pesan: 'Agen yang sama tidak bisa mengisi dua slot.' });
      return;
    }
    seen.add(slot);
    if (agents) {
      const agent = agents instanceof Map ? agents.get(slot) : agents[slot];
      if (!agent) errors.push({ path: p, pesan: 'Agen ini tidak ada di rostermu.' });
      else if (agent.owner_id !== party.owner_id) errors.push({ path: p, pesan: 'Agen ini milik pemain lain.' });
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

export function emptyParty({ id, owner_id }) {
  return { schema: SCHEMA, id, owner_id, slots: Array(MAX_SLOTS).fill(null) };
}

export function memberCount(party) {
  return Array.isArray(party?.slots) ? party.slots.filter((s) => s !== null).length : 0;
}
