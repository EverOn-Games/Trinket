---
status: testing
phase: 05-starter
source: [05-SUMMARY.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

number: 1
name: Create an intention (two-step builder)
expected: |
  From Home, open Starter. Step 1: cue chips (time/place/event groups) are shown; tapping one prefills an editable text field (you can also type your own). Step 2: name a tiny first action. Save → a card appears reading "When [your cue], then [your action]". Double-tapping Save creates only ONE card.
awaiting: user response

## Tests

### 1. Create an intention (two-step builder)
expected: Cue chips prefill an editable field; step 2 takes a tiny action; Save produces exactly one "When X, then Y" card (double-tap safe).
result: [pending]

### 2. Schedule a reminder — contextual permission + own-words content
expected: Tap the bell on an intention card → day (today/tomorrow) + time-slot chips (9/12/18/21). The OS notification-permission dialog appears only NOW (never earlier, never during onboarding). When the reminder fires, the notification title is YOUR cue text and the body is YOUR action text — no app-authored exhortation.
result: [pending]

### 3. Reschedule replaces, never duplicates
expected: Schedule a reminder, then reschedule the same intention to a different slot. Only the NEW reminder fires — the old one never arrives.
result: [pending]

### 4. Delete cancels the reminder
expected: Delete an intention that has a pending reminder. The card disappears and the reminder never fires.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0

## Gaps

[none yet]
