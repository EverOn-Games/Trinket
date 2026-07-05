---
gsd_artifact: plan
quick_id: 260705-wxi
slug: bridge-to-v0-2-spec-ritual-handoff-triad
created: 2026-07-05
mode: quick
requirements: [MECH-02]
---

# Quick Task: Bridge → v0.2 spec (ritual + handoff triad + standalone entry)

## Trigger

Founder uploaded `trinket-dev-synthesis-v0.2.md` (now persisted to
`.planning/source/`). Checked Bridge v0 against §4: matches on
offer-among-equals, one-tap costless decline, no streak/counter/skip-shame,
no `bridges` table, gate-aware session handoff. Falls short on the mechanic's
heart: the RITUAL (breathing beat + self-compassion line from a fixed
localized library + next-first-action framing, Wakelin et al. 2022), the
handoff triad (Starter | session | close — v0 only did session), and
standalone reachability when stuck between tasks.

## Design (per spec §4)

- Post-ending beat becomes a true OFFER (unconditional — the ritual has value
  with zero dump items): "A bridge to the next thing?" / decline → Home.
- Accept → `BridgeRitual` (new shared component, `src/features/bridge/`):
  - Step 1 "landing": mascot presence (breath-glow loop = the breathing
    beat), "A moment to land.", one self-compassion line picked from the
    localized 5-line library (i18n = the version-controlled library, rotated
    by random pick), user-paced continue (nothing auto-advances, D-13).
    No imperative copy anywhere — the breath is shown, never commanded.
  - Step 2 "handoff": tiny-first-action framing + ≤3 un-promoted dump items
    (newest first) + "Set up a starter" + "Just close". Item tap rides the
    gate-aware start path; starter → /starter; close → Home.
- Standalone: new `/bridge` route (Home link "Bridge"/"Pomost") rendering the
  ritual directly (user summoned it — no offer step); item pick rides the
  existing dumpItemId promote param into co-pilot.
- Analytics: `bridge_next` becomes `{ nextAction: 'session'|'starter'|'none' }`
  (closed tokens; event added earlier this session, never shipped — safe to
  reshape). §9 instrumentation, not completion-tracking.
- Constraint watch upheld: no persistence of any bridge outcome, no counters,
  decline/close both full-dignity.

## Tasks

1. `src/features/bridge/BridgeRitual.tsx` + i18n `bridge.*` EN/PL (incl. the
   5-line self-compassion library, tone-checked against the copy gate).
2. co-pilot.tsx: BridgePhase → offer + ritual stages; parent handlers for the
   triad; drop the pre-computed item snapshot (ritual self-snapshots).
3. `src/app/bridge.tsx` route + Home link.
4. events.ts reshape + SAFE tokens; rewrite bridge.test.tsx (offer/decline/
   ritual/handoff/triad/zero-items/standalone).
5. `npm run verify` green; SUMMARY + STATE; commit + push (incl. v0.2 doc).
