# Galantara

**Galantara — buat duniamu sendiri: pasar malam digital Indonesia di browser.**

Galantara adalah **pasar malam digital Indonesia** di browser: kamu bisa **jalan-jalan**, **ngobrol**, dan lama-lama **membangun dunia sendiri** — Spot **publik atau privat**, **prop dan bangunan** dari preset dan generator, plus **avatar** yang bisa kamu bedakan. Proyek ini **open source**: format dunia dan aset dirancang supaya kontributor dan creator kecil bisa ikut, **tanpa** wajib punya tim modeling besar. Kami mengandalkan **procedural mesh**, **template**, **AI-aset** (mis. text→3D), dan **aset terbuka** yang dikurasi — supaya tampilan dan fungsi builder tetap hidup walau tim internal tetap ringan.

**Galantara** is a browser-based **digital night market** for Indonesia: hang out, chat, and grow toward **user-built worlds** — public or private Spots, props and structures from **presets + procedural generators + AI-assisted assets**, plus **customizable avatars**. The stack is **open source** and data-driven so contributors can extend it without a large in-house art team. Visual richness comes from **smart reuse, templates, and curated open assets** — not from pretending we ship a AAA art pipeline on day one.

## Kenapa beda

- **Tanpa install** — Web + WebGL; masuk lewat link.
- **Hyperlocal** — Indonesia sebagai setting produk, bukan skin generik.
- **Creator path** — Arah map / object / logic builder + Spot publik-privat (per roadmap).
- **Open source** — Kode dan arah format transparan untuk komunitas.
- **Realistis soal art** — Generator, AI mesh, preset, dan CC0; ekspektasi jelas untuk kontributor.

## Stack (ringkas)

- **Klien:** Three.js (vanilla ES modules), UI vanilla — `index.html`, `src/`.
- **Realtime:** Socket.io — `galantara-server/`.
- **Data / auth (arah):** Supabase.

## Dokumen produk & salinan publik

- **Value prop & variasi tagline:** [`docs/PUBLIC_VALUE_PROP.md`](docs/PUBLIC_VALUE_PROP.md)
- **Arah engine + builder:** [`docs/GALANTARA_BUILDER_SYSTEM.md`](docs/GALANTARA_BUILDER_SYSTEM.md)
- **Konteks agen / operasi:** [`docs/AGENT_SHARED_KNOWLEDGE.md`](docs/AGENT_SHARED_KNOWLEDGE.md)

## Kontributor

Kamu **tidak** perlu jago Blender untuk membantu: **bugfix**, **JSON map**, **preset procedural**, **dokumentasi**, **integrasi API aset**, dan **UI builder** sama berartinya dengan mengirim satu file `.blend`.

## Demo

Live: [galantara.io](https://galantara.io)
