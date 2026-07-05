# Phase 4: Brain Dump - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/brain-dump.tsx` (rewrite of stub) | component (screen) | CRUD + request-response | `src/app/co-pilot.tsx` (flowPhase state machine) + `src/app/history.tsx` (list rendering) | role-match (composite) |
| `src/features/brain-dump/parseDumpText.ts` | utility (pure function) | transform | `src/features/co-pilot/reconcileActiveSession.ts` | exact |
| `src/features/brain-dump/__tests__/parseDumpText.test.ts` | test | transform | `src/features/co-pilot/__tests__/reconcileActiveSession.test.ts` | exact |
| `src/features/brain-dump/classify.ts` | utility (pure function) | transform | `src/features/co-pilot/reconcileActiveSession.ts` | exact |
| `src/features/brain-dump/keywords.ts` | config (data module) | transform (static data) | `src/components/Mascot/markers.ts` | role-match |
| `src/features/brain-dump/__tests__/classify.test.ts` | test | transform | `src/features/co-pilot/__tests__/reconcileActiveSession.test.ts` | exact |
| `data/draft.ts` | service (thin storage wrapper) | file-I/O (MMKV) | `data/mmkv.ts` (`contentStorage`) usage in `data/repositories/dumpItems.ts` | role-match |
| `__mocks__/expo-speech-recognition.ts` | test (Jest manual mock) | event-driven | `__mocks__/lottie-react-native.tsx` + `__mocks__/expo-localization.ts` | exact |
| `jest.setup.ts` (extend) | config | event-driven | itself (existing `jest.mock(...)` registrations) | exact |
| `src/app/co-pilot.tsx` (extend only) | controller (screen, extend) | request-response | itself — `startFromDumpItem`/`beginSession`/`resumablePointer` (read the existing file, do not restructure) | exact |
| `i18n/locales/{en,pl}.json` (extend) | config (copy) | request-response | existing `brainDump`/`coPilot`/`history` namespaces in same files | exact |
| `app.json` (extend `plugins`) | config | file-I/O (native config) | existing `expo-localization`/`expo-build-properties` plugin entries | exact |

## Pattern Assignments

### `src/features/brain-dump/parseDumpText.ts` (utility, transform)

**Analog:** `src/features/co-pilot/reconcileActiveSession.ts` (read in full, 29 lines)

**Shape to copy** (whole file is the model — no MMKV import, no React import, explicit inputs in, deterministic output out):
```typescript
/**
 * reconcileActiveSession — pure cold-launch reconciliation decision function
 * (D-11/D-12)... explicit inputs in, deterministic discriminated-union
 * output out, no MMKV/React import, no Date.now() read internally — trivially
 * unit-testable with plain Jest it() blocks and zero mocks.
 */
import type { ActiveSessionPointer } from '../../../data/types';

export type ReconcileAction =
  | { kind: 'none' }
  | { kind: 'keep-live' }
  | { kind: 'reconcile-stale'; endedAt: number };

export function reconcileActiveSession(
  pointer: ActiveSessionPointer | undefined,
  now: number,
  thresholdMs: number
): ReconcileAction {
  if (!pointer) return { kind: 'none' };
  if (now - pointer.lastAliveAt <= thresholdMs) return { kind: 'keep-live' };
  return { kind: 'reconcile-stale', endedAt: pointer.lastAliveAt };
}
```

**Apply to `parseDumpText.ts`:** same header-comment convention ("mirrors X's shape: explicit inputs in, ... no mocks"), a single exported pure function, no side effects:
```typescript
// src/features/brain-dump/parseDumpText.ts
// Mirrors reconcileActiveSession.ts's shape: explicit inputs in, deterministic
// output out, no MMKV/React import — trivially unit-testable with zero mocks.
export function parseDumpText(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
```

