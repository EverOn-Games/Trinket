---
phase: 02
slug: mascot-module
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-02
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**ID-collision note:** Plans 01, 02, 04, and 05 each independently declared a threat labeled `T-02-01` with different STRIDE categories/components/mitigations (a planning-process artifact, not a code issue). This audit disambiguates them as `T-02-01(P1)`, `T-02-01(P2)`, `T-02-01(P4)`, `T-02-01(P5)` below and verifies each on its own declared mitigation, rather than collapsing them into one row.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| host → module props | Host screens pass `MascotProps` (state/prominence/accessibilityLabel) into `<Mascot />`; TS narrows at compile time but the runtime edge is untrusted | Prop values only, no user content |
| app code → MMKV settings blob | `mascotProminence` (enum) is written to on-device local storage only | Local enum preference, no PII |
| npm registry → project | `lottie-react-native` installed as a net-new native dependency | Package source + native code, no install-time script surface flagged |
| bundled asset → native Lottie renderer | Lottie JSON (`assets/mascot/*.json`) parsed/decoded on-device, including on low-end Android | Bundled JSON payload, developer-authored, not user-supplied |
| bundled asset → JS marker parser | `resolveMarkers` consumes the asset's `markers` array (author-controlled Bodymovin metadata) | Frame-range metadata only |
| OS accessibility API → module | `AccessibilityInfo` reduce-motion signal | Boolean OS signal, no PII |
| in-memory session flag | Greeting cadence lives only in a module-level JS variable, reset every cold launch | Never persisted, never crosses a storage boundary |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01(P1) | Tampering | `MascotState` union (Plan 01) | mitigate | `src/components/Mascot/types.ts` pins the union to exactly 5 literals; `src/components/Mascot/__tests__/noNegativeStates.test.ts` source-scans the raw file and fails if a 6th/negative literal (`sad`, `disappointed`, `waiting`, `nagging`, `angry`, `upset`) is ever added. Re-run at audit time: 2/2 tests pass | closed |
| T-02-02 | Information Disclosure | `mascotProminence` settings field | accept | Enum-only preference value (`'prominent'\|'subtle'\|'hidden'`), no PII, local-only MMKV write via `data/repositories/settings.ts`; covered by the existing schema denylist guard (re-run at audit time: `schema.denylist.test.ts` passes with `mascotProminence` present, no denylisted stem match). Entry recorded in Accepted Risks Log below | closed |
| T-02-SC | Tampering | npm install of `lottie-react-native` (supply chain) | mitigate | `package.json`/`package-lock.json` re-checked at audit time: `lottie-react-native@~7.3.4` installed by explicit package name; `react-native-reanimated` (`4.3.1`) and `react-native-worklets` (`0.8.3`) pins unchanged, confirming the "explicit name only, never a bare `expo install` sweep" discipline recorded in 02-02-SUMMARY.md | closed |
| T-02-01(P2) | Denial of Service | Oversized/malformed animation JSON on low-end Android (Plan 02) | mitigate | `scripts/check-mascot-asset-size.mjs` — fail-closed 300KB gate, resolves ROOT via `import.meta.url`, exits 1 on an empty scan and on any oversized file. Re-proven at audit time: injected a synthetic 307,201-byte probe under `assets/mascot/` → script exited 1 with a per-file violation line naming the probe; removed the probe after. Wired into `npm run verify` (`package.json` scripts.verify chains `lint:mascot-assets`). All 5 real assets measured 2.1–4.5KB, far under the 300KB limit | closed |
| T-02-03 | Tampering | `resolveMarkers` on malformed/renamed markers | mitigate | `src/components/Mascot/markers.ts:26-43` — `decodeMarkerName` attempts `JSON.parse(cm).name` in a try/catch, falls back to the raw `cm` string on parse failure; empty/missing `markers` array returns `{}` without throwing; dev-only `console.warn` (gated on `NODE_ENV !== 'production'`) fires if a required marker name is absent. `markers.test.ts` (6 tests, including against the real `mascot_idle.json`) re-run at audit time: all pass | closed |
| T-02-04 | Denial of Service | Idle scheduler timer leak/overlap during state change | mitigate | `src/components/Mascot/useIdleScheduler.ts:69-92` — scheduling effect depends on `[active, reducedStimulus]` and calls `clearTimeout(timeoutId)` in its cleanup on every dependency change, including the transition away from idle. A related second timer (the "resume base idle loop" timer inside `Mascot.tsx`, outside `useIdleScheduler`'s own cleanup) was found post-implementation by code review (WR-01) and is now tracked/cancelled via `resumeTimeoutRef` (`Mascot.tsx:150,169,183-188`), cleared on every `currentState` change and on unmount, plus a belt-and-suspenders `currentState === 'idle'` guard inside the timer callback itself. Fixed in commit `3e17d63`. `useIdleScheduler.test.ts` (7 tests) and `Mascot.test.tsx` re-run at audit time: all pass | closed |
| T-02-05 | Tampering | Mascot `state` prop (V5 input validation) | mitigate | `src/components/Mascot/Mascot.tsx:74-77` — `clampState()` checks the incoming `state` against `ALLOWED_STATES` and falls back to `'idle'` for any unrecognized value, called before the value is used anywhere downstream (asset load, idle-scheduler `active` gate, rendering). `Mascot.test.tsx`'s unknown-state (cast) test re-run at audit time: passes | closed |
| T-02-01(P4) | Denial of Service | Eager asset decode / dual `LottieView` instance (Plan 04) | mitigate | `Mascot.tsx` grep-confirmed: exactly one JSX `<LottieView` render site (line 275; the other `LottieView` occurrence at line 125 is a `useRef<LottieView>` type annotation, not a render). Assets load via `loadAssetSafe(currentState)` inside a `useMemo` keyed on `currentState` — never 5 eager top-level `require()`s. `prominence === 'hidden'` keeps the same `LottieView` mounted with zero-size/opacity-0 styling rather than swapping element trees (WR-03 fix, commit `bcae350`), preserving the single-instance contract across prominence toggles as well as state changes. `Mascot.test.tsx`'s single-instance test (including the `prominent→hidden→subtle` toggle case) re-run at audit time: passes | closed |
| T-02-06 | Information Disclosure | `accessibilityLabel` PII passthrough | accept | `Mascot.tsx:26-28` doc comment states the label must be a host-translated, non-PII string; the module never calls `t()`/i18n itself and only renders the host-supplied string verbatim. Host wiring (`src/app/index.tsx:93`) passes `t('mascot.accessibility.${mascotState}')`, an i18next-translated, non-PII static string, not user content. Entry recorded in Accepted Risks Log below | closed |
| T-02-07 | Information Disclosure | Greeting cadence as a disguised aggregate | mitigate | `src/app/index.tsx:27` — `let hasGreetedThisSession = false` is a module-level, in-memory-only flag; grep of `src/app/index.tsx` and `src/` / `data/` trees at audit time confirms no `settingsRepo`/`useSettingsStore` write of any greeted/timestamp field and no `lastGreetedAt`/`greetedAt` identifier exists anywhere in the codebase (the only textual match is the flag's own explanatory code comment). Resets on every cold launch (fresh JS module evaluation) | closed |
| T-02-01(P5) | Denial of Service | Animation jank / oversized asset on low-end Android, on real hardware (Plan 05) | mitigate | Human device checkpoint (Task 3 of Plan 05) executed on real low/mid-tier Android hardware. Round 1 surfaced a UX-quality issue (blink seek-jolt), root-caused to Lottie's non-interpolated `play(start,end)` seek and fixed at the asset-authoring level (commit `eb18755`); round 2 was approved by the user with no stutter/frame-drop reported, per 02-05-SUMMARY.md. Combined with the already-verified 300KB size gate (T-02-01(P2)) and lazy per-state load (T-02-01(P4)), this closes the DoS/perf threat on the actual target hardware class, not just in Jest | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|--------------|------|
| AR-06 | T-02-02 | `mascotProminence` is a 3-value enum UI preference (`prominent`/`subtle`/`hidden`) with no PII and no diagnostic/health inference surface. It is written only to the existing local-only settings MMKV blob (no cloud sync in Phase 2 scope) and is structurally guarded by the same schema denylist test that covers the rest of the settings schema. | gsd-security-auditor (phase-2 audit) | 2026-07-02 |
| AR-07 | T-02-06 | The `<Mascot />` module has no i18n import and never originates copy itself — it is a pure passthrough for a host-supplied `accessibilityLabel` string. The only current caller (`src/app/index.tsx`) passes an i18next-translated static string keyed on mascot state, not user-entered content. Re-open this risk if a future host ever passes raw user content (e.g. a brain-dump item's text) as the mascot's accessibility label. | gsd-security-auditor (phase-2 audit) | 2026-07-02 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|----------------|--------|------|--------|
| 2026-07-02 | 11 | 11 | 0 | gsd-security-auditor |

**Notes on this audit run:**
- All 5 plan files (02-01 through 02-05) and all 5 SUMMARY files were read in full. None of the 5 SUMMARY.md files contain a `## Threat Flags` section, so there is no executor-flagged new attack surface to reconcile against the register (see Unregistered Flags below).
- The threat register above disambiguates the four separately-declared `T-02-01` threats (one per plan: 01, 02, 04, 05) by suffixing the originating plan, since each has a distinct STRIDE component/mitigation despite sharing an ID — collapsing them would have hidden that four separate mitigations were required, not one.
- `02-REVIEW.md`'s WR-01 (idle micro-behavior resume timer never cancelled) directly strengthens T-02-04's declared mitigation and is cited by threat ID above; current source (not plan-time prose) was read as evidence (`Mascot.tsx:145-188`), confirming `resumeTimeoutRef` tracking/cancellation is present and commit `3e17d63` landed it. WR-03 (persistent-LottieView contract violated on hidden-prominence toggle) similarly strengthens T-02-01(P4) and was verified present in current source (`Mascot.tsx:258-273`, commit `bcae350`).
- WR-02 (non-reactive settings snapshot) and WR-04 (double-press session-create guard) are correctness fixes confirmed present in current source (`src/app/index.tsx`) but do not map to a declared STRIDE threat in any plan's `<threat_model>` block; they are out of scope for this threat-verification audit (charter: verify declared threats, do not blind-scan for new ones). Both are already fixed (commits `306c69d`, `cd63d3b`).
- Full test suite re-run at audit time via `npm run verify`: 13 suites, 80 tests, all passing (eslint clean, `lint:hex` clean, `lint:mascot-assets` clean). The 300KB asset-size gate's fail-closed branch was independently re-proven at audit time (not just re-read from SUMMARY prose) by injecting and then removing a synthetic 307,201-byte probe file.
- ASVS Level 1 sanity pass over the phase's full file surface (`src/components/Mascot/*`, `src/app/index.tsx`, `data/repositories/settings.ts`, `scripts/check-mascot-asset-size.mjs`, `assets/mascot/*.json`): no hardcoded secrets/API keys/tokens, no `eval`/`new Function` dynamic code execution, no `fetch`/`axios`/`XMLHttpRequest`/Supabase calls introduced (module is fully local/offline), confirmed via direct grep at audit time.

---

## Unregistered Flags

None. No SUMMARY.md in this phase contains a `## Threat Flags` section, so there is no executor-declared new attack surface requiring reconciliation against the threat register.

(Informational, not a flag: `02-REVIEW.md`'s WR-01 through WR-04 and IN-01 through IN-05 findings are code-review correctness/maintainability observations, not independently-declared security threats. WR-01 and WR-03 were triaged during this audit as directly strengthening already-declared threats T-02-04 and T-02-01(P4) respectively (cited above with evidence). WR-02 and WR-04 border on data-integrity/UX robustness but do not cross a trust boundary declared in this phase's `<threat_model>` blocks. All four warnings are already fixed in current source per `02-REVIEW.md`'s resolution notes.)

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-02
