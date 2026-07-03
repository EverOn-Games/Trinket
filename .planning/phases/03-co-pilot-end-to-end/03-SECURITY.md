---
phase: 3
slug: co-pilot-end-to-end
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-03
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
>
> Scope note: Phase 3 is **local-first with no network, no auth, no external input, and no analytics surface** (analytics arrives in Phase 8). All threats are therefore local/self-inflicted — corrupted on-device state, device-clock manipulation, rapid-tap double-fire, and on-device content handling. No injection, transport, secrets, or authorization surface exists this phase. Register authored at plan time across plans 03-01..03-05; verified against shipped code by gsd-security-auditor.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MMKV persisted pointer → JS at boot | A stored `activeSession` pointer may be malformed (interrupted write / OS kill mid-write) and is parsed pre-first-paint at launch | Session id + timestamps + optional taskLabel (local, user content) |
| Device system clock → elapsed / reconciliation math | Wall-clock time is user-mutable (manual change, DST, NTP correction) and feeds elapsed display + staleness decisions | epoch-ms timestamps |
| User tap handlers → local write side effects | Rapid double-taps on start / End / Resume / Not-now / mood can double-fire local session writes or navigation | none (local state + MMKV) |
| Free-text one-liner + mood → Session fields, on-screen copy, resume card | Arbitrary user content stored locally and interpolated into local screens only | taskLabel free text; mood 1\|2\|3 |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Denial of Service (local) | `activeSessionRepo.read()` JSON.parse; boot reconciliation sweep | mitigate | `data/repositories/activeSession.ts:15-26` wraps `JSON.parse` in try/catch → `undefined` on malformed data; `src/app/_layout.tsx:102-111` treats `undefined` as `{kind:'none'}` (safe no-op). Test: `repositories.test.ts:145-146`. | closed |
| T-03-02 | Tampering (clock skew) | `useElapsedSession` elapsedMs; `reconcileActiveSession` threshold | mitigate | `useElapsedSession.ts:100` `Math.max(0, now - startedAt)` clamps elapsed; `reconcileActiveSession.ts:27` `<=` resolves backward skew to `keep-live` — never negative, never crash, never wrongly closes a live session. | closed |
| T-03-04 | Tampering / Input Validation (ASVS V5) | mood-check tap handler | mitigate | `co-pilot.tsx:528-531` `ALLOWED_MOODS`/`clampMood()` explicit allowlist; raw handler value never persisted (`clampMood(raw)` before `sessionsRepo.update`); `data/types.ts:42` `Session.mood?: 1\|2\|3`. | closed |
| T-03-05 | Tampering (self-inflicted double-fire) | start affordances, End, Resume / Not-now, mood / Skip | mitigate | Distinct single-fire guards: `isStartingSessionRef` (`co-pilot.tsx:114`, `index.tsx:76`), `isEndingSessionRef` (`co-pilot.tsx:446`), `isFinishingRef` (`co-pilot.tsx:550`), `isResumeCardActionRef` (`index.tsx:122`). Home guards RESET on focus — `index.tsx:150-155` `useFocusEffect` — closing the CR-01/CR-02 dead-tap regressions from `03-REVIEW.md`. | closed |
| T-03-06 | Information Disclosure | taskLabel / mood (user content) in pointer, screens, resume card, history | mitigate | User content stays local (MMKV + on-screen JSX only). Grep confirms zero `console.*` / `analytics` / `posthog` / `track(` emitting content across `co-pilot.tsx`, `index.tsx`, `history.tsx`, `activeSession.ts`. No analytics surface exists until Phase 8 — no-content-payload constraint upheld. | closed |
| T-03-07 | Denial of Service (local) | active-phase / resume read of a corrupt pointer | accept | Covered transitively by T-03-01: `co-pilot.tsx:75-96` `resumablePointer`/`flowPhase` initializers fall back to `'setup'` when `read()` is `undefined`. | closed (accepted) |
| T-03-08 | Repudiation / Integrity | history duration display from endedAt/startedAt | accept | Per-session derived fact (not an aggregate — allowed by the data-model constraint); clock skew clamped upstream; `history.tsx:45` `Math.max(0, …)` floors a negative-looking duration to "Under a minute". | closed (accepted) |
| T-03-SC | Tampering (supply chain) | dependency installs | accept | Zero package installs across all 5 plans — `git log …-- package.json package-lock.json` returns no commits. No supply-chain surface this phase. | closed (accepted) |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-07 | Corrupt-pointer read on resume is a strict subset of T-03-01, which is mitigated (try/catch → `undefined` → `'setup'` fallback). No independent surface. | gsd-security-auditor (plan-time disposition) | 2026-07-03 |
| AR-03-02 | T-03-08 | Per-session duration is a single derived fact, not a streak/aggregate; it cannot be used for pressure and is clamped ≥ 0. Consistent with the "no aggregates" data-model constraint. | gsd-security-auditor (plan-time disposition) | 2026-07-03 |
| AR-03-03 | T-03-SC | No new dependencies added this phase; supply-chain surface is unchanged from Phase 2's verified baseline. | gsd-security-auditor (plan-time disposition) | 2026-07-03 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-03 | 8 | 8 | 0 | gsd-security-auditor (verify-mitigations mode; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-03
