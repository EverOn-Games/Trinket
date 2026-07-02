---
phase: 01-scaffold-foundations
plan: 05
subsystem: database
tags: [mmkv, nitro-modules, zustand, persist, jest, typescript, repository-pattern]

# Dependency graph
requires:
  - phase: 01-01
    provides: Expo SDK 56 scaffold with react-native-mmkv v4 + nitro-modules + zustand already installed in package.json
  - phase: 01-02
    provides: Jest harness (jest-expo preset, jest.setup.ts) with __mocks__/react-native-mmkv.ts registered globally, so repository modules import cleanly under Jest without touching the real native binding
provides:
  - data/mmkv.ts — createMMKV() v4 instance factory (contentStorage, settingsStorage); encryption explicitly deferred to Phase 7 (T-01-08), documented not silently skipped
  - data/types.ts — Session/DumpItem/Intention/SettingsState record types matching source synthesis §6.2 field names (camelCase), zero streak/daily-aggregate/diagnosis fields
  - data/repositories/{sessions,dumpItems,intentions}.ts — sessionsRepo/dumpItemsRepo/intentionsRepo, per-record + index-key CRUD over a shared contentStorage instance, namespaced (session:*/dumpItem:*/intention:*) so they never collide
  - data/repositories/settings.ts — settingsRepo, a thin repository-shaped accessor over useSettingsStore
  - data/stores/useSettingsStore.ts — Zustand persist singleton (locale/notificationsOptIn/subscriptionCache) backed by an MMKV StateStorage adapter via createJSONStorage
  - lib/id.ts — newId(), crypto.randomUUID() with a dependency-free RFC4122-v4-shaped fallback
  - data/repositories/__tests__/repositories.test.ts — full CRUD lifecycle + cross-collection isolation + settings round-trip (5 tests)
  - data/repositories/__tests__/schema.denylist.test.ts — structural guard (T-01-09) against streak/daily-aggregate/diagnosis field names across all four schemas, verified to actually fail red via a temporary probe
