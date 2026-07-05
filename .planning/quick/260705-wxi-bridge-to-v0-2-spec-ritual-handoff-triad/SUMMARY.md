---
gsd_artifact: summary
quick_id: 260705-wxi
slug: bridge-to-v0-2-spec-ritual-handoff-triad
status: complete
completed: 2026-07-05
requirements: [MECH-02]
verify: "35 suites / 277 tests green; copy gate 378 strings clean"
---

# Summary: Bridge aligned to v0.2 spec §4

Founder uploaded `trinket-dev-synthesis-v0.2.md` (persisted to
`.planning/source/`). Bridge v0 checked against §4: matched on
offer-among-equals / costless decline / no-pressure-surfaces / no bridges
table / gate-aware session handoff, but was missing the mechanic's heart.
Closed in this task:

- **The ritual** (`src/features/bridge/BridgeRitual.tsx`): user-paced
  two-step — "landing" (companion presence state = the breathing beat,
  shown never commanded; one self-compassion line from the new fixed
  localized 5-line library living in i18n locales = version-controlled, as
  §4 requires; random rotation, zero persistence) → "handoff" (tiny-first-
  action framing + the spec's triad).
- **Handoff triad**: ≤3 un-promoted dump items → session (gate-aware);
  "Set up a starter" → /starter; "Just close" → Home. All equal weight.
- **Offer stage** (co-pilot post-ending): now unconditional — the ritual has
  value with zero items; declining is one tap → Home.
- **Standalone /bridge route** + Home "Bridge"/"Pomost" link (spec: reachable
  when stuck between tasks); no offer stage there (user summoned it); item
  pick rides the existing dumpItemId promote param (gate preserved).
- `bridge_next` reshaped to `{ nextAction: 'session'|'starter'|'none' }`
  (closed tokens; §9 instrumentation, not completion tracking — nothing
  persisted per §4's own constraint-watch).
- screens.test.tsx ending tests updated to the new contract (mood/skip →
  bridge offer; Home via decline); bridge.test.tsx rewritten — 7 tests
  covering offer/decline/ritual/library/triad/newest-3/standalone.

Also in the v0.2 check, recorded for next steps: Soft landing is now SPECCED
(§3: user-configured pre-transition informational notifications, `landings`
data, no completion tracking — reuses Starter's notification plumbing);
light mode is §5 and item 1 in the spec's own build order; native surfaces
(§6-7) are the flagged senior-hire slice; the mascot module's
companion-agnosticism satisfies the §0 form-under-test warning.
