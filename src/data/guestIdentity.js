// ═══════════════════════════════════════════════════════
// guestIdentity.js — Id & nama tamu (persist localStorage)
// ═══════════════════════════════════════════════════════

const KEY_ID = 'galantara_guest_id';
const KEY_NAME = 'galantara_guest_name';

/**
 * Id tamu yang bertahan di browser ini. BUKAN identitas multiplayer: server
 * tidak mempercayai id dari klien dan memberi id publik sendiri per koneksi
 * (ADR-0023). Siapa pun bisa menulis nilai apa saja ke localStorage.
 */
export function getOrCreateGuestId() {
  try {
    let id = localStorage.getItem(KEY_ID);
    if (!id) {
      id =
        'guest:' +
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
      localStorage.setItem(KEY_ID, id);
    }
    return id;
  } catch {
    return 'guest:' + String(Date.now());
  }
}

export function getOrCreateGuestName() {
  try {
    let name = localStorage.getItem(KEY_NAME);
    if (!name) {
      name = 'Tamu ' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem(KEY_NAME, name);
    }
    return name;
  } catch {
    return 'Tamu';
  }
}
