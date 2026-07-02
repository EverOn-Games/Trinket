---
phase: quick-260702-jky
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - theme/tokens.ts
  - eslint.config.js
  - design/DESIGN-SYSTEM.md
  - design/mockups/01341ce6-Home.html
  - design/mockups/62e728e6-Copilot___session_active.html
  - design/mockups/30a0b6e4-Brain_dump___listening.html
  - design/mockups/ca46e15a-Starter___if___then.html
  - design/mockups/665a11af-Soft_landing___transition.html
  - design/mockups/7136e3f9-Bridge___3_breaths.html
  - design/mockups/3a930a0f-Onboarding___welcome.html
  - design/mockups/8b3f0d53-Notifications___lock_screen.html
  - design/mockups/e0ea67c8-Subscription___paywall.html
  - design/mockups/fae1f5f8-Settings___profile.html
autonomous: true
requirements: [DESIGN-SYSTEM-LANDING, POLI-01-REF]

must_haves:
  truths:
    - "darkTokens.colors carries the real brand values sourced from the founder's mockups (terracotta accent, warmer espresso background)"
    - "The ThemeTokens type shape, spacing, radii, typography, and elevation are unchanged"
    - "A design-system reference doc exists at design/DESIGN-SYSTEM.md capturing palette, typography, dual-accent observation, all 10 per-screen notes, and constraint watch-items"
    - "All 10 stripped mockup HTML files are persisted under design/mockups/ and linked from the reference doc"
    - "npm run verify passes (eslint + hex gate + jest)"
  artifacts:
    - path: "theme/tokens.ts"
      provides: "Refined dark brand token values + updated doc-comment (Claude Design system landed)"
      contains: "#D67A56"
    - path: "design/DESIGN-SYSTEM.md"
      provides: "Design-system reference for /gsd-ui-phase 2 and later feature phases"
      min_lines: 120
    - path: "design/mockups/01341ce6-Home.html"
      provides: "Persisted Home mockup (survives container recycling)"
  key_links:
    - from: "design/DESIGN-SYSTEM.md"
      to: "design/mockups/*.html"
      via: "relative markdown links"
      pattern: "mockups/.*\\.html"
    - from: "theme/tokens.ts"
      to: "design/DESIGN-SYSTEM.md"
      via: "shared dark palette (tokens = source of truth for dark; doc labels light as reference-only)"
      pattern: "#1A140E"
---

<objective>
Fold the founder's landed Claude Design mockups (10 screens) into the repository as the durable design-system reference, and refine the dark theme token VALUES to the real brand palette. The app stays DARK-ONLY for MVP.

Purpose: Later phases (`/gsd-ui-phase 2` onward) need one authoritative reference for palette, typography, per-screen copy, and the shame-free / PDA / regulatory constraint watch-items — and the mockup HTML must survive container recycling. The dark tokens must reflect real brand values (terracotta action accent, warmer espresso surfaces) instead of the Phase 1 anchor placeholders.

Output: Updated `theme/tokens.ts` (dark color values + doc-comment only), a new `design/DESIGN-SYSTEM.md` reference, 10 persisted mockup HTML files under `design/mockups/`, and a defensive eslint ignore for `design/**`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@theme/tokens.ts
@eslint.config.js
@scripts/check-hex-literals.mjs

<lint_scoping_findings>
Verified before planning — no lint change is strictly required, one defensive edit is included:

- `scripts/check-hex-literals.mjs` scans an ALLOWLIST of globs only: `src/app/**/*.tsx`, `src/features/**/*.tsx`, `src/components/**/*.tsx`. It never touches `theme/`, `design/`, or `.html` files. New hex values inside `theme/tokens.ts` are allowed; the mockup HTML is out of scope. No change needed there.
- `eslint.config.js` scopes the i18next `no-literal-string` rule to the same `src/**/*.tsx` globs. ESLint does not parse `.html` or `.md` by default. Risk of it scanning `design/` is low, but Task 2 adds `'design/**'` to the top-level `ignores` array as a guarantee.
</lint_scoping_findings>