**Test file pattern** — copy the plain `describe`/`it` shape from `src/features/co-pilot/__tests__/reconcileActiveSession.test.ts` (full file, 63 lines): no `renderHook`, no mocks, construct inputs directly, one `it()` per named scenario/pitfall (e.g. "drops blank lines", "empty field is a no-op", mirroring the file's own "Pitfall 3", "T-03-02" callouts in test names).

---

### `src/features/brain-dump/classify.ts` (utility, transform) + `keywords.ts` (config/data)

**Analog for function shape:** `src/features/co-pilot/reconcileActiveSession.ts` (same as above — pure function, deterministic, always returns a value, never `null`/`undefined`).

**Analog for keyword-list-as-data:** `src/components/Mascot/markers.ts` (lines 1-63, read in full). Key transferable pattern: a **data-only lookup module** with no business logic beyond building/decoding a table, defensive fallback (`try { JSON.parse(...) } catch { return cm; }`), and a dev-only `console.warn` for missing-but-expected entries (not a thrown error):
```typescript
// src/components/Mascot/markers.ts lines 26-43 (decodeMarkerName) — the
// defensive-fallback idiom to mirror: attempt a structured parse, fall back
// to the raw value on failure, never throw.
function decodeMarkerName(cm: string): string {
  try {
    const parsed: unknown = JSON.parse(cm);
    if (parsed !== null && typeof parsed === 'object' && 'name' in parsed && typeof (parsed as { name: unknown }).name === 'string') {
      return (parsed as { name: string }).name;
    }
    return cm;
  } catch {
    return cm;
  }
}
```
And lines 53-60 (dev-only warning idiom — applicable if `keywords.ts` ever wants to sanity-check category coverage without failing a production build):
```typescript
if (process.env.NODE_ENV !== 'production') {
  const missing = REQUIRED_MARKER_NAMES.filter((name) => !(name in table));
  if (missing.length > 0) {
    console.warn(`resolveMarkers: missing required marker(s): ${missing.join(', ')}`);
  }
}
```

**`classify.ts` skeleton (D-09/D-10 — ties/no-match → `'someday'`; never null):**
```typescript
// src/features/brain-dump/classify.ts
import type { DumpItemCategory, Locale } from '../../../data/types';
import { KEYWORDS_BY_CATEGORY } from './keywords';

const CATEGORY_ORDER: readonly DumpItemCategory[] = ['errands', 'work', 'home', 'people', 'someday'];

export function classify(text: string, locale: Locale): DumpItemCategory {
  const normalized = text.toLowerCase();
  let bestCategory: DumpItemCategory = 'someday'; // strict '>' below guarantees ties never displace this
  let bestScore = 0;
  for (const category of CATEGORY_ORDER) {
    if (category === 'someday') continue;
    const stems = KEYWORDS_BY_CATEGORY[category][locale];
    const score = stems.filter((stem) => normalized.includes(stem)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}
```
Note the tie-break relies on strict `>` against a `someday`-seeded default (Pitfall 4 in RESEARCH.md) — TDD this explicitly with a same-score-in-two-categories test case.

**`DumpItemCategory` type source** (`data/types.ts` line 14): `export type DumpItemCategory = 'errands' | 'work' | 'home' | 'people' | 'someday';`. `Locale` type (`data/types.ts` line 57): `export type Locale = 'pl' | 'en';`.

---

### `data/draft.ts` (service, file-I/O)

**Analog:** `data/mmkv.ts` (full file, 21 lines) for the storage instance being wrapped, and `data/repositories/dumpItems.ts` (full file, 69 lines) for the surrounding read/write idiom (`contentStorage.getString`/`.set`/`.remove`, JSON try/catch tolerance on read).

**`contentStorage` import site** (`data/mmkv.ts` line 19):
```typescript
export const contentStorage = createMMKV({ id: 'trinket-content' });
```

**Read/write idiom to mirror** (`data/repositories/dumpItems.ts` lines 14-23, the `readIndex`/`writeIndex` pair — same shape, simpler for a single string value):
```typescript
function readIndex(): string[] {
  const raw = contentStorage.getString(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}
function writeIndex(ids: string[]): void {
  contentStorage.set(INDEX_KEY, JSON.stringify(ids));
}
```

**`data/draft.ts` target shape** (plain string value, no JSON/index — simpler than a repo since D-06 explicitly says this is NOT a repo-shaped record):
```typescript
// data/draft.ts
import { contentStorage } from './mmkv';

const BRAIN_DUMP_DRAFT_KEY = 'draft:brainDump'; // verified clean against every
// DENYLIST_STEMS entry in data/repositories/__tests__/schema.denylist.test.ts
// (streak, daily, completionrate, daychain, lastactive, activedays, diagnosis, adhd)

export function readBrainDumpDraft(): string {
  return contentStorage.getString(BRAIN_DUMP_DRAFT_KEY) ?? '';
}
export function writeBrainDumpDraft(text: string): void {
  contentStorage.set(BRAIN_DUMP_DRAFT_KEY, text);
}
export function clearBrainDumpDraft(): void {
  contentStorage.remove(BRAIN_DUMP_DRAFT_KEY);
}
```

**Save-path repo write to mirror** (`data/repositories/dumpItems.ts` lines 40-45, `create()` — note `...input` spreads FIRST so fresh `id`/`createdAt` win, per CLAUDE.md convention):
```typescript
create(input: Omit<DumpItem, 'id' | 'createdAt'>): DumpItem {
  const item: DumpItem = { ...input, id: newId(), createdAt: Date.now() };
  contentStorage.set(recordKey(item.id), JSON.stringify(item));
  writeIndex([...readIndex(), item.id]);
  return item;
},
```
Brain Dump's Save handler calls `dumpItemsRepo.create({ text: line, category: classify(line, locale) })` once per parsed line — no new repository code needed, `dumpItemsRepo` already supports this shape.

---

### `src/app/brain-dump.tsx` (component, CRUD + request-response — full rewrite of stub)

**Analog 1 (state machine + inline chip/list-in-render pattern):** `src/app/co-pilot.tsx` (read in full, 718 lines).

Key transferable pieces:
- **Screen-level phase state machine** (lines 85-87, 160-177): a `useState<'setup' | 'active' | 'ending'>` (here: `'list' | 'capture'`) driving which sub-component renders, with the `<Screen>` wrapper unchanged across phases:
```typescript
const [flowPhase, setFlowPhase] = useState<'setup' | 'active' | 'ending'>(...);
return (
  <Screen>
    {flowPhase === 'active' && activeSession ? (
      <ActivePhase ... />
    ) : flowPhase === 'ending' && activeSession ? (
      <EndingPhase ... />
    ) : (
      <SetupPhase ... />
    )}
  </Screen>
);
```
- **Repo read directly in render body** (line 203): `const dumpItems = dumpItemsRepo.list();` — no `useEffect`/`useState` mirror of repo data; re-read on every render, consistent with this codebase's precedent (also seen in `index.tsx` line 108's `activeSessionRepo.read()`).
- **Empty-suppression list rendering** (lines 305-319): the exact pattern D-12 calls for (render a section only if it has content):
```typescript
{dumpItems.length > 0 && (
  <View style={{ gap: theme.spacing.sm }}>
    <Text style={sectionLabelStyle}>{t('coPilot.setup.dumpPicker.heading')}</Text>
    {dumpItems.map((item) => (
      <Pressable key={item.id} accessibilityRole="button" onPress={() => onStartDumpItem(item)} style={dumpRowStyle}>
        <Text style={dumpRowTextStyle}>{item.text}</Text>
      </Pressable>
    ))}
  </View>
)}
```
- **Chip row pattern for the category-correction UI** (D-11): lines 322-373 (`LENGTH_CHIP_VALUES.map(...)` chip row with a `selected` boolean driving `theme.colors.accent` vs `theme.colors.surfaceElevated`) is the direct visual/structural analog for the 5-category correction chip row:
```typescript
{LENGTH_CHIP_VALUES.map((minutes) => {
  const selected = lengthIntentMin === minutes;
  const chipStyle = StyleSheet.flatten([
    styles.tapTarget, styles.chip,
    { backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceElevated, borderRadius: theme.radii.pill },
  ]);
  ...
  return (
    <Pressable key={minutes} accessibilityRole="button" hitSlop={8} onPress={() => onSelectLengthIntent(minutes)} style={chipStyle}>
      <Text style={chipLabelStyle}>{t('coPilot.setup.lengthChip', { count: minutes })}</Text>
    </Pressable>
  );
})}
```
- **Double-tap guard idiom** (lines 114, 122-128, `isStartingSessionRef`): use the same `useRef(false)` guard pattern for Save (prevent double-submit creating duplicate items) and for the promote tap.
- **Token-only styling + `StyleSheet.flatten([...])` (never an array style prop)** — every style in the file follows this; `Screen.tsx`'s comment (referenced at `co-pilot.tsx` — actually documented in `index.tsx` lines 157-160) explains why: expo-router's `<Slot>` shim rejects array `style` props.

