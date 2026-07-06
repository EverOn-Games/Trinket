---
gsd_artifact: summary
quick_id: 260706-089
slug: light-mode-authored-light-tokens-system
status: complete
completed: 2026-07-06
requirements: [POLI-01]
verify: "37 suites / 294 tests green; mascot verified readable on cream via headless-Chromium render"
---

# Summary: Light mode (POLI-01, v0.2 §5)

- `lightTokens` authored from the founder's own mockup CREAM/LIGHT reference
  (design/DESIGN-SYSTEM.md): cream background #F2E6CC (deliberately the same
  brand cream as dark-mode text), light surfaces #F4E9D7/#FBF4E4, warm-brown
  text (#4A3F30 primary / #8A7B64 secondary — DEEPER than the reference's
  #6B5F4E/#A89A82 for body-text contrast; founder review welcome), shared
  terracotta accent, deeper amber glow #E8B05C so the mascot glow holds on
  light. Geometry scales shared with dark — themes differ in palette only.
- New `onAccent` color token (espresso in BOTH themes): §5's hardcoded-value
  audit surfaced that all 20 text-on-accent call sites used
  `colors.background`, which would have been unreadable cream-on-terracotta
  (~2.5:1) in light mode. Swapped everywhere; dark mode pixel-identical.
- `themeMode: 'system'|'light'|'dark'` in the settings store (default
  'system' per §10; only an explicit OS 'light' resolves light — null/
  'unspecified' fall back to dark, the brand default). Settings gains an
  Appearance row (System/Light/Dark chips), EN+PL.
- ThemeProvider resolves via pure `resolveThemeTokens()` (unit-tested
  resolution table); provider tests cover both overrides. A test also pins
  the deliberate brand fact that cream is SHARED (dark text == light bg).
- app.json `userInterfaceStyle` dark→automatic — **`npx expo prebuild
  --clean` required after pulling** (the only native-input change today).
- Mascot on light verified via headless-Chromium render: warm browns read
  well on cream; the dozing "z" (cream stroke) is faint on light —
  placeholder-level acceptable, flagged for the final-art pass.

37 suites / 294 tests green.
