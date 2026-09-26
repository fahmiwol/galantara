// Shared rules for every Galantara World contract: ids, vault references, raw-secret detection,
// and loadout (brain + equipment) checks. Browser-safe: no Node imports.
//
// Credentials never live in a contract object. A loadout points at a vault entry
// (`vault://<owner>/<id>`) that only the runtime can open. See docs/adr/0002.

// Each hired agent's tool list is bounded, which bounds its prompt and call budget.
export const MAX_EQUIPMENT = 8;

// Providers that run on hardware we own. Anything else is a cloud brain: allowed only through
// BYOK, and flagged, because the owner's doctrine is "own it, don't rent it".
export const SELF_HOSTED_PROVIDERS = new Set(['migancore', 'ollama', 'local']);

export const EQUIPMENT_KINDS = new Set(['api', 'mcp']);

export const ID = /^[a-z0-9][a-z0-9_-]{1,63}$/;

// Tenant part uses the same alphabet as owner_id, so every owner can have a vault.
const VAULT_REF = /^vault:\/\/([a-z0-9][a-z0-9_-]{1,63})\/([A-Za-z0-9_-]{6,64})$/;

// Exact key names only: a loose /token/ would also flag harmless keys such as `max_tokens`.
const SECRET_KEY =
  /^(api[_-]?key|apikey|secret|client[_-]?secret|(access|refresh|auth|id)[_-]?token|token|password|passwd|pwd|bearer|private[_-]?key|credentials?)$/i;

// Well-known credential prefixes. Not exhaustive; it catches the common paste mistakes.
const SECRET_VALUE =
  /^(sk-|sk_live_|sk_test_|rk_live_|AIza|ghp_|gho_|ghs_|github_pat_|glpat-|xox[abprs]-|hf_|r8_|AKIA|ASIA|Bearer\s)|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

export function isSelfHosted(provider) {
  return SELF_HOSTED_PROVIDERS.has(String(provider).toLowerCase());
}

// Returns { tenant, id } for a well-formed reference, otherwise null.
export function parseVaultRef(ref) {
  const m = VAULT_REF.exec(String(ref));
  return m ? { tenant: m[1], id: m[2] } : null;
}

// Walks any value and reports every place that looks like a raw credential.
export function findSecrets(value, path = '') {
  const found = [];
  const walk = (v, p) => {
    if (typeof v === 'string') {
      if (SECRET_VALUE.test(v.trim())) found.push(p || '(root)');
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${p}[${i}]`));
      return;
    }
    if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v)) {
        const childPath = p ? `${p}.${k}` : k;
        if (SECRET_KEY.test(k)) {
          found.push(childPath);
          continue;
        }
        walk(child, childPath);
      }
    }
  };
  walk(value, path);
  return found;
}

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function nonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

export function secretErrors(obj) {
  return findSecrets(obj).map((path) => ({
    path,
    pesan: 'Terdeteksi kredensial mentah. Simpan di BYOK Vault dan tulis vault_ref saja.',
  }));
}

// In a shared world an agent may only point at its owner's own vault. The runtime refuses a
// foreign reference too; checking here gives the owner a clear message before anything runs.
function checkVaultRef(ref, at, owner, errors) {
  const parsed = parseVaultRef(ref);
  if (!parsed) {
    errors.push({ path: at, pesan: 'Rujukan vault harus berbentuk vault://<pemilik>/<id>.' });
  } else if (parsed.tenant !== owner) {
    errors.push({ path: at, pesan: 'Rujukan vault ini milik pemain lain. Pakai kunci dari brankasmu sendiri.' });
  }
}

function checkBrain(brain, at, owner, errors, warnings) {
  if (!isPlainObject(brain)) {
    errors.push({ path: at, pesan: 'Otak (brain) wajib diisi: provider dan model.' });
    return;
  }
  if (!nonEmptyString(brain.provider)) errors.push({ path: `${at}.provider`, pesan: 'Provider otak kosong.' });
  if (!nonEmptyString(brain.model)) errors.push({ path: `${at}.model`, pesan: 'Model otak kosong.' });
  if (brain.vault_ref !== undefined) checkVaultRef(brain.vault_ref, `${at}.vault_ref`, owner, errors);
  if (nonEmptyString(brain.provider) && !isSelfHosted(brain.provider)) {
    if (brain.vault_ref === undefined) {
      errors.push({
        path: `${at}.vault_ref`,
        pesan: `Provider cloud "${brain.provider}" butuh kunci dari BYOK Vault (vault_ref). Kunci mentah tidak boleh ditulis di sini.`,
      });
    }
    warnings.push({ path: `${at}.provider`, pesan: `Otak "${brain.provider}" berjalan di cloud pihak lain, bukan self-hosted.` });
  }
}

function checkEquipment(list, at, owner, errors) {
  if (!Array.isArray(list)) {
    errors.push({ path: at, pesan: 'Equipment harus berupa daftar (boleh kosong).' });
    return;
  }
  if (list.length > MAX_EQUIPMENT) {
    errors.push({ path: at, pesan: `Maksimal ${MAX_EQUIPMENT} equipment per agen; ada ${list.length}.` });
  }
  const seen = new Set();
  list.forEach((eq, i) => {
    const p = `${at}[${i}]`;
    if (!isPlainObject(eq)) {
      errors.push({ path: p, pesan: 'Equipment harus berupa objek.' });
      return;
    }
    if (!EQUIPMENT_KINDS.has(eq.kind)) errors.push({ path: `${p}.kind`, pesan: 'Jenis equipment harus "api" atau "mcp".' });
    if (!nonEmptyString(eq.id) || !ID.test(eq.id)) {
      errors.push({ path: `${p}.id`, pesan: 'ID equipment tidak sah (huruf kecil, angka, - atau _).' });
    } else if (seen.has(eq.id)) {
      errors.push({ path: `${p}.id`, pesan: `Equipment "${eq.id}" dipasang dua kali.` });
    } else {
      seen.add(eq.id);
    }
    if (eq.scopes !== undefined && !(Array.isArray(eq.scopes) && eq.scopes.every(nonEmptyString))) {
      errors.push({ path: `${p}.scopes`, pesan: 'Scopes harus daftar teks.' });
    }
    if (eq.vault_ref !== undefined) checkVaultRef(eq.vault_ref, `${p}.vault_ref`, owner, errors);
  });
}

// Loadout = brain + equipment. Lives on the hired agent, not on a party slot: like a Pokémon's
// moves, it travels with the agent from party to party.
export function checkLoadout(loadout, at, owner, errors, warnings) {
  if (!isPlainObject(loadout)) {
    errors.push({ path: at, pesan: 'Loadout wajib diisi (otak + equipment).' });
    return;
  }
  checkBrain(loadout.brain, `${at}.brain`, owner, errors, warnings);
  checkEquipment(loadout.equipment ?? [], `${at}.equipment`, owner, errors);
}
