---
phase: 01-scaffold-foundations
reviewed: 2026-07-02T00:00:00Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - __mocks__/expo-localization.ts
  - __mocks__/react-native-mmkv.ts
  - jest.setup.ts
  - jest.config.js
  - eslint.config.js
  - data/mmkv.ts
  - data/repositories/__tests__/repositories.test.ts
  - data/repositories/__tests__/schema.denylist.test.ts
  - data/repositories/dumpItems.ts
  - data/repositories/intentions.ts
  - data/repositories/sessions.ts
  - data/repositories/settings.ts
  - data/stores/useSettingsStore.ts
  - data/types.ts
  - i18n/__tests__/plurals.test.ts
  - i18n/__tests__/resolveInitialLocale.test.ts
  - i18n/index.ts
  - i18n/locales/en.json
  - i18n/locales/pl.json
  - i18n/useLocale.ts
  - lib/id.ts
  - scripts/check-hex-literals.mjs
  - src/app/__tests__/screens.test.tsx
  - src/app/_layout.tsx
  - src/app/brain-dump.tsx
  - src/app/co-pilot.tsx
  - src/app/history.tsx
  - src/app/index.tsx
  - src/app/settings.tsx
  - src/app/starter.tsx
  - src/components/MascotSlot.tsx
  - src/components/Screen.tsx
  - theme/ThemeProvider.tsx
  - theme/__tests__/tokens.test.ts
  - theme/index.ts
  - theme/tokens.ts
  - theme/useTheme.ts
findings:
  critical: 0
  warning: 9
  info: 10
  total: 19
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-02
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Reviewed the scaffold-foundations slice: MMKV-backed repositories, Zustand settings store, i18n (PL/EN with CLDR plurals), dark theme tokens, six Expo Router screens, structural guards (schema denylist test, hex-literal gate), and the Jest harness. Verification performed against installed packages, not just source: react-native-mmkv 4.3.2 exposes `createMMKV`, `remove()`, `getString/getNumber/getBoolean/contains/getAllKeys/clearAll` — the mock and `data/mmkv.ts` match the real v4 API. Zustand 5's persist middleware was read in `node_modules` to confirm hydration is synchronous with MMKV storage and does NOT write back on a clean first boot — so the `contains('settings')` first-boot sentinel in `_layout.tsx` is correct today, but it is fragile (WR-01). The full test suite passes (7 suites, 36 tests), the hex gate passes, and ESLint reports one warning.

No Critical findings: no security-sensitive surface exists in this phase (no network calls, no secrets, no injection vectors), project hard constraints hold (no streak/daily-aggregate/diagnosis fields; timestamps not counters; offer-grammar copy; no hex literals outside `theme/`), and no reachable crash/data-loss path was found. The Warnings cluster around locale-persistence wiring that is half-landed (the boot-time revert exists but the write-through does not), guard mechanisms that fail open or have blind spots, and a latent id-duplication footgun in the repository `create()` spread order.

No structural (fallow) pre-pass was provided for this review; all findings below are narrative.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: First-boot locale sentinel is fragile — any pre-mount store write silently flips it and force-reverts the language

**File:** `src/app/_layout.tsx:31-47`
**Issue:** `usePersistResolvedLocale` distinguishes first boot from subsequent boots via `settingsStorage.contains('settings')`. Verified against zustand 5.0.14 internals: on a clean first boot hydration does not write the key, so the branch is correct *today*. But the sentinel conflates "the persist key exists" with "locale resolution already happened." Any store write that occurs before this effect runs — e.g. Phase 7 writing `subscriptionCache` at startup, a future `onRehydrateStorage` side effect, or a zustand persist behavior change (it already writes back whenever `migrate` runs) — makes `contains()` return `true` on what is logically a first boot. The else-branch then calls `i18n.changeLanguage('en')` (the store default), silently switching a Polish device to English with no user-facing recovery until Phase 8's settings screen. The failure is silent and environment-dependent, which is the worst kind.
**Fix:** Make the sentinel explicit instead of inferred. Either persist `locale: Locale | null` defaulting to `null` and branch on `locale === null`, or persist a dedicated `localeResolved: boolean` flag:
```ts
const { locale, localeResolved } = useSettingsStore.getState();
if (!localeResolved) {
  useSettingsStore.getState().setLocale(resolveInitialLocale()); // setLocale also sets localeResolved: true
  return;
}
if (locale !== i18n.language) void i18n.changeLanguage(locale);
```