affects: [01-06, mascot-module, co-pilot, brain-dump, starter, subscriptions, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Repository-over-MMKV: per-record key (`<namespace>:<id>`) + a JSON-array index key (`<namespace>:index`) per collection, all three collections sharing one contentStorage MMKV instance without colliding via namespace prefixes"
    - "Zustand persist + createJSONStorage(() => StateStorage) as the MMKV bridge for the settings singleton, avoiding an `any` cast on zustand's typed PersistStorage<S> contract"
    - "Repository read paths (get/list) swallow malformed JSON per-record rather than throw, so one corrupted record never breaks list() for the whole collection (T-01-10)"

key-files:
  created:
    - data/mmkv.ts
    - data/types.ts
    - data/repositories/sessions.ts
    - data/repositories/dumpItems.ts
    - data/repositories/intentions.ts
    - data/repositories/settings.ts
    - data/stores/useSettingsStore.ts
    - lib/id.ts
    - data/repositories/__tests__/repositories.test.ts
    - data/repositories/__tests__/schema.denylist.test.ts
  modified: []

key-decisions:
  - "Reordered the plan's two tasks into a RED-then-GREEN commit sequence (both test files committed first, confirmed failing with 'Cannot find module', then all implementation files committed second, confirmed passing) rather than the plan's literal Task 1 (repos) -> Task 2 (settings + tests) ordering — same TDD-gate-sequence rationale as 01-04's precedent: Task 2's tests exercise Task 1's repos, so executing in literal plan order would produce a RED phase that could never genuinely fail"
  - "Mapped source synthesis §6.2's snake_case field sketch (task_label, started_at, cue_text, notifications_optin, etc.) to camelCase in data/types.ts, per this project's TypeScript convention and matching ARCHITECTURE.md Pattern 2's sessionsRepo reference example verbatim (taskLabel, startedAt, endedAt) — field names conceptually match §6.2, casing follows language convention, not a literal snake_case port"
  - "Session's creation timestamp is startedAt itself (no separate createdAt field), per the plan's explicit instruction that sessions use persisted start/end timestamps so elapsed time is derived, never a duration counter — DumpItem and Intention do carry a separate createdAt per §6.2"
  - "Used zustand's createJSONStorage(() => mmkvStateStorage) instead of RESEARCH.md Pattern B's illustrative `storage: {...} as any` cast — functionally identical MMKV-backed StateStorage adapter, but avoids an `any` cast under this project's strict TypeScript requirement"
  - "settingsRepo.update() dispatches through the store's setLocale/setNotificationsOptIn setters for those two fields (keeping the store's own action functions as the single mutation path) and falls back to useSettingsStore.setState() only for subscriptionCache, which has no dedicated setter yet (populated Phase 7)"

patterns-established:
  - "Every future collection repository (none currently planned beyond these three) should follow the sessions.ts/dumpItems.ts/intentions.ts shape exactly: readIndex/writeIndex/readRecord helpers + create/get/list/update/remove, namespaced under `<name>:*`"
  - "schema.denylist.test.ts is a living guard, not a one-time check — any later phase adding a field to Session/DumpItem/Intention/SettingsState is automatically covered by this test without modification, since it introspects the actual runtime record shape"

requirements-completed: [FND-02]

# Metrics
duration: ~7min
completed: 2026-07-02
---

# Phase 01 Plan 05: MMKV Persistence Layer (Repositories + Settings Store) Summary

**Three MMKV v4 repositories (sessionsRepo/dumpItemsRepo/intentionsRepo) sharing one namespaced contentStorage instance, a Zustand-persist settings singleton over a second MMKV instance, and a schema denylist test that structurally forbids streak/daily-aggregate/diagnosis fields across all four local schemas — verified to actually catch a violation via a temporary probe.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-02T10:01:26Z (approx, following 01-04 plan-metadata commit)
- **Completed:** 2026-07-02T10:08:19Z
- **Tasks:** 2/2 completed (executed as RED test commit + GREEN implementation commit)
- **Files modified:** 10 (2 in RED, 8 in GREEN)

## Accomplishments

- `data/mmkv.ts` exports `contentStorage`/`settingsStorage` via `createMMKV({ id })` (v4 API — confirmed no `new MMKV(` usage in `data/` via grep), with T-01-08's encryption deferral documented in a code comment, not silently skipped
- `data/types.ts` defines `Session`/`DumpItem`/`Intention`/`SettingsState` with field names mapped from source synthesis §6.2 (camelCase per TS convention) and zero streak/daily-aggregate/diagnosis fields
- `sessionsRepo`/`dumpItemsRepo`/`intentionsRepo` each implement `create`/`get`/`list`/`update`/`remove` over per-record + index keys, namespaced (`session:*`/`dumpItem:*`/`intention:*`) so all three share `contentStorage` without collision — proven by a dedicated cross-collection isolation test
- `useSettingsStore` (Zustand `persist` + `createJSONStorage` over an MMKV `StateStorage` adapter) persists `locale`/`notificationsOptIn`/`subscriptionCache` and rehydrates synchronously (verified: zustand's `toThenable()` wrapper resolves non-Promise storage synchronously, so `useSettingsStore.getState()` reflects persisted state immediately after store creation, no `await`/act() dance needed in tests)
- `settingsRepo` gives settings a repository-shaped `get()`/`update()` seam consistent with the other three collections
- `schema.denylist.test.ts` introspects the actual runtime key set of one created record per collection (not a text grep) and asserts zero intersection with a 12-entry denylist (`streak`, `streakCount`, `dailyCount`, `dailyTotal`, `dailyAggregate`, `completionRate`, `dayChain`, `lastActiveDate`, `activeDays`, `diagnosis`, `adhdStatus`, `diagnosisStatus`) — manually verified during execution that adding a temporary `streak` field makes this test fail red, then reverted before committing
- `repositories.test.ts` covers full CRUD lifecycle for all three collections, cross-collection isolation, and a settings locale/notification round-trip (5 tests)
- Verified `npx tsc --noEmit` compiles clean under strict mode; `npx jest --watchAll=false` passes the full suite (33/33, up from 27/27 after Plan 04); `npx eslint data lib` reports zero errors

## Task Commits

Executed as a RED-then-GREEN pair (see Deviations for the reordering rationale, mirroring 01-04's precedent):

1. **RED: Add failing tests for repositories and schema denylist** - `52c65c6` (test) — `data/repositories/__tests__/repositories.test.ts`, `data/repositories/__tests__/schema.denylist.test.ts`. Confirmed both suites failed with `Cannot find module '../sessions'` before any implementation existed.
2. **GREEN: Implement MMKV repositories, settings store, and shared types** - `067d9c4` (feat) — `data/mmkv.ts`, `data/types.ts`, `data/repositories/{sessions,dumpItems,intentions,settings}.ts`, `data/stores/useSettingsStore.ts`, `lib/id.ts`. Confirmed `npx jest data --watchAll=false` passes 6/6 and the full suite passes 33/33.

## Files Created/Modified

- `data/mmkv.ts` - `createMMKV()` v4 factory: `contentStorage`, `settingsStorage`
- `data/types.ts` - `Session`/`DumpItem`/`Intention`/`SettingsState` record types
- `data/repositories/sessions.ts` - `sessionsRepo` CRUD (`session:*` namespace)
- `data/repositories/dumpItems.ts` - `dumpItemsRepo` CRUD (`dumpItem:*` namespace)
- `data/repositories/intentions.ts` - `intentionsRepo` CRUD (`intention:*` namespace)
- `data/repositories/settings.ts` - `settingsRepo` thin accessor over the settings store
- `data/stores/useSettingsStore.ts` - Zustand persist singleton over `settingsStorage`
- `lib/id.ts` - `newId()`: `crypto.randomUUID()` with a non-dependency fallback
- `data/repositories/__tests__/repositories.test.ts` - CRUD + isolation + settings round-trip (5 tests)
- `data/repositories/__tests__/schema.denylist.test.ts` - structural denylist guard (1 test)

## Decisions Made

- Reordered the plan's Task 1 (repos)/Task 2 (settings + tests) into a RED-then-GREEN commit sequence — see Deviations below
- Mapped §6.2's snake_case field sketch to camelCase, matching ARCHITECTURE.md's `sessionsRepo` reference example exactly (`taskLabel`, `startedAt`, `endedAt`) rather than a literal snake_case port
- Session's creation timestamp is `startedAt` itself (no separate `createdAt`); `DumpItem`/`Intention` retain a distinct `createdAt` per §6.2
- Used `createJSONStorage(() => mmkvStateStorage)` instead of RESEARCH.md's illustrative `as any` cast, to keep the settings store's `storage` option properly typed under strict TypeScript
- `settingsRepo.update()` routes `locale`/`notificationsOptIn` through the store's own setters and falls back to `setState()` only for `subscriptionCache` (no dedicated setter yet — populated Phase 7)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's task order (repos, then settings+tests) would violate the TDD RED-before-GREEN gate**
- **Found during:** Pre-execution planning of Task 1 vs Task 2 sequencing
- **Issue:** Both tasks are tagged `tdd="true"`, but Task 1's `<action>` describes only implementation (mmkv.ts, types.ts, three repos, lib/id.ts — no test files) while Task 2's `<action>` writes the test files that exercise Task 1's already-built repos, plus the settings store/repo. Executing literally in plan order would mean Task 2's "RED" phase could never actually fail (Task 1's implementation would already exist), violating the executor's fail-fast RED-phase rule and producing no genuine `test(...)`-before-`feat(...)` gate-sequence evidence — the exact same structural issue documented and resolved in 01-04-SUMMARY.md.
- **Fix:** Treated both tasks' content as one cohesive RED/GREEN cycle: wrote both test files first (`repositories.test.ts`, `schema.denylist.test.ts`), confirmed both suites failed with `Cannot find module '../sessions'` (genuine RED, since none of Task 1's or Task 2's implementation files existed yet), then wrote every implementation file from both tasks' `files_modified` lists, confirmed `npx tsc --noEmit` clean and `npx jest data --watchAll=false` 6/6 passing (GREEN). Every file named in either task's `files_modified` list was created exactly as specified — only commit ordering changed.
- **Files modified:** No change to scope; only commit ordering
- **Verification:** `git log --oneline` shows `test(01-05): ...` (`52c65c6`) immediately before `feat(01-05): ...` (`067d9c4`); the test commit's suites were confirmed failing pre-implementation via `npx jest data/repositories --watchAll=false`
- **Committed in:** `52c65c6` (RED), `067d9c4` (GREEN)

---

**Total deviations:** 1 auto-fixed (Rule 3 — commit-sequence correction to satisfy the TDD gate, identical rationale and mechanism to 01-04's precedent)
**Impact on plan:** Zero scope creep — every file in both tasks' `files_modified` lists was created exactly as specified; the only change is commit ordering, to produce genuine RED-then-GREEN evidence in git history.

## Issues Encountered

- Verifying the schema denylist test's own correctness (acceptance criterion: "verify by a temporary probe: adding `streak` to a type makes it red") required more than adding the field to the TypeScript interface alone — since `Session`'s optional/added field wouldn't actually appear in the runtime JSON unless a repository's `create()` sets it. Resolved by temporarily hardcoding `streak: 0` in `sessionsRepo.create()`'s returned object (alongside the type change), confirming `schema.denylist.test.ts` failed with `Received: ["streak"]`, then reverting both edits before the GREEN commit. Not a bug — this is exactly the manual verification step the plan's acceptance criteria called for, executed and documented here rather than skipped.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- `data/` now exposes the full local persistence contract (`sessionsRepo`, `dumpItemsRepo`, `intentionsRepo`, `settingsRepo`/`useSettingsStore`) that Plan 06's route shells and every later feature phase (Co-pilot, Brain dump, Starter, Subscriptions, Settings) will import directly — no repository work remains for those phases beyond calling these functions
- `i18n/useLocale.ts`'s documented persistence seam (from 01-04-SUMMARY.md) can now be wired to `settingsRepo.update({ locale })` / `useSettingsStore`'s `setLocale` — deferred to whichever plan first calls `setLocale` at runtime (Plan 06 boot wiring or Phase 8 settings screen)
- MMKV encryption (T-01-08) remains explicitly deferred to Phase 7 — tracked here and in `data/mmkv.ts`'s own code comment, not silently skipped
- The on-device persistence guarantee itself (real Nitro Modules writing to physical MMKV storage, not the Jest mock) remains unverifiable in this sandboxed environment per 01-RESEARCH.md's Environment Availability section — deferred to the same physical-device dev-client checkpoint already tracked by 01-01-SUMMARY.md

## Self-Check: PASSED

All created files verified present on disk: `data/mmkv.ts`, `data/types.ts`, `data/repositories/sessions.ts`, `data/repositories/dumpItems.ts`, `data/repositories/intentions.ts`, `data/repositories/settings.ts`, `data/stores/useSettingsStore.ts`, `lib/id.ts`, `data/repositories/__tests__/repositories.test.ts`, `data/repositories/__tests__/schema.denylist.test.ts`. Both commit hashes (`52c65c6`, `067d9c4`) verified present in `git log --oneline --all`.

---
*Phase: 01-scaffold-foundations*
*Completed: 2026-07-02*
