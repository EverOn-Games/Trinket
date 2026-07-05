---
status: testing
phase: 05-starter
source: [05-SUMMARY.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

number: 2
name: Schedule a reminder — contextual permission + own-words content
expected: |
  Bell on card → day + time-slot chips; OS permission dialog appears only now; fired notification uses your own cue/action words.
awaiting: user response

## Tests

### 1. Create an intention (two-step builder)
expected: Cue chips prefill an editable field; step 2 takes a tiny action; Save produces exactly one "When X, then Y" card (double-tap safe).
result: pass

### 2. Schedule a reminder — contextual permission + own-words content
expected: "A quiet reminder?" on an intention card → day (today/tomorrow) + time-slot chips (9/12/18/21). The OS notification-permission dialog appears only NOW (never earlier, never during onboarding). When the reminder fires, the notification title is YOUR cue text and the body is YOUR action text — no app-authored exhortation.
result: pass (scheduling + contextual permission); fired-notification content check deferred ~1h until the slot fires
note: UI control is the text offer "A quiet reminder?", not a bell icon — checkpoint wording corrected.

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