**Analog 2 (persistent list + empty-state + `FlatList`):** `src/app/history.tsx` (read in full, 142 lines) — the closer analog for the **grouped list screen half** specifically (D-12's persistent list, as opposed to co-pilot's ephemeral setup picker):
- **Empty-state / populated-list branch** (lines 103-113):
```typescript
{sessions.length === 0 ? (
  <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
    {t('history.emptyState')}
  </Text>
) : (
  <FlatList
    data={sessions}
    keyExtractor={(session) => session.id}
    renderItem={({ item }) => <SessionRow session={item} />}
  />
)}
```
For Brain Dump, per RESEARCH.md Pattern 5, use `SectionList` instead of `FlatList` (grouped-by-category shape) but keep the same empty-state-vs-list branch structure, and per D-12 route straight to the capture view when the list is empty (not just an empty-state message).
- **Row component extraction** (lines 23-80, `SessionRow`) — a separate named row component receiving the record as a prop, computing derived display values (durations, mood glyphs) locally — mirror this for `DumpItemRow` (chip state, promoted-marker "quiet" styling per D-15).
- **`useState(() => Date.now())` lazy-initializer idiom** (line 34) — reuse if any "now" comparison is needed (avoids the `react-hooks/purity` violation of a bare `Date.now()` call in render).