#### WR-02: Locale persistence seam is half-wired — runtime language changes are reverted on every restart, and the useLocale docstring is stale

**File:** `i18n/useLocale.ts:9-16, 33-35`; `src/app/_layout.tsx:42-45`
**Issue:** `useLocale().setLocale` calls `i18n.changeLanguage(next)` but never writes to the settings store. Meanwhile `_layout.tsx` re-applies the store's persisted locale on every boot. The revert mechanism has landed but the write-through has not, so any runtime language change is silently undone at next launch. The docstring in `useLocale.ts` says "The settings repository does not exist yet — it lands in Plan 05" and that "Plan 06 (provider/app-shell wiring) should subscribe to i18next's `languageChanged` event" — both the store (Plan 05) and the app-shell wiring (Plan 06, this `_layout.tsx`) now exist, and the promised `languageChanged` subscription was never added. The codebase is in the exact inconsistent state the docstring warned about. Downstream consequence: because the first-boot device locale is persisted and then treated as authoritative, a user who changes their phone language after first launch keeps the frozen locale with zero override UI until Phase 8 — confirm this is really D-07's intent rather than an accident of the missing wiring.
**Fix:** Wire the write-through now, in `_layout.tsx` (or inside `useLocale.setLocale`):
```ts
useEffect(() => {
  const onLanguageChanged = (lng: string) => {
    useSettingsStore.getState().setLocale(lng === 'pl' ? 'pl' : 'en');
  };
  i18n.on('languageChanged', onLanguageChanged);
  return () => i18n.off('languageChanged', onLanguageChanged);
}, []);
```
And update the stale docstring in `useLocale.ts`.

#### WR-03: Repository `create()` spread order lets caller-supplied `id`/`createdAt` override the fresh values, enabling duplicate index entries

**File:** `data/repositories/sessions.ts:46`; `data/repositories/dumpItems.ts:41`; `data/repositories/intentions.ts:41`
**Issue:** `const session: Session = { id: newId(), startedAt: Date.now(), ...input };` spreads `input` *last*. The `Omit<Session, 'id' | 'startedAt'>` type only blocks fresh object literals — TypeScript's structural typing allows passing a full existing record (e.g. `sessionsRepo.create(existingSession)` in a future restore/duplicate/promote flow) with no compile error, and its runtime `id`/`startedAt` keys then override the freshly generated ones. Result: the same id appended to the index twice, `list()` returning duplicate records, and FlatList duplicate-key errors. Nothing calls it that way today, but this is a one-line trap in the foundation layer that every later phase builds on.
**Fix:** Spread first so generated fields always win:
```ts
const session: Session = { ...input, id: newId(), startedAt: Date.now() };
```
Same change in all three repositories.

#### WR-04: Schema denylist guard has blind spots — optional fields and non-exact names escape it

**File:** `data/repositories/__tests__/schema.denylist.test.ts:16-58`
**Issue:** The guard inspects `Object.keys()` of one created probe record per type. Two escape routes: (1) an *optional* denied field (`streak?: number` added to `Session`) never appears in the probe's runtime key set, so the test stays green while the schema violates T-01-09; (2) matching is exact string equality, so `currentStreak`, `weeklyStreak`, `dailyStreakCount`, `diagnosisType` all pass despite the denylist containing `streak`/`diagnosis`. The file's docstring claims it "guards against accidental additions in later phases," which overstates what it actually catches — that false confidence is the defect.
**Fix:** Match case-insensitive substrings against denylist stems, and add a source-level check of `data/types.ts` (read the file, scan interface property names) so optional fields are covered:
```ts
const STEMS = ['streak', 'daily', 'completionrate', 'diagnosis', 'adhd', 'lastactive', 'daychain'];
const violations = [...allKeys].filter((key) =>
  STEMS.some((stem) => key.toLowerCase().includes(stem))
);
```
(Note `daily` as a stem would also require renaming nothing today — types are clean.)

#### WR-05: i18next hardcoded-string lint does not cover `src/components/**` — the FND-05 gate has a hole where shared UI lives

