# Phase 2: Mascot Module - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 02-mascot-module
**Areas discussed:** Placeholder art style, iOS verification scope, Prominence persistence, UI-SPEC flag deferrals

Note: the approved `02-UI-SPEC.md` pre-answered the state set, public API, micro-behavior contract, transition/perf contract, and reduced-stimulus behavior — those were treated as locked and not re-asked. Discussion covered only the four genuinely open decisions.

---

## Placeholder art style

| Option | Description | Selected |
|--------|-------------|----------|
| Abstract geometric (Recommended) | Soft "breathing" orb/blob using mascotGlow amber, distinct shape/motion per state; cheap, clearly temporary, on-brand; final art drops into same slots | ✓ |
| Raccoon-suggestive silhouette | Recognizable raccoon blob so Phases 3-6 screens read as "the mascot"; more authoring effort for throwaway art; risks pseudo-raccoon becoming a crutch | |
| Sourced CC stand-in | Free/CC Lottie critter; least effort but licensing overhead and won't match the 5-state + 3-marker structure without editing | |

**User's choice:** Abstract geometric
**Notes:** Must be authored with exact slot filenames + idle marker names so final art is a zero-code-change drop-in.

---

## iOS verification scope

| Option | Description | Selected |
|--------|-------------|----------|
| Android-only, iOS deferred (Recommended) | Verify Lottie smoothness on real Android hardware; prebuild + Android dev-client rebuild in plan; iOS device-boot gate stays deferred (hard gate before Phase 9) | ✓ |
| Attempt iOS verification now | Close the iOS gate alongside first Lottie work; needs Mac or EAS cloud build | |

**User's choice:** Android-only, iOS deferred
**Notes:** Consistent with the Phase 1 checkpoint decision not to spend an EAS/Mac build yet. Blocker carries forward in STATE.md.

---

## Prominence persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Add settings field now (Recommended) | `mascotProminence` ('prominent'\|'subtle'\|'hidden', default 'prominent') added to the Phase 1 settings MMKV repo this phase; module reads via host prop; Settings UI lands Phase 8 | ✓ |
| Default-only until Phase 8 | Module hardcodes 'prominent'; no persistence seam until the Settings screen exists | |

**User's choice:** Add settings field now

---

## UI-SPEC flag deferrals (Flags 1, 3, 4)

| Option | Description | Selected |
|--------|-------------|----------|
| Accept all three (Recommended) | Fonts stay 'System' (revisit Phase 6); greeting cadence = host in-memory session flag, never persisted timestamp; only mascotGlow added, mascotGlowDeep deferred | ✓ |
| I want to change one | User names the flag to rework | |

**User's choice:** Accept all three defaults

---

## Claude's Discretion

- Placeholder animation authoring approach (hand-authored JSON / Bodymovin / programmatic), as long as assets stay <300 KB with required markers
- Micro-behavior scheduler implementation details within the UI-SPEC interval/weighting contract
- Jest mocking strategy for lottie-react-native (mirroring Phase 1 native-mock precedent)
- Exact Reanimated usage for the 120ms/200ms transition fade

## Deferred Ideas

- iOS physical-device dev-client boot verification (hard gate before Phase 9; retry when EAS/Mac access happens)
- Custom font loading — Phase 6 Onboarding leading candidate
- `mascotGlowDeep` second glow token — only when art needs two intensities
- Settings screen UI for prominence — Phase 8
- Final raccoon Lottie art — pending from founder, zero-code-change drop-in
