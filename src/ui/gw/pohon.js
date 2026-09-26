// ═══════════════════════════════════════════════════════
// pohon.js — build UI as plain data, render it with textContent only.
//
// Views (tampilan.js) return trees of {tag, props, anak}; nothing in them touches the DOM, so
// they are unit-tested in Node. render() is the one place that creates elements, and it has
// no path to innerHTML: names, questions and mission reports come from the runtime and from
// other players, so every string lands as text (Game Engineer report §5.1 #2: XSS).
// ═══════════════════════════════════════════════════════

/**
 * @param {string} tag
 * @param {{kelas?:string, id?:string, teks?:string|number, attr?:Record<string,any>, on?:Record<string,Function>}|null} [props]
 * @param {...any} anak nodes, strings, arrays; null/false/'' are skipped
 */
export function h(tag, props, ...anak) {
  return {
    tag,
    props: props ?? {},
    anak: anak.flat(Infinity).filter((a) => a !== null && a !== undefined && a !== false && a !== ''),
  };
}

// Attributes a view may set. No on*, no style, no srcdoc: behaviour goes through `on`.
const ATTR_BOLEH = /^(aria-[a-z-]+|role|type|placeholder|maxlength|minlength|rows|href|target|rel|for|name|value|tabindex|inputmode|autocomplete|autocapitalize|spellcheck|disabled|title|data-[a-z0-9-]+|hidden|lang|dir|novalidate|required)$/;

/**
 * Links: https anywhere; http only on this machine (the Kantor runs on localhost in dev).
 * Everything else (javascript:, data:, relative tricks) is dropped.
 */
export function hrefAman(nilai) {
  let u;
  try {
    u = new URL(String(nilai));
  } catch {
    return null;
  }
  if (u.protocol === 'https:') return u.href;
  if (u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return u.href;
  return null;
}

/** @param {any} node @param {Document} [doc] @returns {Node} */
export function render(node, doc = globalThis.document) {
  if (typeof node === 'string' || typeof node === 'number') return doc.createTextNode(String(node));
  const el = doc.createElement(node.tag);
  const { kelas, id, attr, on, teks } = node.props;
  if (kelas) el.className = kelas;
  if (id) el.id = id;
  for (const [k, v] of Object.entries(attr ?? {})) {
    if (!ATTR_BOLEH.test(k) || v === undefined || v === null || v === false) continue;
    if (k === 'href') {
      const aman = hrefAman(v);
      if (aman) el.setAttribute('href', aman);
      continue;
    }
    el.setAttribute(k, v === true ? '' : String(v));
  }
  if (teks !== undefined && teks !== null) el.textContent = String(teks);
  for (const a of node.anak) el.appendChild(render(a, doc));
  for (const [nama, fn] of Object.entries(on ?? {})) {
    if (typeof fn === 'function') el.addEventListener(nama, fn);
  }
  return el;
}

// ── Helpers for tests and for finding things in a tree ──

/** All text in a tree, in order (props.teks and string children). */
export function teksPohon(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  const sendiri = node.props?.teks !== undefined && node.props?.teks !== null ? String(node.props.teks) : '';
  return [sendiri, ...node.anak.map(teksPohon)].filter(Boolean).join(' ');
}

/** Depth-first list of nodes matching `cocok(node)`. */
export function cariSemua(node, cocok) {
  if (!node || typeof node !== 'object') return [];
  return [...(cocok(node) ? [node] : []), ...node.anak.flatMap((a) => cariSemua(a, cocok))];
}

/** The first node whose own text (or a descendant's) equals `teks`. */
export function cariTombol(node, teks) {
  return cariSemua(node, (n) => (n.tag === 'button' || n.tag === 'a') && teksPohon(n).trim() === teks)[0] ?? null;
}
