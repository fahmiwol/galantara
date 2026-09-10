# Deriving Social State Without Protocol: Notes From Building a Small Multiplayer World

**Practice report · Galantara · September 2026**
Author: built with Claude (Anthropic) under the direction of Fahmi Ghani.
Code: MIT. Everything below is reproducible from this repository.

---

## On the word "paper"

This is not novel research and it should not be read as such. Nothing here would
survive peer review as a contribution to knowledge. It is a **practice report**:
two techniques that worked, the failure modes that make them dangerous, and a
methodological discipline that emerged from getting things wrong four separate
times in one project.

The reason to write it down is not that the techniques are clever. It is that
**their failure modes are silent**, and silent failures do not get reported as
bugs — they get absorbed as "the thing feels a bit off."

Where a result is unremarkable, this document says so.

---

## 1. Setting

Galantara is a browser-based 3D social world set in Indonesia. Relevant
constraints, all of which shaped the results below:

| Constraint | Value |
| --- | --- |
| Client | Vanilla ES modules, no build step, Three.js r128 as a global |
| Transport | Socket.io; server relays position and chat, arbitrates nothing |
| Server authority | None. The server is a relay. |
| Target device | Mid-range Android in a browser |
| Codebase | 51 modules, ~10,800 lines |
| Tests | 60, pure Node, no browser |

The absence of server authority is the important one. It is not an oversight; it
is a resource decision by a solo project. Everything in §3 exists because of it.

---

## 2. Prior work, and where this sits

**Deterministic simulation from replicated input.** Lockstep networking —
famously described for *Age of Empires* by Bettner and Terrano (GDC 2001) —
transmits inputs rather than state and relies on every client computing the same
result. The correctness burden is identical to what §3 describes: if any client
diverges, nothing detects it.

**Client-side prediction and reconciliation.** The Valve Source engine
networking documentation and Gabriel Gambetta's write-ups on fast-paced
multiplayer describe the standard shape: authoritative server, predicting
client, reconciliation on mismatch. Galantara cannot use this — there is no
authority to reconcile against.

**What §3 does** is neither. It derives a *social* property (who is sitting at
which seat) from state that is already replicated for another reason (avatar
position). This is closer to a *derived view* in database terms than to
networking technique. It is not novel; it is the obvious thing to do once you
notice the data is already there. The contribution, if any, is naming the
obligation it creates.

**Colour legibility.** WCAG 2.2 SC 1.4.3 (contrast minimum) is the reflexive
tool, and §4 argues it is the wrong instrument for 3D surfaces. CIE76 ΔE\*ab in
CIELAB is used instead. Colour-vision-deficiency simulation uses the matrices of
Machado, Oliveira and Fernandes (2009). None of this is new; misapplying the
first one is, apparently, easy.

---

## 3. Deriving seat occupancy instead of transmitting it

### 3.1 The problem

A "Meja Nongkrong" (gathering table) needs four seats. Every client must agree
on who occupies which one, so that occupancy counts match, so that "join us"
picks a genuinely free seat, and so that sitting players are drawn seated.

The default design is a server map `{socketId → seatIndex}`, broadcast on change.

### 3.2 The observation

Player positions are **already broadcast** every 80 ms by `player_move`. A
sitting player's position is, by construction, the seat position. Adding a
second channel for seat state means adding a second source of truth that can
disagree with the first.

### 3.3 The method

No seat state is transmitted. Each client computes the mapping locally:

```
candidates ← {(player, seat) : dist(player, seat)² ≤ tolerance²}
sort candidates by dist², ties broken by socketId (lexicographic)
greedily assign, skipping seats already filled and players already seated
```

Determinism comes from two places: the distance ordering is total once ties are
broken by a globally unique, stably ordered key, and the greedy pass is
order-independent given a sorted input.

### 3.4 The invariant nobody tells you about

Greedy assignment is deterministic, but the *result* is only unambiguous if no
position can fall inside two seats' tolerance radii. Formally:

```
2 · tolerance < min distance between any two seats
```

This is not decorative. When the table was redesigned — seats moved from a
circle to a 2+1+1 arrangement to stop large-headed avatars from occluding the
table — the minimum seat distance fell from 1.44 m to 0.76 m. The tolerance had
to fall from 0.45 m to 0.34 m for the invariant to hold.