**Header comment convention** (both files' top-of-file docblocks, e.g. `brain-dump.tsx` lines 1-4 currently, `history.tsx` lines 1-8, `co-pilot.tsx` lines 1-14) — cite the requirement IDs (`D-04, D-12` etc.) and briefly explain the phase/state shape, matching this codebase's established documentation style.

---

### `src/app/co-pilot.tsx` (EXTEND ONLY — the promote hand-off, D-14)

**Do not restructure.** Read in full (718 lines) — the exact reuse targets, verbatim:

`startFromDumpItem` (lines 130-136):
```typescript
const startFromDumpItem = (item: DumpItem) => {
  if (isStartingSessionRef.current) return;
  isStartingSessionRef.current = true;
  const session = sessionsRepo.create({ source: 'dump', taskLabel: item.text });
  dumpItemsRepo.update(item.id, { promotedTaskId: session.id });
  beginSession(session);
};
```
`beginSession` (lines 116-120):
```typescript
const beginSession = (session: Session) => {
  activeSessionRepo.start(session.id, session.startedAt, session.taskLabel);
  setActiveSession({ sessionId: session.id, startedAt: session.startedAt, taskLabel: session.taskLabel });
  setFlowPhase('active');
};
```
`resumablePointer` initializer (lines 75-81) — the existing "does a session already win" gate that any new promote-effect must respect (RESEARCH.md: "only when `flowPhase === 'setup'` and no `resumablePointer` exists"):
```typescript
const [resumablePointer] = useState<ActiveSessionPointer | undefined>(() => {
  const pointer = activeSessionRepo.read();
  if (!pointer) return undefined;
  return reconcileActiveSession(pointer, nowAtMount, STALE_THRESHOLD_MS).kind === 'keep-live'
    ? pointer
    : undefined;
});
```

**Additive edit needed:** add `useLocalSearchParams<{ dumpItemId?: string }>()` (new import from `expo-router`, alongside the existing `useRouter` import at line 16) plus one new `useEffect` gated on `flowPhase === 'setup' && !resumablePointer` that calls `dumpItemsRepo.get(dumpItemId)` then `startFromDumpItem(item)` — do not touch the body of `startFromDumpItem`/`beginSession` themselves.

**Brain Dump's calling side** (in the new `brain-dump.tsx`, per RESEARCH.md):
```typescript
router.push({ pathname: '/co-pilot', params: { dumpItemId: item.id } });
```

---

### `__mocks__/expo-speech-recognition.ts` (test, event-driven)

**Analog 1 (native-module View-stub mock):** `__mocks__/lottie-react-native.tsx` (full file, 53 lines) — the pattern of exposing the same imperative API as `jest.fn()`s so component logic is testable without the native binding:
```typescript
export const mockLottieRef: LottieViewRef = {
  play: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  reset: jest.fn(),
};
const LottieView = forwardRef<LottieViewRef, LottieViewProps>((props, ref) => {
  useImperativeHandle(ref, () => mockLottieRef);
  return <View testID="lottie-view-mock" {...props} />;
});
export default LottieView;
```

**Analog 2 (in-memory fake of a native API surface, controllable per-test via `.mockReturnValue`):** `__mocks__/expo-localization.ts` (full file, 17 lines):
```typescript
export const getLocales = jest.fn(() => [
  { languageCode: 'en', languageTag: 'en-US' },
]);
```
This is the closer analog for `expo-speech-recognition` specifically, since it is not a `View`-rendering native module (no ref/JSX needed) but an imperative module + event-hook surface — model `ExpoSpeechRecognitionModule` as a plain object of `jest.fn()`s (`requestPermissionsAsync`, `isRecognitionAvailable`, `supportsOnDeviceRecognition`, `getSupportedLocales`, `start`, `stop`), each individually overridable per test the same way `getLocales` is.

**Registration site** (`jest.setup.ts`, extend the existing block, lines 1-16 show the exact registration idiom to copy — one `jest.mock('<pkg>')` line per native dependency, each preceded by a comment explaining why the real module can't run under Jest):
```typescript
jest.mock('react-native-mmkv');
jest.mock('expo-localization');
jest.mock('lottie-react-native');
```
Add: `jest.mock('expo-speech-recognition');` following the same one-line-plus-comment convention, placed after the existing three (before the `react-native-worklets`/`react-native-reanimated` block at lines 18-34, which is unrelated).

---

### `i18n/locales/{en,pl}.json` (extend)

**Analog:** existing `brainDump` key (currently 2 keys, `en.json` lines 63-66; `pl.json` mirrors it) — extend this exact object with new nested keys (`capture.*`, `category.*`, `item.*`) rather than creating a new top-level namespace. Follow the established nesting depth seen in `coPilot` (lines 18-62) — e.g. `coPilot.setup.oneLiner.{label,placeholder,cta}` as the 3-level-deep nesting precedent for `brainDump.capture.{listening,orTypeInstead,...}`.

**CLDR plural key convention** (`en.json` lines 38-39, `84-85`; `pl.json` lines 38-40 show all 4 Polish forms `_one`/`_few`/`_many`/`_other`) — if any new copy needs pluralization (e.g. an item count), follow this exact suffix convention, e.g.:
```json
"lengthChip_one": "{{count}} min",
"lengthChip_other": "{{count}} min"
```
```json
"lengthChip_one": "{{count}} minuta",
"lengthChip_few": "{{count}} minuty",
"lengthChip_many": "{{count}} minut",
```
No new copy in this phase is expected to need plurals per D-08 ("30 is descriptive, not a gate" — no count-based UI copy), but the convention is here if a category count label is added.

**Category label keys** — add `brainDump.category.{errands,work,home,people,someday}` (5 keys, both locales) since `SectionList`'s `renderSectionHeader` needs a `t()` key per `DumpItemCategory` value (mirrors RESEARCH.md's `t(\`brainDump.category.${section.title}\`)` usage).

---

### `app.json` (extend `plugins` array)

**Analog:** existing plugin entries (lines 29-41) — a mix of bare-string plugins (`"expo-router"`, `"expo-build-properties"`, `"expo-localization"`) and a config-object tuple (`["expo-splash-screen", { ... }]`, lines 31-38). `expo-speech-recognition` needs the tuple form:
```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { "backgroundColor": "#208AEF", "image": "./assets/images/splash-icon.png", "imageWidth": 76 }],
  "expo-build-properties",
  "expo-localization",
  ["expo-speech-recognition", {
    "microphonePermission": "Allow $(PRODUCT_NAME) to use the microphone.",
    "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to use speech recognition.",
    "androidSpeechServicePackages": ["com.google.android.googlequicksearchbox"]
  }]
]
```
**This is a native-input change** — per CLAUDE.md's convention, the phase SUMMARY must carry the "run `npx expo prebuild --clean` after pulling" note (first native change since Phase 2's Lottie addition).

