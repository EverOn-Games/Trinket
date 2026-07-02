# Trinket Design System

**Status:** The Claude Design system landed 2026-07-02 — the founder's 10-screen
mockups are the authoritative visual reference from this point forward. The
app is **DARK-ONLY for MVP**; light mode is deferred (POLI-01).

This document is the single reference for `/gsd-ui-phase 2` and every later
feature phase: palette, typography, the dual-accent observation, per-screen
notes for all 10 mockups, and the constraint watch-items that must be
respected when screens are actually built.

All 10 stripped mockup HTML files are persisted under [`mockups/`](mockups/)
so they survive container recycling. Each per-screen section below links to
its file.

---

## CONSTRAINT WATCH-ITEMS (read before building any screen)

These are hard constraints from `CLAUDE.md` made concrete against the actual
mockup copy. Violating any of these is a bug, not a style nit.

1. **No streak / daily-aggregate fields.** "47 days quietly together"
   (Settings screen) and "23 others, quietly" (Co-pilot session screen)
   **MUST be computed at render time** — elapsed-since-install for the first,
   an ambient/presence count for the second — **NEVER stored as a streak or
   daily-aggregate counter.** Storing either would violate the CLAUDE.md
   schema denylist (hard constraint) and would fail the Phase 1 denylist
   test. If a future screen needs a similar "time together" or "presence"
   figure, derive it the same way: computed on read, never persisted as an
   incrementing counter.
2. **Notifications stay offer-shaped.** Every notification example in the
   mockups (Soft landing, Co-pilot, Brain dump) is phrased as an offer or
   observation, never an urgency or guilt cue. Onboarding must **NEVER** ask
   for notification permission during the welcome flow (Phase 6 hard rule) —
   permission requests happen contextually, later, when the user opts into a
   feature that needs them.
3. **Copy offers, never instructs.** All UI copy across every screen offers
   ("Pick it up?", "Skip · you can always come back") rather than commanding.
   The mascot is present, not directive — no mascot speech-bubble commands.
   No streak mechanics appear anywhere in the mockups; keep it that way in
   implementation.

---

## Palette

### DARK (implemented — mirrors `theme/tokens.ts`)

| Token | Hex | Role |
|---|---|---|
| `background` | `#1A140E` | Warm espresso app background |
| `surface` | `#231C15` | Card / panel surface |
| `surfaceElevated` | `#2E251C` | Raised surface (modals, elevated cards) |
| `textPrimary` | `#F2E6CC` | Primary cream text |
| `textSecondary` | `#A89A82` | Secondary/muted text |
| `accent` | `#D67A56` | Terracotta — primary action accent |
| `accentMuted` | `#B8763F` | Muted terracotta — secondary emphasis |
| `border` | `#3A3229` | Hairlines, dividers |

These eight values are the current `darkTokens.colors` in `theme/tokens.ts`
and are the single source of truth for the implemented dark theme.

### CREAM/LIGHT (seen across most mockups)

> **Reference only — this whole group is reference only and NOT implemented in MVP (dark-only, POLI-01).** These
> values appear throughout the founder's mockups (most screens use a light
> cream backdrop) but the app ships dark-only for MVP. Do not add a
> `lightTokens` export or wire any of these into the app until POLI-01 is
> explicitly scheduled.

| Token | Hex | Role |
|---|---|---|
| Background | `#F2E6CC` | Light cream app background |
| Light cream | `#F4E9D7` | Secondary light surface |
| Text brown (primary) | `#6B5F4E` | Primary text on light |
| Text brown (secondary) | `#A89A82` | Secondary text on light |
| Terracotta | `#D67A56` | Shared accent (same as dark) |
| Amber/gold | `#F2C988` | Mascot glow / highlight |
| Amber/gold (deep) | `#E8B05C` | Mascot glow / highlight, deeper |
| Espresso dark | `#1A140E` | Shared with dark background |
| Espresso dark (surface) | `#231C15` | Shared with dark surface |
| Espresso dark (deep) | `#100B07` | Deepest espresso, light-mode contrast text |