**A geometry change silently altered a networking property.** That is the
finding worth writing down. The invariant is exposed as
`jarakKursiTerdekat` / `toleransiKursi` and asserted in tests, so that moving
furniture cannot quietly break agreement between clients.

### 3.5 Validation

Tests (`tests/mejaNongkrong.test.mjs`, 15 assertions):

| Property | Method | Result |
| --- | --- | --- |
| Order independence | Same players, three input permutations | Identical seat maps |
| Invariant holds | Computed from geometry, not hard-coded | 0.76 m > 2 × 0.34 m |
| One player, one seat | 8-seat table where radii *do* overlap | Exactly one seat filled |
| Nearest free seat | Expected index computed, not memorised | Matches |
| Full table | Four occupants | Returns null, refuses to seat |

Browser verification with three simulated remote players plus the local player:
occupancy read 3/4 then 4/4, the join action took the only free seat, and a
fifth participant was refused. Local and remote sitting heights matched exactly
(−0.16, difference 0).

### 3.6 What this does not solve

- **No authority.** A modified client can place its avatar on a seat it should
  not have. There is no defence, and none is possible without a server.
- **No economic use.** The moment a seat has value — a paid spot, a reservation —
  this approach is wrong and must be replaced by server state.
- **Coupling.** Networking correctness now depends on furniture layout. The
  invariant test is the only thing standing between a designer moving a stool
  and two players seeing each other in different chairs.

### 3.7 Honest assessment

The technique is unremarkable. Its value is entirely in §3.4: **deriving state
converts a data-modelling decision into a geometric one, and the coupling is
invisible unless you name it.** If this report is useful to anyone, that is why.

---

## 4. Choosing the right instrument for colour legibility

### 4.1 The wrong answer, arrived at confidently

Auditing whether team colours read against the arena ground in the Benteng
minigame, I used WCAG luminance contrast. The existing green scored **1.14** —
far below the 3:1 threshold. The obvious conclusion was that it failed.

It did not fail. It read perfectly well, and had done for months.

### 4.2 Why

Luminance contrast measures difference in *lightness*. What makes a coloured 3D
surface separate from a coloured background is difference in *hue*. WCAG's
threshold exists for text on solid backgrounds, where lightness genuinely is the
governing variable. Applying it to a green figure on green ground answers a
question nobody asked.

Measured in CIELAB, the same pair scored **ΔE\*ab = 48.1** — comfortably
separated.

### 4.3 Method adopted

CIE76 ΔE\*ab, working threshold **ΔE ≥ 20**, evaluated additionally under
protanopia, deuteranopia and tritanopia using Machado et al. (2009). WCAG
luminance contrast is retained for text on solid backgrounds, where it is the
correct instrument.

ΔE ≥ 20 is a **chosen working threshold, not a standard.** It is defended as a
working threshold and not claimed as compliance.

### 4.4 A related error, made and corrected

The same confusion recurred elsewhere. Chat bubbles are hidden when the
character becomes smaller than **24 px** on screen. I documented this as "the
WCAG 2.5.8 minimum target size."

That citation is wrong. SC 2.5.8 governs *interactive targets*. A remote
avatar is not a click target. The threshold is defensible as a legibility
decision; it is not a compliance claim, and describing it as one would have made
a reasonable decision untrustworthy to anyone who checked.

**The pattern is worth naming: borrowing a number from a respected standard
borrows its authority too, and if the scope does not match, the borrowing is a
misrepresentation** — even when the number itself is fine.

---

## 5. Sizing screen-space overlays

HTML overlays attached to world positions do not shrink with distance. A player
400 units away still gets a full-size chat bubble above a sub-pixel dot.

A fixed distance cut-off is wrong: it does not adapt to FOV or viewport height,
so it is correct in exactly one screen configuration. The threshold is instead
derived from the perspective projection itself:

```
px_per_unit      = (viewport_height / (2 · tan(fov/2))) / distance
character_px     = CHARACTER_HEIGHT · px_per_unit
hide when character_px < 24
```

**Measured** at 1280×720, fov 45°:

| Distance | Character height | Bubble |
| ---: | ---: | :--- |
| 13.4 u | 119.9 px | shown |
| 36.0 u | 44.7 px | hidden (off-screen, sy = −159) |
| 64.9 u | 24.8 px | hidden (off-screen, sy = −339) |
| 84.6 u | 19.0 px | hidden (below threshold) |
| 408.9 u | 3.9 px | hidden (below threshold) |

The cut-off lands at ≈67 units and moves on its own when the viewport changes.

**The dangerous part is the denominator.** During verification, every layout
measurement in the automation environment returned `0` — `window.innerHeight`,
`document.documentElement.clientHeight`, the layer's `clientHeight`, the canvas.
`px_per_unit` became 0 and **every bubble was hidden. Chat was completely dead
with no error of any kind.**

The rule that follows generalises well beyond this feature:

> **A value that can be zero or unknown must never be grounds for hiding.**
> Skip the test and show. A feature that is silently empty will never be
> reported as a bug — it is simply absorbed as "chat doesn't work."

A related correction came from external review: caching a measurement because it
was non-zero is not enough either. The first measurement returned 22 × 370 px —
a vertical sliver produced by a transient layout — and was latched permanently.
`ResizeObserver` invalidation fixed it. **`> 0` is a sanity check, not proof of
correctness.**

---

## 6. Measurement discipline

Four incidents in one project, one shape.

| # | Claim | Reality | Instrument failure |
| --- | --- | --- | --- |
| 1 | "11.66 GB freed" | ~4.7 GB | Two files were hard links. **My own script printed the correct number and I dismissed it** because it contradicted my expectation. |
| 2 | Parameter sweep shows a sharp optimum | Artefact | 30 simulated matches were ~15 repeated trajectories; the simulation was deterministic. |
| 3 | "87% bias toward the blue team" | 29:23 with 28 draws | My control policy decided every frame (60 Hz) while bots decided every 0.5 s, and skipped pathfinding. **The harness invented the finding.** |
| 4 | "The chat bubble never disappears" | It does | `requestAnimationFrame` was frozen: **0 frames in 1 second**, 0.31 s of simulated time across 88 s of wall time. The feature was fine; the instrument was dead. |

Incidents 1 and 3 are the instructive ones, because in both the wrong number
*agreed with what I expected*, and in incident 1 the correct number was already
on screen.

**Rule adopted:** before reporting a measurement — especially a surprising one,
and *most especially* one that matches the hypothesis — run one check that the
instrument is alive and fair.

| Domain | Instrument check |
| --- | --- |
| Simulation / eval | Run a control arm first |
| Disk / space | Verify against one file of known size |
| Browser | Count frames in one second |
| LLM grounding | Ask a question whose answer is already certain |

This is not a new idea. It is a restatement of the control condition, which is
older than software. It is written here because knowing it did not stop me from
violating it four times.

### 6.1 The discipline caught a real defect elsewhere

The write-up of incident 3 was sent to a parallel project (MiganCore) evaluating
retrieval quality. Their verdict tool checked corpus generation but not the
per-answer time limit — and they had themselves changed that limit from 120 s to
300 s mid-run. A timing difference would have been read as a retrieval
difference, and the tool would have stayed silent. They added an eight-parameter
condition check and 26 tests.

That is the strongest evidence in this document that §6 is worth anything: the
failure mode transferred to a different domain, with different variable names,
and was found before it produced a wrong conclusion.

---

## 7. Balance validation, and a gate that is not passing

Benteng is a capture-and-rescue minigame. A headless harness
(`tools/benteng-sim.mjs`) runs 7 player archetypes with parameter sweeps.

Measured effect of the balance changes:

| Metric | Before | After |
| --- | ---: | ---: |
| Team wipes | 60% | 2% |
| Median match length | 77 s | 180 s |
| Returns home below critical load | 2.0% | 29.0% |
| Near-misses per match | 0.53 | 3.50 |

**One gate is not passing, and is recorded as such.** The metric "captured
player idle ≤ 25 s" reads 0.0 s in every harness run. This is not a pass — every
scripted policy pulls the rescue chain, so the metric *cannot* take any other
value. A `pasrah` (passive) policy was added and it still read 0.0 s, because
the scripted player was never captured across 12 runs.

Status: **UNVALIDATED, not passing.** A browser session with a genuinely
captured player recorded 115.87 s — more than four times the threshold.