## Shared Patterns

### Pure-function + TDD (classifier, parser)
**Source:** `src/features/co-pilot/reconcileActiveSession.ts` + `src/features/co-pilot/__tests__/reconcileActiveSession.test.ts`
**Apply to:** `parseDumpText.ts`, `classify.ts`
No MMKV import, no React import, explicit typed inputs, deterministic discriminated/enum output, named `it()` blocks per scenario/pitfall, zero mocks in the test file.

### Repositories-over-MMKV, spread-input-first
**Source:** `data/repositories/dumpItems.ts` lines 40-45
**Apply to:** all Save-path writes in `brain-dump.tsx` (via `dumpItemsRepo.create`/`.update`) — no new repository code needed; `data/draft.ts` follows the simpler non-indexed variant of the same `contentStorage` wrapper idiom.

### Token-only styling + flattened styles
**Source:** every file read this pass (`co-pilot.tsx`, `history.tsx`, `index.tsx`, `brain-dump.tsx` stub) — `useTheme()` for every color/spacing/radius/font-size value, `StyleSheet.flatten([...])` (never a bare array) for any style combining a static `StyleSheet.create` entry with a theme-derived override.
**Apply to:** `brain-dump.tsx`'s full rewrite.

### i18next `t()` for all copy, offers-never-instructs
**Source:** `i18n/locales/en.json` / `pl.json`, existing `brainDump`/`coPilot`/`history` namespaces
**Apply to:** every new user-facing string (capture prompts, category labels, delete/edit/promote affordance labels) — no literal JSX strings (`i18next/no-literal-string` ESLint rule), warm/plain/gender-neutral Polish register, copy offers rather than instructs (mirrors `home.startSessionOffer` = "Start a session?" not "Start now").