<mockup_source_paths>
The 10 base64-stripped mockup HTML files (~0.6-1.3 MB each, font/image payloads already stripped) currently live at:
`/tmp/claude-0/-home-user-Trinket/91727037-1107-521c-ab7a-3cb76db16099/scratchpad/clean/`
Filenames: 01341ce6-Home.html, 62e728e6-Copilot___session_active.html, 30a0b6e4-Brain_dump___listening.html, ca46e15a-Starter___if___then.html, 665a11af-Soft_landing___transition.html, e0ea67c8-Subscription___paywall.html, 3a930a0f-Onboarding___welcome.html, 7136e3f9-Bridge___3_breaths.html, 8b3f0d53-Notifications___lock_screen.html, fae1f5f8-Settings___profile.html.
</mockup_source_paths>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refine dark theme token VALUES and doc-comment (no type/scale/spacing changes)</name>
  <files>theme/tokens.ts</files>
  <action>
Edit ONLY the eight `darkTokens.colors` values and the file's doc-comments. Set the color values to the real brand palette sourced from the DARK mockups (Co-pilot session / Bridge / lock screen):
- background: `#1A140E` (was `#14120F`)
- surface: `#231C15` (was `#1F1B16`)
- surfaceElevated: `#2E251C` (was `#2A241D`)
- textPrimary: `#F2E6CC` (was `#F2E9DC`)
- textSecondary: `#A89A82` (was `#B8AC97`)
- accent: `#D67A56` (terracotta; was `#D89B4A`)
- accentMuted: `#B8763F` (was `#8C6B3A`)
- border: leave unchanged at `#3A3229`

Do NOT touch anything else: keep the `ThemeTokens` type shape unchanged, `typography.fontFamily: 'System'`, the type scale numbers, `spacing`, `radii`, and `elevation` exactly as they are. Do NOT add a `lightTokens` export or a second accent slot — both are explicitly deferred to /gsd-ui-phase 2.

Update the leading file doc-comment so it no longer says the values "will be replaced wholesale when the external Claude Design system lands." Reflect that the Claude Design system HAS now landed: dark color values sourced from the founder's 10-screen mockups on 2026-07-02; light mode still deferred as POLI-01; reference the new `design/DESIGN-SYSTEM.md` for the full palette and per-screen notes. Also update the `darkTokens` block comment (currently "anchor palette") to describe it as the landed real brand palette (warm espresso background, terracotta action accent). Because all values live under `theme/`, the hex-literal gate still passes.
  </action>
  <verify>
    <automated>node scripts/check-hex-literals.mjs && npx tsc --noEmit</automated>
  </verify>
  <done>theme/tokens.ts has the eight refined dark values (accent `#D67A56` present), type shape and all non-color fields unchanged, doc-comment notes the design system landed and references design/DESIGN-SYSTEM.md; hex gate exits 0 and tsc is clean.</done>
</task>

<task type="auto">
  <name>Task 2: Author design/DESIGN-SYSTEM.md, persist the 10 mockups, add defensive eslint ignore</name>
  <files>design/DESIGN-SYSTEM.md, design/mockups/ (10 .html files), eslint.config.js</files>
  <action>
Step A - Persist mockups. Create `design/mockups/` and copy all 10 stripped HTML files from the scratchpad source dir (see the mockup_source_paths block in context) into it, preserving filenames. Use a shell copy of every `.html` file in that source dir. Confirm exactly 10 files land.

Step B - Author `design/DESIGN-SYSTEM.md` with the Write tool (not heredoc). This is the authoritative reference for /gsd-ui-phase 2 and all later feature phases. It MUST contain these sections:

1. Header note: the Claude Design system landed 2026-07-02 (founder's 10-screen mockups); the app is DARK-ONLY for MVP; light mode deferred as POLI-01.

2. Palette:
   - DARK (implemented, mirrors theme/tokens.ts): background `#1A140E`, surface `#231C15`, surfaceElevated `#2E251C`, textPrimary `#F2E6CC`, textSecondary `#A89A82`, accent/terracotta `#D67A56`, accentMuted `#B8763F`, border `#3A3229`.
   - CREAM/LIGHT (seen across most mockups) - label this whole group PROMINENTLY as "reference only - NOT implemented in MVP (dark-only, POLI-01)": background `#F2E6CC`, light cream `#F4E9D7`, text browns `#6B5F4E` / `#A89A82`, terracotta `#D67A56`, amber/gold `#F2C988` / `#E8B05C`, espresso darks `#1A140E` / `#231C15` / `#100B07`.

3. Typography stack: Fraunces (serif display - warm headings), Inter (body/UI), JetBrains Mono (labels + timers). Note fonts are NOT yet loaded - deferred to /gsd-ui-phase 2 (needs expo-font + font assets + prebuild). Current theme/tokens.ts uses fontFamily 'System'.

4. Dual-accent observation: terracotta `#D67A56` = action; amber/gold `#F2C988`/`#E8B05C` = mascot glow. Note the current token type has only ONE `accent` slot; adding a second accent slot is deferred to the UI phase.

5. CONSTRAINT WATCH-ITEMS (place prominently, near the top or a clearly-headed section):
   a) "47 days quietly together" (Settings) and "23 others, quietly" (Co-pilot) MUST be computed at render time (elapsed-since-install; ambient presence count) - NEVER stored as streak / daily-aggregate counters. Storing them violates the CLAUDE.md schema denylist (hard constraint) and would fail the Phase 1 denylist test.
   b) Notifications must stay OFFER-shaped (never guilt/urgency); onboarding must NEVER ask for notification permission (Phase 6 hard rule).
   c) All copy offers, never instructs; mascot present-not-directive; no streaks anywhere.

6. Per-screen notes for ALL 10 screens - for each: screen name, purpose, key copy, interaction-grammar/constraint observations, and a relative markdown link to its mockup file under `mockups/`. Content:
   - Home (mockups/01341ce6-Home.html): greeting "Good evening." / "No pressure tonight."; Co-pilot paused resume card ("We were writing the proposal intro. Pick it up?" -> Resume / Not now); tiles Brain dump (press & speak), Bridge (60 sec, optional), New starter (if -> then); bottom nav Dump / Start / Co-pilot / Settings.
   - Co-pilot / session active (mockups/62e728e6-Copilot___session_active.html) [DARK]: "SESSION · QUIET", "I'm here with you / doing my thing.", timer 42:17, "YOUR FOCUS" + change, focus text, ambient "Rain & lamplight", "23 others, quietly", Take a break / End session.
   - Brain dump / listening (mockups/30a0b6e4-Brain_dump___listening.html): "BRAIN DUMP", "I'm listening. / Take your time.", "0:42 · recording", Live transcript, "ears forward · listening", "or type instead".
   - Starter / if -> then (mockups/ca46e15a-Starter___if___then.html): "NEW STARTER" + Save; "The smallest possible first step."; "Tie an action to a moment that's already in your day."; If/Then builder; "I'LL KNOW IT WORKED WHEN... optional"; "Or borrow a template" with examples.
   - Soft landing / transition (mockups/665a11af-Soft_landing___transition.html): "Soft landing", "10 minutes until your call with Jan.", "You can start wrapping up - or finish what you're doing. Nothing will happen if you keep going.", event card, OK noted / Snooze 5 / "Skip future warnings for this kind of thing".
   - Bridge / 3 breaths (mockups/7136e3f9-Bridge___3_breaths.html) [DARK]: "BRIDGE · 60s", "Three breaths. / Then forward.", "breathe in, slowly · 4s", "Skip · you can always come back".
   - Onboarding / welcome (mockups/3a930a0f-Onboarding___welcome.html): Skip; "Hi. I'm glad you're here."; "Trinket is a quiet companion for getting things started - built around how an ADHD brain actually works."; "Let's begin / Tell me more first"; "Trinket isn't a replacement for clinical care."; "Evidence-based, never sales-y."
   - Notifications / lock screen (mockups/8b3f0d53-Notifications___lock_screen.html) [DARK/lock]: Soft landing ("10 minutes until your call with Jan. You can start wrapping up."), Co-pilot ("Three breaths? I'll do them with you."), Brain dump ("3 thoughts captured this morning. Want a quick look later?").
   - Subscription / paywall (mockups/e0ea67c8-Subscription___paywall.html): "Trinket Premium", "Trinket is free. / Premium just helps it stay that way.", features (unlimited co-pilot sessions + custom soundscapes, custom Soft Landing rules, reflection notebook "no streaks, ever"), Annual 119 zł (2 months free, approx 9.92 zł/mo) / Monthly 14.99 zł (cancel anytime), "Tight budget? Sliding scale through Fundacja ADHD - no questions, no shame.", Restore.
   - Settings / profile (mockups/fae1f5f8-Settings___profile.html): "Maksym", "Free · 47 days quietly together"; Comfort (Notifications "Gentle, daytime", Reduced stimulus "Always dark"); Mascot (Presence "Prominent", Soundscape "Rain & lamplight"); Account (Trinket Premium / Upgrade); Privacy & data; About v0.1 · beta.