The human playtest gate (20 matches, 10 per variant) has not been run. Tooling
is complete; the data is not.

---

## 8. Limitations

**Of the results.**

- Single project, single developer, one codebase. No comparison group.
- Multiplayer results come from *simulated* remote players in one browser. Real
  network conditions — jitter, packet loss, clock skew — are untested. Position
  interpolation could plausibly push a player outside seat tolerance during a
  lag spike; this has not been observed because it has not been tested.
- No performance measurement on the stated target device (mid-range Android).
  Any claim about performance there would be unfounded.
- The human playtest that would validate the game feel has not been run.

**Of the method.**

- §3 assumes an honest client. It is unsuitable for anything competitive or
  economic.
- The ΔE ≥ 20 threshold is chosen, not derived from perceptual studies for this
  viewing condition.
- §6 is a discipline, not a technique. It has no measurable effect size. Its
  only evidence is §6.1.

**Of the writing.**

- Written by an AI assistant working on the project, reporting on its own
  mistakes. That is a conflict of interest in both directions: incentive to
  minimise errors, and incentive to dramatise their correction. Every incident
  in §6 is traceable to a commit or a test; the reader should check rather than
  trust.

---

## 9. Self-criticism

Written deliberately, because a document that only reports what worked is
marketing.

**The seat derivation is over-documented relative to its difficulty.** It is
roughly 40 lines. An ADR, a test file, and a paper section is disproportionate.
The justification is the coupling in §3.4 — but a reader could reasonably
conclude the whole thing is dressed up.

**The 24 px threshold is still soft.** The WCAG misattribution was corrected, but
what replaced it is "24 px reads acceptably, and here is a comparable number."
That is a judgement wearing a number's clothes. A proper answer needs legibility
testing at the actual viewing conditions, which has not been done.

**§6 might be a story about one person being careless.** Four instrument
failures in one project could indicate a general trap, or it could indicate that
I was insufficiently careful four times. §6.1 is the only evidence for the former
and it is a single case. I am not confident which reading is correct.

**The art direction section is missing.** The most decision-dense work in this
project — the table redesign, where an external art director correctly diagnosed
that "round top + centre pedestal + round stools" is *patio furniture language*
and no amount of Indonesian props fixes a European silhouette — is not in this
document, because I do not know how to validate it. There is no ΔE for "reads as
a warung." That is a real gap, and the honest position is that visual identity
decisions in this project are currently defended by argument and one external
opinion, not by measurement.

**Nothing here is novel.** Every technique is either standard practice or an
obvious consequence of the constraints. If this document has value it is
negative knowledge: here is exactly how each of these fails, measured.

---

## 10. Reproducing

```bash
git clone https://github.com/fahmiwol/galantara
cd galantara
npm test                    # 60 tests
npx serve -p 4000 .         # world at localhost:4000, no build step

npm run install:server
npm run sim:benteng         # balance harness, §7
npm run audit:visual        # ΔE + CVD audit, §4
```

| Section | Where |
| --- | --- |
| §3 seat derivation | `src/world/MejaNongkrong.js`, `tests/mejaNongkrong.test.mjs` |
| §4 colour audit | `tools/benteng-visual-audit.mjs` |
| §5 overlay sizing | `src/ui/ChatBubble.js`, `tests/chatBubble.test.mjs` |
| §6 incidents | `docs/SESSION_2026-09-10_TEMUAN.md` |
| §7 balance | `tools/benteng-sim.mjs`, `docs/BENTENG_BALANCE_LOG.md` |
| Decisions | `docs/adr/` |

## References

- Bettner, P. & Terrano, M. (2001). *1500 Archers on a 28.8: Network Programming
  in Age of Empires and Beyond.* GDC.
- Machado, G. M., Oliveira, M. M. & Fernandes, L. A. F. (2009). A
  physiologically-based model for simulation of color vision deficiency.
  *IEEE Transactions on Visualization and Computer Graphics*, 15(6).
- W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2.* SC 1.4.3, 2.5.8.
- CIE (1976). *CIELAB colour space and the CIE76 colour-difference formula.*
- Valve Developer Community. *Source Multiplayer Networking.*
- Gambetta, G. *Fast-Paced Multiplayer* (client-side prediction and server
  reconciliation series).