**File:** `eslint.config.js:27-29`
**Issue:** The `eslint-plugin-i18next` rule is scoped to `src/app/**/*.tsx` and `src/features/**/*.tsx` only. `src/components/**` — where `Screen` and `MascotSlot` live, and where most reusable JSX (buttons, rows, cards) will accumulate — is not covered. A developer adding `<Text>Start now</Text>` inside a shared component passes lint clean, defeating the stated purpose ("any raw JSX text string … must be an ESLint error"). MascotSlot's own docstring shows the team already anticipates components rendering copy via props; the next component may not be so careful.
**Fix:** Add the directory to the rule scope:
```js
files: ['src/app/**/*.tsx', 'src/features/**/*.tsx', 'src/components/**/*.tsx'],
```

#### WR-06: check-hex-literals guard fails open — zero matched files is reported as success, and globs are cwd-dependent

**File:** `scripts/check-hex-literals.mjs:56-80`
**Issue:** If the globs match zero files — wrong working directory (the script globs relative to `process.cwd()`, not to its own location), a future directory rename (the exact `app/` → `src/app/` move already happened once per the header comment), or a glob typo — the script scans nothing and exits 0 with "no hex color literals found." A structural gate (T-01-05) that silently passes when it inspects nothing is not a gate. Verified: running the script from any cwd other than the repo root prints success.
**Fix:** Resolve globs against the script's own directory and fail on an empty scan:
```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// globSync(pattern, { cwd: ROOT }) ...
if (uniqueFiles.length === 0) {
  console.error('check-hex-literals: no files matched the scan globs — refusing to pass an empty scan.');
  process.exit(1);
}
```

#### WR-07: screens.test.tsx is order-dependent — shared MMKV mock state makes the empty-state test flaky under reordering