---

## Typography

Stack observed across the mockups:

- **Fraunces** — serif display face, used for warm headings.
- **Inter** — body copy and UI text.
- **JetBrains Mono** — labels and timers (e.g. session countdown, recording
  duration).

**Not yet loaded.** `theme/tokens.ts` currently sets
`typography.fontFamily: 'System'`. Loading these three fonts requires
`expo-font`, bundling the font assets, and a native prebuild — this is
deferred to `/gsd-ui-phase 2`, not part of this reference-folding task.

---

## Dual-Accent Observation

The mockups use **two** distinct accent colors for two distinct purposes:

- **Terracotta `#D67A56`** — the *action* accent (buttons, primary CTAs,
  active states).
- **Amber/gold `#F2C988` / `#E8B05C`** — the *mascot glow* accent (ambient
  light around the raccoon, presence indicators).

The current `ThemeTokens` type has only **one** `accent` slot
(`colors.accent`). Adding a second, semantically distinct accent slot (e.g.
`colors.mascotGlow`) for the mascot-glow use case is deferred to the UI
phase — do not add it as part of this token-value refinement.

---

## Per-Screen Notes

### 1. Home
[`mockups/01341ce6-Home.html`](mockups/01341ce6-Home.html)

- **Purpose:** Landing screen — greeting, resumable Co-pilot session, quick
  entry points into the three core flows.
- **Key copy:** "Good evening." / "No pressure tonight."; paused Co-pilot
  resume card — "We were writing the proposal intro. Pick it up?" with
  Resume / Not now.
- **Tiles:** Brain dump (press & speak), Bridge (60 sec, optional), New
  starter (if → then).
- **Nav:** Bottom nav — Dump / Start / Co-pilot / Settings.
- **Constraint notes:** Resume card offers ("Pick it up?"), never demands;
  no urgency framing on the paused session.

### 2. Co-pilot · session active [DARK]
[`mockups/62e728e6-Copilot___session_active.html`](mockups/62e728e6-Copilot___session_active.html)

- **Purpose:** Active body-double session screen.
- **Key copy:** "SESSION · QUIET"; "I'm here with you / doing my thing.";
  timer `42:17`; "YOUR FOCUS" + change; focus text; ambient "Rain &
  lamplight"; "23 others, quietly"; actions Take a break / End session.
- **Constraint notes:** "23 others, quietly" is an ambient presence figure —
  see Constraint Watch-Item 1, must be computed/derived, never a stored
  counter.

### 3. Brain dump · listening
[`mockups/30a0b6e4-Brain_dump___listening.html`](mockups/30a0b6e4-Brain_dump___listening.html)

- **Purpose:** Voice capture screen for the Brain Dump feature.
- **Key copy:** "BRAIN DUMP"; "I'm listening. / Take your time.";
  `0:42 · recording`; live transcript region; "ears forward · listening";
  "or type instead" (fallback to text entry).
- **Constraint notes:** Text-entry fallback keeps the feature usable without
  STT — good accessibility/reliability precedent to preserve.

### 4. Starter · if → then
[`mockups/ca46e15a-Starter___if___then.html`](mockups/ca46e15a-Starter___if___then.html)

- **Purpose:** Create a new "Starter" (implementation intention).
- **Key copy:** "NEW STARTER" + Save; "The smallest possible first step.";
  "Tie an action to a moment that's already in your day."; If/Then builder;
  "I'LL KNOW IT WORKED WHEN… optional"; "Or borrow a template" with example
  starters.
- **Constraint notes:** The success marker is explicitly optional — no
  pressure to define a completion criterion.

### 5. Soft landing · transition
[`mockups/665a11af-Soft_landing___transition.html`](mockups/665a11af-Soft_landing___transition.html)

- **Purpose:** Gentle heads-up before an upcoming scheduled event/transition.
- **Key copy:** "Soft landing"; "10 minutes until your call with Jan.";
  "You can start wrapping up — or finish what you're doing. Nothing will
  happen if you keep going."; event card; actions OK noted / Snooze 5 /
  "Skip future warnings for this kind of thing".