### Double-tap / re-entrancy guard via `useRef(false)`
**Source:** `co-pilot.tsx` lines 114, 122-128 (`isStartingSessionRef`); `index.tsx` lines 76-81, 122-128 (`isStartingSessionRef`, `isResumeCardActionRef`)
**Apply to:** Save (prevent duplicate item creation on rapid double-tap), promote tap (prevent double-navigation into `/co-pilot`), delete (prevent double-delete race).

### Jest manual-mock registration for native modules
**Source:** `jest.setup.ts` (full file) + `__mocks__/*.ts(x)`
**Apply to:** `__mocks__/expo-speech-recognition.ts` + its `jest.mock('expo-speech-recognition')` line, following the exact one-mock-file-per-native-dependency convention already established for `react-native-mmkv`, `expo-localization`, `lottie-react-native`.

### `renderRouter` route-level integration tests
**Source:** `src/app/__tests__/screens.test.tsx` lines 1-116 (imports, `routeContext` object, `beforeEach(() => contentStorage.clearAll())`, `await renderRouter(routeContext, { initialUrl: ... })`)
**Apply to:** the new promote-hand-off test — extend the existing `routeContext` (already includes `'brain-dump': BrainDumpScreen` and `'co-pilot': CoPilotScreen`, lines 38-39) with a new test using `initialUrl: '/co-pilot?dumpItemId=<id>'`, seeding `dumpItemsRepo.create(...)` first, matching the file's existing `beforeEach` reset pattern (line 51-52).

## No Analog Found

None. Every file in this phase's scope has a strong same-role-and-data-flow (or role-match) analog already in the codebase; no file requires inventing a pattern from RESEARCH.md alone.

## Metadata

**Analog search scope:** `src/app/`, `src/features/co-pilot/`, `src/components/Mascot/`, `data/`, `data/repositories/`, `__mocks__/`, `i18n/locales/`, `app.json`, `jest.setup.ts`
**Files scanned (full or targeted read):** `src/app/co-pilot.tsx` (718 lines, full), `src/app/brain-dump.tsx` (37 lines, full), `src/app/history.tsx` (142 lines, full), `src/app/index.tsx` (284 lines, full), `src/features/co-pilot/reconcileActiveSession.ts` (29 lines, full), `src/features/co-pilot/__tests__/reconcileActiveSession.test.ts` (63 lines, full), `src/components/Mascot/markers.ts` (63 lines, full), `data/repositories/dumpItems.ts` (69 lines, full), `data/mmkv.ts` (21 lines, full), `data/types.ts` (65 lines, full), `data/repositories/__tests__/schema.denylist.test.ts` (108 lines, full), `__mocks__/lottie-react-native.tsx` (53 lines, full), `__mocks__/expo-localization.ts` (17 lines, full), `jest.setup.ts` (34 lines, full), `i18n/locales/en.json` (95 lines, full), `i18n/locales/pl.json` (40/98 lines read), `app.json` (47 lines, full), `src/app/__tests__/screens.test.tsx` (120/525 lines read, targeted).
**Pattern extraction date:** 2026-07-05
