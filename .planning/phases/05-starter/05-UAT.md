---
status: complete
phase: 05-starter
source: [05-SUMMARY.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

[complete]

## Tests

### 1. Create an intention (two-step builder)
expected: Cue chips prefill an editable field; step 2 takes a tiny action; Save produces exactly one "When X, then Y" card (double-tap safe).
result: pass

### 2. Schedule a reminder — contextual permission + own-words content
expected: "A quiet reminder?" on an intention card → day (today/tomorrow) + time-slot chips (9/12/18/21). The OS notification-permission dialog appears only NOW (never earlier, never during onboarding). When the reminder fires, the notification title is YOUR cue text and the body is YOUR action text — no app-authored exhortation.
result: pass — full confirmation 2026-07-05 after the foreground-handler fix: notification fired (inexact timing accepted, Option A) with the user's own cue/action words.
note: UI control is the text offer "A quiet reminder?", not a bell icon — checkpoint wording corrected.

### 3. Reschedule replaces, never duplicates
expected: Schedule a reminder, then reschedule the same intention to a different slot. Only the NEW reminder fires — the old one never arrives.
result: pass (2026-07-05, post-handler-fix round; via remove-then-re-add flow — see UAT-05-02)

### 4. Delete cancels the reminder
expected: Delete an intention that has a pending reminder. The card disappears and the reminder never fires.
result: pass (2026-07-05)

## Summary

total: 4
passed: 4
issues: 3 (2 fixed same-session: UAT-05-03 handler, Option A copy; 2 UX gaps open: UAT-05-01/02)
pending: 0
skipped: 0

## Gaps

### UAT-05-01: Delete confirmation lacks button affordance (minor, UX)
- Observed: in the delete-confirm row, "Let it go" renders in default text color and "Keep it" in grey — two plain text rows that don't read as a confirmation step / tappable choices.
- Constraint: keep NO danger color (shame-free design decision) — fix is affordance, not alarm: render both options as bordered pill chips (same grammar as the time-slot chips), confirm slightly more prominent, cancel quiet.
- Where: src/app/starter.tsx rowMode==='delete' block (~line 431).

### UAT-05-03: Reminder fired invisibly — no foreground notification handler — FIXED same session (2026-07-05, major)
- Observed: the 18:00 reminder never appeared (checked 15 min past). Founder was actively using the app at fire time.
- Root cause: no `Notifications.setNotificationHandler` registered anywhere — expo-notifications silently drops foreground presentation without one. The notification fired at 18:00 into the void (one-shot, so it's gone).
- Fix: quiet handler at _layout module scope — banner + list, no sound, no badge (shame-free: the reminder is the user's own words appearing, not an interruption). Boot-time test asserts the handler's exact quiet shape.
- Device re-test: CONFIRMED 2026-07-05 — notification appeared post-fix, ~18 min late (Android inexact-alarm batching).
- DECISION (founder, 2026-07-05): Option A — accept inexact timing for beta; copy made honest ("Reminder around {{when}}" / "około"; subcopy says "around the time you pick"). Option B (SCHEDULE_EXACT_ALARM permission flow + prebuild) stays on the watchlist, revisit only if beta users report lateness as a problem.

### UAT-05-02: No one-tap reschedule for an existing reminder (minor, UX)
- Observed: once a reminder is set, the card only offers "Remove reminder"; changing the time requires remove → re-open picker → re-add.
- Candidate fix: when a reminder exists, offer "Change time" that reopens the slot picker; scheduling already replace-don't-orphans internally, so this is UI-only.
- Where: src/app/starter.tsx notify row.
