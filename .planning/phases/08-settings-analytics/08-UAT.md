---
status: pending
phase: 08-settings-analytics
source: [08-SUMMARY.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

[queued — runs after 07-UAT]

## Tests

### 1. Locale switch is instant and persistent
expected: In Settings, switching PL ↔ EN changes all copy immediately (no restart needed) and the choice survives killing and reopening the app.
result: pass

### 2. Reminders toggle off cancels everything
expected: With at least one scheduled intention reminder, switching Reminders OFF in Settings cancels it — the notification never fires. Toggling back on does NOT resurrect old reminders (you re-schedule per intention).
result: [pending]

### 3. Mascot prominence chips
expected: Changing prominence in Settings visibly changes how present the mascot is, and the choice persists across restart.
result: pass

### 4. Plan row + See plans
expected: Settings shows the current plan (Free) with shame-free copy and a quiet "See plans" link that opens the paywall in its settings variant (different lead copy than the gate variant).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0

## Gaps

[none yet]