7. OUT OF SCOPE note (deferred to /gsd-ui-phase 2): custom font loading (expo-font + assets + prebuild), second accent slot in the token type, any light-mode tokens, and building actual screens. This task was reference + dark-token-value refinement only.

Use standard markdown headings, tables, and lists. Do not author any `.tsx`/JSX here - this is documentation only.

Step C - Defensive eslint ignore. In `eslint.config.js`, add `'design/**'` to the top-level `ignores` array (the first config object) so the `design/` directory is never linted. Do not change any other eslint config.
  </action>
  <verify>
    <automated>test $(ls design/mockups/*.html | wc -l) -eq 10 && test -f design/DESIGN-SYSTEM.md && grep -q "reference only" design/DESIGN-SYSTEM.md && grep -q "47 days quietly together" design/DESIGN-SYSTEM.md && grep -q "design/\*\*" eslint.config.js</automated>
  </verify>
  <done>design/mockups/ holds all 10 mockup HTML files; design/DESIGN-SYSTEM.md exists with palette (dark implemented + light "reference only"), typography stack, dual-accent note, all 10 per-screen sections with mockup links, and the three constraint watch-items; eslint.config.js ignores design/**.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | This plan changes only static color-token values, a markdown reference doc, mockup HTML assets, and an eslint ignore glob. No runtime input, no network, no package installs, no data model changes. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-jky-01 | Information Disclosure | design/mockups/*.html committed to repo | accept | Mockups are already base64-stripped (no embedded font/image binaries); they carry only sample UI copy with fictional names (Maksym, Jan) - no real user data, no secrets. |
| T-jky-02 | Tampering | shame-free / schema-denylist constraints | mitigate | DESIGN-SYSTEM.md records the constraint watch-items (render-time-computed "47 days"/"23 others", offer-shaped notifications, no streaks) so later phases do not implement them as stored counters that would violate the CLAUDE.md hard constraints and the Phase 1 denylist test. |
</threat_model>

<verification>
- `npm run verify` (eslint + hex gate + jest) passes with no new failures.
- `theme/tokens.ts` diff touches only the eight `darkTokens.colors` values and doc-comments; type shape, spacing, radii, typography, elevation unchanged; no `lightTokens`, no second accent slot.
- `design/DESIGN-SYSTEM.md` exists with all required sections; light palette clearly labeled "reference only - NOT implemented in MVP".
- `design/mockups/` contains all 10 mockup HTML files, each linked from the reference doc.
- No `expo prebuild` performed or required (no native inputs changed).
</verification>

<success_criteria>
- Dark brand token values match the mockups (accent terracotta `#D67A56`, background `#1A140E`); nothing else in the token shape changed.
- A single durable design-system reference doc + 10 persisted mockups exist under `design/`, ready for /gsd-ui-phase 2.
- Constraint watch-items (render-time counters, offer-shaped notifications, no streaks) are captured prominently in the doc.
- Deferred items (font loading, second accent, light mode, screen builds) are explicitly noted as out of scope.
- `npm run verify` passes.
</success_criteria>

<output>
Create `.planning/quick/260702-jky-fold-design-system-tokens/260702-jky-SUMMARY.md` when done.
</output>
