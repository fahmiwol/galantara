## Learned User Preferences

- Prefers agents read project documentation thoroughly and only continue implementation when the model clearly understands the product and codebase.
- Wants explicit handoff notes and a durable shared-knowledge index (`docs/AGENT_SHARED_KNOWLEDGE.md`) so Claude and other agents can resume and reuse patterns, references, and modules across projects.
- Values collaborator-style work: product ideas, suggestions, and implementation together, not silent coding only.
- Confirms product direction explicitly when aligned on UX or scope (for example guest presence versus login-only multiplayer).
- Wants primary onboarding to stay inside the game while the in-game "Tentang Galantara" entry opens a separate static landing page for project story, changelog, open-source contribution, sponsors or donors, and a suggestion channel.

## Learned Workspace Facts

- Galantara is framed as social-commerce hyperlocal digital market plus hangout with daily utility, not as a heavyweight metaverse.
- Client stack is Three.js vanilla ES modules with Supabase auth; multiplayer uses Socket.io from `galantara-server`.
- When documentation conflicts, prefer `SPRINT_LOG.md` and `CHANGELOG.md` plus the current codebase over older WRAP City handoff text unless reconciled with the PRD.
- Guests can join the default multiplayer room without Supabase login to see other players; chat and WebRTC relay are blocked for guests on client and server.
- Root npm package is named `galantara-repo`; scripts use `cd galantara-server && …` to avoid Windows npm quirks for nested installs.
- The `bank-tiranyx-temp/` folder in this workspace is minimal; a full Mighan ledger or wallet backend may live in another repo or deployment.
- Mighan coin economy and live wallet balances are not implemented end-to-end yet; HUD token UI remains placeholder until economy sprints documented in `TODO.md` and `docs/GALANTARA_EKONOMI_KOIN.md`.
- `docs/AGENT_SHARED_KNOWLEDGE.md` is the long-form hub for session changes, skill paths, gotchas, and module pointers for agents; it complements the short bullets in this file.
- Primary game shell is `index.html` loading the ES-module client; static `about.html` is the public-facing "Tentang" page wired from the in-game menu and related world zones.
- Production static site and multiplayer deploy are discussed in relation to the `galantara.io` hostname (coordinate `index.html`, `about.html`, `src/`, and `galantara-server/` when releasing).