**File:** `src/app/__tests__/screens.test.tsx:42-49, 66-68`
**Issue:** The first test asserts History renders the empty state, which is only true because no earlier test in the file created a session. All three tests share one in-memory MMKV instance (the mock's `instancesById` map lives for the whole test file). Running with `--randomize`, adding a test above it, or reordering breaks the assertion. The third test's comment ("Prior tests in this file may also have created sessions") shows the pollution is known — it was worked around instead of fixed.
**Fix:** Reset storage between tests:
```ts
import { contentStorage } from '../../../data/mmkv';
beforeEach(() => contentStorage.clearAll());
```

#### WR-08: No `test` script in package.json — the phase's test harness is not runnable via the standard entry point

**File:** `package.json:49-57`
**Issue:** Jest, jest-expo, jest.config.js, jest.setup.ts and 7 test suites all landed in this phase, but `scripts` has no `"test"` entry. `npm test` fails ("Missing script"), and any CI pipeline, pre-commit hook, or contributor following convention will not discover or run the suite. For a phase whose deliverable is the verification harness itself, this is a functional gap, not style.
**Fix:**
```json
"test": "jest"
```
(Consider also chaining the structural gates: `"verify": "npm run lint && npm run lint:hex && npm test"`.)

#### WR-09: Polish copy uses masculine-gendered "sam" — excludes non-male users in a hard-constraint copy surface

**File:** `i18n/locales/pl.json:17`
**Issue:** `"…dopóki sam tego nie zdecydujesz."` uses the masculine form "sam"; a female user reads grammatically male-addressed copy ("sama" would be her form). The project treats Polish copy register as a hard constraint (warm, plain, shame-free); gender-defaulted phrasing in the very first release copy set undermines that and will multiply as more strings copy the pattern. Polish can express this gender-neutrally with no loss of warmth.
**Fix:** Rephrase to avoid the gendered pronoun entirely:
```json
"description": "Miejsce, żeby szybko wyrzucić z głowy myśli — nic tu nie staje się zadaniem, dopóki tego nie zdecydujesz."
```
Audit all future PL strings for gendered forms as part of copy review.

### Info

#### IN-01: pl.json missing `sessionsRemaining_other` plural form

**File:** `i18n/locales/pl.json:33-35`
**Issue:** Polish CLDR has four categories; `_other` (used for fractional counts like 1.5) is absent. A fractional `count` would fall back through `fallbackLng` and render the *English* string inside a Polish UI. Counts are integers today, so impact is latent.
**Fix:** Add `"sessionsRemaining_other": "{{count}} sesji pozostałych w tym tygodniu"`.

#### IN-02: `sessionsRemaining` keys are unused fixture copy shipped in production locale files — and the "left this week" framing needs a shame-free check before real use

**File:** `i18n/locales/en.json:33-34`; `i18n/locales/pl.json:33-35`
**Issue:** No screen references `sessionsRemaining`; it exists only to exercise the plural tests, yet ships in the app bundle. Separately, "X sessions left this week" is quota/scarcity framing — before any real feature uses it, confirm it passes the shame-free constraint and that computing it doesn't require the weekly aggregates the data model forbids.
**Fix:** Either move plural fixtures to a test-only namespace/file, or keep them but flag the key for copy review before first real use.

#### IN-03: `Locale` type defined twice

**File:** `data/types.ts:43`; `i18n/useLocale.ts:21`
**Issue:** Two independent `type Locale = 'pl' | 'en'` declarations. Adding a third language requires remembering both; drift would type-check silently on each side.
**Fix:** Export from `data/types.ts` (or a shared module) and re-export from `i18n/useLocale.ts`.

#### IN-04: Three near-identical repository implementations — drift already visible

**File:** `data/repositories/sessions.ts`; `data/repositories/dumpItems.ts`; `data/repositories/intentions.ts`
**Issue:** `readIndex`/`writeIndex`/`readRecord` and all five CRUD methods are copy-pasted three times. Drift has already started: the T-01-10 rationale comments exist only in `sessions.ts`. Any fix (e.g. WR-03) must be applied in three places.
**Fix:** Extract a generic `createRepo<T extends { id: string }>(namespace, stampFields)` factory; each repo becomes ~5 lines.

#### IN-05: `update()` permits patching `startedAt`/`createdAt`

**File:** `data/repositories/sessions.ts:62`; `data/repositories/dumpItems.ts:57`; `data/repositories/intentions.ts:57`
**Issue:** `Partial<Omit<Session, 'id'>>` still includes `startedAt`. Since session timing must be timestamp-derived, allowing arbitrary mutation of the creation timestamp weakens that integrity guarantee for no current need.
**Fix:** `Partial<Omit<Session, 'id' | 'startedAt'>>` (and `createdAt` for the other two).

#### IN-06: Dev tooling declared under `dependencies`

**File:** `package.json:5-42`
**Issue:** `jest`, `jest-expo`, `eslint`, `eslint-config-expo`, `@testing-library/react-native` are runtime `dependencies`. Metro won't bundle unimported modules, so this is hygiene, not shipping weight — but it misstates the dependency graph and slows production installs.
**Fix:** Move them to `devDependencies`.

#### IN-07: ESLint is not clean — one warning in i18n/index.ts

**File:** `i18n/index.ts:29`
**Issue:** `import/no-named-as-default-member` warning on `i18n.use(...)` ("i18n also has a named export use"). A baseline with warnings normalizes ignoring lint output.
**Fix:** Either destructure per the suggestion or add a targeted `// eslint-disable-next-line import/no-named-as-default-member` with a comment noting the default-export usage is idiomatic i18next.

#### IN-08: Math.random UUID fallback is non-cryptographic

**File:** `lib/id.ts:13-17`
**Issue:** The fallback generator uses `Math.random()`, giving weaker uniqueness guarantees than `crypto.randomUUID()`. Hermes on RN 0.85 and Node 19+ both provide `randomUUID`, so the fallback should be nearly dead code — collision risk is negligible for local-only ids, but worth knowing the branch exists if these ids ever become sync keys in Phase 7.
**Fix:** Acceptable as-is for local records; revisit before ids cross the device boundary.

#### IN-09: Hex-guard comment stripping misfires on `//` inside strings

**File:** `scripts/check-hex-literals.mjs:44-45`
**Issue:** `line.indexOf('//')` treats the first `//` anywhere — including inside string literals or URLs (`"https://…"`) — as a comment start, so a hex literal appearing after such a string on the same line is a false negative.
**Fix:** Low priority; if hardening, only strip `//` when not preceded by `:` or inside quotes, or accept the occasional false positive by not stripping at all.

#### IN-10: History reads sessionsRepo.list() non-reactively at render

**File:** `src/app/history.tsx:44`
**Issue:** The list is read once per render with no subscription or focus-refresh. Safe today because History is a leaf route freshly mounted on each navigation, but the moment it stays mounted (tabs, background create, split view) it shows stale data with no error.
**Fix:** When session creation becomes reachable while History is alive, wrap the read in `useFocusEffect`/state or move sessions into a reactive store slice.

---

_Reviewed: 2026-07-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
