# Phase 1: Scaffold & Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 1-Scaffold & Foundations
**Areas discussed:** Theme fidelity, App shell layout, App identity, Locale behavior

> **Note:** Interactive questioning was unavailable in this remote session — the
> AskUserQuestion permission stream closed on both attempts, and the user
> instructed "Continue from where you left off." All selections below were made
> by Claude using recommended defaults grounded in the product brief and research.

---

## Theme fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral dark scaffold | Gray placeholder theme, minimal churn risk, defers all visual identity | |
| Earthy night-cozy attempt | Real attempt at the written direction via swappable tokens | ✓ |

**Choice:** Earthy night-cozy attempt (Claude discretion)
**Notes:** The brief calls the UI "the mascot's habitat"; composing screens against a neutral scaffold would cause rework in every later phase. Token-only styling makes palette churn cheap when the external design system lands.

---

## App shell layout

| Option | Description | Selected |
|--------|-------------|----------|
| Home-hub | Mascot-centric home with primary Co-pilot action, others reachable from home | ✓ |
| Tab bar | Standard bottom tabs elevating all features equally | |

**Choice:** Home-hub (Claude discretion)
**Notes:** Dev synthesis names Co-pilot as the primary home action and Brain dump as prominent secondary reachable in ≤2 taps; a tab bar flattens that hierarchy.

---

## App identity

| Option | Description | Selected |
|--------|-------------|----------|
| com.everon.trinket | Derived from EverOn Games sp. z o.o. | ✓ (provisional) |
| Ask user, block phase | Wait for founder confirmation before scaffolding | |

**Choice:** `com.everon.trinket`, display name "Trinket", slug `trinket` (Claude discretion, ⚠ flagged for user confirmation before any store upload)
**Notes:** Identifiers are cheap to change pre-submission; blocking the scaffold on this would be pure delay.

---

## Locale behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Follow system, EN fallback | PL if device is Polish, EN otherwise; no picker screen | ✓ |
| First-launch language picker | Explicit choice screen before app use | |

**Choice:** Follow system with EN fallback (Claude discretion)
**Notes:** A picker screen adds first-launch friction for an audience defined by low friction tolerance; manual override arrives with the Phase 8 settings screen.

---

## Claude's Discretion

All four areas above, plus: exact palette token values, MMKV instance layout, i18n lint mechanism, folder-structure details.

## Deferred Ideas

- Light mode theming (v2, POLI-01)
- First-launch language picker (rejected; override lands in Phase 8 settings)