- **Constraint notes:** Explicitly reassures "nothing will happen" — a
  direct shame-free/PDA-aware framing example to replicate elsewhere.

### 6. Bridge · 3 breaths [DARK]
[`mockups/7136e3f9-Bridge___3_breaths.html`](mockups/7136e3f9-Bridge___3_breaths.html)

- **Purpose:** Short breathing bridge between tasks.
- **Key copy:** "BRIDGE · 60s"; "Three breaths. / Then forward."; "breathe
  in, slowly · 4s"; "Skip · you can always come back".
- **Constraint notes:** Skip option is always present and unashamed — "you
  can always come back", not "are you sure?".

### 7. Onboarding · welcome
[`mockups/3a930a0f-Onboarding___welcome.html`](mockups/3a930a0f-Onboarding___welcome.html)

- **Purpose:** First-run welcome screen.
- **Key copy:** Skip option; "Hi. I'm glad you're here."; "Trinket is a
  quiet companion for getting things started — built around how an ADHD
  brain actually works."; "Let's begin / Tell me more first"; "Trinket
  isn't a replacement for clinical care."; "Evidence-based, never sales-y."
- **Constraint notes:** This screen does **not** request notification
  permission — see Constraint Watch-Item 2. It also models regulatory-safe
  language ("supports task initiation"-style framing, not clinical claims).

### 8. Notifications · lock screen [DARK/lock]
[`mockups/8b3f0d53-Notifications___lock_screen.html`](mockups/8b3f0d53-Notifications___lock_screen.html)

- **Purpose:** Example lock-screen notification content for three flows.
- **Key copy:**
  - Soft landing: "10 minutes until your call with Jan. You can start
    wrapping up."
  - Co-pilot: "Three breaths? I'll do them with you."
  - Brain dump: "3 thoughts captured this morning. Want a quick look later?"
- **Constraint notes:** All three are offers/observations, none are
  urgency-framed or guilt-framed — see Constraint Watch-Item 2.

### 9. Subscription · paywall
[`mockups/e0ea67c8-Subscription___paywall.html`](mockups/e0ea67c8-Subscription___paywall.html)

- **Purpose:** Premium upsell screen.
- **Key copy:** "Trinket Premium"; "Trinket is free. / Premium just helps it
  stay that way."; features — unlimited Co-pilot sessions + custom
  soundscapes, custom Soft Landing rules, reflection notebook ("no streaks,
  ever"); pricing — Annual 119 zł (2 months free, ≈9.92 zł/mo) / Monthly
  14.99 zł (cancel anytime); "Tight budget? Sliding scale through Fundacja
  ADHD — no questions, no shame."; Restore purchases.
- **Constraint notes:** "no streaks, ever" is stated directly in the paywall
  copy — reinforces Constraint Watch-Item 1 as a product commitment, not
  just an implementation detail.

### 10. Settings · profile
[`mockups/fae1f5f8-Settings___profile.html`](mockups/fae1f5f8-Settings___profile.html)

- **Purpose:** User settings and account screen.
- **Key copy:** "Maksym"; "Free · 47 days quietly together"; Comfort section
  (Notifications "Gentle, daytime", Reduced stimulus "Always dark"); Mascot
  section (Presence "Prominent", Soundscape "Rain & lamplight"); Account
  (Trinket Premium / Upgrade); Privacy & data; About v0.1 · beta.
- **Constraint notes:** "47 days quietly together" — see Constraint
  Watch-Item 1, must be computed at render time from install date, never
  stored as an incrementing counter.

---

## Out of Scope (deferred to `/gsd-ui-phase 2`)

This task was a reference-folding + dark-token-value refinement task only.
The following are explicitly **not** part of this task and remain open for
the UI phase:

- Custom font loading (`expo-font` + font assets + native prebuild) for
  Fraunces / Inter / JetBrains Mono.
- Adding a second accent slot to `ThemeTokens` for the mascot-glow color.
- Any `lightTokens` export or light-mode wiring (POLI-01).
- Building the actual screens shown in the mockups.
