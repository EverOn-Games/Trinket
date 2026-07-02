# Phase 2: Mascot Module - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 15
**Analogs found:** 13 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `src/components/Mascot/Mascot.tsx` | component | event-driven | `src/components/MascotSlot.tsx` | exact (direct predecessor/seam) |
| `src/components/Mascot/types.ts` | utility (type defs) | transform | `data/types.ts` | role-match (typed schema/union conventions) |
| `src/components/Mascot/markers.ts` | utility | transform | `data/repositories/sessions.ts` (pure-function helpers `readIndex`/`readRecord`) | partial (closest pure-JSON-parsing helper) |
| `src/components/Mascot/useIdleScheduler.ts` | hook | event-driven | `i18n/useLocale.ts` | role-match (only existing custom hook) |
| `src/components/Mascot/useReducedStimulus.ts` | hook | event-driven | `i18n/useLocale.ts` | role-match (only existing custom hook; also mirrors OS-signal + override combining) |
| `theme/tokens.ts` (modify: add `mascotGlow`) | config | CRUD (static) | `theme/tokens.ts` (existing `darkTokens.colors`) | exact (same file, additive edit) |
| `data/types.ts` (modify: add `mascotProminence` to `SettingsState`) | model | CRUD | `data/types.ts` (existing `SettingsState`) | exact (same file, additive edit) |
| `data/stores/useSettingsStore.ts` (modify) | store | CRUD | `data/stores/useSettingsStore.ts` (existing `locale`/`notificationsOptIn` fields) | exact (same file, additive edit) |
| `data/repositories/settings.ts` (modify) | service (repository) | CRUD | `data/repositories/settings.ts` (existing `get`/`update`) | exact (same file, additive edit) |
| `i18n/locales/en.json` / `pl.json` (modify: `mascot.accessibility.*`) | config (copy) | CRUD (static) | `i18n/locales/en.json` (existing `home.mascotSlotLabel`) | exact (same file, additive edit) |
| `scripts/check-mascot-asset-size.mjs` | utility (build gate) | batch | `scripts/check-hex-literals.mjs` | exact |
| `__mocks__/lottie-react-native.tsx` | test (native-module mock) | event-driven | `__mocks__/react-native-mmkv.ts` | role-match (mock-shape precedent); `__mocks__/expo-localization.ts` also relevant |
| `src/components/Mascot/__tests__/Mascot.test.tsx` | test | event-driven | `src/app/__tests__/screens.test.tsx` + `theme/__tests__/tokens.test.ts` | role-match (RTL render + assertions pattern) |
| `src/components/Mascot/__tests__/useIdleScheduler.test.ts` | test | event-driven | no direct analog (no existing hook test) | no analog — use RESEARCH.md Code Examples |
| `assets/mascot/mascot_<state>.json` (×5) | config (static asset) | batch | none (no existing asset directory) | no analog — use RESEARCH.md Pattern 2 |
| `src/app/index.tsx` (modify: swap `MascotSlot` → `Mascot`) | route (screen) | request-response | `src/app/index.tsx` (existing `MascotSlot` mount) | exact (same file, targeted edit) |

## Pattern Assignments

### `src/components/Mascot/Mascot.tsx` (component, event-driven)

**Analog:** `src/components/MascotSlot.tsx` (full file, 52 lines — read in full above)

**Imports pattern** (`src/components/MascotSlot.tsx` lines 13-15):
```typescript
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
```
Carry the same relative-import style (`../../theme`, not `@/theme`) — this codebase mixes `@/` alias (seen in `src/app/index.tsx`'s `@/components/Screen`) and relative imports inconsistently; `MascotSlot.tsx` itself uses relative, so match the file it directly replaces. New files under `src/components/Mascot/` are one directory deeper, so adjust to `../../../theme` accordingly.

**Props/fallback pattern** (`src/components/MascotSlot.tsx` lines 17-43):
```typescript
export type MascotSlotProps = {
  accessibilityLabel?: string;
};

export function MascotSlot({ accessibilityLabel }: MascotSlotProps) {
  const theme = useTheme();

  // Flattened (never an array) — see Screen.tsx's comment on expo-router's
  // <Slot> shim rejecting array `style` props on a route's child elements.
  const slotStyle = StyleSheet.flatten([
    styles.slot,
    {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
    },
  ]);

  return (
    <View
      testID="mascot-slot"
      accessible
      accessibilityLabel={accessibilityLabel}
      style={slotStyle}
    />
  );
}
```
Carry forward directly for the **loading/error fallback box** inside `<Mascot />` per the UI-SPEC's Copywriting Contract ("render the same static rounded `surfaceElevated` box the current `MascotSlot` placeholder already uses"). Also carry the **`StyleSheet.flatten([...])` never-array-style rule** — this is a hard project convention (expo-router's `<Slot>` shim throws on array `style` props on a route's root child), so any `style` prop passed down from `<Mascot />` when mounted at a route root must stay flattened.

**Testability precedent** — `testID` prop is a first-class pattern (`testID="mascot-slot"`); `MascotProps` from the UI-SPEC also requires an optional `testID` — pass it through to the root `Animated.View`/`View` the same way.

**No `style` prop** — UI-SPEC explicitly forbids a `style` prop on `MascotProps` (locks size to presets). `MascotSlot` has no `style` prop either (100% width/height:220 hardcoded) — this is consistent, no new precedent needed.

---

### `src/components/Mascot/useIdleScheduler.ts` / `useReducedStimulus.ts` (hooks, event-driven)

**Analog:** `i18n/useLocale.ts` (full file, 37 lines — read in full above)

**Hook shape pattern** (`i18n/useLocale.ts` lines 22-37):
```typescript
export type UseLocaleResult = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

export function useLocale(): UseLocaleResult {
  const { i18n } = useTranslation();

  const locale: Locale = i18n.language === 'pl' ? 'pl' : 'en';

  const setLocale = (next: Locale): void => {
    void i18n.changeLanguage(next);
  };

  return { locale, setLocale };
}
```
Pattern to copy: named `UseXResult` return-type export, hook function name matches file name, no default export. Apply this shape to both `useIdleScheduler` (return `{ /* no public API needed — internal orchestration only, called from Mascot.tsx */ }` or void) and `useReducedStimulus` (return `{ reducedStimulus: boolean }`, combining `AccessibilityInfo.isReduceMotionEnabled()` + a subscribed change listener + the host-passed prop via logical OR — same "OS signal + explicit override, combined" shape `useLocale` doesn't literally have but is the closest existing hook precedent for file/export conventions).

**No existing subscribe/unsubscribe-to-native-event hook exists in the codebase** — `useReducedStimulus` will be the first. Use RESEARCH.md's Reanimated fade example (`useEffect` cleanup pattern) and RN core `AccessibilityInfo.addEventListener(...).remove()` per RESEARCH.md's Standard Stack table — no in-repo analog for the subscribe/cleanup shape, cite RESEARCH.md directly in the plan.

---

### `src/components/Mascot/markers.ts` (utility, transform)

**Analog:** `data/repositories/sessions.ts` — pure helper functions `readIndex`/`readRecord` (lines 17-42, read in full above)

**Defensive-parse pattern** (`data/repositories/sessions.ts` lines 33-42):
```typescript
function readRecord(id: string): Session | undefined {
  const raw = contentStorage.getString(recordKey(id));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    // T-01-10: tolerate malformed JSON in a record key rather than crash list()/get().
    return undefined;
  }
}
```
Copy the **tolerate-malformed-input-defensively, never throw** convention (`try { ... } catch { return <safe fallback> }` with an inline comment citing why) for `resolveMarkers()`'s defensive `JSON.parse(marker.cm).name` fallback (RESEARCH.md Pitfall 2) — this project's established idiom for "input may be malformed, degrade gracefully, comment why" is exactly this shape. Use the same comment-citing-requirement-ID convention (e.g. reference `Pitfall 2` or a requirement ID in the inline comment, mirroring `T-01-10`).

---

### `theme/tokens.ts` (config, additive edit)

**Analog:** same file, existing `darkTokens.colors` block (lines 68-78, read in full above)

**Pattern to copy** — add exactly one key to the existing `colors` object in both the `ThemeTokens` type and `darkTokens`:
```typescript
// In ThemeTokens.colors:
border: string;
mascotGlow: string; // '#F2C988' — amber/gold, mascot-only accent (D-08)

// In darkTokens.colors:
border: '#3A3229',
mascotGlow: '#F2C988',
```
Do **not** add `mascotGlowDeep` (D-08/FLAG 4 explicitly defers it). Extend `theme/__tests__/tokens.test.ts`'s `REQUIRED_COLOR_KEYS` array (line 11-20) to include `'mascotGlow'` so the existing `it.each` hex-format test covers it automatically — this is the established pattern for asserting new token keys are valid hex (see `theme/__tests__/tokens.test.ts` lines 22-25).

---

### `data/types.ts` / `data/stores/useSettingsStore.ts` / `data/repositories/settings.ts` (model/store/service, CRUD — D-05)

**Analog:** all three same files, existing `locale`/`notificationsOptIn` field wiring (read in full above)

**`data/types.ts` pattern** (lines 45-49):
```typescript
export interface SettingsState {
  locale: Locale;
  notificationsOptIn: boolean;
  subscriptionCache: unknown; // typed placeholder, populated in Phase 7
}
```
Add: `mascotProminence: 'prominent' | 'subtle' | 'hidden';` (a new exported `MascotProminence` type alias, or inline union — the UI-SPEC's `types.ts` in the Mascot module already defines `MascotProminence`; **reuse that exact type** here via import to avoid a duplicate/drifting union, e.g. `import type { MascotProminence } from '../../src/components/Mascot/types';` — confirm actual relative path at plan time). **CRITICAL:** name contains no denylist stem (`streak`/`daily`/`diagnosis`/etc.) — `mascotProminence` passes `schema.denylist.test.ts`'s stems cleanly, no risk there.

**`data/stores/useSettingsStore.ts` pattern** (lines 23-56):
```typescript
export interface SettingsStoreState {
  locale: Locale;
  localeResolved: boolean;
  notificationsOptIn: boolean;
  subscriptionCache: unknown;
  setLocale: (locale: Locale) => void;
  setNotificationsOptIn: (notificationsOptIn: boolean) => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      locale: 'en',
      localeResolved: false,
      notificationsOptIn: false,
      subscriptionCache: null,
      setLocale: (locale) => set({ locale, localeResolved: true }),
      setNotificationsOptIn: (notificationsOptIn) => set({ notificationsOptIn }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage<SettingsStoreState>(() => mmkvStateStorage),
    }
  )
);
```
Add `mascotProminence: MascotProminence;` to the interface, default `mascotProminence: 'prominent'` in the initializer, and a `setMascotProminence: (mascotProminence: MascotProminence) => void` action following the exact `setNotificationsOptIn` shape (`set({ mascotProminence })`). No new persist key/storage wiring needed — same `settings` persist blob.

**`data/repositories/settings.ts` pattern** (full file, lines 10-28, read in full above):
```typescript
export const settingsRepo = {
  get(): SettingsState {
    const { locale, notificationsOptIn, subscriptionCache } = useSettingsStore.getState();
    return { locale, notificationsOptIn, subscriptionCache };
  },

  update(patch: Partial<SettingsState>): SettingsState {
    if (patch.locale !== undefined) {
      useSettingsStore.getState().setLocale(patch.locale);
    }
    if (patch.notificationsOptIn !== undefined) {
      useSettingsStore.getState().setNotificationsOptIn(patch.notificationsOptIn);
    }
    if (patch.subscriptionCache !== undefined) {
      useSettingsStore.setState({ subscriptionCache: patch.subscriptionCache });
    }
    return settingsRepo.get();
  },
};
```
Add `mascotProminence` to the destructure in `get()` and a mirrored `if (patch.mascotProminence !== undefined) { useSettingsStore.getState().setMascotProminence(patch.mascotProminence); }` block in `update()`, following the exact `notificationsOptIn` branch shape (setter-action route, not raw `setState`, since a dedicated action now exists).

**Test extension pattern** — `data/repositories/__tests__/repositories.test.ts` and `schema.denylist.test.ts` both already iterate `useSettingsStore.getState()`; no new test file needed, extend existing coverage (per RESEARCH.md's Validation Architecture: "✅ (files exist, extend coverage)").

---

### `i18n/locales/en.json` / `pl.json` (config copy, additive edit — `mascot.accessibility.*`)

**Analog:** same files, existing `home.mascotSlotLabel` key (`i18n/locales/en.json` line 4, `pl.json` line 4)

**Pattern to copy** — nested namespace object, mirroring the existing `home`/`coPilot`/`brainDump` top-level namespace shape:
```json
// en.json — add a new top-level "mascot" namespace, sibling to "home"
"mascot": {
  "accessibility": {
    "greeting": "Your companion says hello",
    "idle": "Your companion is here, resting quietly",
    "presence": "Your companion is here with you",
    "dozing": "Your companion has dozed off",
    "acknowledge": "Your companion acknowledges you"
  }
}
```
```json
// pl.json — same structure, warm/plain/gender-neutral register matching existing pl.json tone
// (e.g. "Miejsce twojego towarzysza" for mascotSlotLabel — reuse "towarzysz" (companion) vocabulary)
"mascot": {
  "accessibility": {
    "greeting": "...",
    "idle": "...",
    "presence": "...",
    "dozing": "...",
    "acknowledge": "..."
  }
}
```
Note `pl.json` has **no trailing-key pluralization needed here** (these are static per-state labels, not counted quantities) — do not apply the `_one`/`_few`/`_many` CLDR pattern seen in `sessionsRemaining_*` (lines 33-35 of each file); that pattern is irrelevant to this key set. Existing `home.mascotSlotLabel` (`"Miejsce twojego towarzysza"` / `"Your companion's spot"`) establishes `towarzysz`/`companion` as the settled PL/EN vocabulary for the mascot — reuse it consistently across the new `mascot.accessibility.*` keys rather than introducing a new term (e.g. "maskotka").

---

### `scripts/check-mascot-asset-size.mjs` (utility/build gate, batch)

**Analog:** `scripts/check-hex-literals.mjs` (full file, 98 lines — read in full above)

**Fail-closed gate shape to copy** (lines 1-26, 63-97):
```javascript
#!/usr/bin/env node
/**
 * [doc comment explaining the guard, citing the requirement ID]
 */
import { globSync } from 'node:fs';
import { readFileSync, statSync } from 'node:fs'; // statSync new for size-check
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_GLOB = 'assets/mascot/*.json';
const MAX_BYTES = 300 * 1024; // 300KB (MASC-04)

function main() {
  const files = globSync(SCAN_GLOB, { cwd: ROOT });

  if (files.length === 0) {
    console.error(
      `check-mascot-asset-size: no files matched ${SCAN_GLOB} — refusing to pass an empty scan.`
    );
    process.exit(1);
  }

  let violationCount = 0;

  for (const file of files) {
    const { size } = statSync(path.join(ROOT, file));
    if (size > MAX_BYTES) {
      violationCount += 1;
      console.error(`${file}: ${size} bytes exceeds ${MAX_BYTES} byte limit (MASC-04)`);
    }
  }

  if (violationCount > 0) {
    console.error(`\ncheck-mascot-asset-size: ${violationCount} asset(s) exceed the 300KB gate.`);
    process.exit(1);
  }

  console.log('check-mascot-asset-size: all mascot assets under 300KB.');
  process.exit(0);
}

main();
```
Copy verbatim: (1) `#!/usr/bin/env node` shebang, (2) root resolution via `import.meta.url` not `process.cwd()` (documented reason: "running the script from any other working directory used to silently scan nothing and still exit 0"), (3) **empty-scan-is-a-failure guard** (`files.length === 0` → exit 1, not a silent pass), (4) `violationCount` accumulator + single summary error line + `process.exit(1)`, (5) success `console.log` + `process.exit(0)`. Wire into `package.json`'s `verify` script the same way `lint:hex` is wired: `"lint:mascot-assets": "node scripts/check-mascot-asset-size.mjs"`, then `"verify": "npm run lint && npm run lint:hex && npm run lint:mascot-assets && npm test"`.

---

### `__mocks__/lottie-react-native.tsx` (test — native-module mock)

**Analog:** `__mocks__/react-native-mmkv.ts` (full file, 72 lines, read in full above) and `__mocks__/expo-localization.ts` (full file, 17 lines, read in full above)

**Doc-comment convention to copy** (`__mocks__/react-native-mmkv.ts` lines 1-9):
```typescript
/**
 * In-memory fake of the react-native-mmkv v4 surface, used exclusively under Jest.
 *
 * MMKV v4 is built on Nitro Modules (JSI) and cannot initialize inside Jest's Node test
 * environment ("Failed to get NitroModules" — see 01-RESEARCH.md Pitfall 1 /
 * github.com/mrousavy/react-native-mmkv/issues/945). This mock lets repository logic
 * (CRUD correctness, index management, schema shape) be unit-tested without the real
 * native binding. Actual on-device persistence must be verified separately on hardware.
 */
```
Every mock file in this repo opens with: (1) what native capability is faked, (2) *why* Jest can't use the real module (cite the specific error string if known), (3) what this unblocks, (4) what must still be verified on hardware. Apply the same 4-part doc comment to `__mocks__/lottie-react-native.tsx`, citing "native `LottieView` rendering + imperative ref API cannot run under Jest's Node environment" as the reason.

**Registration pattern** (`jest.setup.ts` lines 1-9, read in full above):
```typescript
// Register the in-memory react-native-mmkv fake (see __mocks__/react-native-mmkv.ts).
// MMKV v4's Nitro Modules binding cannot initialize under Jest's Node environment, so
// every repository/test that touches storage must go through this mock instead.
jest.mock('react-native-mmkv');

// Register the in-memory expo-localization fake (see __mocks__/expo-localization.ts).
// getLocales() wraps a native module unavailable under Jest's Node environment; every
// module/test that reads the device locale (e.g. i18n/index.ts's resolveInitialLocale)
// must go through this mock instead.
jest.mock('expo-localization');
```
Add a third block: `jest.mock('lottie-react-native');` with the same 2-line comment shape (what's faked, why, what depends on it) directly below the existing two in `jest.setup.ts`.

**Mock implementation shape** — use RESEARCH.md's Pattern 3 code example verbatim (`forwardRef` + `useImperativeHandle` exposing `play`/`pause`/`resume`/`reset` as `jest.fn()`s, `View` stub with `testID="lottie-view-mock"`) — this is a synthesized-but-well-sourced pattern (mirrors `react-native-mmkv`'s class-based fake shape adapted to a component/ref shape since `LottieView` is a component, not a class). No existing component-with-imperative-ref mock exists in-repo to copy directly; RESEARCH.md Pattern 3 is the correct source for this one file.

---

### `src/components/Mascot/__tests__/Mascot.test.tsx` (test, event-driven)

**Analog:** `src/app/__tests__/screens.test.tsx` (full file, 82 lines, read in full above) for RTL usage conventions; `theme/__tests__/tokens.test.ts` (full file, 81 lines, read in full above) for component-under-provider render pattern

**RTL render + provider wrapping pattern** (`theme/__tests__/tokens.test.ts` lines 62-80):
```typescript
describe('theme/useTheme', () => {
  function Probe() {
    const theme = useTheme();
    return React.createElement(Text, null, `${theme.colors.background}|...`);
  }

  it('returns darkTokens when rendered under ThemeProvider', async () => {
    const { getByText } = await render(
      React.createElement(ThemeProvider, null, React.createElement(Probe))
    );
    expect(getByText(expected)).toBeTruthy();
  });
});
```
Note: `render()` from `@testing-library/react-native` v14 is **async — must be awaited** (explicit comment in `screens.test.tsx` line 52-53: "`@testing-library/react-native` v14's `render()` is async — `renderRouter`'s return value must be awaited"). Apply the same `await render(...)` discipline to every `Mascot.test.tsx` test. `<Mascot />` will need `ThemeProvider` as a wrapper (it calls `useTheme()`) and the `lottie-react-native` mock (auto-applied via `jest.setup.ts`'s `jest.mock`).

**`fireEvent` + `screen` singleton pattern** (`src/app/__tests__/screens.test.tsx` lines 60-68) — use `fireEvent` for any interactive assertions (not applicable to `<Mascot />` itself since it has no touch targets, but relevant if testing host integration in `index.tsx`'s test coverage).

**Structural/source-scan test pattern** (`data/repositories/__tests__/schema.denylist.test.ts` lines 87-94, read in full above) — for MASC-03's "exactly 5 states, no 6th" structural guard:
```typescript
it('has zero pressure/aggregate/diagnosis fields declared in data/types.ts, including optional ones', () => {
  const typesSource = readFileSync(join(__dirname, '../../types.ts'), 'utf8');
  const declaredNames = extractInterfacePropertyNames(typesSource);
  const violations = declaredNames.filter((name) => violatingStems(name).length > 0);
  expect(violations).toEqual([]);
});
```
Copy this **source-level regex scan over a `.ts` file's raw text** approach for the MASC-03 structural guard (assert `MascotState` union literal in `types.ts` contains exactly the 5 allowed values and no others) — same `readFileSync(join(__dirname, ...))` + regex-extraction + `expect(...).toEqual([])` shape.

---

## Shared Patterns

### Token-only styling (D-02, hard constraint)
**Source:** `theme/useTheme.ts`, enforced by `scripts/check-hex-literals.mjs`
**Apply to:** `Mascot.tsx` (all colors via `useTheme()`, no hex in `.tsx`); the one exception is the Lottie JSON asset files themselves (`assets/mascot/*.json`), which are **not** scanned by `check-hex-literals.mjs` (glob is `src/app|features|components/**/*.tsx` only) — RESEARCH.md Pattern 2 confirms this is a deliberate, documented exception, not an oversight. Note this explicitly in the plan so no one "fixes" it by trying to import from `theme/tokens.ts` into a JSON file (impossible).
```javascript
const SCAN_GLOBS = [
  'src/app/**/*.tsx',
  'src/features/**/*.tsx',
  'src/components/**/*.tsx',
];
```

### `StyleSheet.flatten([...])` never-array-style rule (hard project convention)
**Source:** `src/components/MascotSlot.tsx` lines 24-26, `src/app/index.tsx` lines 32-34
**Apply to:** Any `Mascot.tsx` style prop that could be composed from multiple sources (base + theme-derived) — always `StyleSheet.flatten([...])`, never pass a raw array to a `style` prop on any node that could become a route's root/`<Link asChild>` child.

### i18next `t()`-only copy, no literal strings (hard constraint)
**Source:** `i18n/locales/en.json`/`pl.json`, ESLint `i18next/no-literal-string`
**Apply to:** `Mascot.tsx` itself never calls `t()` (it receives `accessibilityLabel` as a translated prop per UI-SPEC — "module receives translated strings via props; keys live host-side"). The **host** (`src/app/index.tsx`) is what calls `t('mascot.accessibility.idle')` etc. and passes the result down. Do not add i18n imports inside `src/components/Mascot/` itself.

### Repositories-over-MMKV + Zustand-persist singleton (D-05)
**Source:** `data/repositories/settings.ts` + `data/stores/useSettingsStore.ts`
**Apply to:** `mascotProminence` field — extends the existing `settings` persist blob exactly like `notificationsOptIn` was added; no new MMKV key, no new repo file, no new store file.
```typescript
setNotificationsOptIn: (notificationsOptIn) => set({ notificationsOptIn }),
```

### Schema denylist guard (structural, hard constraint — D-07)
**Source:** `data/repositories/__tests__/schema.denylist.test.ts`
**Apply to:** Confirms `mascotProminence` (an enum/state field, not a timestamp/counter) passes cleanly; the **real** risk this phase is D-07's in-memory-only greeting flag — do NOT add any field like `lastGreetedAt`/`greetedAt` to `SettingsState` or any MMKV-backed store. The greeting cadence flag must live in a plain in-memory React state/ref (e.g. a module-level `let hasGreetedThisSession = false` or a Zustand store **without** `persist`), never written through `settingsRepo`/`useSettingsStore`.

### Fail-closed build-gate script shape
**Source:** `scripts/check-hex-literals.mjs`
**Apply to:** `scripts/check-mascot-asset-size.mjs` — same shebang, root-resolution-via-`import.meta.url`, empty-scan-fails, violation-accumulator, `process.exit(0|1)` shape. Wire into `package.json`'s `verify` script alongside `lint:hex`.

### Native-module Jest mock + `jest.setup.ts` registration
**Source:** `__mocks__/react-native-mmkv.ts`, `__mocks__/expo-localization.ts`, `jest.setup.ts`
**Apply to:** `__mocks__/lottie-react-native.tsx` — same 4-part doc comment (what/why/unblocks/still-verify-on-hardware) + `jest.mock('lottie-react-native')` registration appended to `jest.setup.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `assets/mascot/mascot_<state>.json` (×5) | config (static asset) | batch | No existing `assets/` directory with structured JSON assets in this codebase (Phase 1 has no Lottie/media assets yet) — author per RESEARCH.md Pattern 2's minimal Bodymovin JSON schema example directly; no in-repo precedent exists |
| `src/components/Mascot/__tests__/useIdleScheduler.test.ts` | test | event-driven | No existing custom-hook test file in the codebase to mirror (only component/screen/repository tests exist) — use RESEARCH.md's Code Examples (`pickWeightedMicroBehavior`, `nextIdleIntervalMs`) as the source of truth for what to assert, and Jest's built-in fake-timers API (`jest.useFakeTimers()`) per standard RN/Jest convention, not an in-repo pattern |
| `src/components/Mascot/useReducedStimulus.ts` (OS subscribe/cleanup half) | hook | event-driven | No existing hook in this codebase subscribes to a native `AccessibilityInfo`-style change event with cleanup — `i18n/useLocale.ts` is the closest hook-shape analog but doesn't demonstrate the subscribe/unsubscribe pattern; cite RESEARCH.md's Standard Stack table (`AccessibilityInfo.isReduceMotionEnabled()` + `addEventListener('reduceMotionChanged', ...)`) directly |

## Metadata

**Analog search scope:** `src/`, `data/`, `theme/`, `i18n/`, `scripts/`, `__mocks__/`, `jest.config.js`, `jest.setup.ts`, `package.json` (full repo excluding `node_modules/`, `ios/`, `android/`, which do not exist pre-prebuild)
**Files scanned:** 24 (full reads: `MascotSlot.tsx`, `tokens.ts`, `tokens.test.ts`, `useTheme.ts`, `ThemeProvider.tsx`, `data/types.ts`, `settings.ts` repo, `useSettingsStore.ts`, `schema.denylist.test.ts`, `repositories.test.ts` (partial), `sessions.ts`, `check-hex-literals.mjs`, `react-native-mmkv.ts` mock, `expo-localization.ts` mock, `useLocale.ts`, `index.tsx` (Home), `screens.test.tsx`, `jest.setup.ts`, `jest.config.js`, `package.json`; directory listings of `data/`, `__mocks__/`, `scripts/`, `src/`, `theme/`, `i18n/`)
**Pattern extraction date:** 2026-07-02
